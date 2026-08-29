'use client';

import React from 'react';
import {
  IconRefresh,
  IconDeviceFloppy,
  IconSend,
  IconTruckDelivery,
  IconChevronRight,
  IconArrowRight,
} from '@tabler/icons-react';
import { Button, Modal, TextInput } from '@/components/ui';
import DateInput from '@/components/ui/DateInput';

interface TransferCheckoutPanelProps {
  totalItems: number;
  totalQty: number;
  gudangAsalNama: string;
  gudangTujuanNama: string;
  submitting: boolean;
  onReset: () => void;
  onSaveDraft: () => void;
  onSaveAndSend: () => void;
  isBottomSheetOpen: boolean;
  setIsBottomSheetOpen: (open: boolean) => void;
  kurir: string;
  setKurir: (val: string) => void;
  catatan: string;
  setCatatan: (val: string) => void;
  tanggalKirim: string;
  setTanggalKirim: (val: string) => void;
}

export function TransferCheckoutPanel({
  totalItems,
  totalQty,
  gudangAsalNama,
  gudangTujuanNama,
  submitting,
  onReset,
  onSaveDraft,
  onSaveAndSend,
  isBottomSheetOpen,
  setIsBottomSheetOpen,
  kurir,
  setKurir,
  catatan,
  setCatatan,
  tanggalKirim,
  setTanggalKirim,
}: TransferCheckoutPanelProps) {
  return (
    <>
      {/* Desktop Sticky Footer Section */}
      <div className="relative bottom-0 hidden flex-shrink-0 lg:block">
        <div className="shadow-elevated rounded-3xl border border-white/40 bg-white/85 p-4 backdrop-blur-xl lg:p-5 dark:border-white/10 dark:bg-neutral-900/85">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Left metrics */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/50 min-w-[130px]">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Macam Item
                </p>
                <p className="mt-0.5 text-xl font-black text-neutral-900 lg:text-2xl dark:text-white">
                  {totalItems}{' '}
                  <span className="text-xs font-medium text-neutral-500">jenis</span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/50 min-w-[140px]">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Total Muatan
                </p>
                <p className="mt-0.5 text-xl font-black text-brand-600 lg:text-2xl dark:text-brand-400">
                  {totalQty}{' '}
                  <span className="text-xs font-medium text-neutral-500">pcs</span>
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/40 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/50">
                <div className="text-xs">
                  <span className="font-semibold text-neutral-500 block">Rute Transfer:</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-neutral-800 dark:text-neutral-200">
                    <span>{gudangAsalNama || 'Gudang Asal'}</span>
                    <IconChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-brand-600 dark:text-brand-400">
                      {gudangTujuanNama || 'Gudang Tujuan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              {/* Reset F6 */}
              <div className="group relative">
                <span className="pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 group-hover:block sm:block dark:bg-neutral-700 dark:text-neutral-300">
                  F6
                </span>
                <Button
                  variant="secondary"
                  onClick={onReset}
                  disabled={totalItems === 0 || submitting}
                  className="border-white/40 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/50"
                  leftIcon={<IconRefresh className="h-5 w-5" />}
                >
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>

              {/* Simpan Draft */}
              <Button
                variant="secondary"
                onClick={onSaveDraft}
                disabled={totalItems === 0 || submitting}
                loading={submitting}
                className="border-white/40 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/50"
                leftIcon={<IconDeviceFloppy className="h-5 w-5" />}
              >
                Simpan Draft
              </Button>

              {/* Simpan & Kirim F9 */}
              <div className="group relative">
                <span className="bg-brand-200 dark:bg-brand-900 text-brand-700 dark:text-brand-300 pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded px-1.5 py-0.5 text-[10px] font-bold group-hover:block sm:block">
                  F9
                </span>
                <Button
                  onClick={onSaveAndSend}
                  disabled={totalItems === 0 || submitting}
                  loading={submitting}
                  variant="primary"
                  size="lg"
                  className="shadow-brand px-6 sm:px-8"
                  leftIcon={<IconSend className="h-5 w-5" />}
                >
                  <span className="hidden sm:inline">Simpan & Langsung Kirim</span>
                  <span className="sm:hidden">Kirim</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Mini Action Bar */}
      <div className="fixed right-0 bottom-0 left-0 z-[40] rounded-t-3xl border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 lg:hidden dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div
          className={`flex h-[4.5rem] cursor-pointer items-center justify-between px-4 transition-opacity ${
            totalItems === 0
              ? 'pointer-events-none opacity-50'
              : 'rounded-t-3xl opacity-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          }`}
          onClick={() => setIsBottomSheetOpen(true)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-brand-50 dark:bg-brand-900/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <IconTruckDelivery className="text-brand-600 dark:text-brand-400" size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500">
                {totalItems} Item ({totalQty} Pcs)
              </p>
              <p className="text-brand-600 dark:text-brand-400 text-sm font-bold truncate max-w-[200px]">
                {gudangAsalNama} &rarr; {gudangTujuanNama}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 pr-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
            <span>Kirim</span>
            <IconArrowRight size={18} />
          </div>
        </div>
      </div>

      {/* Mobile Vaul Bottom Sheet Modal */}
      <Modal
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        isBottomSheetOnMobile
        title="Ringkasan Transfer Stok"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-800/50 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">Gudang Asal:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {gudangAsalNama || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Gudang Tujuan:</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {gudangTujuanNama || '-'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500">Total Muatan:</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {totalItems} item ({totalQty} pcs)
              </span>
            </div>
          </div>

          <DateInput
            label="Tanggal Dokumen"
            value={tanggalKirim}
            onChange={setTanggalKirim}
            inputSize="md"
          />

          <TextInput
            label="Kurir / Driver / Armada"
            value={kurir}
            onChange={(e) => setKurir(e.target.value)}
            placeholder="Contoh: Pak Budi / Mobil Pickup"
            inputSize="md"
          />

          <TextInput
            label="Catatan Pengiriman"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Restock etalase Toko 2"
            inputSize="md"
          />

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={onSaveDraft}
              disabled={totalItems === 0 || submitting}
              loading={submitting}
              className="flex-1"
              leftIcon={<IconDeviceFloppy size={18} />}
            >
              Simpan Draft
            </Button>
            <Button
              variant="primary"
              onClick={onSaveAndSend}
              disabled={totalItems === 0 || submitting}
              loading={submitting}
              className="flex-1 shadow-brand"
              leftIcon={<IconSend size={18} />}
            >
              Kirim Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
