import React, { useState } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import { InputMode, ProcessingStatus, UploadedFile } from './types';
import { processCV } from './services/geminiService';

const FIXED_SHEET_URL = "https://script.google.com/macros/s/AKfycbwFIYJXURgK0h9rbIblM56fIsI7n1-sAfSzf1CQPAa23Jhf5a5VCxDcc-NpTeZawaYIUA/exec";

const DEFAULT_TEMPLATE = `YÊU CẦU TRÍCH XUẤT DỮ LIỆU (ĐỊNH DẠNG RAW DATA):

Vui lòng trích xuất thông tin từ CV và trả về 1 DÒNG DỮ LIỆU DUY NHẤT.
- Các trường thông tin phân cách nhau bởi dấu gạch đứng "|".
- QUAN TRỌNG: KHÔNG xuất hàng tiêu đề (Header). 
- KHÔNG sử dụng định dạng bảng Markdown (không cần dòng "|---|").
- Chỉ xuất dữ liệu thô.

Các trường cần trích xuất (theo thứ tự chính xác):
1. Họ và tên
2. Quốc tịch (Nếu không rõ ghi "N/A")
3. Địa chỉ hiện tại (Ghi Quận/Huyện, Tỉnh/Thành phố hoặc "N/A")
4. Năm sinh (Chỉ lấy năm. Ví dụ: 1995)
5. Email
6. Số điện thoại
7. Bằng đại học (Ghi Tên trường - Chuyên ngành)
8. Chứng chỉ giảng dạy (Ghi tên chứng chỉ hoặc "Không")
9. Danh sách các trường đã dạy (Liệt kê ngắn gọn)
10. Tóm tắt kinh nghiệm (Tóm tắt ngắn gọn dưới 50 từ)`;

function App() {
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.FILE);
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<UploadedFile | null>(null);
  const [templateInstructions, setTemplateInstructions] = useState(DEFAULT_TEMPLATE);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);

  const parseResultToRowData = (result: string): string[] => {
    const lines = result.trim().split('\n').filter(line => line.trim() !== '');
    let bestLine = '';
    let maxPipes = -1;

    for (const line of lines) {
        if (line.includes('---')) continue;
        const pipeCount = (line.match(/\|/g) || []).length;
        if (pipeCount > maxPipes) {
            maxPipes = pipeCount;
            bestLine = line;
        }
    }

    if (maxPipes > 0) {
        let line = bestLine;
        if (line.startsWith('|')) line = line.substring(1);
        if (line.endsWith('|')) line = line.substring(0, line.length - 1);
        return line.split('|').map(cell => cell.trim());
    }
    return [];
  };

  const sendToGoogleSheet = async (rowData: string[], file: UploadedFile | null) => {
    const payload: any = { rowData };
    if (file && file.data) {
        try {
            const base64Content = file.data.split(',')[1];
            payload.fileData = {
                name: file.name,
                mimeType: file.type,
                base64: base64Content
            };
        } catch (e) {
            console.warn("Could not prepare file for upload", e);
        }
    }

    await fetch(FIXED_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
    });
  };

  const handleProcess = async () => {
    setStatus(ProcessingStatus.PROCESSING);
    
    try {
      // 1. Process CV with AI
      const formattedCV = await processCV(templateInstructions, cvText, cvFile);
      
      // 2. Parse the result to get structured data
      const rowData = parseResultToRowData(formattedCV);
      
      if (rowData.length === 0) {
          throw new Error("Không trích xuất được dữ liệu hợp lệ từ CV.");
      }

      // 3. Send to Google Sheet (Upload File + Data)
      await sendToGoogleSheet(rowData, cvFile);

      setStatus(ProcessingStatus.SUCCESS);
      
      // Reset after success if needed, or keep status to show "Success" checkmark
      setTimeout(() => {
          if (status === ProcessingStatus.SUCCESS) {
              setCvFile(null);
              setCvText('');
              setStatus(ProcessingStatus.IDLE);
          }
      }, 3000); // Auto reset UI after 3s

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Đã xảy ra lỗi khi xử lý.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-8 flex justify-center">
        <div className="w-full max-w-lg">
            <InputSection 
              inputMode={inputMode}
              setInputMode={setInputMode}
              cvText={cvText}
              setCvText={setCvText}
              cvFile={cvFile}
              setCvFile={setCvFile}
              templateInstructions={templateInstructions}
              setTemplateInstructions={setTemplateInstructions}
              onProcess={handleProcess}
              isProcessing={status === ProcessingStatus.PROCESSING}
              status={status}
            />
        </div>
      </main>
    </div>
  );
}

export default App;