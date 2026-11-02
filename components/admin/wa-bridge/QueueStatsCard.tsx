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
}

export function QueueStatsCard({ stats }: QueueStatsCardProps) {
  const pending = stats?.pending || 0;
  const processing = stats?.processing || 0;
  const sent = stats?.sent || 0;
  const delivered = stats?.delivered || 0;
  const failed = stats?.failed || 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* Pending */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Pending Antrean
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <IconClock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
          {pending}
        </p>
        <span className="text-[11px] text-neutral-400">Menunggu dikirim</span>
      </div>

      {/* Processing */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Diproses
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <IconLoader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
          {processing}
        </p>
        <span className="text-[11px] text-neutral-400">Sedang dikirim Baileys</span>
      </div>

      {/* Sent (Centang 1) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Terkirim
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <IconCheck className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
          {sent}
        </p>
        <span className="text-[11px] text-neutral-400">Centang 1 (Keluar server)</span>
      </div>

      {/* Delivered (Centang 2) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Sampai
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <IconChecks className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
          {delivered}
        </p>
        <span className="text-[11px] text-neutral-400">Centang 2 (HP pelanggan)</span>
      </div>

      {/* Failed */}
      <div className="col-span-2 sm:col-span-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Gagal
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <IconAlertCircle className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
          {failed}
        </p>
        <span className="text-[11px] text-neutral-400">Perlu ditinjau / diulang</span>
      </div>
    </div>
  );
}
