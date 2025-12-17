import { GoogleGenAI } from "@google/genai";
import { UploadedFile } from "../types";

const processCV = async (
  instructions: string, 
  cvText: string, 
  cvFile: UploadedFile | null
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key chưa được cấu hình.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Bạn là một Trợ lý Nhân sự (HR Assistant) chuyên nghiệp và tỉ mỉ.
    Nhiệm vụ của bạn là xử lý hồ sơ năng lực/CV của ứng viên theo chính xác "Yêu cầu xử lý" được cung cấp.
    
    Quy tắc xử lý:
    1. Giữ nguyên sự thật: Không được bịa đặt thông tin. Nếu thông tin thiếu, hãy để trống hoặc ghi "Không có thông tin" (hoặc N/A theo yêu cầu).
    2. Cấu trúc: Tuân thủ chặt chẽ cấu trúc và các trường thông tin được yêu cầu trong hướng dẫn.
    3. Ngôn ngữ: Giữ nguyên ngôn ngữ của CV gốc trừ khi mẫu yêu cầu dịch.
    4. Định dạng đầu ra: Tuân thủ định dạng được yêu cầu trong hướng dẫn (ví dụ: Markdown, CSV, 1 dòng Excel, JSON...). Nếu không có yêu cầu cụ thể về định dạng, hãy mặc định sử dụng Markdown chuyên nghiệp.
    5. Chỉ trả về nội dung kết quả, không thêm lời chào hay giải thích ngoài lề.
  `;

  const userPrompt = `
    Đây là Yêu cầu xử lý (Mẫu định dạng hoặc Yêu cầu trích xuất):
    """
    ${instructions}
    """

    ${cvText ? `Đây là nội dung văn bản thô từ CV gốc:\n"""\n${cvText}\n"""` : ''}
    
    ${cvFile ? `Tôi đã đính kèm tệp CV gốc (dưới dạng ảnh hoặc PDF). Hãy trích xuất thông tin và xử lý theo yêu cầu.` : ''}

    Hãy thực hiện yêu cầu trên với CV này.
  `;

  const parts: any[] = [{ text: userPrompt }];

  if (cvFile) {
    // Remove data URL prefix provided by FileReader (e.g., "data:image/png;base64,")
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
      model: 'gemini-2.5-flash',
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Low temperature for factual consistency
      }
    });

    return response.text || "Không thể tạo nội dung. Vui lòng thử lại.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Đã xảy ra lỗi khi xử lý CV. Vui lòng kiểm tra lại file hoặc kết nối mạng.");
  }
};

export { processCV };