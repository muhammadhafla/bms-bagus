'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import Header from '@/components/ui/Header';
import {
  IconPackage,
  IconShoppingCart,
  IconArrowUpCircle,
  IconCurrencyDollar,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { dashboardApi, DashboardStats, LowStockItem, TrendData, RecentTransaction } from '@/lib/api';

function HomeContent() {
  const { user, initialized } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [statsRes, lowStockRes, trendRes, transactionsRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getLowStockItems(),
          dashboardApi.get7DayTrend(),
          dashboardApi.getRecentTransactions(),
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (lowStockRes.data) setLowStock(lowStockRes.data);
        if (trendRes.data) setTrend(trendRes.data);
        if (transactionsRes.data) setTransactions(transactionsRes.data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    // Refresh setiap 5 menit
    const interval = setInterval(loadDashboard, 300000);
    return () => clearInterval(interval);
  }, [user]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <Header title="Dashboard" />
      
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-1">
              Dashboard
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Selamat datang kembali, berikut ringkasan inventaris toko anda
            </p>
          </div>

          {/* Statistik Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title="Total Nilai Inventory"
                  value={stats?.totalInventoryValue || 0}
                  prefix="Rp "
                  icon={<IconCurrencyDollar size={20} />}
                  variant="default"
                />
                <StatCard
                  title="Penjualan Hari Ini"
                  value={stats?.todaySales || 0}
                  prefix="Rp "
                  icon={<IconArrowUpCircle size={20} />}
                  variant="success"
                />
                <StatCard
                  title="Pembelian Hari Ini"
                  value={stats?.todayPurchases || 0}
                  prefix="Rp "
                  icon={<IconShoppingCart size={20} />}
                  variant="warning"
                />
                <StatCard
                  title="Stok Minimum"
                  value={stats?.lowStockItems || 0}
                  icon={<IconAlertTriangle size={20} />}
                  suffix=" item"
                  variant={stats && stats.lowStockItems > 0 ? 'danger' : 'default'}
                />
              </>
            )}
          </div>

          {/* Baris 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <TrendChart data={trend} isLoading={loading} />
            </div>
            <LowStockAlert items={lowStock} isLoading={loading} />
          </div>

          {/* Baris 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RecentTransactions transactions={transactions} isLoading={loading} />
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Ringkasan Inventaris
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {loading ? (
                  <>
                    <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Item Barang</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.totalItems || 0} SKU</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Transaksi Hari Ini</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.todayTransactions || 0}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
