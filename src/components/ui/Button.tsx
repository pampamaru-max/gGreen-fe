import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  icon?: LucideIcon;
  // เฉลย: color?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  icon: Icon,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={isLoading || disabled}
      className={`w-full bg-[#54A7D4] hover:bg-[#3d90bd] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 ${
        isLoading || disabled ? 'opacity-70 cursor-not-allowed' : ''
      } ${className}`}
      style={{ boxShadow: '0px 8px 24px 0px rgba(0,0,0,0.15)', ...props.style }}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        Icon && <Icon className="w-5 h-5" />
      )}
      <span>{children}</span>
    </button>
  );
};
