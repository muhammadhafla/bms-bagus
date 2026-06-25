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
import { Card } from '@/components/ui';


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
      <div className="flex-1 h-full flex items-center justify-center">
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
    <div className="relative flex flex-col h-full w-full">
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-5 lg:mb-8 animate-fade-in-up">
          <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-sm lg:text-base font-medium">
            Ringkasan performa dan stok barang.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-6 mb-6">
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

        {/* Baris 2 & 3: Bento Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6">
          {/* Main Chart Section (Spans 8 columns) */}
          <div className="xl:col-span-8 animate-fade-in-up flex flex-col" style={{ animationDelay: '200ms' }}>
            <TrendChart data={trend} isLoading={loading} />
          </div>

          {/* Right Column (Spans 4 columns) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="animate-fade-in-up flex-1" style={{ animationDelay: '250ms' }}>
              <LowStockAlert items={lowStock} isLoading={loading} />
            </div>
            <div className="animate-fade-in-up flex-1" style={{ animationDelay: '300ms' }}>
              <RecentTransactions transactions={transactions} isLoading={loading} />
            </div>
          </div>
        </div>

        {/* Baris 4: Summary */}
        <div className="grid grid-cols-1 gap-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <Card variant="flat" padding="lg" className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-2xl">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-5 text-lg">
                Ringkasan Stok
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {loading ? (
                  <>
                    <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                    <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                  </>
                ) : (
                  <>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-50/80 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/10 border border-brand-200/50 dark:border-brand-500/20 shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-colors" />
                      <p className="text-sm text-brand-600 dark:text-brand-400 font-medium tracking-wide uppercase">Total Item Barang</p>
                      <p className="text-3xl font-extrabold text-brand-700 dark:text-brand-300 mt-2 tracking-tight">{stats?.totalItems || 0}</p>
                      <p className="text-xs text-brand-500/80 dark:text-brand-400/80 mt-1 font-medium">SKU Tersedia</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-accent-teal-50/80 to-accent-teal-100/50 dark:from-accent-teal-900/30 dark:to-accent-teal-800/10 border border-accent-teal-200/50 dark:border-accent-teal-500/20 shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-accent-teal-500/10 rounded-full blur-2xl group-hover:bg-accent-teal-500/20 transition-colors" />
                      <p className="text-sm text-accent-teal-600 dark:text-accent-teal-400 font-medium tracking-wide uppercase">Transaksi Hari Ini</p>
                      <p className="text-3xl font-extrabold text-accent-teal-700 dark:text-accent-teal-300 mt-2 tracking-tight">{stats?.todayTransactions || 0}</p>
                      <p className="text-xs text-accent-teal-500/80 dark:text-accent-teal-400/80 mt-1 font-medium">Total Transaksi</p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}




export default function Home() {
  return <HomeContent />;
}

