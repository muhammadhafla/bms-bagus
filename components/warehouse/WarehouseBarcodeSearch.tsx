'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { IconScan, IconBarcode, IconAlertCircle } from '@tabler/icons-react';
import { inventoryApi } from '@/lib/api';
import { supabase } from '@/lib/api/client';
import { InventoryItem } from '@/types/inventory';
import { debounce, normalizeBarcode } from '@/lib/utils';
import { Badge } from '@/components/ui';

export interface WarehouseSearchResultItem {
  inventory_id: string;
  nama_barang: string;
  kode_barcode: string;
  unit: string;
  stok_tersedia: number;
  rak_lokasi?: string | null;
  similarity?: number;
}

export interface WarehouseBarcodeSearchProps {
  gudangAsalId: string;
  onItemSelected: (item: WarehouseSearchResultItem) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface WarehouseBarcodeSearchRef {
  clearInput: () => void;
  focus: () => void;
}

export const WarehouseBarcodeSearch = React.forwardRef<
  WarehouseBarcodeSearchRef,
  WarehouseBarcodeSearchProps
>(({ gudangAsalId, onItemSelected, disabled = false, placeholder = 'Scan barcode atau cari nama barang di gudang asal...' }, ref) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [searchResults, setSearchResults] = useState<WarehouseSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const searchSeqRef = useRef(0);
  const isProcessingBarcodeRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  React.useImperativeHandle(ref, () => ({
    clearInput: () => {
      setBarcodeInput('');
      setShowDropdown(false);
      setSearchSelectedIndex(-1);
    },
    focus: focusInput,
  }));

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (searchSelectedIndex >= 0) {
      const el = document.getElementById(`warehouse-search-item-${searchSelectedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [searchSelectedIndex]);

  // Fetch stocks in specific warehouse for the given items
  const enrichWithWarehouseStock = useCallback(
    async (items: Array<InventoryItem & { similarity?: number }>): Promise<WarehouseSearchResultItem[]> => {
      if (!gudangAsalId || items.length === 0) {
        return items.map((it) => ({
          inventory_id: it.id,
          nama_barang: it.nama_barang,
          kode_barcode: it.kode_barcode || '',
          unit: it.unit || 'pcs',
          stok_tersedia: 0,
          rak_lokasi: null,
          similarity: it.similarity,
        }));
      }

      const itemIds = items.map((it) => it.id);
      const { data: stocksData } = await supabase
        .from('inventory_stocks')
        .select('inventory_id, stok, rak_lokasi')
        .eq('gudang_id', gudangAsalId)
        .in('inventory_id', itemIds);

      const stockMap = new Map<string, { stok: number; rak_lokasi?: string | null }>();
      (stocksData || []).forEach((row: any) => {
        stockMap.set(row.inventory_id, {
          stok: row.stok || 0,
          rak_lokasi: row.rak_lokasi,
        });
      });

      return items.map((it) => {
        const stockInfo = stockMap.get(it.id);
        return {
          inventory_id: it.id,
          nama_barang: it.nama_barang,
          kode_barcode: it.kode_barcode || '',
          unit: it.unit || 'pcs',
          stok_tersedia: stockInfo ? stockInfo.stok : 0,
          rak_lokasi: stockInfo?.rak_lokasi || null,
          similarity: it.similarity,
        };
      });
    },
    [gudangAsalId],
  );

  const handleSearch = useCallback(
    async (query: string) => {
      const seq = ++searchSeqRef.current;
      const cleanQuery = query.trim();

      if (cleanQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchSelectedIndex(-1);
        return;
      }

      setLoading(true);
      try {
        const result = await inventoryApi.fuzzySearch(cleanQuery, [], 15);
        if (seq !== searchSeqRef.current) return;

        if (!result.error && result.data) {
          const activeItems = result.data.filter((it) => !it.is_discontinued);
          const enriched = await enrichWithWarehouseStock(activeItems);
          if (seq !== searchSeqRef.current) return;

          setSearchResults(enriched);
          setShowDropdown(enriched.length > 0);
        }
      } catch (err) {
        console.error('Error during warehouse fuzzy search:', err);
      } finally {
        if (seq === searchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [enrichWithWarehouseStock],
  );

  const debouncedSearch = useMemo(
    () => debounce((query: string) => handleSearch(query), 250),
    [handleSearch],
  );

  const handleBarcodeSubmit = useCallback(
    async (input: string) => {
      if (loading || disabled || isProcessingBarcodeRef.current) return;

      const normalized = normalizeBarcode(input);
      if (!normalized) return;

      isProcessingBarcodeRef.current = true;
      setLoading(true);

      try {
        const exactResult = await inventoryApi.getByExactBarcode(normalized);

        if (exactResult.data && !exactResult.data.is_discontinued) {
          const enriched = await enrichWithWarehouseStock([exactResult.data]);
          if (enriched.length > 0) {
            onItemSelected(enriched[0]);
            setBarcodeInput('');
            setShowDropdown(false);
            return;
          }
        }

        const fuzzyResult = await inventoryApi.fuzzySearch(normalized, [], 10);
        if (fuzzyResult.data && fuzzyResult.data.length > 0) {
          const active = fuzzyResult.data.filter((it) => !it.is_discontinued);
          const exactMatch = active.find((it) => it.similarity === 100);
          if (exactMatch) {
            const enriched = await enrichWithWarehouseStock([exactMatch]);
            if (enriched.length > 0) {
              onItemSelected(enriched[0]);
              setBarcodeInput('');
              setShowDropdown(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error submitting barcode:', err);
      } finally {
        isProcessingBarcodeRef.current = false;
        setLoading(false);
        focusInput();
      }
    },
    [loading, disabled, enrichWithWarehouseStock, onItemSelected, focusInput],
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
        <IconScan size={22} />
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
          if (barcodeInput.length >= 2 && searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 250);
        }}
        onKeyDown={(e) => {
          if (!showDropdown || searchResults.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSearchSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSearchSelectedIndex((prev) => Math.max(prev - 1, -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchSelectedIndex >= 0 && searchSelectedIndex < searchResults.length) {
              const selected = searchResults[searchSelectedIndex];
              if (selected.stok_tersedia > 0) {
                onItemSelected(selected);
                setBarcodeInput('');
                setShowDropdown(false);
              }
            } else {
              handleBarcodeSubmit(barcodeInput);
            }
          } else if (e.key === 'Escape') {
            setShowDropdown(false);
          }
        }}
        disabled={loading || disabled}
        className="focus:ring-brand-500 w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pr-10 pl-12 text-base shadow-sm backdrop-blur-md transition-all focus:ring-2 focus:outline-none focus:ring-inset lg:text-lg dark:border-neutral-700 dark:bg-neutral-900"
        autoFocus
      />

      {loading && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-neutral-400">
          Mencari...
        </div>
      )}

      {showDropdown && barcodeInput.length >= 2 && (
        <div className="absolute z-30 mt-2 max-h-[45vh] w-full overflow-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl md:max-h-80 dark:border-neutral-700 dark:bg-neutral-900">
          {searchResults.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">
              Tidak ada barang yang cocok dengan &quot;{barcodeInput}&quot;
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isZeroStock = item.stok_tersedia <= 0;
              const isSelected = searchSelectedIndex === idx;

              return (
                <button
                  key={item.inventory_id}
                  id={`warehouse-search-item-${idx}`}
                  type="button"
                  disabled={isZeroStock}
                  onClick={() => {
                    if (!isZeroStock) {
                      onItemSelected(item);
                      setBarcodeInput('');
                      setShowDropdown(false);
                      focusInput();
                    }
                  }}
                  className={`flex w-full items-center justify-between border-b border-neutral-100 px-4 py-3 text-left transition-colors last:border-0 ${
                    isZeroStock
                      ? 'cursor-not-allowed opacity-50 bg-neutral-50/50 dark:bg-neutral-900/30'
                      : isSelected
                      ? 'bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex flex-col text-left flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {item.nama_barang}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{item.kode_barcode || 'Tanpa barcode'}</span>
                      {item.rak_lokasi && (
                        <>
                          <span>•</span>
                          <span>Rak: {item.rak_lokasi}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.similarity !== undefined && item.similarity < 100 && (
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {item.similarity}% cocok
                      </span>
                    )}

                    <div className="text-right">
                      {isZeroStock ? (
                        <Badge variant="danger" size="sm">
                          Stok: 0 (Kosong)
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Stok Asal: {item.stok_tersedia} {item.unit}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </form>
  );
});

WarehouseBarcodeSearch.displayName = 'WarehouseBarcodeSearch';
