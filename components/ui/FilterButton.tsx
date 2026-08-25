import React from 'react';
import { IconFilter } from '@tabler/icons-react';
import { Button } from './Button/Button';

interface FilterButtonProps {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  onClick,
  activeCount = 0,
  className = '',
}) => {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      // Mobile: h-10 w-10 (40x40px), no text. Desktop: h-10 w-auto, with padding
      className={`relative mt-1.5 mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:mt-0 sm:mr-0 sm:w-auto sm:!px-4 sm:!py-2 ${className}`}
    >
      <IconFilter size={18} className="shrink-0" />
      <span className="ml-2 hidden font-medium sm:inline">Filter</span>

      {activeCount > 0 && (
        <span className="bg-brand-500 sm:bg-brand-100 sm:text-brand-600 dark:sm:bg-brand-900/30 dark:sm:text-brand-400 absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm sm:static sm:ml-1.5 sm:border-0 sm:text-xs sm:shadow-none dark:border-neutral-900">
          {activeCount}
        </span>
      )}
    </Button>
  );
};
