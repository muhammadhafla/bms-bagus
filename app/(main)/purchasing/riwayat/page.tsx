'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { purchasesApi, PembelianItem } from '@/lib/api/pembelian';
import { formatCurrency } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight, IconFileSpreadsheet } from '@tabler/icons-react';
import { SlideOver } from '@/components/ui/SlideOver';
import { AmbientLayout, Button } from '@/components/ui';

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

export default function RiwayatPembelianPage() {
  const [records, setRecords] = useState<PembelianRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PembelianDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const limit = 10;

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        {/* Header Section */}
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconFileSpreadsheet className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Riwayat Pembelian</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Lihat record pembelian yang telah dilakukan</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="relative flex-1 max-w-md">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari nomor nota atau supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all text-neutral-900 dark:text-white text-sm"
              />
              <span className="self-center text-neutral-500">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all text-neutral-900 dark:text-white text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="px-6 shadow-brand"
            >
              Cari
            </Button>
          </form>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
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
                <p className="text-sm mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
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
                        <p className="text-sm mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
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
            <div className="flex-shrink-0 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
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
        </div>
      </div>

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
            </div>
          )}
        </div>
      </SlideOver>
    </AmbientLayout>
  );
}