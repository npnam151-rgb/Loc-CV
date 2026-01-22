import React, { useRef, useState } from 'react';
import { Upload, Type, X, File as FileIcon, Check, Send, AlertTriangle } from 'lucide-react';
import { InputMode, UploadedFile, ProcessingStatus } from '../types';
import * as mammoth from 'mammoth';

interface InputSectionProps {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  cvText: string;
  setCvText: (text: string) => void;
  cvFile: UploadedFile | null;
  setCvFile: (file: UploadedFile | null) => void;
  templateInstructions: string;
  setTemplateInstructions: (text: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  status: ProcessingStatus;
  result?: string;
}

const InputSection: React.FC<InputSectionProps> = ({
  inputMode,
  setInputMode,
  cvText,
  setCvText,
  cvFile,
  setCvFile,
  templateInstructions,
  setTemplateInstructions,
  onProcess,
  isProcessing,
  status,
  result
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    // Validate File Type
    // Added docx mime type
    const validTypes = [
        'application/pdf', 
        'image/png', 'image/jpeg', 'image/jpg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    
    if (!validTypes.includes(file.type)) {
        alert("Định dạng không hỗ trợ. Vui lòng tải lên PDF, Word (.docx) hoặc ảnh (JPG, PNG).");
        return;
    }

    // GIỚI HẠN 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn (tối đa 5MB).");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Xử lý riêng cho file Word: Trích xuất text
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBufferReader = new FileReader();
        arrayBufferReader.onloadend = async () => {
           const arrayBuffer = arrayBufferReader.result as ArrayBuffer;
           try {
               const result = await mammoth.extractRawText({ arrayBuffer });
               // Tự động điền text đã trích xuất vào cvText để AI đọc
               setCvText(result.value); 
           } catch (e) {
               console.error("Lỗi đọc file Word:", e);
               alert("Không thể đọc nội dung file Word này. Hãy thử copy text thủ công.");
           }
        };
        arrayBufferReader.readAsArrayBuffer(file);
    } else {
        // Với PDF/Ảnh, clear cvText cũ để tránh lẫn lộn
        setCvText('');
    }

    // Luôn tạo object cvFile (base64) để upload lên Google Sheet (cho cả Word, PDF, Ảnh)
    const reader = new FileReader();
    reader.onloadend = () => {
      setCvFile({
        name: file.name,
        type: file.type,
        data: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    setCvText(''); // Clear text nếu xóa file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 flex items-center">
          <Upload className="w-4 h-4 mr-2 text-blue-600" />
          Upload Hồ Sơ
        </h2>
        {status === ProcessingStatus.ERROR && (
           <div className="flex items-center text-red-500 text-[10px] font-medium bg-red-50 px-2 py-1 rounded animate-pulse">
             <AlertTriangle className="w-3 h-3 mr-1" /> Lỗi
           </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn nguồn dữ liệu
          </label>
          
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-3 w-fit">
            <button
              onClick={() => setInputMode(InputMode.FILE)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                inputMode === InputMode.FILE 
                  ? 'bg-white text-blue-700 shadow-sm font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>File (Tối đa 5MB)</span>
              </div>
            </button>
            <button
              onClick={() => setInputMode(InputMode.TEXT)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                inputMode === InputMode.TEXT 
                  ? 'bg-white text-blue-700 shadow-sm font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Type className="w-4 h-4" />
                <span>Dán văn bản</span>
              </div>
            </button>
          </div>

          {inputMode === InputMode.FILE ? (
            <div className="mt-2">
              {!cvFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer h-56 flex flex-col justify-center items-center ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-opacity-50' 
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-3 ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-base text-gray-700 font-medium">
                    {isDragging ? "Thả file ngay" : "Nhấn để tải hoặc Kéo thả file CV"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    PDF, Word (.docx), JPG, PNG
                  </p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,image/png,image/jpeg,image/jpg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-lg h-24 shadow-sm">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                      <FileIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <span className="block text-sm font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-[300px]">{cvFile.name}</span>
                        <span className="text-xs text-blue-600 font-medium">Đã sẵn sàng xử lý</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste nội dung CV vào đây..."
              className="w-full h-56 p-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none shadow-inner"
            />
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={onProcess}
            disabled={isProcessing || (!cvFile && !cvText.trim())}
            className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-base font-bold transition-all shadow-md active:scale-[0.99]
              ${(isProcessing || (!cvFile && !cvText.trim()))
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                : status === ProcessingStatus.SUCCESS 
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200'
              }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang xử lý & Lưu...</span>
              </>
            ) : status === ProcessingStatus.SUCCESS ? (
               <>
                  <Check className="w-5 h-5" />
                  <span>Hoàn tất! Tiếp tục CV khác</span>
               </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Xử lý & Lưu vào Sheet</span>
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {status === ProcessingStatus.SUCCESS && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <div className="bg-green-100 p-1.5 rounded-full mt-0.5">
                        <Check className="w-4 h-4 text-green-700" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-green-800">Thành công</h4>
                        <p className="text-xs text-green-700 mt-0.5">
                            Dữ liệu đã được trích xuất và gửi vào Google Sheet của công ty.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {status === ProcessingStatus.ERROR && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-red-800 font-semibold text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Lỗi xử lý</span>
                    </div>
                    <div className="text-xs text-red-700 bg-white/50 p-2 rounded border border-red-100 font-mono break-words">
                        {result || "Không xác định được lỗi. Vui lòng thử lại."}
                    </div>
                    <p className="text-[10px] text-red-500 mt-2 italic">
                        * Mẹo: Nếu file PDF quá phức tạp, hãy thử copy text và dùng chế độ "Dán văn bản".
                    </p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default InputSection;