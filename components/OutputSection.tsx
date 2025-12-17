import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download, Edit3, Send, AlertCircle, FileUp } from 'lucide-react';
import { ProcessingStatus, UploadedFile } from '../types';

interface OutputSectionProps {
  status: ProcessingStatus;
  result: string;
  sheetUrl: string;
  cvFile: UploadedFile | null;
}

const OutputSection: React.FC<OutputSectionProps> = ({ status, result, sheetUrl, cvFile }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [sendingToSheet, setSendingToSheet] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Detect if string is a markdown table (has separator line)
  const isMarkdownTable = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    return lines.length >= 2 && lines[0].includes('|') && lines[1].includes('---');
  };

  // Detect if string is just pipe separated data (headless)
  const isPipeData = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    // Has pipes, but NO markdown table separator
    return lines.length > 0 && lines[0].includes('|') && !text.includes('---|');
  };

  const handleCopy = () => {
    let textToCopy = result;

    if (viewMode === 'preview') {
      if (isMarkdownTable(result)) {
        textToCopy = markdownTableToTSV(result);
      } else if (isPipeData(result)) {
        textToCopy = pipeDataToTSV(result);
      }
    }
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([result], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "ket_qua_hr.txt";
    document.body.appendChild(element);
    element.click();
  };

  const handleSendToSheet = async () => {
    if (!sheetUrl) {
      alert("Vui lòng nhập Link Google Sheet Web App trong phần Cấu hình (Input).");
      return;
    }

    setSendingToSheet(true);
    setSendSuccess(false);
    
    // Improved Parsing Logic: Find the line with the most pipes
    let rowData: string[] = [];
    const lines = result.trim().split('\n').filter(line => line.trim() !== '');
    
    let bestLine = '';
    let maxPipes = -1;

    for (const line of lines) {
        // Ignore separator lines like |---|
        if (line.includes('---')) continue;
        
        // Count pipes to find the most "data-like" row
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
        rowData = line.split('|').map(cell => cell.trim());
    }

    if (rowData.length === 0) {
        alert("Không tìm thấy dòng dữ liệu hợp lệ (ngăn cách bởi dấu |) để gửi.");
        setSendingToSheet(false);
        return;
    }

    // Prepare payload
    const payload: any = { rowData };

    // Attach File Data if available
    if (cvFile && cvFile.data) {
        try {
            // cvFile.data is "data:application/pdf;base64,....."
            // We need to strip the prefix for Google Apps Script
            const base64Content = cvFile.data.split(',')[1];
            
            payload.fileData = {
                name: cvFile.name,
                mimeType: cvFile.type,
                base64: base64Content
            };
        } catch (e) {
            console.warn("Could not prepare file for upload", e);
        }
    }

    try {
        // Use no-cors mode for Google Apps Script Web App.
        await fetch(sheetUrl, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(payload),
        });
        
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
    } catch (error) {
        console.error("Error sending to sheet:", error);
        alert("Gửi thất bại. Hãy kiểm tra lại đường link Script hoặc kết nối mạng.");
    } finally {
        setSendingToSheet(false);
    }
  };

  // Convert Markdown table to TSV (excluding separator)
  const markdownTableToTSV = (text: string) => {
      const lines = text.trim().split('\n').filter(line => line.trim() !== '');
      const dataLines = lines.filter(line => !line.includes('---'));
      
      return dataLines.map(line => {
          let content = line.trim();
          if (content.startsWith('|')) content = content.substring(1);
          if (content.endsWith('|')) content = content.substring(0, content.length - 1);
          return content.split('|').map(cell => cell.trim()).join('\t');
      }).join('\n');
  };

  // Convert raw pipe data to TSV
  const pipeDataToTSV = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
       return line.split('|').map(cell => cell.trim()).join('\t');
    }).join('\n');
  };

  const PipeDataRenderer = ({ content }: { content: string }) => {
    const lines = content.trim().split('\n').filter(l => l.trim() !== '');
    
    const parseRow = (row: string) => {
        let r = row.trim();
        // Remove outer pipes if implied
        if (r.startsWith('|') && r.endsWith('|')) {
             r = r.substring(1, r.length - 1);
        }
        return r.split('|').map(c => c.trim());
    };

    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {parseRow(line).map((cell, cIdx) => (
                  <td key={cIdx} className="px-6 py-4 text-sm text-gray-900 border-r last:border-r-0 border-gray-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200">
          * Dữ liệu dạng bảng thô.
        </div>
      </div>
    );
  };

  const MarkdownTableRenderer = ({ content }: { content: string }) => {
    const lines = content.trim().split('\n').filter(l => l.trim() !== '');
    const headerLine = lines[0];
    const dataLines = lines.slice(2); 

    const parseRow = (row: string) => {
        let r = row.trim();
        if (r.startsWith('|')) r = r.substring(1);
        if (r.endsWith('|')) r = r.substring(0, r.length - 1);
        return r.split('|').map(c => c.trim());
    };

    const headers = parseRow(headerLine);

    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r last:border-r-0 border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataLines.map((line, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {parseRow(line).map((cell, cIdx) => (
                  <td key={cIdx} className="px-6 py-4 text-sm text-gray-900 border-r last:border-r-0 border-gray-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (status === ProcessingStatus.IDLE) {
    return (
      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 items-center justify-center p-8 text-center text-gray-400">
        <div className="bg-gray-50 p-6 rounded-full mb-4">
          <Edit3 className="w-12 h-12 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-600">Chưa có dữ liệu</h3>
        <p className="max-w-xs mt-2 text-sm">
          Tải lên CV và nhập yêu cầu ở cột bên trái, sau đó nhấn "Chuẩn hóa CV" để xem kết quả.
        </p>
      </div>
    );
  }

  if (status === ProcessingStatus.ERROR) {
    return (
      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-red-200 items-center justify-center p-8 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-700">Đã xảy ra lỗi</h3>
        <p className="text-gray-600 mt-2 max-w-sm">{result}</p>
      </div>
    );
  }

  const isTable = isMarkdownTable(result);
  const isPipe = isPipeData(result);
  const canConvertToExcel = isTable || isPipe;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="font-semibold text-gray-800 flex items-center">
            <Check className="w-4 h-4 mr-2 text-green-600" />
            Kết quả
          </h2>
          <div className="flex space-x-1 bg-white border border-gray-200 rounded-md p-0.5">
             <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'preview' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Xem trước
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'raw' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Mã nguồn
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {sheetUrl && canConvertToExcel && (
            <button
              onClick={handleSendToSheet}
              disabled={sendingToSheet}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sendSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
              title="Gửi dữ liệu vào Google Sheet & Lưu file CV vào Drive"
            >
              {sendingToSheet ? (
                <span className="w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full animate-spin"></span>
              ) : sendSuccess ? (
                <Check className="w-3 h-3" />
              ) : (
                <>
                    {cvFile ? <FileUp className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                </>
              )}
              <span>{sendingToSheet ? 'Đang gửi...' : sendSuccess ? 'Hoàn tất!' : (cvFile ? 'Lưu Sheet & Drive' : 'Gửi vào Sheet')}</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Tải xuống .txt"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied 
                ? 'bg-green-100 text-green-700' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? (canConvertToExcel && viewMode === 'preview' ? 'Đã copy Excel' : 'Đã sao chép') : (canConvertToExcel && viewMode === 'preview' ? 'Copy Excel' : 'Sao chép')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-6">
        {status === ProcessingStatus.PROCESSING ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
            <div className="h-32 bg-gray-100 rounded border border-gray-200 p-4"></div>
          </div>
        ) : (
          viewMode === 'preview' ? (
             isTable ? (
               <MarkdownTableRenderer content={result} />
             ) : isPipe ? (
                <PipeDataRenderer content={result} />
             ) : (
               <div className="prose prose-sm prose-blue max-w-none">
                 <ReactMarkdown>{result}</ReactMarkdown>
               </div>
             )
          ) : (
            <textarea 
              readOnly 
              className="w-full h-full font-mono text-sm text-gray-800 focus:outline-none resize-none whitespace-pre"
              value={result}
            />
          )
        )}
      </div>
      
      {/* Troubleshooting Tip */}
      {sheetUrl && (
          <div className="bg-yellow-50 px-4 py-2 border-t border-yellow-100 text-[10px] text-yellow-700 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0"/>
              <p>
                  Nếu nút Gửi báo "Đã gửi" nhưng Sheet không có dữ liệu: Hãy kiểm tra Script Deployment. 
                  Quyền truy cập phải là "Anyone" (Bất kỳ ai). Nếu sửa code Script, nhớ chọn "New deployment".
              </p>
          </div>
      )}
    </div>
  );
};

export default OutputSection;