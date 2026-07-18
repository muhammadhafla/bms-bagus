'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';

interface ResponsivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  snapPoints?: (number | string)[];
  defaultSnap?: number | string;
}

export function ResponsivePanel({
  isOpen,
  onClose,
  title,
  children,
  snapPoints,
  defaultSnap,
}: ResponsivePanelProps) {
  const [direction, setDirection] = useState<'bottom' | 'right'>('bottom');

  useEffect(() => {
    const update = () =>
      setDirection(window.innerWidth >= 1024 ? 'right' : 'bottom');
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isDesktop = direction === 'right';

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction={direction}
      snapPoints={!isDesktop ? snapPoints : undefined}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/50" />

        <Drawer.Content
          className={`
            fixed z-[101] bg-white dark:bg-neutral-950 flex flex-col
            focus:outline-none
            ${isDesktop
              ? 'top-0 right-0 h-full w-full max-w-md shadow-xl'
              : 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[92svh] pb-[env(safe-area-inset-bottom)]'
            }
          `}
        >
          {/* Drag handle — hanya di mobile */}
          {!isDesktop && (
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4
                          border-b border-neutral-200 dark:border-neutral-800 shrink-0">
            <Drawer.Title className="text-lg font-semibold text-neutral-900 dark:text-white">
              {title}
            </Drawer.Title>
          </div>

          {/* Konten scrollable */}
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
