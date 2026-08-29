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
    const update = () => setDirection(window.innerWidth >= 1024 ? 'right' : 'bottom');
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
          className={`fixed z-[101] flex flex-col bg-white focus:outline-none dark:bg-neutral-950 ${
            isDesktop
              ? 'top-0 right-0 h-full w-full max-w-md shadow-xl'
              : 'right-0 bottom-0 left-0 max-h-[92svh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]'
          } `}
        >
          {/* Drag handle — hanya di mobile */}
          {!isDesktop && (
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
          )}

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2.5 sm:px-5 sm:py-3.5 dark:border-neutral-800">
            <Drawer.Title className="text-base font-semibold text-neutral-900 sm:text-lg dark:text-white truncate">
              {title}
            </Drawer.Title>
          </div>

          {/* Konten scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
