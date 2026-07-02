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
import { useQuery } from '@tanstack/react-query';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { dashboardApi, DashboardStats, LowStockItem, TrendData, RecentTransaction } from '@/lib/api';
import { Card } from '@/components/ui';


function HomeContent() {
  const { user, initialized } = useAuthStore();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ['dashboard', 'lowStock'],
    queryFn: () => dashboardApi.getLowStockItems().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: () => dashboardApi.get7DayTrend().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['dashboard', 'transactions'],
    queryFn: () => dashboardApi.getRecentTransactions().then(res => res.data),
    refetchInterval: 300000,
  });

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

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
        <div className="mb-5 lg:mb-8 animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-sm lg:text-base font-medium">
              Ringkasan performa dan stok barang.
            </p>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-6 mb-6">
          {statsLoading ? (
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
            <TrendChart data={trend || []} isLoading={trendLoading} />
          </div>

          {/* Right Column (Spans 4 columns) */}
          <div className="xl:col-span-4 flex flex-col gap-4 lg:gap-6">
            <div className="animate-fade-in-up flex-1" style={{ animationDelay: '250ms' }}>
              <LowStockAlert items={lowStock || []} isLoading={lowStockLoading} />
            </div>
            <div className="animate-fade-in-up flex-1" style={{ animationDelay: '300ms' }}>
              <RecentTransactions transactions={transactions || []} isLoading={transactionsLoading} />
            </div>
          </div>
        </div>

        {/* Baris 4: Summary */}
        <div className="grid grid-cols-1 gap-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <Card variant="flat" padding="lg" className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm rounded-3xl p-4 lg:p-6">
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4 lg:mb-5 text-base lg:text-lg">
                Ringkasan Stok
              </h3>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {statsLoading ? (
                  <>
                    <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                    <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                  </>
                ) : (
                  <>
                    <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800/80 shadow-sm relative overflow-hidden">
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium tracking-wide uppercase">Total Item Barang</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white mt-1 sm:mt-2 tracking-tight">{stats?.totalItems || 0}</p>
                      <p className="text-[10px] sm:text-xs text-brand-600 dark:text-brand-400 mt-0.5 sm:mt-1 font-medium">SKU Tersedia</p>
                    </div>
                    <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800/80 shadow-sm relative overflow-hidden">
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium tracking-wide uppercase">Transaksi Hari Ini</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white mt-1 sm:mt-2 tracking-tight">{stats?.todayTransactions || 0}</p>
                      <p className="text-[10px] sm:text-xs text-accent-teal-600 dark:text-accent-teal-400 mt-0.5 sm:mt-1 font-medium">Total Transaksi</p>
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

