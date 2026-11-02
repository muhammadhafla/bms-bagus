'use client';

import React from 'react';
import { WaQueueStats } from '@/types/wa-bridge';
import {
  IconClock,
  IconCheck,
  IconChecks,
  IconEyeCheck,
  IconAlertCircle,
  IconLoader2,
} from '@tabler/icons-react';

interface QueueStatsCardProps {
  stats?: WaQueueStats;
  activeStatus?: string;
  onStatusClick?: (status: string) => void;
}

export function QueueStatsCard({ stats, activeStatus, onStatusClick }: QueueStatsCardProps) {
  const pending = stats?.pending || 0;
  const processing = stats?.processing || 0;
  const sent = stats?.sent || 0;
  const delivered = stats?.delivered || 0;
  const failed = stats?.failed || 0;

  const handleClick = (status: string) => {
    if (onStatusClick) {
      // Toggle: jika sudah aktif, klik lagi untuk reset ke 'all'
      onStatusClick(activeStatus === status ? 'all' : status);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* Pending */}
      <button
        type="button"
        onClick={() => handleClick('pending')}
        className={`text-left rounded-2xl border p-3.5 sm:p-4 shadow-xs transition active:scale-95 cursor-pointer ${
          activeStatus === 'pending'
            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30 dark:bg-amber-950/30 dark:border-amber-600'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Pending Antrean
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <IconClock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
          {pending}
        </p>
        <span className="text-[10px] sm:text-[11px] text-neutral-400">Menunggu dikirim</span>
      </button>

      {/* Processing */}
      <button
        type="button"
        onClick={() => handleClick('processing')}
        className={`text-left rounded-2xl border p-3.5 sm:p-4 shadow-xs transition active:scale-95 cursor-pointer ${
          activeStatus === 'processing'
            ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/30 dark:bg-indigo-950/30 dark:border-indigo-600'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Diproses
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <IconLoader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
        <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
          {processing}
        </p>
        <span className="text-[10px] sm:text-[11px] text-neutral-400">Sedang dikirim Baileys</span>
      </button>

      {/* Sent (Centang 1) */}
      <button
        type="button"
        onClick={() => handleClick('sent')}
        className={`text-left rounded-2xl border p-3.5 sm:p-4 shadow-xs transition active:scale-95 cursor-pointer ${
          activeStatus === 'sent'
            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/30 dark:bg-blue-950/30 dark:border-blue-600'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Terkirim
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <IconCheck className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
          {sent}
        </p>
        <span className="text-[10px] sm:text-[11px] text-neutral-400">Centang 1 (Keluar)</span>
      </button>

      {/* Delivered (Centang 2) */}
      <button
        type="button"
        onClick={() => handleClick('delivered')}
        className={`text-left rounded-2xl border p-3.5 sm:p-4 shadow-xs transition active:scale-95 cursor-pointer ${
          activeStatus === 'delivered'
            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30 dark:border-emerald-600'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Sampai
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <IconChecks className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
          {delivered}
        </p>
        <span className="text-[10px] sm:text-[11px] text-neutral-400">Centang 2 (Pelanggan)</span>
      </button>

      {/* Failed */}
      <button
        type="button"
        onClick={() => handleClick('failed')}
        className={`text-left col-span-2 sm:col-span-1 rounded-2xl border p-3.5 sm:p-4 shadow-xs transition active:scale-95 cursor-pointer ${
          activeStatus === 'failed'
            ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/30 dark:bg-rose-950/30 dark:border-rose-600'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Gagal
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <IconAlertCircle className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
          {failed}
        </p>
        <span className="text-[10px] sm:text-[11px] text-neutral-400">Perlu ditinjau / diulang</span>
      </button>
    </div>
  );
}
