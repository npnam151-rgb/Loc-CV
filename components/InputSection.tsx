import React, { useRef } from 'react';
import { Upload, Type, X, File as FileIcon, Check, Send } from 'lucide-react';
import { InputMode, UploadedFile, ProcessingStatus } from '../types';

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvFile({
          name: file.name,
          type: file.type,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 flex items-center">
          <Upload className="w-4 h-4 mr-2 text-blue-600" />
          Upload Hồ Sơ
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Upload Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn hồ sơ ứng viên
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
                <span>File (PDF/Ảnh)</span>
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
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer h-48 flex flex-col justify-center items-center"
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Nhấn để tải lên file CV</p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ PDF, PNG, JPG</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-lg h-24">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="bg-blue-100 p-2 rounded">
                      <FileIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-gray-700 truncate max-w-[200px]">{cvFile.name}</span>
                        <span className="text-xs text-gray-500">Đã sẵn sàng</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleRemoveFile}
                    className="p-1 hover:bg-blue-200 rounded-full text-gray-500 hover:text-red-500 transition-colors"
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
              placeholder="Copy nội dung CV và dán vào đây..."
              className="w-full h-48 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          )}
        </div>

        {/* Hidden Template Instructions but Logic Remains */}
        <div className="hidden">
            <textarea
              value={templateInstructions}
              onChange={(e) => setTemplateInstructions(e.target.value)}
            />
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={onProcess}
          disabled={isProcessing || (!cvFile && !cvText.trim())}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-base font-bold transition-all shadow-sm
            ${(isProcessing || (!cvFile && !cvText.trim()))
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : status === ProcessingStatus.SUCCESS 
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
            }`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Đang xử lý & Upload...</span>
            </>
          ) : status === ProcessingStatus.SUCCESS ? (
             <>
                <Check className="w-5 h-5" />
                <span>Thành công! Upload tiếp?</span>
             </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Upload</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;