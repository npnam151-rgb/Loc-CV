import React from 'react';
import { FileText, Briefcase } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">HR CV Formatter</h1>
            <p className="text-xs text-gray-500">Trợ lý chuẩn hóa hồ sơ ứng viên</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Gemini 2.5 Flash Connected
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;