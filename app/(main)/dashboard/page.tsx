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
  RecentTransaction,
  kasApi,
} from '@/lib/api';
import { Card } from '@/components/ui';

import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SoftPromptBanner } from '@/components/SoftPromptBanner';
import { HRAlerts } from '@/components/dashboard/HRAlerts';
import { MobileLaunchpad } from '@/components/dashboard/MobileLaunchpad';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });


function HomeContent() {
  const { user, initialized } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const router = useRouter();

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!initialized || !mounted) {
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
      <SoftPromptBanner />
      
      {/* Mobile View (Launchpad) */}
      {!isDesktop && (
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
      )}

      {/* Desktop View (Original Dashboard) */}
      {isDesktop && (
        <div className="relative hidden h-full w-full flex-col lg:flex">
          <div className="relative z-10">
            {/* Header */}
            <div className="animate-fade-in-up mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                  Dashboard
                </h1>
                <p className="mt-1 hidden md:block text-sm font-medium text-neutral-500 lg:text-base dark:text-neutral-400">
                  Ringkasan performa dan stok barang.
                </p>
              </div>

              {isAdminUser && (
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                  <div className="flex items-end gap-3">
                    {stats && stats.todaySales > 0 && (
                      <span className="mb-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        +{(stats.todayTransactions || 0)} Trx
                      </span>
                    )}
                    <p className="text-[2rem] leading-none font-black tracking-tighter text-neutral-900 dark:text-white">
                      {statsLoading ? '...' : `Rp ${(stats?.todaySales || 0).toLocaleString('id-ID')}`}
                    </p>
                  </div>
                  <p className="mt-1 text-sm font-bold text-neutral-500 dark:text-neutral-400">
                    Penjualan hari ini
                  </p>
                </div>
              )}
            </div>

            {/* Dashboard Stats Grid */}
            <div className="mb-6">
              {statsLoading ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <CompactStatCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {isAdminUser && (
                    <>
                      <div className="animate-fade-in-up [animation-delay:50ms]">
                        <CompactStatCard
                          title="Total Nilai Inventory"
                          value={stats?.totalInventoryValue || 0}
                          prefix="Rp "
                          icon={<IconCurrencyDollar size={20} />}
                          variant="default"
                          onClick={() => router.push('/inventory')}
                        />
                      </div>
                      <div className="animate-fade-in-up [animation-delay:100ms]">
                        <CompactStatCard
                          title="Pembelian Hari Ini"
                          value={stats?.todayPurchases || 0}
                          prefix="Rp "
                          icon={<IconShoppingCart size={20} />}
                          variant="warning"
                          onClick={() => router.push('/purchasing')}
                        />
                      </div>
                    </>
                  )}

                  <div className="animate-fade-in-up [animation-delay:120ms]">
                    <CompactStatCard
                      title={isAdminUser ? 'Saldo Kas Global' : 'Saldo Kas Shift Anda'}
                      value={kasBalance || 0}
                      prefix="Rp "
                      icon={<IconWallet size={20} />}
                      variant="success"
                      onClick={isAdminUser ? () => router.push('/finance/cash-flow') : undefined}
                    />
                  </div>

                  <div className="animate-fade-in-up [animation-delay:150ms]">
                    <CompactStatCard
                      title="Total Item Barang"
                      value={stats?.totalItems || 0}
                      icon={<IconPackage size={20} />}
                      suffix=" SKU"
                      variant="default"
                      onClick={() => router.push('/inventory')}
                    />
                  </div>
                  
                  <div className="animate-fade-in-up [animation-delay:200ms]">
                    <CompactStatCard
                      title="Stok Minimum"
                      value={stats?.lowStockItems || 0}
                      icon={<IconAlertTriangle size={20} />}
                      suffix=" item"
                      variant={stats && stats.lowStockItems > 0 ? 'danger' : 'default'}
                      onClick={() => router.push('/inventory')}
                    />
                  </div>
                  
                  <div className="animate-fade-in-up [animation-delay:250ms]">
                    <CompactStatCard
                      title="Transaksi Hari Ini"
                      value={stats?.todayTransactions || 0}
                      icon={<IconShoppingCart size={20} />}
                      variant="default"
                      onClick={() => router.push('/transactions/history')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Baris 2 & 3: Bento Layout */}
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isAdminUser && (
                <>
                  <div className="animate-fade-in-up flex flex-col [animation-delay:320ms]">
                    <HRAlerts />
                  </div>
                </>
              )}

              <div className="animate-fade-in-up flex flex-col [animation-delay:350ms]">
                <LowStockAlert
                  items={lowStock || []}
                  isLoading={lowStockLoading}
                  totalCount={stats?.lowStockItems || 0}
                />
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
      )}
    </PullToRefresh>
  );
}

export default function Home() {
  return <HomeContent />;
}
