'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
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

    const interval = setInterval(loadDashboard, 300000);
    return () => clearInterval(interval);
  }, [user]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-display font-bold text-neutral-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1.5 text-base font-medium">
            Berikut ringkasan inventaris toko anda
          </p>
        </div>

        {/* Statistik Utama - Staggered animation */}
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
              <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <StatCard
                  title="Total Nilai Inventory"
                  value={stats?.totalInventoryValue || 0}
                  prefix="Rp "
                  icon={<IconCurrencyDollar size={22} />}
                  variant="default"
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <StatCard
                  title="Penjualan Hari Ini"
                  value={stats?.todaySales || 0}
                  prefix="Rp "
                  icon={<IconArrowUpCircle size={22} />}
                  variant="success"
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <StatCard
                  title="Pembelian Hari Ini"
                  value={stats?.todayPurchases || 0}
                  prefix="Rp "
                  icon={<IconShoppingCart size={22} />}
                  variant="warning"
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <StatCard
                  title="Stok Minimum"
                  value={stats?.lowStockItems || 0}
                  icon={<IconAlertTriangle size={22} />}
                  suffix=" item"
                  variant={stats && stats.lowStockItems > 0 ? 'danger' : 'default'}
                />
              </div>
            </>
          )}
        </div>

        {/* Baris 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <TrendChart data={trend} isLoading={loading} />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <LowStockAlert items={lowStock} isLoading={loading} />
          </div>
        </div>

        {/* Baris 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <RecentTransactions transactions={transactions} isLoading={loading} />
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-card card-hover animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 text-lg">
              Ringkasan Inventaris
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {loading ? (
                <>
                  <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                  <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                </>
              ) : (
                <>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-950/30 dark:to-brand-900/20 border border-brand-200 dark:border-brand-800">
                    <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">Total Item Barang</p>
                    <p className="text-2xl font-bold text-brand-700 dark:text-brand-300 mt-1">{stats?.totalItems || 0}</p>
                    <p className="text-xs text-brand-500 dark:text-brand-500">SKU</p>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-accent-teal-50 to-accent-teal-100/50 dark:from-accent-teal-950/30 dark:to-accent-teal-900/20 border border-accent-teal-200 dark:border-accent-teal-800">
                    <p className="text-sm text-accent-teal-600 dark:text-accent-teal-400 font-medium">Transaksi Hari Ini</p>
                    <p className="text-2xl font-bold text-accent-teal-700 dark:text-accent-teal-300 mt-1">{stats?.todayTransactions || 0}</p>
                    <p className="text-xs text-accent-teal-500 dark:text-accent-teal-500">transaksi</p>
                  </div>
                </>
              )}
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