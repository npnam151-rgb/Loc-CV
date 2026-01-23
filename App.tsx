import React, { useState } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import { InputMode, ProcessingStatus, UploadedFile } from './types';
import { processCV } from './services/geminiService';
import { APP_CONFIG } from './constants';

const DEFAULT_TEMPLATE = `TRÍCH XUẤT 1 DÒNG DUY NHẤT:
Họ tên | Quốc tịch | Địa chỉ hiện tại | Năm sinh | Email | Số điện thoại | Đại học | Chứng chỉ | Trường đã dạy | Tóm tắt kinh nghiệm | Đề xuất giảng dạy

(Quy tắc:
1. Ngăn cách các trường bởi dấu "|".
2. Cột "Tóm tắt kinh nghiệm": Tóm tắt phần kinh nghiệm giảng dạy trong khoảng 40–60 chữ, bằng tiếng Việt, tập trung vào: số năm kinh nghiệm, quốc gia/trường đã dạy, cấp lớp/môn học, chương trình giảng dạy, điểm mạnh hoặc thành tích nổi bật. Văn phong khách quan, súc tích, dùng cho báo cáo nội bộ.
3. Cột "Đề xuất giảng dạy": AI tự phân tích CV và đưa ra gợi ý ngắn gọn gồm 4 yếu tố:
   - Hình thức: Online hoặc Trực tiếp
   - Môi trường: Trường học / Trung tâm / Doanh nghiệp / Lớp cá nhân
   - Lứa tuổi: Mầm non / Tiểu học / Teen / Người lớn
   - Trình độ: Cơ bản / Giao tiếp / Luyện thi (IELTS/TOEIC)
   (Ví dụ output: Trực tiếp - Trung tâm - Teen - Luyện thi IELTS)
4. Nếu thiếu thông tin ghi N/A)`;

function App() {
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.FILE);
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<UploadedFile | null>(null);
  const [templateInstructions, setTemplateInstructions] = useState(DEFAULT_TEMPLATE);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<string>(''); 

  const parseResultToRowData = (result: string): string[] => {
    const lines = result.trim().split('\n').filter(l => l.includes('|'));
    if (lines.length === 0) return [];

    const bestLine = lines.reduce((prev, curr) => 
        (curr.match(/\|/g) || []).length > (prev.match(/\|/g) || []).length ? curr : prev
    );

    let cleanLine = bestLine.trim();
    if (cleanLine.startsWith('|')) cleanLine = cleanLine.substring(1);
    if (cleanLine.endsWith('|')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
    
    return cleanLine.split('|').map(cell => cell.trim());
  };

  const sendToGoogleSheet = async (rowData: string[], file: UploadedFile | null) => {
    // Dữ liệu gửi đi bao gồm cả folderId lấy từ config
    const payload: any = { 
        rowData,
        folderId: APP_CONFIG.FOLDER_ID 
    };

    if (file && file.data) {
        try {
            const base64Content = file.data.split(',')[1];
            payload.fileData = {
                name: file.name,
                mimeType: file.type,
                base64: base64Content
            };
        } catch (e) {
            console.warn("File preparation failed", e);
        }
    }

    // Thêm timestamp vào URL để tránh cache trình duyệt, đảm bảo gọi request mới nhất
    const urlWithCacheBuster = `${APP_CONFIG.SHEET_URL}?v=${Date.now()}`;

    // Gửi request
    fetch(urlWithCacheBuster, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
    }).catch(err => console.error("Sheet Error:", err));
  };

  const handleProcess = async () => {
    setStatus(ProcessingStatus.PROCESSING);
    setResult(''); 
    
    try {
      const aiResult = await processCV(templateInstructions, cvText, cvFile);
      
      // KIỂM TRA LOẠI TÀI LIỆU
      if (aiResult && aiResult.includes("SKIP: NOT_CV")) {
         const skipMsg = "⚠️ ĐÃ BỎ QUA: Hệ thống phát hiện đây là Passport hoặc Bằng cấp, không phải CV nên KHÔNG lưu vào Sheet.";
         setResult(skipMsg);
         // Sử dụng trạng thái ERROR để hiển thị thông báo trong hộp màu đỏ nổi bật
         setStatus(ProcessingStatus.ERROR); 
         
         // Clear file sau 5s để người dùng làm tiếp
         setTimeout(() => {
            setCvFile(null);
            setCvText('');
            setStatus(ProcessingStatus.IDLE);
            setResult(''); 
         }, 5000);
         return; 
      }

      setResult(aiResult); 
      
      const rowData = parseResultToRowData(aiResult);
      if (rowData.length < 3) {
          throw new Error("AI trả về sai định dạng. Hãy thử lại hoặc dùng nút 'Dán văn bản'.");
      }

      await sendToGoogleSheet(rowData, cvFile);

      setStatus(ProcessingStatus.SUCCESS);
      
      setTimeout(() => {
          setCvFile(null);
          setCvText('');
          setStatus(ProcessingStatus.IDLE);
          setResult(''); 
      }, 3500);

    } catch (error: any) {
      console.error(error);
      alert(error.message);
      setStatus(ProcessingStatus.ERROR);
      setResult(error.message); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
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
              status={status}
              result={result}
            />
          </div>
          <div className="h-full min-h-[500px]">
            <OutputSection 
              status={status}
              result={result}
              cvFile={cvFile}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;