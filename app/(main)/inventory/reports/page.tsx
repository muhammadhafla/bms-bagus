'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

import { StockReportTab } from './tabs/StockReportTab';
import { ValueReportTab } from './tabs/ValueReportTab';
import { SalesReportTab } from './tabs/SalesReportTab';
import { ProfitReportTab } from './tabs/ProfitReportTab';
import { TopItemsReportTab } from './tabs/TopItemsReportTab';

type ReportType = 'stock' | 'value' | 'sales' | 'profit' | 'top_items';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat laporan...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reportType = (searchParams.get('type') as ReportType) || 'stock';

  const setReportType = (type: ReportType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
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
          <StockReportTab stockMutations={stockMutations} page={page} totalPages={totalPages} setPage={setPage} />
        ) : reportType === 'value' ? (
          <ValueReportTab inventoryValue={inventoryValue} page={page} totalPages={totalPages} setPage={setPage} getTotalValue={getTotalValue} />
        ) : reportType === 'sales' ? (
          <SalesReportTab salesSummary={salesSummary} page={page} totalPages={totalPages} setPage={setPage} getTotalSales={getTotalSales} />
        ) : reportType === 'profit' ? (
          <ProfitReportTab profitSummary={profitSummary} page={page} totalPages={totalPages} setPage={setPage} getTotalProfit={getTotalProfit} />
        ) : reportType === 'top_items' ? (
          <TopItemsReportTab topItems={topItems} topItemsSort={topItemsSort} setTopItemsSort={setTopItemsSort} />
        ) : null}
      </div>
    </AmbientLayout>
  );
}