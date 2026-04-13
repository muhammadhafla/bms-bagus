'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { returnApi, ReturnItem } from '@/lib/api';
import { formatCurrency, generateIdempotencyKey } from '@/lib/utils';
import { IconArrowBack, IconSearch } from '@tabler/icons-react';
import Header from '@/components/ui/Header';

interface TransactionItem {
  id: string;
  inventory_id: string;
  barcode: string;
  nama_barang: string;
  qty_original: number;
  qty_returned: number;
  harga_beli?: number;
  harga_jual?: number;
  diskon: number;
  subtotal_original: number;
}

interface Transaction {
  id: string;
  tanggal: string;
  supplier_id?: string | null;
  total: number;
  created_at: string;
}

type ReturnType = 'pembelian' | 'penjualan';

export default function ReturnPage() {
  const [returnType, setReturnType] = useState<ReturnType>('pembelian');
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let result;
      if (returnType === 'pembelian') {
        result = await returnApi.searchPembelian(searchQuery);
      } else {
        result = await returnApi.searchPenjualan(searchQuery);
      }

      if (result.error) {
        setError('Gagal mencari transaksi');
      } else {
        setSearchResults(result.data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, returnType]);

  const handleSelectTransaction = useCallback(async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setLoading(true);

    try {
      let result;
      if (returnType === 'pembelian') {
        result = await returnApi.getPembelianItems(transaction.id);
      } else {
        result = await returnApi.getPenjualanItems(transaction.id);
      }

      if (result.error) {
        setError('Gagal memuat items');
        return;
      }

      const itemsWithReturn: TransactionItem[] = (result.data || []).map((item: any) => ({
        id: item.id,
        inventory_id: item.inventory_id,
        barcode: item.barcode,
        nama_barang: item.nama_barang,
        qty_original: item.qty,
        qty_returned: item.qty_returned || 0,
        harga_beli: item.harga_beli,
        harga_jual: item.harga_jual,
        diskon: item.diskon || 0,
        subtotal_original: item.subtotal,
      }));

      setItems(itemsWithReturn);
      setStep(2);
    } catch (err) {
      console.error('Error loading items:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [returnType]);

  const handleReturnQtyChange = useCallback((index: number, qty: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];
      const maxReturn = item.qty_original - item.qty_returned;
      const validQty = Math.max(0, Math.min(qty, maxReturn));
      newItems[index] = { ...item };
      return newItems;
    });
  }, []);

  const getReturnSubtotal = useCallback((item: TransactionItem) => {
    const harga = item.harga_beli || item.harga_jual || 0;
    const qtyToReturn = item.qty_original - item.qty_returned;
    return qtyToReturn * (harga - item.diskon);
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTransaction(null);
    setItems([]);
    setError(null);
    setSuccess(null);
  }, []);

  const handleTypeChange = useCallback((type: ReturnType) => {
    setReturnType(type);
    setStep(1);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTransaction(null);
    setItems([]);
  }, []);

  const totalReturn = items.reduce((sum, item) => {
    const qtyToReturn = item.qty_original - item.qty_returned;
    const harga = item.harga_beli || item.harga_jual || 0;
    return sum + qtyToReturn * (harga - item.diskon);
  }, 0);

  const handleSubmit = useCallback(async () => {
    if (!selectedTransaction) return;

    const returnItems = items
      .filter(item => item.qty_original - item.qty_returned > 0)
      .map(item => {
        const qtyToReturn = item.qty_original - item.qty_returned;
        return {
          pembelian_item_id: item.id,
          qty: qtyToReturn,
        };
      });

    if (returnItems.length === 0) {
      setError('Tidak ada item yang dikembalikan');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let result;
      if (returnType === 'pembelian') {
        result = await returnApi.submitPembelianReturn({
          original_transaction_id: selectedTransaction.id,
          tanggal: selectedTransaction.tanggal,
          items: returnItems,
        });
      } else {
        result = await returnApi.submitPenjualanReturn({
          original_transaction_id: selectedTransaction.id,
          tanggal: selectedTransaction.tanggal,
          items: returnItems.map(item => ({
            penjualan_item_id: item.pembelian_item_id,
            qty: item.qty,
          })),
        });
      }

      if (result.error) {
        setError(result.error.message || 'Gagal menyimpan return');
      } else {
        setSuccess(`Return berhasil disimpan. Total: ${formatCurrency(totalReturn)}`);
        setTimeout(() => {
          handleReset();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }, [selectedTransaction, items, returnType, totalReturn, handleReset]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header title="Return" />
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-300 to-brand-400 rounded-xl flex items-center justify-center shadow-md">
              <IconArrowBack className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Retur Barang</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Kelola retur barang</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => handleTypeChange('pembelian')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              returnType === 'pembelian'
                ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-md'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Retur Pembelian
          </button>
          <button
            onClick={() => handleTypeChange('penjualan')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              returnType === 'penjualan'
                ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-md'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Retur Penjualan
          </button>
        </div>

        {step === 1 && (
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Cari transaksi (ID atau tanggal)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white dark:focus:bg-neutral-800 transition-all text-lg text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-8 py-3 bg-gradient-to-r from-brand-400 to-brand-500 text-white rounded-xl hover:from-brand-500 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md transition-all"
            >
              {loading ? '...' : 'Cari'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 rounded-lg text-sm border border-red-100 dark:border-red-800">{error}</div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-emerald-950 text-green-600 dark:text-emerald-200 rounded-lg text-sm border border-green-100 dark:border-emerald-800">{success}</div>
        )}
      </header>

      <main className="flex-1 overflow-auto p-6">
        {step === 1 ? (
          <div>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
                <IconSearch className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">
                  {searchQuery ? 'Tidak ada transaksi ditemukan' : 'Masukkan ID transaksi untuk mencari'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">Tanggal</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {searchResults.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-mono text-neutral-900">{transaction.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm text-neutral-900">{transaction.tanggal}</td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900">
                        {formatCurrency(transaction.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSelectTransaction(transaction)}
                          className="px-3 py-1.5 text-sm bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg hover:from-brand-600 hover:to-brand-700"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div>
            {selectedTransaction && (
              <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Transaksi: <span className="font-mono text-neutral-900 dark:text-neutral-100">{selectedTransaction.id.slice(0, 8)}</span>
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Tanggal: {selectedTransaction.tanggal}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total Asli: {formatCurrency(selectedTransaction.total)}
                </p>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                Tidak ada item dalam transaksi
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 w-12">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">Barcode</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">Nama Barang</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Qty Asli</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Sudah Return</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Sisa</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Return</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((item, index) => {
                    const qtyRemaining = item.qty_original - item.qty_returned;
                    const harga = item.harga_beli || item.harga_jual || 0;
                    const returnSubtotal = qtyRemaining * (harga - item.diskon);

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-neutral-600">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono text-neutral-900">{item.barcode}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900">{item.nama_barang}</td>
                        <td className="px-4 py-3 text-right text-neutral-900">{item.qty_original}</td>
                        <td className="px-4 py-3 text-right text-neutral-600">{item.qty_returned}</td>
                        <td className="px-4 py-3 text-right font-medium text-neutral-900">{qtyRemaining}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={qtyRemaining}
                            value={qtyRemaining}
                            onChange={(e) => handleReturnQtyChange(index, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-right border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-neutral-100"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-neutral-900">
                          {formatCurrency(returnSubtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {step === 2 && items.length > 0 && (
        <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl px-5 py-3 border border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Return</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalReturn)}</p>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={handleReset}
                className="px-6 py-3 border-2 border-neutral-200 rounded-xl hover:bg-neutral-50 font-medium text-neutral-700 transition-all"
              >
                Kembali
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || totalReturn === 0}
                className="px-8 py-3 bg-gradient-to-r from-brand-400 to-brand-500 text-white rounded-xl hover:from-brand-500 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md transition-all"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Return'}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

