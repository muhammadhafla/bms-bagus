'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { purchasesApi, PembelianItem } from '@/lib/api/pembelian';
import { inventoryApi } from '@/lib/api';
import { useBulkPrintStore } from '@/lib/store';
import { formatCurrency, formatDateWIB, formatDateTimeWIB } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  IconChevronRight,
  IconPrinter,
  IconEdit,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { SlideOver } from '@/components/ui/SlideOver';
import { TransactionHistoryTable } from './TransactionHistoryTable';

interface PembelianRecord {
  id: string;
  tanggal: string;
  nomor_nota: string | null;
  supplier_nama: string | null;
  total: number;
  total_supplier: number;
  selisih: number;
  created_at: string;
  created_by_nama: string | null;
  note: string | null;
}

interface PembelianDetail extends PembelianRecord {
  items: PembelianItem[];
}

interface RiwayatPembelianTabProps {
  search: string;
  startDate: string;
  endDate: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function RiwayatPembelianTab({
  search,
  startDate,
  endDate,
  sortBy,
  sortDir,
}: RiwayatPembelianTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const router = useRouter();
  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);

  const { data: detail, isLoading: detailLoading, error: queryError } = useQuery({
    queryKey: ['purchaseDetail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const res = await purchasesApi.getById(selectedId);
      if (res.error) throw new Error(res.error.message);
      return res.data as PembelianDetail;
    },
    enabled: slideOverOpen && !!selectedId,
  });

  const detailError = queryError ? queryError.message : null;

  const detailItems = detail?.items;
  const filteredItems = useMemo(() => {
    if (!detailItems) return [];
    if (!itemSearch.trim()) return detailItems;
    const query = itemSearch.toLowerCase().trim();
    return detailItems.filter((item) =>
      item.nama_barang?.toLowerCase().includes(query),
    );
  }, [detailItems, itemSearch]);

  const handleViewDetail = (id: string) => {
    setItemSearch('');
    setSelectedId(id);
    setSlideOverOpen(true);
  };

  const handleCloseSlideOver = () => {
    setItemSearch('');
    setSlideOverOpen(false);
    // Optionally we can wait a bit before clearing ID to let slideover close animation play
    setTimeout(() => setSelectedId(null), 300);
  };

  const handleCetakLabel = async () => {
    if (!detail || !detail.items || detail.items.length === 0) return;

    const inventoryIds = Array.from(new Set(detail.items.map((item) => item.inventory_id)));

    try {
      const { data: inventoryData } = await inventoryApi.getByIds(inventoryIds);
      if (inventoryData && inventoryData.length > 0) {
        resetBulkPrint();

        detail.items.forEach((purchaseItem) => {
          const matchedInventory = inventoryData.find(
            (inv) => inv.id === purchaseItem.inventory_id,
          );
          if (matchedInventory && purchaseItem.qty > 0 && !matchedInventory.is_discontinued) {
            addBulkPrintItem(matchedInventory, purchaseItem.qty);
          }
        });

        router.push('/bulk-print');
      }
    } catch (err) {
      console.error('Error fetching inventory for bulk print:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return formatDateWIB(dateStr, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    return formatDateTimeWIB(dateStr, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMobileCard = (record: PembelianRecord, index: number) => (
    <div
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="cursor-pointer rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm transition-transform active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs text-neutral-500">{formatDateTime(record.tanggal)}</p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-medium text-neutral-900 dark:text-white">
              {record.nomor_nota || '-'}
            </p>
            <span className="bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold">
              Selesai
            </span>
          </div>
        </div>
        <div className="p-1 text-neutral-400 dark:text-neutral-500">
          <IconChevronRight className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500">Supplier</p>
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            {record.supplier_nama || '-'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">Total</p>
          <p className="font-bold text-neutral-900 dark:text-white">
            {formatCurrency(record.total)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderTableHeader = () => (
    <tr>
      <th className="w-16 px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        #
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        No. Nota
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Tanggal & Waktu
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Supplier
      </th>
      <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Total
      </th>
      <th className="w-32 px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Status
      </th>
    </tr>
  );

  const renderTableRow = (record: PembelianRecord, index: number, pageOffset: number) => (
    <tr
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="group cursor-pointer transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
    >
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {pageOffset + index + 1}
      </td>
      <td className="px-5 py-4 font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {record.nomor_nota || '-'}
      </td>
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {formatDateTime(record.tanggal)}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {record.supplier_nama || '-'}
      </td>
      <td className="px-5 py-4 text-right text-sm font-bold text-neutral-900 dark:text-neutral-100">
        {formatCurrency(record.total)}
      </td>
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold">
            Selesai
          </span>
          <IconChevronRight className="group-hover:text-brand-500 h-4 w-4 text-neutral-400 transition-colors" />
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <TransactionHistoryTable<PembelianRecord>
        fetchFn={purchasesApi.getAll}
        queryKeyPrefix={['pembelian']}
        search={search}
        startDate={startDate}
        endDate={endDate}
        sortBy={sortBy}
        sortDir={sortDir}
        renderMobileCard={renderMobileCard}
        renderTableHeader={renderTableHeader}
        renderTableRow={renderTableRow}
      />

      {/* SlideOver Rincian Pembelian */}
      <SlideOver
        isOpen={slideOverOpen}
        onClose={handleCloseSlideOver}
        title="Detail Pembelian"
        size="xl"
      >
        <div className="p-6">
          {detailLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          ) : detailError ? (
            <div className="bg-accent-rose-50 dark:bg-accent-rose-900/30 text-accent-rose-600 dark:text-accent-rose-400 border-accent-rose-200 dark:border-accent-rose-800/50 rounded-xl border p-4">
              {detailError}
            </div>
          ) : !detail ? (
            <div className="p-10 text-center text-neutral-500">Tidak ada data</div>
          ) : (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    No. Nota
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {detail.nomor_nota || '-'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Tanggal
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {formatDate(detail.tanggal)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Supplier
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {detail.supplier_nama || '-'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Kasir
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {detail.created_by_nama || '-'}
                  </p>
                </div>
                <div className="col-span-2 mt-2 border-t border-neutral-200 pt-3 sm:col-span-4 dark:border-neutral-800">
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Total Nilai
                  </p>
                  <p className="text-brand-600 dark:text-brand-400 text-xl font-bold">
                    {formatCurrency(detail.total || 0)}
                  </p>
                </div>
              </div>

              {detail.note && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Catatan
                  </p>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200">{detail.note}</p>
                </div>
              )}

              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      Daftar Barang
                    </h3>
                    {detail.items && detail.items.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {itemSearch.trim()
                          ? `${filteredItems.length} dari ${detail.items.length}`
                          : `${detail.items.length}`}
                      </span>
                    )}
                  </div>

                  {detail.items && detail.items.length > 0 && (
                    <div className="relative w-full sm:w-64">
                      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Cari nama barang..."
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-1.5 pl-9 pr-8 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:bg-neutral-950"
                      />
                      {itemSearch && (
                        <button
                          type="button"
                          onClick={() => setItemSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                          title="Hapus pencarian"
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {detail.items && detail.items.length > 0 ? (
                  filteredItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-neutral-600 dark:text-neutral-400">
                              Nama Barang
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">
                              Harga
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">
                              Diskon
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {filteredItems.map((item: any, idx: number) => {
                            return (
                              <tr
                                key={idx}
                                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                              >
                                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                                  {item.nama_barang}
                                </td>
                                <td className="px-4 py-3 text-right">{item.qty}</td>
                                <td className="px-4 py-3 text-right">
                                  {formatCurrency(item.harga_beli || 0)}
                                </td>
                                <td className="px-4 py-3 text-right text-neutral-500">
                                  {item.diskon ? formatCurrency(item.diskon) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                                  {formatCurrency((item.harga_final || 0) * (item.qty || 0))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center dark:border-neutral-800">
                      <IconSearch className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Tidak ada barang yang cocok
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Tidak ditemukan barang dengan kata kunci &quot;{itemSearch}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={() => setItemSearch('')}
                        className="text-brand-600 hover:underline dark:text-brand-400 mt-3 text-xs font-semibold"
                      >
                        Reset Pencarian
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-neutral-500 italic">Tidak ada rincian barang</p>
                )}
              </div>

              <div className="flex flex-row justify-end gap-2 border-t border-neutral-200 pt-4 sm:gap-3 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  className="flex-1 !px-2 !text-xs whitespace-nowrap sm:flex-none sm:!px-4 sm:!text-sm"
                  onClick={() => {
                    handleCloseSlideOver();
                    router.push(`/purchasing?editId=${detail.id}`);
                  }}
                  leftIcon={<IconEdit className="h-3 w-3 sm:h-4 sm:w-4" />}
                >
                  Revisi Transaksi
                </Button>
                <Button
                  onClick={handleCetakLabel}
                  variant="primary"
                  leftIcon={<IconPrinter className="h-3 w-3 sm:h-5 sm:w-5" />}
                  className="flex-1 !px-2 !text-xs whitespace-nowrap sm:flex-none sm:!px-4 sm:!text-sm"
                >
                  Cetak Label Bulk
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideOver>
    </>
  );
}
