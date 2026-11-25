'use client';

import React from 'react';
import {
  IconArrowBack,
  IconX,
  IconBuildingWarehouse,
  IconAlertCircle,
} from '@tabler/icons-react';
import { SelectInput } from '@/components/ui/SelectInput';
import {
  SharedBarcodeSearch,
  SharedBarcodeSearchRef,
} from '@/components/inventory/SharedBarcodeSearch';
import { AggregatedReturnItem } from '@/lib/api/return';
import { Gudang } from '@/types/warehouse';
import { Supplier } from '@/lib/api/supplier';
import { InventoryItem } from '@/types/inventory';

interface ReturnHeaderControlsProps {
  onBack: () => void;
  selectedSupplier: Supplier | null;
  onOpenResetConfirm: () => void;
  warehouses: Gudang[];
  selectedGudangId: string;
  onGudangChange: (gudangId: string) => void;
  error: string | null;
  onDismissError: () => void;
  searchRef: React.RefObject<SharedBarcodeSearchRef | null>;
  onItemSelected: (item: InventoryItem) => void;
  aggregatedItems: AggregatedReturnItem[];
  suppliers: Supplier[];
  onSelectSupplier: (supplier: Supplier) => void;
}

export function ReturnHeaderControls({
  onBack,
  selectedSupplier,
  onOpenResetConfirm,
  warehouses,
  selectedGudangId,
  onGudangChange,
  error,
  onDismissError,
  searchRef,
  onItemSelected,
  aggregatedItems,
  suppliers,
  onSelectSupplier,
}: ReturnHeaderControlsProps) {
  return (
    <div className="animate-fade-in-up mb-4 flex-shrink-0 transition-all duration-300 lg:mb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-neutral-600 shadow-sm transition hover:bg-neutral-100 hover:text-neutral-900 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Kembali"
          >
            <IconArrowBack className="h-5 w-5" stroke={2} />
          </button>
          <div>
            <h1 className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-xl font-extrabold tracking-tight text-transparent lg:text-3xl dark:from-brand-400 dark:to-brand-200">
              Retur Pembelian
            </h1>
            <p className="text-xs font-medium text-neutral-500 lg:text-sm dark:text-neutral-400">
              Pengembalian barang rusak, cacat, atau konsinyasi ke supplier
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedSupplier && (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 shadow-sm dark:border-brand-900/40 dark:bg-brand-950/40">
              <span className="text-xs text-neutral-500">Supplier:</span>
              <span className="text-xs sm:text-sm font-bold text-brand-700 dark:text-brand-300">
                {selectedSupplier.nama}
              </span>
              <button
                type="button"
                onClick={onOpenResetConfirm}
                className="ml-1 rounded-md p-1 text-neutral-400 transition hover:bg-brand-100 hover:text-danger-500 dark:hover:bg-brand-900/60"
                title="Ganti Supplier"
                aria-label="Ganti Supplier"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          )}
          {warehouses.length > 0 && (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 px-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <IconBuildingWarehouse className="h-4 w-4 text-brand-500 shrink-0" />
              <span className="text-xs text-neutral-500 shrink-0">Gudang:</span>
              <div className="w-40 sm:w-48">
                <SelectInput
                  value={selectedGudangId}
                  onChange={onGudangChange}
                  options={warehouses.map((g) => ({
                    value: g.id,
                    label: `${g.nama}${g.is_default ? ' [Pusat]' : ''}`,
                  }))}
                  inputSize="sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs sm:text-sm text-danger-700 dark:border-danger-800/60 dark:bg-danger-950/40 dark:text-danger-300">
          <IconAlertCircle className="h-5 w-5 shrink-0 text-danger-500" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Tutup pesan error"
            className="text-danger-400 hover:text-danger-600"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SharedBarcodeSearch
            ref={searchRef}
            onItemSelected={onItemSelected}
            placeholder={
              selectedSupplier
                ? `Cari nama atau scan barcode barang dari ${selectedSupplier.nama}...`
                : 'Scan barcode atau ketik nama barang (Auto-detect supplier)...'
            }
            icon="scan"
            filterPredicate={
              selectedSupplier
                ? (item) => aggregatedItems.some((agg) => agg.inventory_id === item.id)
                : undefined
            }
          />
        </div>

        {!selectedSupplier && suppliers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">
              Atau pilih manual:
            </span>
            <div className="w-56">
              <SelectInput
                value=""
                onChange={(val) => {
                  const sup = suppliers.find((s) => s.id === val);
                  if (sup) onSelectSupplier(sup);
                }}
                options={suppliers.map((s) => ({ value: s.id, label: s.nama }))}
                placeholder="Pilih Supplier..."
                inputSize="md"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
