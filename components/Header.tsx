import React from 'react';
import { Briefcase, FileSpreadsheet } from 'lucide-react';
import { APP_CONFIG } from '../constants';

interface HeaderProps {
    // Không còn cần prop mở hướng dẫn cấu hình
}

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CV Scanner</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Công cụ quét & trích xuất hồ sơ</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <a 
            href={`https://docs.google.com/spreadsheets/d/${APP_CONFIG.SPREADSHEET_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            title="Mở Google Sheet theo dõi"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Mở Sheet Tổng Hợp</span>
            <span className="inline sm:hidden">Sheet</span>
          </a>

          <div className="hidden md:flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Gemini 2.5 Flash
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;