'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mock Login Logic
    if (email === 'admin@ggreen.com' && password === 'password123') {
      // Set a fake token
      localStorage.setItem('auth_token', 'mock_token_123');
      router.push('/');
    } else {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f9f6] px-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#24967a] rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
             <span className="text-3xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ G-Green</h1>
          <p className="text-gray-500 mt-2">กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block ml-1">อีเมล</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#24967a] focus:bg-white transition-all text-gray-800"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block ml-1">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#24967a] focus:bg-white transition-all text-gray-800"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#24967a] hover:bg-[#1e7e66] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200/50 transition-all flex items-center justify-center space-x-2"
          >
            <LogIn className="w-5 h-5" />
            <span>เข้าสู่ระบบ</span>
          </button>
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
