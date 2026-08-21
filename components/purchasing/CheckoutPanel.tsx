'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { IconRefresh, IconDeviceFloppy, IconShoppingCart, IconArrowRight } from '@tabler/icons-react';
import { Button, Modal, TextInput } from '@/components/ui';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { PriceInput } from '@/components/ui/PriceInput';
import { Supplier } from '@/lib/api';

interface CheckoutPanelProps {
  totalSistem: number;
  totalSupplier: number;
  selisih: number;
  isValid: boolean;
  setShowResetConfirm: (show: boolean) => void;
  handleSimpan: () => void;
  submitting: boolean;
  itemsCount: number;
  editId: string | null;
  isBottomSheetOpen: boolean;
  setIsBottomSheetOpen: (open: boolean) => void;
  tanggal: string;
  setTanggal: (val: string) => void;
  nomorNota: string;
  setNomorNota: (val: string) => void;
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null) => void;
  setSupplierName: (name: string) => void;
  supplierList: Supplier[];
  setTotalSupplier: (val: number) => void;
}

export function CheckoutPanel({
  totalSistem,
  totalSupplier,
  selisih,
  isValid,
  setShowResetConfirm,
  handleSimpan,
  submitting,
  itemsCount,
  editId,
  isBottomSheetOpen,
  setIsBottomSheetOpen,
  tanggal,
  setTanggal,
  nomorNota,
  setNomorNota,
  selectedSupplierId,
  setSelectedSupplierId,
  setSupplierName,
  supplierList,
  setTotalSupplier,
}: CheckoutPanelProps) {
  return (
    <>
      {/* Desktop Footer Section */}
      <div className="relative bottom-0 hidden flex-shrink-0 xl:block">
        <div className="shadow-elevated rounded-3xl border border-white/40 bg-white/80 p-4 backdrop-blur-xl lg:p-5 dark:border-white/10 dark:bg-neutral-900/80">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 text-center shadow-sm backdrop-blur-md lg:rounded-2xl lg:px-5 lg:py-4 lg:text-left dark:border-white/10 dark:bg-neutral-950/50">
                <p className="text-[10px] font-medium whitespace-nowrap text-neutral-500 sm:text-xs lg:text-sm dark:text-neutral-400">
                  Total Sistem
                </p>
                <p className="mt-0.5 text-sm font-black text-neutral-900 sm:text-xl lg:text-2xl dark:text-white">
                  {formatCurrency(totalSistem)}
                </p>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 text-center shadow-sm backdrop-blur-md lg:rounded-2xl lg:px-5 lg:py-4 lg:text-left dark:border-white/10 dark:bg-neutral-950/50">
                <p className="text-[10px] font-medium whitespace-nowrap text-neutral-500 sm:text-xs lg:text-sm dark:text-neutral-400">
                  Total Tagihan
                </p>
                <p className="mt-0.5 text-sm font-black text-neutral-900 sm:text-xl lg:text-2xl dark:text-white">
                  {formatCurrency(totalSupplier)}
                </p>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 text-center shadow-sm backdrop-blur-md lg:rounded-2xl lg:px-5 lg:py-4 lg:text-left dark:border-white/10 dark:bg-neutral-950/50">
                <p className="text-[10px] font-medium whitespace-nowrap text-neutral-500 sm:text-xs lg:text-sm dark:text-neutral-400">
                  Selisih
                </p>
                <p
                  className={`mt-0.5 text-sm font-black sm:text-xl lg:text-2xl ${
                    isValid ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(selisih)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <div className="group relative">
                <span className="pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 group-hover:block sm:block dark:bg-neutral-700 dark:text-neutral-300">
                  F6
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setShowResetConfirm(true)}
                  className="border-white/40 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/50"
                  leftIcon={<IconRefresh className="h-5 w-5" />}
                >
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>
              <div className="group relative">
                <span className="bg-brand-200 dark:bg-brand-900 text-brand-700 dark:text-brand-300 pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded px-1.5 py-0.5 text-[10px] font-bold group-hover:block sm:block">
                  F9
                </span>
                <Button
                  onClick={handleSimpan}
                  disabled={itemsCount === 0 || submitting}
                  variant="primary"
                  size="lg"
                  className="shadow-brand px-8"
                  leftIcon={<IconDeviceFloppy className="h-5 w-5" />}
                >
                  <span className="hidden sm:inline">
                    {submitting ? 'Menyimpan...' : editId ? 'Simpan Revisi' : 'Simpan Pembelian'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Mini Cart (Trigger) */}
      <div className="fixed right-0 bottom-0 left-0 z-[40] rounded-t-3xl border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 xl:hidden dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div
          className={`flex h-[4.5rem] cursor-pointer items-center justify-between px-4 transition-opacity ${
            itemsCount === 0
              ? 'pointer-events-none opacity-50'
              : 'rounded-t-3xl opacity-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          }`}
          onClick={() => setIsBottomSheetOpen(true)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-brand-50 dark:bg-brand-900/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <IconShoppingCart className="text-brand-600 dark:text-brand-400" size={20} />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] leading-tight font-medium text-neutral-500 dark:text-neutral-400">
                Total Sistem
              </p>
              <p className="text-brand-600 dark:text-brand-400 text-lg leading-tight font-black">
                {formatCurrency(totalSistem)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 pr-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">
            <span>Checkout</span>
            <IconArrowRight size={18} />
          </div>
        </div>
      </div>

      {/* Vaul Bottom Sheet for Checkout Details */}
      <Modal
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        isBottomSheetOnMobile
        title="Selesaikan Pembelian"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <DateInput label="Tanggal" value={tanggal} onChange={setTanggal} inputSize="md" />

            <div>
              <TextInput
                label="Nomor Nota (Opsional)"
                value={nomorNota}
                onChange={(e) => setNomorNota(e.target.value)}
                placeholder="Contoh: INV-2023001"
                inputSize="md"
              />
            </div>

            <SelectInput
              label="Supplier"
              value={selectedSupplierId || ''}
              onChange={(id) => {
                const s = supplierList.find((x) => x.id === id);
                setSelectedSupplierId(id || null);
                setSupplierName(s ? s.nama : '');
              }}
              options={(Array.isArray(supplierList) ? supplierList : []).map((s) => ({
                value: s.id,
                label: s.nama + (s.kontak ? ` (${s.kontak})` : ''),
              }))}
              placeholder="-- Pilih Supplier --"
            />

            <PriceInput
              label="Total Tagihan"
              value={totalSupplier || 0}
              onChange={setTotalSupplier}
              className="w-full transition-all focus:outline-none"
              placeholder="0"
              min={0}
            />

            <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Selisih
              </span>
              <span
                className={`text-lg font-black ${
                  isValid ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatCurrency(selisih)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <div className="relative flex-1">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsBottomSheetOpen(false);
                  setShowResetConfirm(true);
                }}
                className="w-full"
                leftIcon={<IconRefresh size={18} />}
              >
                Reset
              </Button>
            </div>
            <div className="relative flex-1">
              <Button
                onClick={handleSimpan}
                disabled={itemsCount === 0 || submitting}
                variant="primary"
                className="shadow-brand w-full"
                leftIcon={<IconDeviceFloppy size={18} />}
              >
                {editId ? 'Simpan Revisi' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
