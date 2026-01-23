import { GoogleGenAI } from "@google/genai";

// Cấu hình cho Vercel Serverless Function
export const config = {
  maxDuration: 60, // Thời gian xử lý tối đa 60s
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Tăng giới hạn dung lượng body lên 4MB (Mặc định là 1MB)
    },
  },
};

const DEFAULT_INSTRUCTION = `TRÍCH XUẤT 1 DÒNG DUY NHẤT:
Họ tên | Quốc tịch | Địa chỉ hiện tại | Năm sinh | Email | Số điện thoại | Đại học | Chứng chỉ | Trường đã dạy | Tóm tắt kinh nghiệm | Đề xuất giảng dạy

(Quy tắc:
1. Ngăn cách các trường bởi dấu "|".
2. Cột "Tóm tắt kinh nghiệm": Tóm tắt phần kinh nghiệm giảng dạy trong khoảng 40–60 chữ, bằng tiếng Việt.
3. Cột "Đề xuất giảng dạy": AI tự phân tích CV và đưa ra gợi ý ngắn gọn (Ví dụ: Trực tiếp - Trung tâm - Teen - Luyện thi IELTS).
4. Nếu thiếu thông tin ghi N/A)`;

export default async function handler(req: any, res: any) {
  // 1. Xử lý CORS chuẩn
  // Nếu Allow-Origin là * thì KHÔNG ĐƯỢC để Allow-Credentials là true
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 2. Lấy API Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Missing API Key");
      res.status(500).json({ error: 'Server configuration error: Missing API Key' });
      return;
    }

    // 3. Parse Body từ Request
    let body = req.body;
    
    // Debug Log: Kiểm tra xem body có nhận được không
    if (!body) {
        console.error("Body is empty/null");
        res.status(400).json({ error: 'Empty request body' });
        return;
    }

    // Fallback nếu body chưa được parse (dạng string)
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            res.status(400).json({ error: 'Invalid JSON body', details: (e as any).message });
            return;
        }
    }

    const { 
      base64,      
      mimeType,    
      text,        
      instruction  
    } = body || {};

    // Validate Input
    if (!text && !base64) {
      console.error("Missing text and base64. Received keys:", Object.keys(body));
      res.status(400).json({ error: 'Missing data: Provide "base64" (file) or "text" (content).' });
      return;
    }

    console.log("Processing request..."); // Log bắt đầu xử lý

    // 4. Gọi Gemini AI
    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt hệ thống
    const systemInstruction = `Bạn là chuyên gia HR. Nhiệm vụ:
    1. XÁC ĐỊNH LOẠI TÀI LIỆU ĐẦU TIÊN.
    - Nếu là Passport (Hộ chiếu), Căn cước công dân (ID Card), Bằng cấp (Degree), Chứng chỉ (Certificate) đứng riêng lẻ: Trả về duy nhất chuỗi "SKIP: NOT_CV".
    - Nếu là CV, Hồ sơ xin việc, Resume: Thực hiện trích xuất thông tin theo yêu cầu người dùng.
    
    2. NGUYÊN TẮC TRÍCH XUẤT (CHỈ ÁP DỤNG VỚI CV):
    - Trả về đúng 1 dòng dữ liệu ngăn cách bởi dấu |.
    - Không giải thích thêm.`;
    
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
    console.log("AI Response Success"); // Log thành công

    // 5. Trả về kết quả
    res.status(200).json({ result: resultText });

  } catch (error: any) {
    console.error("API Error Detail:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}