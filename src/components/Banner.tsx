'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

export const Banner = () => {
  return (
    <div className="relative w-full max-w-7xl mx-auto overflow-hidden rounded-3xl bg-[#dae5e2] p-8 md:p-12 mb-12 flex flex-col md:flex-row items-center justify-between">
      <div className="z-10 flex flex-col items-start space-y-6 md:w-2/3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#2d6a4f] rounded-full flex items-center justify-center text-white font-bold">
            {/* Placeholder for the logo */}
            <span className="text-xs">LOGO</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-gray-700">กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Department of Climate Change and Environment</p>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-[#2d3436] leading-tight">
          แนวทางการดำเนินโครงการ
        </h1>
        
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center px-6 py-3 bg-[#24967a] hover:bg-[#1e7e66] text-white rounded-full font-medium transition-colors">
            แนวทางการดำเนินโครงการ
            <ArrowRight className="ml-2 w-4 h-4" />
          </button>
          <button className="px-8 py-3 bg-[#24967a] hover:bg-[#1e7e66] text-white rounded-full font-medium transition-colors">
            สมัครเข้าร่วม
          </button>
        </div>
      </div>
      
      {/* Decorative G Placeholder */}
      <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 pointer-events-none md:opacity-100 md:relative md:w-auto">
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
             <span className="text-[200px] md:text-[240px] font-bold text-[#2d6a4f]/20 leading-none select-none">G</span>
             {/* Simple floral effect with circles */}
             <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-[#2d6a4f]/30 rounded-full blur-sm"></div>
             <div className="absolute bottom-1/3 right-1/4 w-6 h-6 bg-[#2d6a4f]/20 rounded-full blur-sm"></div>
             <div className="absolute top-1/2 left-10 w-8 h-8 bg-[#2d6a4f]/10 rounded-full blur-md"></div>
        </div>
      </div>
    </div>
  );
};
