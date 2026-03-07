'use client';

import React from 'react';
import * as Lucide from 'lucide-react';

interface ProjectCardProps {
  iconName: keyof typeof Lucide;
  title: string;
  description: string;
}

export const ProjectCard = ({ iconName, title, description }: ProjectCardProps) => {
  const IconComponent = (Lucide[iconName] as React.ElementType) || Lucide.HelpCircle;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer aspect-square">
      <div className="w-16 h-16 bg-[#f0f9f6] rounded-xl flex items-center justify-center mb-6">
        <IconComponent className="w-8 h-8 text-[#24967a]" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
    </div>
  );
};
