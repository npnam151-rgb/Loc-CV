import { GoogleGenAI } from "@google/genai";
import { UploadedFile } from "../types";

const processCV = async (
  instructions: string, 
  cvText: string, 
  cvFile: UploadedFile | null
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key chưa được cấu hình. Hãy kiểm tra Environment Variables trên Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Bạn là một Trợ lý Nhân sự (HR Assistant) chuyên nghiệp.
    Nhiệm vụ: Trích xuất thông tin CV theo đúng mẫu yêu cầu.
    
    Quy tắc:
    1. Chỉ trả về dữ liệu thô (Raw data), không giải thích.
    2. Nếu thiếu thông tin, ghi "N/A".
    3. Định dạng: Các trường cách nhau bằng dấu "|".
  `;

  const userPrompt = `
    YÊU CẦU:
    ${instructions}

    DỮ LIỆU CV:
    ${cvText ? `Văn bản CV: ${cvText}` : ''}
    ${cvFile ? `(Sử dụng tệp đính kèm để trích xuất)` : ''}
  `;

  const parts: any[] = [{ text: userPrompt }];

  if (cvFile) {
    const base64Data = cvFile.data.split(',')[1]; 
    parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: cvFile.type
      }
    });
  }

  try {
    // Sử dụng model gemini-3-flash-preview theo hướng dẫn mới nhất
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      }
    });

    const result = response.text;
    if (!result) {
      throw new Error("AI không trả về nội dung. Có thể file quá lớn hoặc không đọc được.");
    }

    return result;
  } catch (error: any) {
    console.error("Lỗi Gemini API:", error);
    
    // Phân loại lỗi để người dùng dễ xử lý
    if (error.message?.includes('429')) {
      throw new Error("Hết hạn mức (Rate Limit). Vui lòng thử lại sau 1 phút.");
    }
    if (error.message?.includes('API key not valid')) {
      throw new Error("API Key không hợp lệ. Hãy kiểm tra lại cấu hình Project trên Vercel.");
    }
    if (error.message?.includes('fetch failed')) {
        throw new Error("Lỗi kết nối mạng hoặc Vercel chặn yêu cầu.");
    }

    throw new Error(`Lỗi hệ thống: ${error.message || "Vui lòng thử lại hoặc dùng văn bản thay vì file."}`);
  }
};

export { processCV };