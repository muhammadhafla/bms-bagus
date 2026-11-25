'use client';

import React from 'react';
import { IconArrowDownLeft, IconArrowUpRight } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ModernPagination } from '@/components/ui';
import { LedgerPaginatedItem } from '@/lib/api/ledger';

export function getLedgerSumberBadge(sumber: string) {
  switch (sumber) {
    case 'PENJUALAN_SHIFT':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50';
    case 'PEMBELIAN_STOK':
    case 'BIAYA_OPERASIONAL':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50';
    case 'BEBAN_SUSUT_GUDANG':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50';
    case 'KASBON':
    case 'GAJI':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50';
    case 'MODAL':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
  }
}

interface LedgerTableSectionProps {
  hasLedgerError: boolean;
  onRetry: () => void;
  isLoading: boolean;
  paginatedList: LedgerPaginatedItem[];
  startDateStr: string;
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  baselineOpeningBalance: number;
  onPageChange: (page: number) => void;
}

export function LedgerTableSection({
  hasLedgerError,
  onRetry,
  isLoading,
  paginatedList,
  startDateStr,
  page,
  totalPages,
  totalItems,
  limit,
  baselineOpeningBalance,
  onPageChange,
}: LedgerTableSectionProps) {
  return (
    <>
      {hasLedgerError && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <span>Gagal memuat data buku besar atau saldo awal periode.</span>
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:block dark:border-neutral-800 dark:bg-neutral-900 print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Lokasi</th>
                <th className="px-5 py-3.5">Keterangan / Transaksi</th>
                <th className="px-5 py-3.5">Sumber</th>
                <th className="px-5 py-3.5 text-right">Debit (Masuk)</th>
                <th className="px-5 py-3.5 text-right">Kredit (Keluar)</th>
                <th className="px-5 py-3.5 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      Memuat data buku besar...
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    Belum ada data mutasi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedList.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {item.created_at ? format(new Date(item.created_at), 'HH:mm') : '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {item.gudang?.nama ? (
                          <span className="inline-flex items-center rounded-md border border-neutral-200/60 bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                            {item.gudang.nama}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium leading-snug text-neutral-900 dark:text-white">
                          {item.keterangan}
                        </p>
                        {item.profiles?.nama && (
                          <span className="text-[11px] text-neutral-400">
                            Dicatat oleh: {item.profiles.nama}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getLedgerSumberBadge(item.sumber)}`}
                        >
                          {item.sumber.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.tipe_transaksi === 'PEMASUKAN'
                          ? `+ Rp ${Number(item.nominal).toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {item.tipe_transaksi === 'PENGELUARAN'
                          ? `- Rp ${Number(item.nominal).toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-neutral-900 dark:text-white">
                        Rp {Number(item.saldo_berjalan).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}

                  {startDateStr && page === totalPages && (
                    <tr className="border-t-2 border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-850">
                      <td className="whitespace-nowrap px-5 py-3 font-bold text-neutral-600 dark:text-neutral-300">
                        {format(new Date(startDateStr), 'd MMM yyyy', { locale: localeId })}
                      </td>
                      <td colSpan={3} className="px-5 py-3">
                        <span className="font-bold text-neutral-700 dark:text-neutral-200">
                          Saldo Awal Periode (Sebelum{' '}
                          {format(new Date(startDateStr), 'd MMMM yyyy', { locale: localeId })})
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-400">-</td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-400">-</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-black text-brand-700 dark:text-brand-300">
                        Rp {baselineOpeningBalance.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2.5 md:hidden print:hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Memuat data mutasi...
            </div>
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-neutral-500">
            Belum ada mutasi sesuai filter.
          </div>
        ) : (
          <>
            {paginatedList.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    item.tipe_transaksi === 'PEMASUKAN'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  }`}
                >
                  {item.tipe_transaksi === 'PEMASUKAN' ? (
                    <IconArrowDownLeft size={20} stroke={2.5} />
                  ) : (
                    <IconArrowUpRight size={20} stroke={2.5} />
                  )}
                </div>

                <div className="min-w-0 flex-1 pr-1">
                  <p className="line-clamp-2 text-xs font-bold text-neutral-900 dark:text-white">
                    {item.keterangan}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.gudang?.nama && (
                      <span className="inline-flex items-center rounded-md border border-neutral-200/60 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                        {item.gudang.nama}
                      </span>
                    )}
                    <span
                      className={`py-0.2 inline-flex items-center rounded-full border px-1.5 text-[9px] font-bold ${getLedgerSumberBadge(item.sumber)}`}
                    >
                      {item.sumber.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      • {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`text-xs font-black ${
                      item.tipe_transaksi === 'PEMASUKAN'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.tipe_transaksi === 'PEMASUKAN' ? '+' : '-'}{' '}
                    {Number(item.nominal).toLocaleString('id-ID')}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-neutral-400">
                    Sl: {Number(item.saldo_berjalan).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}

            {startDateStr && page === totalPages && (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-center dark:border-neutral-700 dark:bg-neutral-800/60">
                <p className="text-[11px] font-bold uppercase text-neutral-500">
                  Saldo Awal Periode (Sebelum{' '}
                  {format(new Date(startDateStr), 'd MMM yyyy', { locale: localeId })})
                </p>
                <p className="mt-0.5 text-base font-black text-brand-600 dark:text-brand-400">
                  Rp {baselineOpeningBalance.toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 print:hidden">
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
