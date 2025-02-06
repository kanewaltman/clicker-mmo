import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MenuItemProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  variant?: 'dense' | 'large';
}

export const MenuItem: React.FC<MenuItemProps> = ({ 
  label, 
  icon: Icon,
  onClick, 
  isFirst, 
  isLast,
  variant = 'dense'
}) => (
  <button
    onClick={onClick}
    className={`
      flex justify-between items-center w-full
      bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06]
      transition-all duration-200 ease-in-out
      group
      ${isFirst ? 'rounded-t-[16px]' : ''}
      ${isLast ? 'rounded-b-[16px]' : ''}
      ${variant === 'dense' ? 'p-4' : 'py-5 px-4'}
      ${!isLast ? 'mb-[2px]' : ''}
    `}
  >
    <div className={`
      font-semibold tracking-normal text-white 
      transition-transform duration-200 ease-in-out
      group-hover:translate-x-2
      ${variant === 'dense' ? 'text-sm' : 'text-base'}
    `}>
      {label}
    </div>
    <div className="text-white/70 [&>svg]:fill-white/[0.06]">
      <Icon className="w-5 h-5" />
    </div>
  </button>
);