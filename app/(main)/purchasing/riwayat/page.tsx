'use client';

import { useState, useEffect, useCallback } from 'react';
import { purchasesApi, PembelianItem } from '@/lib/api/pembelian';
import { formatCurrency } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
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

export default function RiwayatPembelianPage() {
  const [records, setRecords] = useState<PembelianRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PembelianDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const limit = 10;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * limit;
    const result = await purchasesApi.getAll({ limit, offset, search: search || undefined });
    if (!result.error && result.data) {
      setRecords(result.data as PembelianRecord[]);
      setTotal(Math.ceil((result.data as PembelianRecord[]).length / limit) * limit || 0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleViewDetail = async (id: string) => {
    setSelectedId(id);
    setSlideOverOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    
    const timeoutId = setTimeout(() => {
      setDetailLoading(false);
      setDetailError('Request timeout - coba lagi');
    }, 15000);

    try {
      const result = await purchasesApi.getById(id);
      clearTimeout(timeoutId);
      
      console.log('getById result:', result);
      if (!result.error && result.data) {
        console.log('detail data:', result.data);
        setDetail(result.data as PembelianDetail);
      } else if (result.error) {
        console.error('Error fetching detail:', result.error);
        setDetailError(result.error.message);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Exception:', err);
      setDetailError(err.message || 'Terjadi kesalahan');
    }
    setDetailLoading(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Riwayat Pembelian</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nomor nota atau supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
        >
          Cari
        </button>
      </form>

      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">No. Nota</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">Supplier</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700 dark:text-neutral-300">Total</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700 dark:text-neutral-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Tidak ada data</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{record.nomor_nota || '-'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{formatDate(record.tanggal)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{record.supplier_nama || '-'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 text-right">{formatCurrency(record.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetail(record.id)}
                        className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <SlideOver
        isOpen={slideOverOpen}
        onClose={handleCloseSlideOver}
        title="Detail Pembelian"
        size="xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detailError ? (
          <div className="p-4 text-error">{detailError}</div>
        ) : !detail ? (
          <div className="p-4 text-neutral-500">Tidak ada data</div>
        ) : detail && detail.items && detail.items.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">No. Nota</p>
                <p className="font-medium text-neutral-900 dark:text-white">{detail.nomor_nota || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Tanggal</p>
                <p className="font-medium text-neutral-900 dark:text-white">{formatDate(detail.tanggal)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Supplier</p>
                <p className="font-medium text-neutral-900 dark:text-white">{detail.supplier_nama || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Kasir</p>
                <p className="font-medium text-neutral-900 dark:text-white">{detail.created_by_nama || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Total</p>
                <p className="font-medium text-neutral-900 dark:text-white">{formatCurrency(detail.total || 0)}</p>
              </div>
            </div>

            {detail.note && (
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Catatan</p>
                <p className="text-neutral-900 dark:text-white">{detail.note}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Items ({detail.items.length})</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Nama Barang</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Harga</th>
                      <th className="px-3 py-2 text-right font-medium">Diskon</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {detail.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{item.nama_barang}</td>
                        <td className="px-3 py-2 text-right">{item.qty}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.harga_beli || 0)}</td>
                        <td className="px-3 py-2 text-right">{item.diskon ? formatCurrency(item.diskon) : '-'}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency((item.harga_final || 0) * (item.qty || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-neutral-500">Items tidak tersedia</div>
        )}
      </SlideOver>
    </div>
  );
}