'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportApi, kategoriApi, StockMutation, InventoryValue, SalesSummary, ProfitSummary, TopSellingItem } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IconReport, IconPackage, IconCash, IconShoppingCart, IconTrendingUp, IconDownload, IconChartBar } from '@tabler/icons-react';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button, Breadcrumb, AmbientLayout } from '@/components/ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type ReportType = 'stock' | 'value' | 'sales' | 'profit' | 'top_items';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('stock');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{id: string, nama: string}[]>([]);
  const [stockMutations, setStockMutations] = useState<StockMutation[]>([]);
  const [inventoryValue, setInventoryValue] = useState<InventoryValue[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary[]>([]);
  const [topItems, setTopItems] = useState<TopSellingItem[]>([]);
  const [topItemsSort, setTopItemsSort] = useState<'qty' | 'profit'>('qty');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const fetchReport = async (type: ReportType, start: string, end: string, catId: string, currentPage: number) => {
    setLoading(true);
    setError(null);

    const pagination = { page: currentPage, limit: ITEMS_PER_PAGE };

    try {
      if (type === 'stock') {
        const result = await reportApi.getStockMutations(start || undefined, end || undefined, pagination);
        if (result.error) {
          setError('Gagal memuat mutasi stock');
        } else {
          setStockMutations(result.data || []);
          setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE) || 1);
        }
      } else if (type === 'value') {
        const result = await reportApi.getInventoryValue(pagination);
        if (result.error) {
          setError('Gagal memuat nilai inventory');
        } else {
          setInventoryValue(result.data || []);
          setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE) || 1);
        }
      } else if (type === 'sales') {
        const result = await reportApi.getSalesReport(start || undefined, end || undefined, catId || undefined, pagination);
        if (result.error) {
          setError('Gagal memuat laporan penjualan');
        } else {
          setSalesSummary(result.data || []);
          setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE) || 1);
        }
      } else if (type === 'profit') {
        const result = await reportApi.getProfitReport(start || undefined, end || undefined, catId || undefined, pagination);
        if (result.error) {
          setError('Gagal memuat laporan profit');
        } else {
          setProfitSummary(result.data || []);
          setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE) || 1);
        }
      } else if (type === 'top_items') {
        const result = await reportApi.getTopSellingItems(start || undefined, end || undefined, catId || undefined, 20);
        if (result.error) {
          setError('Gagal memuat barang terlaris');
        } else {
          setTopItems(result.data || []);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await kategoriApi.getAll();
      if (!res.error && res.data) {
        setCategories(res.data);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [reportType, startDate, endDate, categoryId]);

  useEffect(() => {
    fetchReport(reportType, startDate, endDate, categoryId, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, page]);

  const handleRefresh = () => {
    fetchReport(reportType, startDate, endDate, categoryId, page);
  };

  const handleExportCSV = () => {
    let csvData = '';
    let filename = `report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const arrayToCsv = (headers: string[], rows: any[][]) => {
      return [
        headers.join(','),
        ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
    };

    if (reportType === 'stock') {
      csvData = arrayToCsv(
        ['Tanggal', 'Barcode', 'Nama Barang', 'Tipe', 'Qty', 'Transaksi'],
        stockMutations.map(m => [new Date(m.created_at).toLocaleDateString('id-ID'), m.barcode || '', m.nama_barang || '', m.tipe, m.qty_mutation, m.transaction_type])
      );
    } else if (reportType === 'value') {
      csvData = arrayToCsv(
        ['Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Harga Beli', 'Harga Jual', 'Nilai Total'],
        inventoryValue.map(i => [i.barcode || '', i.nama_barang || '', i.kategori, i.stok, i.harga_beli, i.harga_jual, i.total_value])
      );
    } else if (reportType === 'sales') {
      csvData = arrayToCsv(
        ['Tanggal', 'Jumlah Transaksi', 'Total Penjualan'],
        salesSummary.map(s => [s.date, s.transaction_count, s.total_sales])
      );
    } else if (reportType === 'profit') {
      csvData = arrayToCsv(
        ['Tanggal', 'Total Modal (HPP)', 'Total Penjualan', 'Profit', 'Margin %'],
        profitSummary.map(s => [s.date, s.total_modal, s.total_penjualan, s.total_profit, s.margin_percentage.toFixed(2) + '%'])
      );
    } else if (reportType === 'top_items') {
      const sorted = [...topItems].sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit);
      csvData = arrayToCsv(
        ['Barang', 'Qty Terjual', 'Total Penjualan', 'Total Profit'],
        sorted.map(t => [t.nama_barang, t.total_qty, t.total_sales, t.total_profit])
      );
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

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
    <AmbientLayout>
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5 animate-fade-in-up pl-12 lg:pl-0">
          <div className="flex items-center gap-4">
            <IconReport className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Laporan</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-xs lg:text-base font-medium">Monitoring & analytics</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <Button
            variant={reportType === 'stock' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setReportType('stock')}
          >
            Mutasi Stock
          </Button>
          <Button
            variant={reportType === 'value' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setReportType('value')}
          >
            Nilai Inventory
          </Button>
          <Button
            variant={reportType === 'sales' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setReportType('sales')}
          >
            Penjualan
          </Button>
          <Button
            variant={reportType === 'profit' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setReportType('profit')}
          >
            Profit
          </Button>
          <Button
            variant={reportType === 'top_items' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setReportType('top_items')}
          >
            Top Items
          </Button>
        </div>

        {reportType !== 'value' && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-5">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3 w-full sm:w-auto">
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
            </div>
            {['sales', 'profit', 'top_items'].includes(reportType) && (
              <div className="flex flex-col gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Kategori:</label>
                <SelectInput
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[{ value: '', label: 'Semua Kategori' }, ...categories.map(c => ({ value: c.id, label: c.nama }))]}
                  placeholder="Semua Kategori"
                  className="w-full sm:w-40"
                />
              </div>
            )}
            <div className="flex items-center gap-2 mb-0.5 w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="primary"
                size="sm"
                className="flex-1 sm:flex-none justify-center"
              >
                Refresh
              </Button>
              <Button
                onClick={handleExportCSV}
                disabled={loading}
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none justify-center sm:ml-auto"
              >
                <IconDownload size={16} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="inline sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-4 bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 rounded-xl text-sm border border-danger-100 dark:border-danger-800 flex items-center gap-2">
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>

      <div className="flex-1">
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
            <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
              <div className="overflow-x-auto hidden lg:block">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
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
                      <tr key={mutation.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
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

              <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                {stockMutations.map((mutation) => (
                  <div key={mutation.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{mutation.nama_barang}</div>
                        <div className="text-xs text-neutral-500 font-mono mt-0.5">{mutation.barcode}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        mutation.type === 'in' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                      }`}>
                        {mutation.type === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-500">{new Date(mutation.created_at).toLocaleDateString('id-ID')}</span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{mutation.transaction_type}</span>
                      </div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-lg">
                        {mutation.qty_mutation > 0 ? `+${mutation.qty_mutation}` : mutation.qty_mutation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 gap-4">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
                  </div>
                </div>
              )}
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
                <div className="bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated">
                  <p className="text-emerald-100 text-sm font-medium">Total Nilai Inventory</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalValue())}</p>
                </div>
                <div className="bg-gradient-to-br from-brand-500/90 to-brand-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated">
                  <p className="text-brand-100 text-sm font-medium">Total Item</p>
                  <p className="text-3xl font-bold mt-1">{inventoryValue.length}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
                <div className="overflow-x-auto hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
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
                        <tr key={item.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
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

                <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                  {inventoryValue.map((item) => (
                    <div key={item.id} className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</div>
                          <div className="text-xs text-neutral-500 font-mono mt-0.5">{item.barcode}</div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium">
                          {item.kategori}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                        <div>
                          <span className="text-neutral-500 text-xs">Stok</span>
                          <div className="font-semibold">{item.stok}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-neutral-500 text-xs">Nilai Total</span>
                          <div className="font-bold text-brand-600 dark:text-brand-400">{formatCurrency(item.total_value)}</div>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-xs">Hrg Beli</span>
                          <div className="text-neutral-700 dark:text-neutral-300">{formatCurrency(item.harga_beli)}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-neutral-500 text-xs">Hrg Jual</span>
                          <div className="text-neutral-700 dark:text-neutral-300">{formatCurrency(item.harga_jual)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 mt-4 rounded-3xl gap-4">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
                  </div>
                </div>
              )}
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
              <div className="bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated mb-6">
                <p className="text-blue-100 text-sm font-medium">Total Penjualan</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalSales())}</p>
              </div>

              <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
                <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Tren Penjualan</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...salesSummary].reverse()} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis tickFormatter={(val) => `Rp ${val / 1000}k`} tick={{fontSize: 12}} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="total_sales" name="Total Penjualan" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
                <div className="overflow-x-auto hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Jumlah Transaksi</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {salesSummary.map((item) => (
                        <tr key={item.date} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-700 dark:text-neutral-300">{item.transaction_count}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                  {salesSummary.map((item) => (
                    <div key={item.date} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.date}</div>
                        <div className="text-sm text-neutral-500">{item.transaction_count} Transaksi</div>
                      </div>
                      <div className="font-bold text-brand-600 dark:text-brand-400">
                        {formatCurrency(item.total_sales)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 mt-4 rounded-3xl gap-4">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )
        ) : reportType === 'profit' ? (
          profitSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
              <IconTrendingUp className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Tidak ada data profit</p>
            </div>
          ) : (
            <>
              <div className={`rounded-3xl border border-white/20 backdrop-blur-md p-5 shadow-elevated mb-6 ${
                getTotalProfit() >= 0 
                  ? 'bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 text-white' 
                  : 'bg-gradient-to-br from-rose-500/90 to-rose-600/90 text-white'
              }`}>
                <p className="text-sm font-medium opacity-80">Total Profit</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalProfit())}</p>
              </div>

              <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
                <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Tren Profit</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...profitSummary].reverse()} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis tickFormatter={(val) => `Rp ${val / 1000}k`} tick={{fontSize: 12}} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="total_profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="total_penjualan" name="Penjualan" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
                <div className="overflow-x-auto hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Modal (HPP)</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Profit</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {profitSummary.map((item) => (
                        <tr key={item.date} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_modal)}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_penjualan)}</td>
                          <td className={`px-4 py-3.5 text-right font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(item.total_profit)}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-bold ${item.margin_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {item.margin_percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                  {profitSummary.map((item) => (
                    <div key={item.date} className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.date}</div>
                        <div className={`font-bold ${item.margin_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          Margin: {item.margin_percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                        <div>
                          <span className="text-neutral-500 text-xs">Penjualan</span>
                          <div className="font-medium">{formatCurrency(item.total_penjualan)}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-neutral-500 text-xs">Profit</span>
                          <div className={`font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(item.total_profit)}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-xs">Modal (HPP)</span>
                          <div className="text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_modal)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 mt-4 rounded-3xl gap-4">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
                    <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )
        ) : reportType === 'top_items' ? (
          topItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
              <IconChartBar className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Tidak ada data penjualan barang</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Urutkan berdasarkan:</span>
                <Button 
                  size="sm" 
                  variant={topItemsSort === 'qty' ? 'primary' : 'secondary'} 
                  onClick={() => setTopItemsSort('qty')}
                >
                  Qty Terjual
                </Button>
                <Button 
                  size="sm" 
                  variant={topItemsSort === 'profit' ? 'primary' : 'secondary'} 
                  onClick={() => setTopItemsSort('profit')}
                >
                  Total Profit
                </Button>
              </div>
              
              <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
                <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">10 Barang Terlaris ({topItemsSort === 'qty' ? 'Kuantitas' : 'Profit'})</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[...topItems].sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit).slice(0, 10)} 
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="nama_barang" tick={{fontSize: 11}} width={150} tickFormatter={(val) => val.length > 15 ? val.substring(0,15) + '...' : val} />
                      <YAxis tick={{fontSize: 12}} tickFormatter={(val) => topItemsSort === 'profit' ? `Rp ${val / 1000}k` : val} />
                      <Tooltip formatter={(value: any) => topItemsSort === 'profit' ? formatCurrency(Number(value)) : value} />
                      <Bar 
                        dataKey={topItemsSort === 'qty' ? 'total_qty' : 'total_profit'} 
                        name={topItemsSort === 'qty' ? 'Qty Terjual' : 'Total Profit'} 
                        fill="#8b5cf6" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
                <div className="overflow-x-auto hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Qty Terjual</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {[...topItems].sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit).map((item) => (
                        <tr key={item.inventory_id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{item.nama_barang}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-brand-600 dark:text-brand-400">{item.total_qty}</td>
                          <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_sales)}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.total_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                  {[...topItems].sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit).map((item, index) => (
                    <div key={item.inventory_id} className="p-4 flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-sm text-neutral-500">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">{item.nama_barang}</div>
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-neutral-500 text-xs block">Terjual</span>
                            <span className="font-bold text-brand-600 dark:text-brand-400">{item.total_qty}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-500 text-xs block">Total Profit</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.total_profit)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        ) : null}
      </div>
    </AmbientLayout>
  );
}