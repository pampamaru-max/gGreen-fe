'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@/components/Banner';
import { ProjectCard } from '@/components/ProjectCard';
import * as Lucide from 'lucide-react';

const projects = [
  { icon: 'Hotel' as keyof typeof Lucide, title: 'Green Hotel', description: 'โรงแรมที่เป็นมิตรกับสิ่งแวดล้อม' },
  { icon: 'Utensils' as keyof typeof Lucide, title: 'Green Restaurant', description: 'ร้านอาหารที่เป็นมิตรกับสิ่งแวดล้อม' },
  { icon: 'Building' as keyof typeof Lucide, title: 'Green Office', description: 'สำนักงานสีเขียว' },
  { icon: 'Home' as keyof typeof Lucide, title: 'Green Residence', description: 'ที่พักอาศัยสีเขียว' },
  { icon: 'Factory' as keyof typeof Lucide, title: 'Green Production', description: 'การผลิตที่เป็นมิตรกับสิ่งแวดล้อม' },
  { icon: 'Trees' as keyof typeof Lucide, title: 'Green National Park', description: 'อุทยานแห่งชาติสีเขียว' },
  { icon: 'Recycle' as keyof typeof Lucide, title: 'G-Upcycle', description: 'การนำวัสดุกลับมาใช้ใหม่' },
  { icon: 'Award' as keyof typeof Lucide, title: 'Eco Plus', description: 'มาตรฐานสิ่งแวดล้อมขั้นสูง' },
  { icon: 'Star' as keyof typeof Lucide, title: 'Green Hotel Plus', description: 'โรงแรมที่เป็นมิตรกับสิ่งแวดล้อมอย่างยั่งยืน' },
  { icon: 'ClipboardCheck' as keyof typeof Lucide, title: 'G-Green Assessment Unit', description: 'หน่วยรับดำเนินงานตรวจประเมิน G-Green' }
];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#24967a]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] font-sans pb-20">
      <main className="container mx-auto px-4 pt-12">
        <Banner />
        
        <div className="max-w-7xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-[#2d3436] mb-12">
            โครงการภายใต้ G-Green
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {projects.map((project, index) => (
              <ProjectCard 
                key={index}
                iconName={project.icon}
                title={project.title}
                description={project.description}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
