'use client';

import React, { useMemo } from 'react';
import {
  IconChevronRight,
  IconPrinter,
  IconTrash,
  IconTruckDelivery,
  IconBuildingWarehouse,
} from '@tabler/icons-react';
import {
  Card,
  DataTable,
  Column,
  Button,
  EmptyState,
  ModernPagination,
} from '@/components/ui';
import { TransferStok } from '@/types/warehouse';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { renderTransferStatusBadge } from './TransferStatusBadge';

interface TransferListSectionProps {
  transfers: TransferStok[];
  transfersLoading: boolean;
  canCancelTransfer: boolean;
  activeFilterCount: number;
  search: string;
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onOpenDetail: (transfer: TransferStok) => void;
  onCancelTransfer: (transferId: string) => void;
  onResetFilters: () => void;
  onNewTransfer: () => void;
}

export function TransferListSection({
  transfers,
  transfersLoading,
  canCancelTransfer,
  activeFilterCount,
  search,
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onOpenDetail,
  onCancelTransfer,
  onResetFilters,
  onNewTransfer,
}: TransferListSectionProps) {
  const columns: Column<TransferStok>[] = useMemo(
    () => [
      {
        key: 'nomor_transfer',
        header: 'No. Transfer',
        render: (row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(row);
            }}
            className="text-left font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded dark:text-brand-400"
          >
            {row.nomor_transfer}
          </button>
        ),
      },
      {
        key: 'rute',
        header: 'Rute Gudang',
        render: (row) => (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {row.gudang_asal?.nama}
            </span>
            <IconChevronRight className="h-3 w-3 text-neutral-400" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              {row.gudang_tujuan?.nama}
            </span>
          </div>
        ),
      },
      {
        key: 'total_items',
        header: 'Total Muatan',
        render: (row) => (
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            {row.total_items} jenis ({row.total_qty_kirim} pcs)
          </span>
        ),
      },
      {
        key: 'kurir',
        header: 'Kurir / Ekspedisi',
        render: (row) => (
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {row.kurir_pengirim || '-'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => renderTransferStatusBadge(row.status),
      },
      {
        key: 'actions',
        header: 'Aksi',
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={
                <IconPrinter className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
              }
              onClick={(e) => {
                e.stopPropagation();
                downloadOrShareFile(
                  `/api/export/warehouse/surat-jalan/${row.id}`,
                  `Surat_Jalan_${row.id}.pdf`,
                  'Surat Jalan',
                );
              }}
              title="Cetak Surat Jalan (PDF)"
              aria-label={`Cetak Surat Jalan ${row.nomor_transfer}`}
            />
            {row.status === 'DRAFT' && canCancelTransfer && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<IconTrash className="h-4 w-4 text-rose-500" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelTransfer(row.id);
                }}
                title="Batalkan Dokumen Transfer"
                aria-label={`Batalkan Dokumen Transfer ${row.nomor_transfer}`}
              />
            )}
          </div>
        ),
      },
    ],
    [canCancelTransfer, onCancelTransfer, onOpenDetail],
  );

  return (
    <>
      <div className="flex-1">
        <div className="hidden lg:block">
          <Card padding="none" className="overflow-hidden">
            <DataTable
              columns={columns}
              data={transfers}
              keyField="id"
              loading={transfersLoading}
              className="rounded-none border-0"
              onRowClick={onOpenDetail}
              emptyState={
                <EmptyState
                  title="Tidak ada transaksi transfer stok"
                  description={
                    activeFilterCount > 0 || search
                      ? 'Tidak ada dokumen mutasi yang cocok dengan filter atau pencarian Anda.'
                      : 'Belum ada riwayat dokumen mutasi transfer stok antar cabang.'
                  }
                  illustration={
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                      <IconTruckDelivery size={32} stroke={1.5} />
                    </div>
                  }
                  action={
                    activeFilterCount > 0 || search
                      ? {
                          label: 'Reset Filter',
                          onClick: onResetFilters,
                          variant: 'secondary',
                        }
                      : {
                          label: 'Buat Transfer Baru',
                          onClick: onNewTransfer,
                          variant: 'primary',
                        }
                  }
                />
              }
            />
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:hidden">
          {transfersLoading ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-2xl border border-neutral-200/60 p-4 shadow-sm dark:border-neutral-800/60"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800/60">
                  <div className="h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))
          ) : transfers.length === 0 ? (
            <EmptyState
              title="Tidak ada transfer ditemukan"
              description={
                activeFilterCount > 0 || search
                  ? 'Coba sesuaikan filter atau kata kunci pencarian Anda.'
                  : 'Belum ada transaksi transfer stok tercatat.'
              }
              illustration={
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                  <IconTruckDelivery size={32} stroke={1.5} />
                </div>
              }
              action={
                activeFilterCount > 0 || search
                  ? {
                      label: 'Reset Filter',
                      onClick: onResetFilters,
                      variant: 'secondary',
                    }
                  : {
                      label: 'Transfer Baru',
                      onClick: onNewTransfer,
                      variant: 'primary',
                    }
              }
            />
          ) : (
            transfers.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onOpenDetail(row)}
                className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:bg-neutral-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.98] dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                        {row.nomor_transfer}
                      </span>
                      {renderTransferStatusBadge(row.status)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <IconBuildingWarehouse className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="line-clamp-1 font-medium text-neutral-800 dark:text-neutral-200">
                        {row.gudang_asal?.nama}
                      </span>
                      <IconChevronRight className="h-3 w-3 shrink-0 text-neutral-400" />
                      <span className="line-clamp-1 font-semibold text-neutral-900 dark:text-white">
                        {row.gudang_tujuan?.nama}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg p-1 text-neutral-400 transition-all group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-900/20 dark:group-hover:text-brand-400">
                    <IconChevronRight size={18} stroke={2.5} />
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-2.5 text-[12px] dark:border-neutral-800/60">
                  <div className="flex flex-col">
                    <span className="text-neutral-500">Total Muatan</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {row.total_items} jenis ({row.total_qty_kirim} pcs)
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500">Kurir</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {row.kurir_pengirim || '-'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <ModernPagination
          page={page}
          totalPages={totalPages}
          total={totalCount}
          limit={limit}
          onPageChange={onPageChange}
          className="hidden rounded-xl border border-neutral-200 bg-white lg:flex dark:border-neutral-800 dark:bg-neutral-900"
        />
      )}

      {totalPages > 1 && (
        <ModernPagination
          page={page}
          totalPages={totalPages}
          total={totalCount}
          limit={limit}
          onPageChange={onPageChange}
          className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:hidden dark:bg-neutral-950"
        />
      )}
    </>
  );
}
