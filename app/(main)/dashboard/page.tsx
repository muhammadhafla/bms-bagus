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
import { useQuery } from '@tanstack/react-query';
import {
  StatCard,
  StatCardSkeleton,
  HeroStatCard,
  HeroStatCardSkeleton,
  CompactStatCard,
  CompactStatCardSkeleton,
  ListStatCard,
  ListStatCardSkeleton,
} from '@/components/dashboard/StatCard';
import dynamic from 'next/dynamic';
import {
  dashboardApi,
  DashboardStats,
  LowStockItem,
  TrendData,
  RecentTransaction,
  kasApi,
} from '@/lib/api';
import { Card } from '@/components/ui';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

const LowStockAlert = dynamic(
  () => import('@/components/dashboard/LowStockAlert').then((m) => m.LowStockAlert),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] animate-pulse rounded-3xl border border-white/20 bg-white/50 backdrop-blur dark:border-white/5 dark:bg-neutral-900/40" />
    ),
  },
);

const RecentTransactions = dynamic(
  () => import('@/components/dashboard/RecentTransactions').then((m) => m.RecentTransactions),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] animate-pulse rounded-3xl border border-white/20 bg-white/50 backdrop-blur dark:border-white/5 dark:bg-neutral-900/40" />
    ),
  },
);

const MobileLaunchpad = dynamic(
  () => import('@/components/dashboard/MobileLaunchpad').then((m) => m.MobileLaunchpad),
  { ssr: false },
);

const TrendChart = dynamic(
  () => import('@/components/dashboard/TrendChart').then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] animate-pulse rounded-3xl border border-white/20 bg-white/50 backdrop-blur dark:border-white/5 dark:bg-neutral-900/40" />
    ),
  },
);

function HomeContent() {
  const { user, initialized } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const router = useRouter();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
    refetchInterval: 300000,
  });

  const {
    data: lowStock,
    isLoading: lowStockLoading,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: ['dashboard', 'lowStock'],
    queryFn: () => dashboardApi.getLowStockItems().then((res) => res.data),
    refetchInterval: 300000,
  });

  const {
    data: trend,
    isLoading: trendLoading,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: () => dashboardApi.get7DayTrend().then((res) => res.data),
    refetchInterval: 300000,
  });

  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ['dashboard', 'transactions'],
    queryFn: () => dashboardApi.getRecentTransactions().then((res) => res.data),
    refetchInterval: 300000,
  });

  const {
    data: kasBalance,
    isLoading: kasBalanceLoading,
    refetch: refetchKas,
  } = useQuery({
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
      <div className="flex h-full flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
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
      refetchKas(),
    ]);
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex items-center justify-center py-4 text-neutral-400">
          <IconArrowDown className="h-5 w-5 animate-bounce" />
        </div>
      }
      refreshingContent={
        <div className="flex items-center justify-center py-4">
          <div className="border-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
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
      <div className="relative hidden h-full w-full flex-col lg:flex">
        <div className="relative z-10">
          {/* Header */}
          <div className="animate-fade-in-up mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center lg:mb-6">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                Dashboard
              </h1>
              <p className="mt-1 text-sm font-medium text-neutral-500 lg:text-base dark:text-neutral-400">
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
                      title={isAdminUser ? 'Saldo Kas Global' : 'Saldo Kas Shift Anda'}
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
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isAdminUser && (
              <div className="animate-fade-in-up flex flex-col [animation-delay:300ms]">
                <TrendChart data={trend || []} isLoading={trendLoading} />
              </div>
            )}

            <div className="animate-fade-in-up flex flex-col [animation-delay:350ms]">
              <LowStockAlert items={lowStock || []} isLoading={lowStockLoading} />
            </div>

            <div className="animate-fade-in-up flex flex-col [animation-delay:400ms]">
              <RecentTransactions
                transactions={transactions || []}
                isLoading={transactionsLoading}
              />
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
