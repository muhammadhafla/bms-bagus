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

  const items = [
    {
      key: 'pending',
      label: 'Pending Antrean',
      desc: 'Menunggu dikirim',
      count: pending,
      icon: IconClock,
      spin: false,
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
      activeRing: 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30 dark:bg-amber-950/30 dark:border-amber-600',
      activeBorderMobile: 'border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/30',
    },
    {
      key: 'processing',
      label: 'Diproses',
      desc: 'Sedang dikirim Baileys',
      count: processing,
      icon: IconLoader2,
      spin: true,
      iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
      activeRing: 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/30 dark:bg-indigo-950/30 dark:border-indigo-600',
      activeBorderMobile: 'border-l-4 border-l-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30',
    },
    {
      key: 'sent',
      label: 'Terkirim',
      desc: 'Centang 1 (Keluar)',
      count: sent,
      icon: IconCheck,
      spin: false,
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      textColor: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
      activeRing: 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/30 dark:bg-blue-950/30 dark:border-blue-600',
      activeBorderMobile: 'border-l-4 border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/30',
    },
    {
      key: 'delivered',
      label: 'Sampai',
      desc: 'Centang 2 (Pelanggan)',
      count: delivered,
      icon: IconChecks,
      spin: false,
      iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
      activeRing: 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30 dark:border-emerald-600',
      activeBorderMobile: 'border-l-4 border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30',
    },
    {
      key: 'failed',
      label: 'Gagal',
      desc: 'Perlu ditinjau / diulang',
      count: failed,
      icon: IconAlertCircle,
      spin: false,
      iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
      textColor: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
      activeRing: 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/30 dark:bg-rose-950/30 dark:border-rose-600',
      activeBorderMobile: 'border-l-4 border-l-rose-500 bg-rose-50/60 dark:bg-rose-950/30',
    },
  ];

  return (
    <>
      {/* Tampilan Mobile: Dense Row List (Padat, Ergonomis, Informasi 100% Lengkap) */}
      <div className="block sm:hidden rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
        {items.map((item) => {
          const isActive = activeStatus === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleClick(item.key)}
              className={`w-full text-left p-2.5 flex items-center justify-between transition cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:scale-[0.99] ${
                isActive ? item.activeBorderMobile : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                  <Icon className={`h-4 w-4 ${item.spin ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${isActive ? item.textColor : 'text-neutral-800 dark:text-neutral-200'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                    {item.desc}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md shrink-0 ${item.badgeBg}`}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tampilan Tablet & Desktop: Grid 5 Kolom Ringkas */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => {
          const isActive = activeStatus === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleClick(item.key)}
              className={`text-left rounded-2xl border p-3.5 shadow-xs transition active:scale-95 cursor-pointer ${
                isActive
                  ? item.activeRing
                  : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {item.label}
                </span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <Icon className={`h-4 w-4 ${item.spin ? 'animate-spin' : ''}`} />
                </div>
              </div>
              <p className={`mt-1.5 text-xl font-black font-mono ${item.textColor}`}>
                {item.count}
              </p>
              <span className="text-[11px] text-neutral-400 block truncate">{item.desc}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
