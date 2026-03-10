import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon: Icon, className = '', style, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-semibold text-gray-700 block ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          )}
          <input
            ref={ref}
            className={`w-full bg-[#E1F2F2] rounded-xl py-4 ${Icon ? 'pl-12' : 'pl-4'} pr-4 focus:outline-none focus:ring-2 focus:ring-[#24967a] transition-all text-gray-800 ${className}`}
            style={{ 
              boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.15)',
              ...style 
            }}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
