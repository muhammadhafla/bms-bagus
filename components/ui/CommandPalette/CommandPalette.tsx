'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import Fuse from 'fuse.js';
import {
  IconSearch,
  IconX,
  IconArrowRight,
  IconLoader2,
  IconCornerDownLeft,
  IconPackage,
  IconAlertCircle,
  IconBook,
} from '@tabler/icons-react';
import { useCommandPaletteStore } from './useCommandPaletteStore';
import {
  ALL_COMMAND_ITEMS,
  CommandItem,
  getFilteredCommands,
  getSuggestedCommands,
  RolePermissions,
} from './commandItems';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { useDarkMode } from '@/components/DarkModeProvider';
import { useSidebarContext } from '@/components/layout/SidebarProvider';
import { inventoryApi } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { debounce, formatCurrency } from '@/lib/utils';

type SelectableItem =
  | { type: 'command'; data: CommandItem }
  | { type: 'product'; data: InventoryItem & { similarity?: number } }
  | { type: 'recovery'; action: () => void; label: string; icon: React.ElementType };

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, close, toggle } = useCommandPaletteStore();
  const { user, hasRole, hasAnyRole } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const { theme, toggleTheme } = useDarkMode();
  const { setAutoHideEnabled } = useSidebarContext();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [productResults, setProductResults] = useState<Array<InventoryItem & { similarity?: number }>>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const productSeqRef = useRef(0);

  // Keyboard shortcut: Ctrl+K or Cmd+K to toggle, Esc to close
  useHotkeys(['ctrl+k', 'meta+k'], (e) => {
    e.preventDefault();
    toggle();
  }, { enableOnFormTags: true });

  useHotkeys('escape', () => {
    if (isOpen) close();
  }, { enabled: isOpen, enableOnFormTags: true });

  // Permissions context
  const rolePermissions: RolePermissions = useMemo(() => {
    const isFinance = hasRole('finance') || isAdminUser;
    const isWarehouse = hasAnyRole(['kepala_cabang', 'staff_gudang', 'admin']);
    const isKepalaGudang = hasRole('kepala_cabang') || isAdminUser;
    const isKasir = hasRole('kasir') || isAdminUser;

    return {
      isAdminUser,
      isFinanceUser: isFinance,
      isWarehouseUser: isWarehouse,
      isKepalaGudang,
      isKasir,
    };
  }, [hasRole, hasAnyRole, isAdminUser]);

  // Allowed commands based on active user role
  const availableCommands = useMemo(() => {
    return getFilteredCommands(rolePermissions);
  }, [rolePermissions]);

  // Suggested commands for State 2 (Empty initial query)
  const suggestedCommands = useMemo(() => {
    return getSuggestedCommands(rolePermissions);
  }, [rolePermissions]);

  // Fuse.js index for instant local fuzzy matching
  const fuse = useMemo(() => {
    return new Fuse(availableCommands, {
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'keywords', weight: 0.3 },
        { name: 'subtitle', weight: 0.1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [availableCommands]);

  // Debounced product search against Supabase RPC
  const searchProductDebounced = useMemo(() => {
    return debounce(async (q: string) => {
      const seq = ++productSeqRef.current;
      if (q.trim().length < 2) {
        setProductResults([]);
        setIsSearchingProduct(false);
        return;
      }

      setIsSearchingProduct(true);
      try {
        const res = await inventoryApi.fuzzySearch(q.trim(), [], 8);
        if (seq === productSeqRef.current) {
          setProductResults(res.data || []);
        }
      } catch {
        if (seq === productSeqRef.current) {
          setProductResults([]);
        }
      } finally {
        if (seq === productSeqRef.current) {
          setIsSearchingProduct(false);
        }
      }
    }, 300);
  }, []);

  // When query changes, search products if query >= 2 chars
  useEffect(() => {
    setSelectedIndex(0);
    if (query.trim().length >= 2) {
      searchProductDebounced(query);
    } else {
      setProductResults([]);
      setIsSearchingProduct(false);
    }
  }, [query, searchProductDebounced]);

  // Filter commands by query
  const matchedCommands = useMemo(() => {
    if (!query.trim()) {
      return suggestedCommands;
    }
    return fuse.search(query).map((res) => res.item);
  }, [query, suggestedCommands, fuse]);

  // Group commands into menu vs action
  const menuCommands = useMemo(() => {
    return matchedCommands.filter((c) => c.category === 'menu');
  }, [matchedCommands]);

  const actionCommands = useMemo(() => {
    return matchedCommands.filter((c) => c.category === 'action');
  }, [matchedCommands]);

  // Check if zero results
  const isZeroResults = useMemo(() => {
    return (
      query.trim().length > 0 &&
      menuCommands.length === 0 &&
      actionCommands.length === 0 &&
      productResults.length === 0 &&
      !isSearchingProduct
    );
  }, [query, menuCommands, actionCommands, productResults, isSearchingProduct]);

  // Flatten currently visible selectable items for keyboard traversal
  const selectableItems: SelectableItem[] = useMemo(() => {
    const list: SelectableItem[] = [];

    menuCommands.forEach((cmd) => list.push({ type: 'command', data: cmd }));
    actionCommands.forEach((cmd) => list.push({ type: 'command', data: cmd }));
    productResults.forEach((prod) => list.push({ type: 'product', data: prod }));

    if (isZeroResults) {
      list.push({
        type: 'recovery',
        label: `Cari "${query}" di Katalog Lengkap`,
        icon: IconPackage,
        action: () => {
          router.push(`/inventory?search=${encodeURIComponent(query.trim())}`);
          close();
        },
      });
      list.push({
        type: 'recovery',
        label: 'Buka Pusat Bantuan & Panduan',
        icon: IconBook,
        action: () => {
          router.push('/help');
          close();
        },
      });
    }

    return list;
  }, [menuCommands, actionCommands, productResults, isZeroResults, query, router, close]);

  // Auto-focus input when opened & reset state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setProductResults([]);
      setIsSearchingProduct(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Execute an item action
  const executeItem = useCallback(
    (item: SelectableItem) => {
      if (item.type === 'command') {
        if (item.data.href) {
          router.push(item.data.href);
          close();
        } else if (item.data.perform) {
          item.data.perform({
            toggleTheme,
            isDark: theme === 'dark',
            toggleSidebar: () => setAutoHideEnabled((p) => !p),
            openLogoutModal: () => {},
            navigate: (href) => router.push(href),
          });
          close();
        }
      } else if (item.type === 'product') {
        router.push(`/inventory?search=${encodeURIComponent(item.data.nama_barang)}`);
        close();
      } else if (item.type === 'recovery') {
        item.action();
      }
    },
    [router, close, toggleTheme, theme, setAutoHideEnabled]
  );

  // Keyboard navigation inside dialog (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectableItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % selectableItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + selectableItems.length) % selectableItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = selectableItems[selectedIndex];
      if (current) {
        executeItem(current);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentPointer = -1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[10vh] sm:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={close}
        aria-hidden="true"
      />

      {/* Dialog Card Container */}
      <div
        className="relative z-10 flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl transition-all dark:border-neutral-800 dark:bg-neutral-900 animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Area */}
        <div className="relative flex items-center border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-800">
          <IconSearch className="h-5 w-5 flex-shrink-0 text-neutral-400 dark:text-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama menu, aksi, atau nama/barcode produk..."
            className="flex-1 bg-transparent px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            aria-autocomplete="list"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="Bersihkan pencarian"
            >
              <IconX className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Esc
            </kbd>
          )}
        </div>

        {/* Scrollable Results Area */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 scroll-smooth">
          {/* STATE 2: Empty initial query header */}
          {!query.trim() && (
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Pintasan yang Disarankan
            </div>
          )}

          {/* GROUP: Menu & Halaman */}
          {menuCommands.length > 0 && (
            <div className="mb-2">
              {query.trim() && (
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Halaman & Menu
                </div>
              )}
              {menuCommands.map((cmd) => {
                currentPointer++;
                const isSelected = selectedIndex === currentPointer;
                const Icon = cmd.icon;

                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-active={isSelected}
                    onClick={() => executeItem({ type: 'command', data: cmd })}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white dark:bg-brand-500'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded bg-brand-100/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 animate-in fade-in">
                        <span>Buka</span>
                        <IconCornerDownLeft className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* GROUP: Aksi Cepat */}
          {actionCommands.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Aksi Cepat
              </div>
              {actionCommands.map((act) => {
                currentPointer++;
                const isSelected = selectedIndex === currentPointer;
                const Icon = act.icon;

                return (
                  <button
                    key={act.id}
                    type="button"
                    data-active={isSelected}
                    onClick={() => executeItem({ type: 'command', data: act })}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white dark:bg-brand-500'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{act.title}</div>
                      {act.subtitle && (
                        <div className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                          {act.subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded bg-brand-100/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                        <span>Pilih</span>
                        <IconCornerDownLeft className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* GROUP: Produk & Inventaris */}
          {(productResults.length > 0 || isSearchingProduct) && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                <span>Produk & Inventaris</span>
                {isSearchingProduct && (
                  <span className="flex items-center gap-1 text-[10px] font-normal text-brand-600 dark:text-brand-400">
                    <IconLoader2 className="h-3 w-3 animate-spin" />
                    <span>Mencari di database...</span>
                  </span>
                )}
              </div>
              {productResults.map((prod) => {
                currentPointer++;
                const isSelected = selectedIndex === currentPointer;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    data-active={isSelected}
                    onClick={() => executeItem({ type: 'product', data: prod })}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100/80 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-amber-600 text-white dark:bg-amber-500'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      <IconPackage className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{prod.nama_barang}</div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                        {prod.kode_barcode && <span>#{prod.kode_barcode}</span>}
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(prod.harga_jual || 0)}
                        </span>
                        <span>•</span>
                        <span>Stok: {prod.stok ?? 0}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded bg-brand-100/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                        <span>Lihat</span>
                        <IconArrowRight className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STATE 7: Zero-Results Recovery State */}
          {isZeroResults && (
            <div className="px-3 py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 mb-3">
                <IconAlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Tidak ada hasil untuk &ldquo;{query}&rdquo;
              </h4>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Coba gunakan kata kunci lain, atau gunakan opsi pemulihan di bawah ini:
              </p>

              <div className="mt-4 space-y-1.5 text-left max-w-sm mx-auto">
                {selectableItems.map((item, idx) => {
                  if (item.type !== 'recovery') return null;
                  const isSelected = selectedIndex === idx;
                  const Icon = item.icon;

                  return (
                    <button
                      key={idx}
                      type="button"
                      data-active={isSelected}
                      onClick={item.action}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200 ring-1 ring-brand-300 dark:ring-brand-700'
                          : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <IconCornerDownLeft className="h-3 w-3 text-neutral-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* STATE 8: Footer Helper Bar */}
        <div className="flex items-center justify-between border-t border-neutral-200/80 bg-neutral-50/90 px-4 py-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 bg-white px-1 py-0.5 font-mono text-[9px] shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
                ↑↓
              </kbd>
              <span>Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 bg-white px-1 py-0.5 font-mono text-[9px] shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
                ↵
              </kbd>
              <span>Pilih</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 bg-white px-1 py-0.5 font-mono text-[9px] shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
                Esc
              </kbd>
              <span>Tutup</span>
            </span>
          </div>

          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            BMS Quick Command
          </span>
        </div>
      </div>
    </div>
  );
}
