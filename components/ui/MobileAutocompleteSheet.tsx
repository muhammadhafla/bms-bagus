'use client';

import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MobileAutocompleteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (option: string) => void;
  title?: string;
  placeholder?: string;
}

export function MobileAutocompleteSheet({
  isOpen,
  onClose,
  options,
  onSelect,
  title = 'Pilih Kategori',
  placeholder = 'Cari...',
}: MobileAutocompleteSheetProps) {
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 640px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredOptions = options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()));

  // Fallback to null if desktop or not mounted, as this is strictly for mobile
  if (!mounted || isDesktop) return null;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[110] bg-black/50" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-[111] flex h-[80vh] flex-col rounded-t-2xl bg-white outline-none dark:bg-neutral-950">
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />

          <div className="flex shrink-0 items-center justify-between px-5 pt-2 pb-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>

          <div className="shrink-0 border-b border-neutral-200 px-5 pb-3 dark:border-neutral-800">
            <div className="relative">
              <IconSearch
                className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="focus:ring-brand-500 w-full rounded-xl border-none bg-neutral-100 py-3 pr-4 pl-10 text-neutral-900 focus:ring-2 dark:bg-neutral-900 dark:text-neutral-100"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className="w-full rounded-xl px-4 py-3.5 text-left text-neutral-900 transition-colors hover:bg-neutral-100 active:bg-neutral-200 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="mt-8 px-4 text-center">
                <p className="mb-4 text-neutral-500 dark:text-neutral-400">
                  Kategori &quot;{search}&quot; tidak ditemukan.
                </p>
                {search.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(search.trim());
                      onClose();
                    }}
                    className="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 w-full rounded-xl px-4 py-3.5 font-medium"
                  >
                    Gunakan &quot;{search.trim()}&quot;
                  </button>
                )}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
