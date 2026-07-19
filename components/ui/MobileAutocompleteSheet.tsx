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

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Fallback to null if desktop or not mounted, as this is strictly for mobile
  if (!mounted || isDesktop) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[110]" />
        <Drawer.Content className="bg-white dark:bg-neutral-950 flex flex-col rounded-t-2xl fixed bottom-0 left-0 right-0 z-[111] h-[80vh] outline-none">
          <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />
          
          <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-neutral-100"
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
                  className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 active:bg-neutral-200 dark:active:bg-neutral-800 transition-colors"
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="text-center mt-8 px-4">
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  Kategori &quot;{search}&quot; tidak ditemukan.
                </p>
                {search.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(search.trim());
                      onClose();
                    }}
                    className="w-full px-4 py-3.5 bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 rounded-xl font-medium"
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
