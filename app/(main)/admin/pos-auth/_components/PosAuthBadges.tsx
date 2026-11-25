'use client';

import React from 'react';
import {
  IconShieldLock,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
} from '@tabler/icons-react';
import { PosAuthStatus } from '@/types/pos-auth';
import { formatCurrency } from '@/lib/utils';
import { PosActionConfigItem } from '../_hooks/usePosAuthData';

export function ActionBadge({
  actionType,
  actionConfig,
}: {
  actionType: string;
  actionConfig: Record<string, PosActionConfigItem>;
}) {
  const config = actionConfig[actionType] || {
    label: actionType,
    icon: IconShieldLock,
    colorClass: 'text-neutral-700 dark:text-neutral-300',
    bgClass:
      'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${config.bgClass} ${config.colorClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </span>
  );
}

export function MetadataSummary({
  metadata,
}: {
  metadata: Record<string, any> | null;
}) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-neutral-400">-</span>;
  }

  return (
    <div className="space-y-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
        {metadata.nota_no || metadata.item_nama || 'Detail Transaksi'}
        {metadata.total && (
          <span className="ml-1.5 font-bold text-brand-600 dark:text-brand-400">
            ({formatCurrency(metadata.total)})
          </span>
        )}
      </div>
      {metadata.alasan && (
        <div className="italic text-neutral-500">&ldquo;{metadata.alasan}&rdquo;</div>
      )}
    </div>
  );
}

export function MetadataDetailedView({
  metadata,
}: {
  metadata: Record<string, any>;
}) {
  return (
    <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
      {metadata.nota_no && (
        <div className="flex justify-between">
          <span className="text-neutral-400">No. Nota:</span>
          <span className="font-mono font-bold">{metadata.nota_no}</span>
        </div>
      )}
      {metadata.total && (
        <div className="flex justify-between">
          <span className="text-neutral-400">Total:</span>
          <span className="font-bold text-neutral-900 dark:text-white">
            {formatCurrency(metadata.total)}
          </span>
        </div>
      )}
      {metadata.diskon_persen && (
        <div className="flex justify-between">
          <span className="text-neutral-400">Diskon:</span>
          <span className="font-bold text-amber-600">{metadata.diskon_persen}%</span>
        </div>
      )}
      {metadata.item_nama && (
        <div className="flex justify-between">
          <span className="text-neutral-400">Produk:</span>
          <span className="font-semibold">{metadata.item_nama}</span>
        </div>
      )}
      {metadata.alasan && (
        <div className="border-t border-neutral-200/50 pt-1 text-[11px] italic text-neutral-500 dark:border-neutral-700/50">
          Alasan: &ldquo;{metadata.alasan}&rdquo;
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: PosAuthStatus }) {
  switch (status) {
    case 'used':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <IconCheck className="h-3 w-3" />
          Digunakan
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          <IconX className="h-3 w-3" />
          Ditolak
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          <IconClock className="h-3 w-3" />
          Kedaluwarsa
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <IconAlertCircle className="h-3 w-3" />
          Menunggu
        </span>
      );
  }
}
