'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import {
  IconPackage,
  IconShoppingCart,
  IconArrowUpCircle,
  IconCurrencyDollar,
  IconAlertTriangle,
  IconWallet,
  IconArrowDown,
} from '@tabler/icons-react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useQuery } from '@tanstack/react-query';
import { 
  StatCard, 
  StatCardSkeleton,
  HeroStatCard,
  HeroStatCardSkeleton,
  CompactStatCard,
  CompactStatCardSkeleton,
  ListStatCard,
  ListStatCardSkeleton
} from '@/components/dashboard/StatCard';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import dynamic from 'next/dynamic';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { dashboardApi, DashboardStats, LowStockItem, TrendData, RecentTransaction, kasApi } from '@/lib/api';
import { Card } from '@/components/ui';
import { MobileLaunchpad } from '@/components/dashboard/MobileLaunchpad';

const TrendChart = dynamic(
  () => import('@/components/dashboard/TrendChart').then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] rounded-3xl bg-white/50 dark:bg-neutral-900/40 backdrop-blur border border-white/20 dark:border-white/5 animate-pulse" />
    ),
  }
);

function HomeContent() {
  const { user, initialized } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: lowStock, isLoading: lowStockLoading, refetch: refetchLowStock } = useQuery({
    queryKey: ['dashboard', 'lowStock'],
    queryFn: () => dashboardApi.getLowStockItems().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: trend, isLoading: trendLoading, refetch: refetchTrend } = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: () => dashboardApi.get7DayTrend().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTx } = useQuery({
    queryKey: ['dashboard', 'transactions'],
    queryFn: () => dashboardApi.getRecentTransactions().then(res => res.data),
    refetchInterval: 300000,
  });

  const { data: kasBalance, isLoading: kasBalanceLoading, refetch: refetchKas } = useQuery({
    queryKey: ['dashboard', 'kasBalance', isAdminUser ? 'global' : user?.id],
    queryFn: async () => {
      if (isAdminUser) {
        const res = await kasApi.getSummary({});
        return res.saldo || 0;
      } else {
        const res = await kasApi.getCurrentShiftBalance(user!.id);
        return res.saldo || 0;
      }
    },
    enabled: !!user,
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

  const handleRefresh = async () => {
    await Promise.all([
      refetchStats(),
      refetchLowStock(),
      refetchTrend(),
      refetchTx(),
      refetchKas()
    ]);
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex items-center justify-center py-4 text-neutral-400">
          <IconArrowDown className="w-5 h-5 animate-bounce" />
        </div>
      }
      refreshingContent={
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {/* Mobile View (Launchpad) */}
      <div className="block lg:hidden">
        <MobileLaunchpad 
          stats={stats}
          kasBalance={kasBalance || 0}
          lowStock={lowStock}
          recentTransactions={transactions}
          isAdminUser={isAdminUser}
          isLoading={statsLoading || kasBalanceLoading}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Desktop View (Original Dashboard) */}
      <div className="hidden lg:flex relative flex-col h-full w-full">
        <div className="relative z-10">
          {/* Header */}
          <div className="mb-4 lg:mb-6 animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Dashboard
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm lg:text-base font-medium">
                Ringkasan performa dan stok barang.
              </p>
            </div>
          </div>

          {/* SaaS Native App Layout for Stats */}
          <div className="mb-6">
            {statsLoading ? (
              <div className="flex flex-col gap-4">
                <HeroStatCardSkeleton />
                <div className="flex flex-col gap-2">
                  <ListStatCardSkeleton />
                  <ListStatCardSkeleton />
                  <ListStatCardSkeleton />
                  <ListStatCardSkeleton />
                  <ListStatCardSkeleton />
                  <ListStatCardSkeleton />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {isAdminUser && (
                  <div className="animate-fade-in-up [animation-delay:0ms]">
                    <HeroStatCard
                      title="Penjualan Hari Ini"
                      value={stats?.todaySales || 0}
                      prefix="Rp "
                      icon={<IconArrowUpCircle size={24} />}
                      variant="success"
                    />
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  {isAdminUser && (
                    <>
                      <div className="animate-fade-in-up [animation-delay:50ms]">
                        <ListStatCard
                          title="Total Nilai Inventory"
                          value={stats?.totalInventoryValue || 0}
                          prefix="Rp "
                          icon={<IconCurrencyDollar size={20} />}
                          variant="default"
                        />
                      </div>
                      <div className="animate-fade-in-up [animation-delay:100ms]">
                        <ListStatCard
                          title="Pembelian Hari Ini"
                          value={stats?.todayPurchases || 0}
                          prefix="Rp "
                          icon={<IconShoppingCart size={20} />}
                          variant="warning"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="animate-fade-in-up [animation-delay:120ms]">
                    <ListStatCard
                      title={isAdminUser ? "Saldo Kas Global" : "Saldo Kas Shift Anda"}
                      value={kasBalance || 0}
                      prefix="Rp "
                      icon={<IconWallet size={20} />}
                      variant="success"
                    />
                  </div>

                  <div className="animate-fade-in-up [animation-delay:150ms]">
                    <ListStatCard
                      title="Total Item Barang"
                      value={stats?.totalItems || 0}
                      icon={<IconPackage size={20} />}
                      suffix=" SKU"
                      variant="default"
                    />
                  </div>
                  <div className="animate-fade-in-up [animation-delay:200ms]">
                    <ListStatCard
                      title="Stok Minimum"
                      value={stats?.lowStockItems || 0}
                      icon={<IconAlertTriangle size={20} />}
                      suffix=" item"
                      variant={stats && stats.lowStockItems > 0 ? 'danger' : 'default'}
                    />
                  </div>
                  <div className="animate-fade-in-up [animation-delay:250ms]">
                    <ListStatCard
                      title="Transaksi Hari Ini"
                      value={stats?.todayTransactions || 0}
                      icon={<IconShoppingCart size={20} />}
                      variant="default"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Baris 2 & 3: Bento Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
            {isAdminUser && (
              <div className="animate-fade-in-up flex flex-col [animation-delay:300ms]">
                <TrendChart data={trend || []} isLoading={trendLoading} />
              </div>
            )}

            <div className="animate-fade-in-up flex flex-col [animation-delay:350ms]">
              <LowStockAlert items={lowStock || []} isLoading={lowStockLoading} />
            </div>
            
            <div className="animate-fade-in-up flex flex-col [animation-delay:400ms]">
              <RecentTransactions transactions={transactions || []} isLoading={transactionsLoading} />
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}




export default function Home() {
  return <HomeContent />;
}

