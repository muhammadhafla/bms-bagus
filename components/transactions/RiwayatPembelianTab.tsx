'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { purchasesApi, purchaseApi, PembelianItem } from '@/lib/api/pembelian';
import { inventoryApi } from '@/lib/api';
import { useBulkPrintStore } from '@/lib/store';
import { formatCurrency, formatDateWIB, formatDateTimeWIB } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight, IconPrinter, IconEdit, IconTrash, IconCheck, IconX as IconClose } from '@tabler/icons-react';
import { Button, ModernPagination } from '@/components/ui';
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

export function RiwayatPembelianTab({ search, startDate, endDate, sortBy, sortDir }: RiwayatPembelianTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PembelianDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleViewDetail = async (id: string) => {
    setSelectedId(id);
    setSlideOverOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchPromise = purchasesApi.getById(id);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - coba lagi')), 15000)
    );

    try {
      const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
      if (controller.signal.aborted) return;
      
      if (!result.error && result.data) {
        setDetail(result.data as PembelianDetail);
      } else if (result.error) {
        setDetailError(result.error.message);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setDetailError(err.message || 'Terjadi kesalahan');
    } finally {
      if (!controller.signal.aborted) {
        setDetailLoading(false);
      }
    }
  };

  const handleCloseSlideOver = () => {
    setSlideOverOpen(false);
    setSelectedId(null);
    setDetail(null);
  };

  const handleCetakLabel = async () => {
    if (!detail || !detail.items || detail.items.length === 0) return;
    
    const inventoryIds = Array.from(new Set(detail.items.map(item => item.inventory_id)));
    
    try {
      const { data: inventoryData } = await inventoryApi.getByIds(inventoryIds);
      if (inventoryData && inventoryData.length > 0) {
        resetBulkPrint();
        
        detail.items.forEach(purchaseItem => {
          const matchedInventory = inventoryData.find(inv => inv.id === purchaseItem.inventory_id);
          if (matchedInventory && purchaseItem.qty > 0) {
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
    return formatDateTimeWIB(dateStr, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderMobileCard = (record: PembelianRecord, index: number) => (
    <div
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="bg-white dark:bg-neutral-900 rounded-2xl p-3 shadow-sm border border-neutral-100 dark:border-neutral-800 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-neutral-500 mb-1">{formatDateTime(record.tanggal)}</p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-medium text-neutral-900 dark:text-white">
              {record.nomor_nota || '-'}
            </p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400">
              Selesai
            </span>
          </div>
        </div>
        <div className="text-neutral-400 dark:text-neutral-500 p-1">
          <IconChevronRight className="w-5 h-5" />
        </div>
      </div>
      <div className="flex justify-between items-end mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
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
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">#</th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">No. Nota</th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tanggal & Waktu</th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Supplier</th>
      <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Total</th>
      <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32">Status</th>
    </tr>
  );

  const renderTableRow = (record: PembelianRecord, index: number, pageOffset: number) => (
    <tr key={record.id} onClick={() => handleViewDetail(record.id)} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group">
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {pageOffset + index + 1}
      </td>
      <td className="px-5 py-4 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">
        {record.nomor_nota || '-'}
      </td>
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {formatDateTime(record.tanggal)}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {record.supplier_nama || '-'}
      </td>
      <td className="px-5 py-4 text-sm font-bold text-neutral-900 dark:text-neutral-100 text-right">
        {formatCurrency(record.total)}
      </td>
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400">
            Selesai
          </span>
          <IconChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <TransactionHistoryTable<PembelianRecord>
        fetchFn={purchasesApi.getAll}
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
            <div className="flex items-center justify-center h-40">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailError ? (
            <div className="p-4 bg-accent-rose-50 dark:bg-accent-rose-900/30 text-accent-rose-600 dark:text-accent-rose-400 rounded-xl border border-accent-rose-200 dark:border-accent-rose-800/50">
              {detailError}
            </div>
          ) : !detail ? (
            <div className="p-10 text-center text-neutral-500">Tidak ada data</div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50 dark:bg-neutral-900/50 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mb-1">No. Nota</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{detail.nomor_nota || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mb-1">Tanggal</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{formatDate(detail.tanggal)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mb-1">Supplier</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{detail.supplier_nama || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mb-1">Kasir</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{detail.created_by_nama || '-'}</p>
                </div>
                <div className="col-span-2 sm:col-span-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mb-1">Total Nilai</p>
                  <p className="text-xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(detail.total || 0)}</p>
                </div>
              </div>

              {detail.note && (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold mb-1">Catatan</p>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200">{detail.note}</p>
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-3">Daftar Barang</h3>
                {detail.items && detail.items.length > 0 ? (
                  <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 dark:bg-neutral-900">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
                          <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">Qty</th>
                          <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">Harga</th>
                          <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">Diskon</th>
                          <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {detail.items.map((item: any, idx: number) => {
                          return (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
                              <td className="px-4 py-3 text-right">
                                  {item.qty}
                              </td>
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
                  <p className="text-sm text-neutral-500 italic">Tidak ada rincian barang</p>
                )}
              </div>

              <div className="flex flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  className="flex-1 sm:flex-none whitespace-nowrap !px-2 sm:!px-4 !text-xs sm:!text-sm"
                  onClick={() => {
                    handleCloseSlideOver();
                    router.push(`/purchasing?editId=${detail.id}`);
                  }}
                  leftIcon={<IconEdit className="w-3 h-3 sm:w-4 sm:h-4" />}
                >
                  Revisi Transaksi
                </Button>
                <Button
                  onClick={handleCetakLabel}
                  variant="primary"
                  leftIcon={<IconPrinter className="w-3 h-3 sm:w-5 sm:h-5" />}
                  className="flex-1 sm:flex-none whitespace-nowrap !px-2 sm:!px-4 !text-xs sm:!text-sm"
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
