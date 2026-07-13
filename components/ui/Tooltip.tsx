'use client';

import { useState, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const positionClasses = {
  top: {
    panel: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700'
  },
  right: {
    panel: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-neutral-700'
  },
  bottom: {
    panel: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900 dark:border-b-neutral-700'
  },
  left: {
    panel: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-neutral-900 dark:border-l-neutral-700'
  }
};

export default function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [show, setShow] = useState(false);
  const classes = positionClasses[position] || positionClasses.top;

  return (
    <div 
      className={`relative inline-block ${className || ''}`.trim()}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute z-50 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in ${classes.panel}`}>
          {content}
          <div className={`absolute ${classes.arrow}`} />
        </div>
      )}
    </div>
  );
}
