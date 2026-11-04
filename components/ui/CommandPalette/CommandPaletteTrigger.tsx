'use client';

import React, { useEffect, useState } from 'react';
import { IconSearch, IconCommand } from '@tabler/icons-react';
import { useCommandPaletteStore } from './useCommandPaletteStore';
import Tooltip from '@/components/ui/Tooltip';

interface CommandPaletteTriggerProps {
  collapsed?: boolean;
}

export function CommandPaletteTrigger({ collapsed = false }: CommandPaletteTriggerProps) {
  const { open } = useCommandPaletteStore();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
    }
  }, []);

  if (collapsed) {
    return (
      <Tooltip content={`Cari Cepat (${isMac ? '⌘K' : 'Ctrl+K'})`} position="right" className="w-full">
        <button
          type="button"
          onClick={open}
          className="flex h-9 w-full items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          aria-label="Buka Command Palette"
        >
          <IconSearch className="h-4 w-4" />
        </button>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="group relative flex h-9 w-full items-center gap-2.5 rounded-lg border border-neutral-200/80 bg-neutral-50/80 px-2.5 text-xs text-neutral-500 shadow-sm transition-all hover:border-brand-300 hover:bg-white hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400 dark:hover:border-brand-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
      aria-label="Buka Command Palette (Ctrl+K)"
    >
      <IconSearch className="h-4 w-4 flex-shrink-0 text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
      <span className="flex-1 text-left truncate">Cari menu, aksi, atau barang...</span>
      <kbd className="inline-flex items-center gap-0.5 rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-600 shadow-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        {isMac ? (
          <>
            <IconCommand className="h-2.5 w-2.5" />
            <span>K</span>
          </>
        ) : (
          <span>Ctrl K</span>
        )}
      </kbd>
    </button>
  );
}
