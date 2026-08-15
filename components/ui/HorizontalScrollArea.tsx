'use client';

import React, { useRef, useEffect } from 'react';

export interface HorizontalScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function HorizontalScrollArea({
  children,
  className = '',
  ...props
}: HorizontalScrollAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stopPropagation = (e: Event) => {
      // Menghentikan propagasi event native agar tidak memicu JS PullToRefresh
      // dari library pihak ketiga yang menggunakan native event listeners.
      e.stopPropagation();
    };

    // Gunakan capture: true untuk memastikan event dicegat sebelum sampai ke listener PullToRefresh
    const options = { passive: true, capture: true };

    el.addEventListener('touchstart', stopPropagation, options);
    el.addEventListener('touchmove', stopPropagation, options);
    el.addEventListener('touchend', stopPropagation, options);

    el.addEventListener('pointerdown', stopPropagation, options);
    el.addEventListener('pointermove', stopPropagation, options);
    el.addEventListener('pointerup', stopPropagation, options);

    return () => {
      el.removeEventListener('touchstart', stopPropagation, options);
      el.removeEventListener('touchmove', stopPropagation, options);
      el.removeEventListener('touchend', stopPropagation, options);

      el.removeEventListener('pointerdown', stopPropagation, options);
      el.removeEventListener('pointermove', stopPropagation, options);
      el.removeEventListener('pointerup', stopPropagation, options);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`hide-scrollbar touch-pan-x overflow-x-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default HorizontalScrollArea;
