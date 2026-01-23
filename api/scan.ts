import { GoogleGenAI } from "@google/genai";

// Cấu hình cho Vercel Serverless Function
export const config = {
  maxDuration: 60, // Tăng thời gian xử lý lên 60s
};

const DEFAULT_INSTRUCTION = `TRÍCH XUẤT 1 DÒNG DUY NHẤT:
Họ tên | Quốc tịch | Địa chỉ hiện tại | Năm sinh | Email | Số điện thoại | Đại học | Chứng chỉ | Trường đã dạy | Tóm tắt kinh nghiệm | Đề xuất giảng dạy

(Quy tắc:
1. Ngăn cách các trường bởi dấu "|".
2. Cột "Tóm tắt kinh nghiệm": Tóm tắt phần kinh nghiệm giảng dạy trong khoảng 40–60 chữ, bằng tiếng Việt.
3. Cột "Đề xuất giảng dạy": AI tự phân tích CV và đưa ra gợi ý ngắn gọn (Ví dụ: Trực tiếp - Trung tâm - Teen - Luyện thi IELTS).
4. Nếu thiếu thông tin ghi N/A)`;

export default async function handler(request: Request) {
  // 1. Xử lý CORS (Cho phép script bên ngoài gọi vào)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Lấy API Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse Body từ Request
    const body = await request.json();
    const { 
      base64,      // Dữ liệu file (bắt buộc nếu không có text)
      mimeType,    // Loại file (vd: application/pdf)
      text,        // Text CV (nếu đã trích xuất sẵn)
      instruction  // Câu lệnh prompt tùy chỉnh (optional)
    } = body;

    // Validate Input
    if (!text && !base64) {
      return new Response(JSON.stringify({ error: 'Missing data: Provide "base64" (file) or "text" (content).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Gọi Gemini AI
    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt hệ thống (ĐÃ CẬP NHẬT LOGIC SKIP)
    const systemInstruction = `Bạn là chuyên gia HR. Nhiệm vụ:
    1. XÁC ĐỊNH LOẠI TÀI LIỆU ĐẦU TIÊN.
    - Nếu là Passport (Hộ chiếu), Căn cước công dân (ID Card), Bằng cấp (Degree), Chứng chỉ (Certificate) đứng riêng lẻ: Trả về duy nhất chuỗi "SKIP: NOT_CV".
    - Nếu là CV, Hồ sơ xin việc, Resume: Thực hiện trích xuất thông tin theo yêu cầu người dùng.
    
    2. NGUYÊN TẮC TRÍCH XUẤT (CHỈ ÁP DỤNG VỚI CV):
    - Trả về đúng 1 dòng dữ liệu ngăn cách bởi dấu |.
    - Không giải thích thêm.`;
    
    // Prompt người dùng
    const userInstruction = instruction || DEFAULT_INSTRUCTION;
    const userPrompt = `
      YÊU CẦU:
      ${userInstruction}
      
      DỮ LIỆU ĐẦU VÀO:
      ${text || "(Xem file đính kèm)"}
    `;

    const parts: any[] = [{ text: userPrompt }];

    // Xử lý file đính kèm (PDF/Image)
    if (base64 && mimeType) {
        // Loại bỏ header base64 nếu có (data:image/png;base64,...)
        const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
        
        parts.unshift({
            inlineData: {
                data: cleanBase64,
                mimeType: mimeType
            }
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.1,
      }
    });

    const resultText = response.text;

    // 5. Trả về kết quả
    return new Response(JSON.stringify({ result: resultText }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}