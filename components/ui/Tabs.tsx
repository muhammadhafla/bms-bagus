'use client';

import React from 'react';
import { HorizontalScrollArea } from './HorizontalScrollArea';

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
      <HorizontalScrollArea className="flex snap-x">
        {items.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex snap-start items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200'
              } `}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </HorizontalScrollArea>
    </div>
  );
}

export default Tabs;
