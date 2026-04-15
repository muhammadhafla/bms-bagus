'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportApi, StockMutation, InventoryValue, SalesSummary, ProfitSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IconReport, IconPackage, IconCash, IconShoppingCart, IconTrendingUp } from '@tabler/icons-react';
import DateInput from '@/components/ui/DateInput';

type ReportType = 'stock' | 'value' | 'sales' | 'profit';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('stock');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stockMutations, setStockMutations] = useState<StockMutation[]>([]);
  const [inventoryValue, setInventoryValue] = useState<InventoryValue[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (reportType === 'stock') {
        const result = await reportApi.getStockMutations(startDate || undefined, endDate || undefined);
        if (result.error) {
          setError('Gagal memuat mutasi stock');
        } else {
          setStockMutations(result.data || []);
        }
      } else if (reportType === 'value') {
        const result = await reportApi.getInventoryValue();
        if (result.error) {
          setError('Gagal memuat nilai inventory');
        } else {
          setInventoryValue(result.data || []);
        }
      } else if (reportType === 'sales') {
        const result = await reportApi.getSalesReport(startDate || undefined, endDate || undefined);
        if (result.error) {
          setError('Gagal memuat laporan penjualan');
        } else {
          setSalesSummary(result.data || []);
        }
      } else if (reportType === 'profit') {
        const result = await reportApi.getProfitReport(startDate || undefined, endDate || undefined);
        if (result.error) {
          setError('Gagal memuat laporan profit');
        } else {
          setProfitSummary(result.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const getTotalValue = () => {
    return inventoryValue.reduce((sum, item) => sum + item.total_value, 0);
  };

  const getTotalSales = () => {
    return salesSummary.reduce((sum, item) => sum + item.total_sales, 0);
  };

  const getTotalProfit = () => {
    return profitSummary.reduce((sum, item) => sum + item.total_profit, 0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center shadow-md">
              <IconReport className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Laporan</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Monitoring & analytics</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setReportType('stock')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              reportType === 'stock'
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Mutasi Stock
          </button>
          <button
            onClick={() => setReportType('value')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              reportType === 'value'
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Nilai Inventory
          </button>
          <button
            onClick={() => setReportType('sales')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              reportType === 'sales'
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Penjualan
          </button>
          <button
            onClick={() => setReportType('profit')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              reportType === 'profit'
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Profit
          </button>
        </div>

        {reportType !== 'value' && (
          <div className="flex flex-wrap gap-3 items-center">
            <DateInput
              value={startDate}
              onChange={setStartDate}
              label="Dari:"
              inputSize="sm"
            />
            <DateInput
              value={endDate}
              onChange={setEndDate}
              label="Sampai:"
              inputSize="sm"
            />
            <button
              onClick={loadReport}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 shadow-md transition-all font-medium"
            >
              Refresh
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-800 flex items-center gap-2">
            <span className="font-medium">{error}</span>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
            <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-700 border-t-brand-600 rounded-full animate-spin mb-4"></div>
            <p className="text-neutral-500 dark:text-neutral-400">Memuat data...</p>
          </div>
        ) : reportType === 'stock' ? (
          stockMutations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
              <IconPackage className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Tidak ada data mutasi stock</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                      <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barcode</th>
                      <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                      <th className="px-4 py-4 text-center text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tipe</th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {stockMutations.map((mutation) => (
                      <tr key={mutation.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {new Date(mutation.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">{mutation.barcode}</td>
                        <td className="px-4 py-3.5 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{mutation.nama_barang}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            mutation.type === 'in' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                          }`}>
                            {mutation.type === 'in' ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                          {mutation.qty_mutation > 0 ? `+${mutation.qty_mutation}` : mutation.qty_mutation}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-400">{mutation.transaction_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : reportType === 'value' ? (
          inventoryValue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
              <IconCash className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Tidak ada data inventory</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-emerald-100 text-sm font-medium">Total Nilai Inventory</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalValue())}</p>
                </div>
                <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-brand-100 text-sm font-medium">Total Item</p>
                  <p className="text-3xl font-bold mt-1">{inventoryValue.length}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barcode</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Kategori</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Stok</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Harga Beli</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Harga Jual</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nilai Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {inventoryValue.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">{item.barcode}</td>
                          <td className="px-4 py-3.5 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{item.nama_barang}</td>
                          <td className="px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">{item.stok}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.harga_beli)}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.harga_jual)}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : reportType === 'sales' ? (
          salesSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
              <IconShoppingCart className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Tidak ada data penjualan</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg mb-6">
                <p className="text-blue-100 text-sm font-medium">Total Penjualan</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalSales())}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Jumlah Transaksi</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {salesSummary.map((item) => (
                        <tr key={item.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-700 dark:text-neutral-300">{item.transaction_count}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : (
          profitSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
              <IconTrendingUp className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Tidak ada data profit</p>
            </div>
          ) : (
            <>
              <div className={`rounded-2xl p-5 shadow-lg mb-6 ${
                getTotalProfit() >= 0 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' 
                  : 'bg-gradient-to-br from-rose-500 to-rose-600 text-white'
              }`}>
                <p className="text-sm font-medium opacity-80">Total Profit</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalProfit())}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Pembelian</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {profitSummary.map((item) => (
                        <tr key={item.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_pembelian)}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_penjualan)}</td>
                          <td className={`px-4 py-3.5 text-right font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(item.total_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}