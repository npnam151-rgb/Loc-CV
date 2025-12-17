import React, { useState } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import { InputMode, ProcessingStatus, UploadedFile } from './types';
import { processCV } from './services/geminiService';

const DEFAULT_TEMPLATE = `YÊU CẦU TRÍCH XUẤT DỮ LIỆU (ĐỊNH DẠNG RAW DATA):

Vui lòng trích xuất thông tin từ CV và trả về 1 DÒNG DỮ LIỆU DUY NHẤT.
- Các trường thông tin phân cách nhau bởi dấu gạch đứng "|".
- QUAN TRỌNG: KHÔNG xuất hàng tiêu đề (Header). 
- KHÔNG sử dụng định dạng bảng Markdown (không cần dòng "|---|").
- Chỉ xuất dữ liệu thô để tôi có thể copy paste nối tiếp vào file Excel có sẵn.

Các trường cần trích xuất (theo thứ tự chính xác):
1. Họ và tên
2. Quốc tịch (Nếu không rõ ghi "N/A")
3. Năm sinh (Chỉ lấy năm. Ví dụ: 1995)
4. Email
5. Số điện thoại
6. Bằng đại học (Ghi Tên trường - Chuyên ngành)
7. Chứng chỉ giảng dạy (Ghi tên chứng chỉ hoặc "Không")
8. Danh sách các trường đã dạy (Liệt kê ngắn gọn)
9. Tóm tắt kinh nghiệm (Tóm tắt ngắn gọn dưới 50 từ)

Ví dụ kết quả mong muốn (Chỉ 1 dòng):
Nguyễn Văn A | Việt Nam | 1990 | a@gmail.com | 0909000111 | ĐH Bách Khoa - CNTT | IELTS 8.0 | VUS, ILA | 5 năm kinh nghiệm giảng dạy tiếng Anh.`;

function App() {
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.FILE);
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<UploadedFile | null>(null);
  const [templateInstructions, setTemplateInstructions] = useState(DEFAULT_TEMPLATE);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState('');

  const handleProcess = async () => {
    setStatus(ProcessingStatus.PROCESSING);
    setResult('');
    
    try {
      const formattedCV = await processCV(templateInstructions, cvText, cvFile);
      setResult(formattedCV);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setResult(error.message || "Đã xảy ra lỗi không xác định.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
          {/* Left Column: Input */}
          <div className="h-full">
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
            />
          </div>

          {/* Right Column: Output */}
          <div className="h-full">
            <OutputSection status={status} result={result} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;