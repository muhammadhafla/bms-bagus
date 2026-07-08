import React from 'react';
import { IconFilter } from '@tabler/icons-react';
import { Button } from './Button/Button';

interface FilterButtonProps {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ onClick, activeCount = 0, className = '' }) => {
  return (
    <Button 
      variant="secondary" 
      onClick={onClick} 
      // Mobile: h-10 w-10 (40x40px), no text. Desktop: h-10 w-auto, with padding
      className={`shrink-0 flex items-center justify-center h-10 w-10 sm:w-auto p-0 sm:px-4 rounded-xl relative ${className}`}
    >
      <IconFilter size={18} className="shrink-0" />
      <span className="hidden sm:inline font-medium ml-2">Filter</span>
      
      {activeCount > 0 && (
        <span className="
          absolute -top-1.5 -right-1.5 
          sm:static sm:ml-1.5 
          flex h-5 w-5 
          items-center justify-center 
          rounded-full 
          bg-brand-500 sm:bg-brand-100 
          text-[10px] sm:text-xs font-bold 
          text-white sm:text-brand-600 
          border-2 border-white sm:border-0 
          shadow-sm sm:shadow-none
          dark:border-neutral-900 dark:sm:bg-brand-900/30 dark:sm:text-brand-400
        ">
          {activeCount}
        </span>
      )}
    </Button>
  );
};
