'use client';

import { useState } from 'react';
import { LogIn, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000); // หยุด loading หลัง 2 วิ
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">ทดสอบ Button Component</h1>

      {/* ปุ่มปกติ ไม่มี icon */}
      <Button>
        ปุ่มธรรมดา
      </Button>

      {/* ปุ่มพร้อม icon */}
      <Button icon={LogIn}>
        มี Icon
      </Button>

      {/* ปุ่ม loading จริง */}
      <Button icon={Download} isLoading={isLoading} onClick={handleClick}>
        {isLoading ? 'กำลังโหลด...' : 'กดเพื่อ Loading'}
      </Button>

      {/* ปุ่ม disabled */}
      <Button icon={Trash2} disabled>
        disabled (กดไม่ได้)
      </Button>
    </div>
  );
}
