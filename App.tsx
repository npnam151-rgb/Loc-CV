import React, { useState } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import { InputMode, ProcessingStatus, UploadedFile } from './types';
import { processCV } from './services/geminiService';

const FIXED_SHEET_URL = "https://script.google.com/macros/s/AKfycbwFIYJXURgK0h9rbIblM56fIsI7n1-sAfSzf1CQPAa23Jhf5a5VCxDcc-NpTeZawaYIUA/exec";

const DEFAULT_TEMPLATE = `TRÍCH XUẤT 1 DÒNG DUY NHẤT:
Họ tên | Quốc tịch | Địa chỉ hiện tại | Năm sinh | Email | Số điện thoại | Đại học | Chứng chỉ | Trường đã dạy | Kinh nghiệm

(Lưu ý: Ngăn cách bởi dấu "|", không tiêu đề, nếu thiếu ghi N/A)`;

function App() {
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.FILE);
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<UploadedFile | null>(null);
  const [templateInstructions, setTemplateInstructions] = useState(DEFAULT_TEMPLATE);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);

  const parseResultToRowData = (result: string): string[] => {
    const lines = result.trim().split('\n').filter(l => l.includes('|'));
    if (lines.length === 0) return [];

    // Lấy dòng có nhiều dấu "|" nhất (khả năng cao là dòng dữ liệu)
    const bestLine = lines.reduce((prev, curr) => 
        (curr.match(/\|/g) || []).length > (prev.match(/\|/g) || []).length ? curr : prev
    );

    let cleanLine = bestLine.trim();
    if (cleanLine.startsWith('|')) cleanLine = cleanLine.substring(1);
    if (cleanLine.endsWith('|')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
    
    return cleanLine.split('|').map(cell => cell.trim());
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
            console.warn("File preparation failed", e);
        }
    }

    // Gửi ngầm không đợi kết quả để tránh nghẽn UI
    fetch(FIXED_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
    }).catch(err => console.error("Sheet Error:", err));
  };

  const handleProcess = async () => {
    setStatus(ProcessingStatus.PROCESSING);
    
    try {
      // 1. AI Processing
      const result = await processCV(templateInstructions, cvText, cvFile);
      
      // 2. Data Parsing
      const rowData = parseResultToRowData(result);
      
      if (rowData.length < 3) {
          throw new Error("AI trả về sai định dạng. Hãy thử lại hoặc dùng nút 'Dán văn bản'.");
      }

      // 3. Send to Sheet (Async)
      await sendToGoogleSheet(rowData, cvFile);

      setStatus(ProcessingStatus.SUCCESS);
      
      // Auto-reset UI after success
      setTimeout(() => {
          setCvFile(null);
          setCvText('');
          setStatus(ProcessingStatus.IDLE);
      }, 3500);

    } catch (error: any) {
      console.error(error);
      alert(error.message);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-['Inter']">
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
            
            {status === ProcessingStatus.ERROR && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs italic">
                    * Mẹo: Nếu lỗi kéo dài, hãy thử copy văn bản từ CV rồi dùng chức năng "Dán văn bản" thay vì tải file.
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;