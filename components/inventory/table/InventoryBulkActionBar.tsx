'use client';

import React from 'react';
import { IconGitMerge, IconTrash } from '@tabler/icons-react';
import Button from '@/components/ui/Button';

interface InventoryBulkActionBarProps {
  selectedCount: number;
  isAdminUser: boolean;
  isBulkSnoozing: boolean;
  showBulkSnoozeOpts: boolean;
  onToggleBulkSnoozeOpts: () => void;
  bulkSnoozeRef: React.RefObject<HTMLDivElement | null>;
  onOpenBulkMerge: () => void;
  onOpenBulkDelete: () => void;
  onBulkSnooze: (days: number) => void;
}

export function InventoryBulkActionBar({
  selectedCount,
  isAdminUser,
  isBulkSnoozing,
  showBulkSnoozeOpts,
  onToggleBulkSnoozeOpts,
  bulkSnoozeRef,
  onOpenBulkMerge,
  onOpenBulkDelete,
  onBulkSnooze,
}: InventoryBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 hidden items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm lg:flex dark:border-brand-900/50 dark:bg-brand-900/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs dark:bg-brand-800">
          {selectedCount}
        </span>
        Barang Dipilih
      </div>

      <div className="flex items-center gap-2.5">
        {isAdminUser && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenBulkMerge}
              leftIcon={<IconGitMerge size={16} />}
              className="shadow-2xs"
            >
              Gabung Massal (Merge)
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onOpenBulkDelete}
              leftIcon={<IconTrash size={16} />}
              className="shadow-2xs"
            >
              Hapus Massal
            </Button>
          </>
        )}

        <div className="relative" ref={bulkSnoozeRef}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleBulkSnoozeOpts}
            className="border-brand-300 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-800"
          >
            🕒 Snooze Massal
          </Button>

          {showBulkSnoozeOpts && (
            <div className="shadow-elevated absolute right-0 top-10 z-30 w-40 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="mb-2 px-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Pilih Durasi
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { label: '1 Hari', days: 1, icon: '⏱️' },
                  { label: '3 Hari', days: 3, icon: '🚚' },
                  { label: '1 Minggu', days: 7, icon: '📅' },
                  { label: '1 Bulan', days: 30, icon: '📦' },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => onBulkSnooze(opt.days)}
                    disabled={isBulkSnoozing}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    <span className="text-base">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
