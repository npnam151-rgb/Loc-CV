import { GoogleGenAI } from "@google/genai";
import { UploadedFile } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const processCV = async (
  instructions: string, 
  cvText: string, 
  cvFile: UploadedFile | null,
  retryCount = 1
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key chưa được cấu hình trên Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Cập nhật instruction để AI hiểu nhiệm vụ phân tích/đánh giá
  const systemInstruction = "Bạn là chuyên gia HR. Nhiệm vụ: Trích xuất thông tin và Phân tích sự phù hợp từ CV. Trả về đúng 1 dòng dữ liệu ngăn cách bởi dấu |. Không giải thích thêm.";

  const userPrompt = `
    YÊU CẦU:
    ${instructions}
    
    DỮ LIỆU ĐẦU VÀO:
    ${cvText || "(Xem file đính kèm)"}
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.1, // Giữ nhiệt độ thấp để format ổn định
      }
    });

    const result = response.text;
    if (!result) throw new Error("AI trả về rỗng.");
    return result;

  } catch (error: any) {
    // Nếu là lỗi mạng hoặc lỗi nhất thời và vẫn còn lượt thử
    if (retryCount > 0 && !error.message?.includes('401') && !error.message?.includes('403')) {
      console.warn(`Đang thử lại... Còn ${retryCount} lượt.`);
      await wait(1500); // Đợi 1.5s trước khi thử lại
      return processCV(instructions, cvText, cvFile, retryCount - 1);
    }

    console.error("Lỗi cuối cùng:", error);
    
    if (error.message?.includes('429')) {
      throw new Error("Hệ thống đang quá tải (Rate Limit). Vui lòng đợi 30 giây rồi thử lại.");
    }
    
    throw new Error(error.message || "Lỗi kết nối. Hãy thử dùng văn bản thay vì file.");
  }
};

export { processCV };