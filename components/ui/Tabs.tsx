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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (items.length === 0) return;
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = items.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const targetTab = items[nextIndex];
      onChange(targetTab.id);
      const tabButtons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      tabButtons?.[nextIndex]?.focus();
    }
  };

  return (
    <div className={`w-full border-b border-neutral-200 dark:border-neutral-800 ${className}`}>
      <HorizontalScrollArea className="flex snap-x" role="tablist">
        {items.map((tab, index) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex snap-start items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
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
