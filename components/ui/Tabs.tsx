'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className = '' }: TabsProps) {
  return (
    <div className={`w-full border-b border-neutral-200 dark:border-neutral-800 ${className}`}>
      <div className="flex overflow-x-auto hide-scrollbar snap-x">
        {items.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors snap-start
                border-b-2
                ${isActive 
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-neutral-700'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Tabs;
