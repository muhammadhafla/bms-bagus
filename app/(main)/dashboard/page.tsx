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
        <div className="mb-3 lg:mb-4 animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-1 text-sm lg:text-base font-medium">
              Ringkasan performa dan stok barang.
            </p>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 mb-4">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <div className="animate-fade-in-up [animation-delay:0ms]">
                <StatCard
                  title="Total Nilai Inventory"
                  value={stats?.totalInventoryValue || 0}
                  prefix="Rp "
                  icon={<IconCurrencyDollar size={22} />}
                  variant="default"
                />
              </div>
              <div className="animate-fade-in-up [animation-delay:50ms]">
                <StatCard
                  title="Penjualan Hari Ini"
                  value={stats?.todaySales || 0}
                  prefix="Rp "
                  icon={<IconArrowUpCircle size={22} />}
                  variant="success"
                />
              </div>
              <div className="animate-fade-in-up [animation-delay:100ms]">
                <StatCard
                  title="Pembelian Hari Ini"
                  value={stats?.todayPurchases || 0}
                  prefix="Rp "
                  icon={<IconShoppingCart size={22} />}
                  variant="warning"
                />
              </div>
              <div className="animate-fade-in-up [animation-delay:150ms]">
                <StatCard
                  title="Stok Minimum"
                  value={stats?.lowStockItems || 0}
                  icon={<IconAlertTriangle size={22} />}
                  suffix=" item"
                  variant={stats && stats.lowStockItems > 0 ? 'danger' : 'default'}
                />
              </div>
              <div className="animate-fade-in-up [animation-delay:200ms]">
                <StatCard
                  title="Total Item Barang"
                  value={stats?.totalItems || 0}
                  icon={<IconPackage size={22} />}
                  suffix=" SKU"
                  variant="default"
                />
              </div>
              <div className="animate-fade-in-up [animation-delay:250ms]">
                <StatCard
                  title="Transaksi Hari Ini"
                  value={stats?.todayTransactions || 0}
                  icon={<IconShoppingCart size={22} />}
                  variant="default"
                />
              </div>
            </>
          )}
        </div>

        {/* Baris 2 & 3: Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          <div className="animate-fade-in-up flex flex-col [animation-delay:300ms]">
            <TrendChart data={trend || []} isLoading={trendLoading} />
          </div>

          <div className="animate-fade-in-up flex flex-col [animation-delay:350ms]">
            <LowStockAlert items={lowStock || []} isLoading={lowStockLoading} />
          </div>
          
          <div className="animate-fade-in-up flex flex-col [animation-delay:400ms]">
            <RecentTransactions transactions={transactions || []} isLoading={transactionsLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}




export default function Home() {
  return <HomeContent />;
}

