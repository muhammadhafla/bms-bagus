'use client';

import React from 'react';
import {
  IconCheck,
  IconBuildingWarehouse,
  IconChevronDown,
} from '@tabler/icons-react';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { Button } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { Gudang } from '@/types/warehouse';
import { TransferTabStatus } from '../_hooks/useWarehouseTransfers';

interface TransferFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TransferTabStatus;
  onTabChange: (tab: TransferTabStatus) => void;
  isRestrictedBranchUser: boolean;
  userAssignedWarehouse: Gudang | null;
  warehouses: Gudang[];
  selectedGudangId: string;
  onSelectGudang: (val: string) => void;
  dateFilterPreset: 'all' | 'today' | '7days' | '30days' | 'custom';
  onApplyDatePreset: (preset: 'all' | 'today' | '7days' | '30days') => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onResetFilters: () => void;
  onApply: () => void;
}

export function TransferFilterPanel({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  isRestrictedBranchUser,
  userAssignedWarehouse,
  warehouses,
  selectedGudangId,
  onSelectGudang,
  dateFilterPreset,
  onApplyDatePreset,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetFilters,
  onApply,
}: TransferFilterPanelProps) {
  return (
    <ResponsivePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Dokumen Transfer"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Status Transfer
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'IN_TRANSIT', label: 'Dalam Pengiriman' },
              { id: 'DRAFT', label: 'Draft / Permintaan' },
              { id: 'RECEIVED', label: 'Selesai Diterima' },
              { id: 'CANCELED', label: 'Dibatalkan' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onTabChange(st.id as TransferTabStatus)}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                  activeTab === st.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                }`}
              >
                <span className="text-xs font-medium sm:text-sm">{st.label}</span>
                {activeTab === st.id && <IconCheck size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="filter-gudang-select"
            className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
          >
            Gudang Cabang Penugasan
          </label>
          {isRestrictedBranchUser ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
              <IconBuildingWarehouse
                size={18}
                className="shrink-0 text-brand-600 dark:text-brand-400"
              />
              <div>
                <div className="font-bold">
                  {userAssignedWarehouse?.nama || 'Cabang Tugas'}
                </div>
                <div className="text-[11px] font-normal text-neutral-500">
                  Data mutasi otomatis dibatasi hanya untuk transfer masuk & keluar cabang ini.
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <select
                id="filter-gudang-select"
                value={selectedGudangId}
                onChange={(e) => onSelectGudang(e.target.value)}
                className="w-full appearance-none rounded-xl border border-neutral-200/80 bg-white py-2.5 pl-9 pr-8 text-xs font-medium text-neutral-800 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <option value="">Semua Gudang</option>
                {warehouses.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} ({g.kode_gudang})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconBuildingWarehouse size={16} />
              </div>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconChevronDown size={14} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Rentang Tanggal Pembuatan / Kirim
          </label>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all', label: 'Semua Waktu' },
              { id: 'today', label: 'Hari Ini' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: '30days', label: '30 Hari Terakhir' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onApplyDatePreset(
                    preset.id as 'all' | 'today' | '7days' | '30days',
                  )
                }
                className={`rounded-xl border px-3 py-2 text-center text-xs font-medium transition-all ${
                  dateFilterPreset === preset.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-2 sm:grid-cols-2 dark:border-neutral-800">
            <div>
              <DateInput
                label="Dari Tanggal"
                value={startDate}
                onChange={onStartDateChange}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <DateInput
                label="Sampai Tanggal"
                value={endDate}
                onChange={onEndDateChange}
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Button
            variant="secondary"
            className="w-1/2"
            onClick={onResetFilters}
          >
            Reset Filter
          </Button>
          <Button variant="primary" className="w-1/2" onClick={onApply}>
            Terapkan
          </Button>
        </div>
      </div>
    </ResponsivePanel>
  );
}
