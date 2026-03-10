'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import apiClient from '@/lib/axios';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      // Assuming the API returns the token in response.data.token or response.data.accessToken
      const token = response.data.token || response.data.accessToken || response.data.data?.token;

      if (token) {
        localStorage.setItem('auth_token', token);
        router.push('/');
      } else {
        throw new Error('ไม่พบ Token ในการตอบกลับจากเซิร์ฟเวอร์');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4" 
      style={{ background: 'linear-gradient(180deg, #C3EDE6 23%, #B5D984 100%)' }}
    >
      <div 
        className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full flex flex-col justify-center" 
        style={{ width: '605px', height: '582px', maxWidth: '100%' }}
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#24967a] rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
             <span className="text-3xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ระบบประมวลผล G-Green</h1>
          <p className="text-gray-500 mt-2">เข้าสู่ระบบ G-Green</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          
          <Input
            label="อีเมล"
            icon={Mail}
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="รหัสผ่าน"
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            isLoading={isLoading}
            icon={LogIn}
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ยังไม่เป็นสมาชิก?{' '}
            <a href="#" className="text-[#24967a] font-bold hover:underline">สมัครเข้าร่วมโครงการ</a>
          </p>
        </div>
      </div>
    </div>
  );
}
