'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { IconScan, IconPlus, IconBarcode } from '@tabler/icons-react';
import { inventoryApi } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { debounce, normalizeBarcode } from '@/lib/utils';

export interface SharedBarcodeSearchProps {
  onItemSelected: (item: InventoryItem & { similarity?: number }) => void;
  allowCreateNew?: boolean;
  onCreateNew?: (barcode: string) => void;
  disabled?: boolean;
  placeholder?: string;
  icon?: 'scan' | 'barcode';
  filterPredicate?: (item: InventoryItem) => boolean;
}

export function SharedBarcodeSearch({
  onItemSelected,
  allowCreateNew = false,
  onCreateNew,
  disabled = false,
  placeholder = 'Cari atau scan barcode...',
  icon = 'scan',
  filterPredicate,
}: SharedBarcodeSearchProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [inventorySearchResults, setInventorySearchResults] = useState<
    Array<InventoryItem & { similarity: number }>
  >([]);
  const [loading, setLoading] = useState(false);

  const searchSeqRef = useRef(0);
  const isProcessingBarcodeRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Expose focus to parent if needed, but for now we auto-focus on mount
  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (searchSelectedIndex >= 0) {
      const el = document.getElementById(`shared-search-item-${searchSelectedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [searchSelectedIndex]);

  const handleSearchInventory = useCallback(async (query: string) => {
    const seq = ++searchSeqRef.current;
    if (query.length < 2) {
      setInventorySearchResults([]);
      setShowAddDropdown(false);
      setSearchSelectedIndex(-1);
      return;
    }
    const result = await inventoryApi.fuzzySearch(query, []);
    if (seq !== searchSeqRef.current) return;

    if (!result.error && result.data) {
      let filtered = result.data;
      if (filterPredicate) {
        filtered = filtered.filter(filterPredicate);
      }
      setInventorySearchResults(filtered);
      setShowAddDropdown(filtered.length > 0);
    }
  }, [filterPredicate]);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => handleSearchInventory(query), 300),
    [handleSearchInventory]
  );

  const handleCreateNewFromInput = useCallback(() => {
    if (!allowCreateNew || !onCreateNew) return;
    setShowAddDropdown(false);
    const normalized = normalizeBarcode(barcodeInput);
    onCreateNew(normalized || barcodeInput);
  }, [allowCreateNew, onCreateNew, barcodeInput]);

  const handleBarcodeSubmit = useCallback(
    async (input: string) => {
      if (loading || disabled || isProcessingBarcodeRef.current) return;

      const normalized = normalizeBarcode(input);
      if (!normalized) return;

      isProcessingBarcodeRef.current = true;
      setLoading(true);

      try {
        const exactResult = await inventoryApi.getByExactBarcode(normalized);

        if (exactResult.data) {
          if (!filterPredicate || filterPredicate(exactResult.data)) {
            onItemSelected(exactResult.data);
            setBarcodeInput('');
            setShowAddDropdown(false);
            return;
          }
        }

        const fuzzyResult = await inventoryApi.fuzzySearch(normalized, []);

        if (fuzzyResult.data && fuzzyResult.data.length > 0) {
          let fuzzyItems = fuzzyResult.data;
          if (filterPredicate) fuzzyItems = fuzzyItems.filter(filterPredicate);
          
          const exactMatch = fuzzyItems.find((item) => item.similarity === 100);
          if (exactMatch) {
            onItemSelected(exactMatch);
            setBarcodeInput('');
            setShowAddDropdown(false);
            return;
          }
        }

        if (allowCreateNew && onCreateNew) {
          onCreateNew(normalized);
        }
      } catch (err) {
        console.error('Error searching barcode:', err);
      } finally {
        isProcessingBarcodeRef.current = false;
        setLoading(false);
        focusInput();
      }
    },
    [loading, disabled, allowCreateNew, onCreateNew, onItemSelected, focusInput, filterPredicate]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleBarcodeSubmit(barcodeInput);
      }}
      className="relative flex-1"
    >
      <div className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-neutral-400">
        {icon === 'scan' ? <IconScan size={22} /> : <IconBarcode size={22} />}
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={barcodeInput}
        onChange={(e) => {
          setBarcodeInput(e.target.value);
          setSearchSelectedIndex(-1);
          debouncedSearch(e.target.value);
        }}
        onFocus={() => {
          if (barcodeInput.length >= 2) setShowAddDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => setShowAddDropdown(false), 200);
        }}
        onKeyDown={(e) => {
          if (!showAddDropdown) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSearchSelectedIndex((prev) =>
              Math.min(
                prev + 1,
                inventorySearchResults.length - (allowCreateNew ? 0 : 1)
              )
            );
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSearchSelectedIndex((prev) => Math.max(prev - 1, -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey && allowCreateNew) {
              handleCreateNewFromInput();
            } else if (
              searchSelectedIndex >= 0 &&
              searchSelectedIndex < inventorySearchResults.length
            ) {
              onItemSelected(inventorySearchResults[searchSelectedIndex]);
              setBarcodeInput('');
              setShowAddDropdown(false);
            } else if (
              searchSelectedIndex === inventorySearchResults.length &&
              allowCreateNew
            ) {
              handleCreateNewFromInput();
            } else {
              handleBarcodeSubmit(barcodeInput);
            }
          }
        }}
        disabled={loading || disabled}
        className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-white py-3.5 pr-4 pl-12 text-base shadow-sm backdrop-blur-md transition-all focus:ring-2 focus:outline-none focus:ring-inset lg:text-lg dark:border-neutral-700 dark:bg-neutral-900"
        autoFocus
      />
      {showAddDropdown && barcodeInput.length >= 2 && (
        <div className="absolute z-20 mt-2 max-h-[40vh] w-full scroll-pb-16 overflow-auto rounded-xl border border-neutral-200 bg-white shadow-xl md:max-h-80 dark:border-neutral-700 dark:bg-neutral-900">
          {inventorySearchResults.map((inventory, idx) => (
            <button
              key={inventory.id}
              id={`shared-search-item-${idx}`}
              type="button"
              onClick={() => {
                onItemSelected(inventory);
                setBarcodeInput('');
                setShowAddDropdown(false);
              }}
              className={`flex w-full items-center justify-between border-b border-neutral-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800 ${
                searchSelectedIndex === idx ? 'bg-neutral-50 dark:bg-neutral-800' : ''
              }`}
            >
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {inventory.nama_barang}
                  </span>
                  {inventory.is_discontinued && (
                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      Discontinue
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {inventory.kode_barcode || 'Tanpa barcode'} | Stok: {inventory.stok}
                </div>
              </div>
              {inventory.similarity !== undefined && (
                <div className="bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 ml-2 rounded-full px-2 py-1 text-xs whitespace-nowrap">
                  {inventory.similarity}% cocok
                </div>
              )}
            </button>
          ))}

          {/* Tambah Baru Action - Only shown if allowCreateNew is true */}
          {allowCreateNew && onCreateNew && (
            <div className="sticky bottom-0 border-t border-neutral-100 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
              <button
                id={`shared-search-item-${inventorySearchResults.length}`}
                type="button"
                onClick={handleCreateNewFromInput}
                className={`bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-300 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  searchSelectedIndex === inventorySearchResults.length
                    ? 'ring-brand-500 ring-2'
                    : ''
                }`}
              >
                <IconPlus size={18} />
                <span className="flex-1 text-left">
                  Tambah &quot;{barcodeInput}&quot; sebagai barang baru
                </span>
                <kbd className="bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 hidden rounded-md border px-2 py-0.5 text-[10px] font-semibold sm:inline-block">
                  Shift + Enter
                </kbd>
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
