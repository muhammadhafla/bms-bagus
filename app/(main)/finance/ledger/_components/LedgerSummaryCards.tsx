'use client';

import React from 'react';
import { IconArrowDownLeft, IconArrowUpRight } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LedgerTipe } from '@/lib/api/ledger';

interface LedgerSummaryCardsProps {
  startDateStr: string;
  endDateStr: string;
  saldoAkhir: number;
  baselineOpeningBalance: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  selectedTipe: LedgerTipe | '';
  onSelectTipe: (tipe: LedgerTipe | '') => void;
}

export function LedgerSummaryCards({
  startDateStr,
  endDateStr,
  saldoAkhir,
  baselineOpeningBalance,
  totalPemasukan,
  totalPengeluaran,
  selectedTipe,
  onSelectTipe,
}: LedgerSummaryCardsProps) {
  return (
    <>
      <div className="relative z-0 mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-6 text-white shadow-xl shadow-brand-500/10 print:hidden">
        <div className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-black/20 blur-2xl" />

        <div className="relative z-10">
          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-200">
                  {startDateStr
                    ? `Saldo Akhir Periode (${format(new Date(startDateStr), 'd MMM', { locale: localeId })} - ${endDateStr ? format(new Date(endDateStr), 'd MMM yyyy', { locale: localeId }) : 'Sekarang'})`
                    : 'Saldo Kas Berjalan Toko'}
                </span>
              </div>
              <p className="text-3xl font-black tracking-tight sm:text-4xl">
                Rp {saldoAkhir.toLocaleString('id-ID')}
              </p>
            </div>

            {startDateStr && (
              <div className="self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-md sm:self-auto">
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-200">
                  Saldo Awal Periode
                </p>
                <p className="text-lg font-bold">
                  Rp {baselineOpeningBalance.toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </div>

          <div className="mb-4 h-px w-full bg-white/20" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/20 backdrop-blur-md">
                <IconArrowDownLeft size={20} className="text-emerald-300" stroke={2.5} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                  Total Masuk (Debit)
                </p>
                <p className="text-base font-extrabold text-emerald-200 sm:text-lg">
                  + Rp {totalPemasukan.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 text-right">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                  Total Keluar (Kredit)
                </p>
                <p className="text-base font-extrabold text-rose-200 sm:text-lg">
                  - Rp {totalPengeluaran.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/20 backdrop-blur-md">
                <IconArrowUpRight size={20} className="text-rose-300" stroke={2.5} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 print:hidden">
        <div className="flex w-full items-center gap-1.5 rounded-2xl border border-neutral-200/60 bg-neutral-100/90 p-1 shadow-inner sm:w-auto dark:border-neutral-700/50 dark:bg-neutral-800/80">
          <button
            type="button"
            onClick={() => onSelectTipe('')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:flex-initial ${
              selectedTipe === ''
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Semua Mutasi
          </button>
          <button
            type="button"
            onClick={() => onSelectTipe('PEMASUKAN')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:flex-initial ${
              selectedTipe === 'PEMASUKAN'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400'
            }`}
          >
            <IconArrowDownLeft size={16} />
            Masuk (Debit)
          </button>
          <button
            type="button"
            onClick={() => onSelectTipe('PENGELUARAN')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:flex-initial ${
              selectedTipe === 'PENGELUARAN'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-neutral-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400'
            }`}
          >
            <IconArrowUpRight size={16} />
            Keluar (Kredit)
          </button>
        </div>
      </div>
    </>
  );
}
