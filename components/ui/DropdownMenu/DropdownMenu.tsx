'use client';

import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';

export interface DropdownMenuItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  onSelect: (value: string) => void;
  value?: string;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  onSelect,
  value,
  align = 'left',
  className = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg"
      >
        {trigger}
        <IconChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div
          className={`
            absolute top-full mt-1 z-50
            min-w-[180px] py-1
            bg-white dark:bg-neutral-900
            border border-neutral-200 dark:border-neutral-800
            rounded-xl shadow-lg
            animate-fade-in-up
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSelect(item.value);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2.5 text-left text-sm
                flex items-center justify-between gap-2
                hover:bg-neutral-100 dark:hover:bg-neutral-800
                transition-colors
                ${value === item.value 
                  ? 'text-brand-600 dark:text-brand-400 font-medium' 
                  : 'text-neutral-700 dark:text-neutral-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              {value === item.value && (
                <IconCheck className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DropdownMenu;