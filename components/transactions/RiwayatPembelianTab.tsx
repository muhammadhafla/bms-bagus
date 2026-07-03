'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { purchasesApi, PembelianItem } from '@/lib/api/pembelian';
import { inventoryApi } from '@/lib/api';
import { useBulkPrintStore } from '@/lib/store';
import { formatCurrency, formatDateWIB } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight, IconPrinter } from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { SlideOver } from '@/components/ui/SlideOver';

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
}

export function RiwayatPembelianTab({ search, startDate, endDate }: RiwayatPembelianTabProps) {
  const [records, setRecords] = useState<PembelianRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PembelianDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);
  const limit = 10;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * limit;
    const result = await purchasesApi.getAll({ 
      limit, 
      offset, 
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
    if (!result.error && result.data) {
      setRecords(result.data as PembelianRecord[]);
      setTotal(result.total || 0);
    }
    setLoading(false);
  }, [page, search, startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
    
    // Extract unique inventory ids
    const inventoryIds = Array.from(new Set(detail.items.map(item => item.inventory_id)));
    
    try {
      // Fetch full inventory items
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

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-[400px] bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated">
      {/* Mobile View */}
      <div className="block lg:hidden space-y-4 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/50 dark:bg-neutral-950/50 rounded-2xl flex items-center justify-center mb-4">
              <IconSearch className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">Tidak ada data</p>
            <p className="text-sm mt-1">Coba sesuaikan filter pencarian.</p>
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">{formatDate(record.tanggal)}</p>
                  <p className="font-mono font-medium text-neutral-900 dark:text-white">
                    {record.nomor_nota || '-'}
                  </p>
                </div>
                <button
                  onClick={() => handleViewDetail(record.id)}
                  className="p-2 text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/30 rounded-xl"
                >
                  <IconEye className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
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
          ))
        )}
      </div>

      <div className="overflow-x-auto h-full custom-scrollbar hidden lg:block">
        <table className="w-full min-w-[900px]">
          <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
            <tr>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">#</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">No. Nota</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tanggal</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Supplier</th>
              <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Total</th>
              <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-neutral-500">
                  <div className="flex justify-center items-center h-32">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-white/50 dark:bg-neutral-950/50 rounded-2xl flex items-center justify-center mb-4">
                      <IconSearch className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">Tidak ada data</p>
                    <p className="text-sm mt-1">Coba sesuaikan filter pencarian.</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {((page - 1) * limit) + index + 1}
                  </td>
                  <td className="px-5 py-4 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {record.nomor_nota || '-'}
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {formatDate(record.tanggal)}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {record.supplier_nama || '-'}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-neutral-900 dark:text-neutral-100 text-right">
                    {formatCurrency(record.total)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleViewDetail(record.id)}
                      className="p-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-xl transition-colors btn-press"
                    >
                      <IconEye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 0 && (
        <div className="flex-shrink-0 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 rounded-b-3xl">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium text-center sm:text-left">
            Menampilkan {total > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} dari {total} data <span className="mx-2">|</span> Halaman {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-600 dark:text-neutral-300 btn-press"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-600 dark:text-neutral-300 btn-press"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
            <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50">
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
                        {detail.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
                            <td className="px-4 py-3 text-right">{item.qty}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.harga_beli || 0)}</td>
                            <td className="px-4 py-3 text-right text-neutral-500">{item.diskon ? formatCurrency(item.diskon) : '-'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency((item.harga_final || 0) * (item.qty || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 italic">Tidak ada rincian barang</p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  onClick={handleCetakLabel}
                  variant="primary"
                  leftIcon={<IconPrinter className="w-5 h-5" />}
                  className="w-full sm:w-auto"
                >
                  Cetak Label Bulk
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideOver>
    </div>
  );
}
