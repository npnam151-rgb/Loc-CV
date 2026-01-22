import React from 'react';
import { X, Copy, Check, AlertTriangle, RefreshCw, Server, FileSpreadsheet, Globe, ShieldAlert, Play } from 'lucide-react';
import { APP_CONFIG } from '../constants';

interface ScriptHelpProps {
  onClose: () => void;
}

const ScriptHelp: React.FC<ScriptHelpProps> = ({ onClose }) => {
  const [copied, setCopied] = React.useState(false);

  // V8.1: CODE FINAL MATCHING CONFIG
  const scriptCode = `/**
 * --- PHIÊN BẢN V8.1: FINAL CONFIG ---
 * LƯU Ý: Nếu bạn đã Deploy bản V8 và có link "Kết nối thành công", 
 * bạn KHÔNG CẦN làm lại bước này nữa.
 * Code này chỉ để tham khảo hoặc nếu bạn muốn tạo lại từ đầu.
 */

function doGet(e) {
  return ContentService.createTextOutput("✅ KẾT NỐI THÀNH CÔNG! Web App đang hoạt động tốt.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    // --- CẤU HÌNH CHÍNH XÁC ---
    var SPREADSHEET_ID = "1MoLgeqZTJAF1uDGaDlrckU84QqDOLkleffPcGMQN8lY"; // ID Sheet
    var FOLDER_ID = "1Wphss6hujHgqD9izkKXPiusfezT3p_Rb"; // ID Folder
    // --------------------------

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheets()[0];
    
    var rawData = e.postData.contents;
    var jsonData = JSON.parse(rawData);
    var rowData = jsonData.rowData || [];
    var fileUrl = "";
    
    if (jsonData.fileData && jsonData.fileData.base64) {
      try {
        var folder = DriveApp.getFolderById(FOLDER_ID);
        var dataBlob = Utilities.newBlob(
          Utilities.base64Decode(jsonData.fileData.base64), 
          jsonData.fileData.mimeType, 
          jsonData.fileData.name
        );
        var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
        dataBlob.setName(timestamp + "_" + jsonData.fileData.name);
        
        var file = folder.createFile(dataBlob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } catch (fileError) {
        fileUrl = "Lỗi Upload: " + fileError.toString();
      }
    }

    rowData.push(fileUrl);
    rowData.push(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"));
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({"result": "success", "url": fileUrl}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({"result":"error", "error": e.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="font-bold text-gray-800 flex items-center text-lg">
            <Server className="w-5 h-5 mr-2 text-green-600" />
            Trạng thái Backend
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                 <h4 className="font-bold text-green-800 flex items-center text-base mb-1">
                   <Check className="w-5 h-5 mr-2" />
                   Đã cập nhật URL mới!
                 </h4>
                 <p className="text-green-700 text-sm">
                   Hệ thống đã tự động cập nhật link Web App mới của bạn: <br/>
                   <code className="bg-green-100 px-1 py-0.5 rounded text-xs font-mono break-all">...QZXgh7RZ7_yaP0Y5Vle9AQUxag5Cm775MLsA/exec</code>
                 </p>
               </div>

               <p className="text-gray-600 text-sm">
                 Bây giờ bạn có thể đóng cửa sổ này và thử nhấn nút <strong>"Xử lý & Lưu Sheet"</strong>. Dữ liệu sẽ được gửi về Sheet ID <code>...QN8lY</code>.
               </p>
            </div>

            <div className="flex flex-col h-full">
              <div className="relative flex-1 group">
                <div className="absolute -top-3 left-4 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">Code.gs (Reference)</div>
                <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl text-xs font-mono overflow-auto h-[300px] shadow-inner border-2 border-gray-700">
                  {scriptCode}
                </pre>
                <button 
                  onClick={handleCopy}
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs flex items-center backdrop-blur-sm transition-colors border border-white/20 shadow-lg font-medium"
                >
                  {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptHelp;