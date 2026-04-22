
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'standard' | 'light' | 'mono' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', variant = 'standard' }) => {
  const sizes = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-32',
  };

  if (variant === 'icon') {
    return (
      <div className={`relative ${sizes[size]} aspect-square ${className}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path d="M20 20 L80 50 L20 80 Z" fill="#F2C94C" />
          <path d="M80 50 L60 40 L60 60 Z" fill="#D9B441" />
          <path d="M20 20 L40 35 L20 50 Z" fill="#FFD65A" />
        </svg>
      </div>
    );
  }

  // standard: black text, yellow subtext (for white bg)
  // light: white text, yellow subtext (for dark bg)
  // mono: black text, black subtext (for yellow bg)
  const mainTextColor = variant === 'light' ? 'text-white' : 'text-[#111111]';
  const subTextColor = variant === 'mono' ? 'text-black' : 'text-[#F2C94C]';
  
  // Icon colors based on variant
  const iconColors = variant === 'mono' 
    ? { main: '#000000', dark: '#111111', light: '#222222' }
    : { main: '#F2C94C', dark: '#D9B441', light: '#FFD65A' };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex flex-col items-start relative">
        <div className="flex items-baseline space-x-1">
          <div className={`${size === 'xl' ? 'h-16' : size === 'lg' ? 'h-10' : 'h-6'} mr-2`}>
             <svg viewBox="0 0 100 100" className="h-full">
                <path d="M20 20 L80 50 L20 80 Z" fill={iconColors.main} />
                <path d="M80 50 L60 40 L60 60 Z" fill={iconColors.dark} />
                <path d="M20 20 L40 35 L20 50 Z" fill={iconColors.light} />
             </svg>
          </div>
          <span className={`${size === 'xl' ? 'text-7xl' : size === 'lg' ? 'text-5xl' : 'text-3xl'} font-bold tracking-tighter ${mainTextColor} leading-none`}>
            enactus
          </span>
          <span className={`text-[10px] font-bold ${subTextColor} absolute -top-1 -right-4`}>TM</span>
        </div>
        <div className={`${size === 'xl' ? 'text-2xl mt-1' : size === 'lg' ? 'text-xl mt-1' : 'text-[10px] mt-0.5'} font-black tracking-[0.2em] ${subTextColor} ml-[2.5rem]`}>
          KISS-KIIT
        </div>
      </div>
    </div>
  );
};

export default Logo;
