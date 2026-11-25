'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  IconGift,
  IconReceipt2,
  IconBellRinging,
  IconChartBar,
  IconRefresh,
  IconShieldLock,
  IconArrowLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import Link from 'next/link';

import {
  LoyaltySettings,
  PointReward,
  MemberVoucher,
  LoyaltyBudgetMetrics,
} from '@/lib/types/loyalty';
import LoyaltyOverviewTab from '@/components/loyalty/LoyaltyOverviewTab';
import LoyaltyRewardsTab from '@/components/loyalty/LoyaltyRewardsTab';
import LoyaltyVouchersTab from '@/components/loyalty/LoyaltyVouchersTab';
import LoyaltyBroadcastTab from '@/components/loyalty/LoyaltyBroadcastTab';
import { PageLoadingSpinner } from '@/components/ui';
import { sanitizeSearchQuery } from '@/lib/utils';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
const VOUCHER_LIMIT = 20;

interface LoyaltyDashboardMetricsRpc {
  committed_budget: number;
  realized_budget: number;
  active_vouchers_count: number;
  used_vouchers_count: number;
  total_members_count: number;
  total_points_in_circulation: number;
  active_fcm_devices_count: number;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const { isAdmin, initialized, user, profile } = useAuthStore(
    useShallow((state) => ({
      isAdmin: state.isAdmin,
      initialized: state.initialized,
      user: state.user,
      profile: state.profile,
    })),
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'vouchers' | 'broadcast'>(
    'overview',
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [vouchers, setVouchers] = useState<MemberVoucher[]>([]);
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherTotalCount, setVoucherTotalCount] = useState(0);
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [debouncedVoucherSearch, setDebouncedVoucherSearch] = useState('');
  const [metrics, setMetrics] = useState<LoyaltyBudgetMetrics>({
    monthlyBudgetCap: 3000000,
    committedBudget: 0,
    realizedBudget: 0,
    remainingBudget: 3000000,
    usagePercentage: 0,
    isLocked: false,
    activeVouchersCount: 0,
    usedVouchersCount: 0,
    totalMembersCount: 0,
    activeFcmDevicesCount: 0,
    totalPointsInCirculation: 0,
    totalPointsRedeemed: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVoucherSearch(voucherSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [voucherSearch]);

  const voucherFilterKey = `${voucherStatusFilter}|${debouncedVoucherSearch}`;
  const [prevVoucherFilterKey, setPrevVoucherFilterKey] = useState(voucherFilterKey);
  if (voucherFilterKey !== prevVoucherFilterKey) {
    setPrevVoucherFilterKey(voucherFilterKey);
    setVoucherPage(1);
  }

  // Proteksi Akses Khusus Admin
  useEffect(() => {
    const isAuthFullyLoaded = initialized && (!user || profile !== null);
    if (isAuthFullyLoaded && !isAdmin()) {
      router.push('/');
    }
  }, [initialized, isAdmin, router, user, profile]);

  const loadAllData = useCallback(async () => {
    try {
      const from = (voucherPage - 1) * VOUCHER_LIMIT;
      const to = from + VOUCHER_LIMIT - 1;
      const nowIso = new Date().toISOString();

      let vouchersQuery = supabase
        .from('member_vouchers')
        .select(
          `
          *,
          members ( name, whatsapp_number ),
          point_rewards ( title, image_url )
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (voucherStatusFilter === 'active') {
        vouchersQuery = vouchersQuery.eq('status', 'active').gte('expires_at', nowIso);
      } else if (voucherStatusFilter === 'used') {
        vouchersQuery = vouchersQuery.eq('status', 'used');
      } else if (voucherStatusFilter === 'expired') {
        vouchersQuery = vouchersQuery.eq('status', 'active').lt('expires_at', nowIso);
      }

      const cleanSearch = sanitizeSearchQuery(debouncedVoucherSearch);
      if (cleanSearch) {
        vouchersQuery = vouchersQuery.or(
          `voucher_code.ilike.%${cleanSearch}%,title.ilike.%${cleanSearch}%`,
        );
      }

      const [settingsRes, rewardsRes, vouchersRes, metricsRes] = await Promise.all([
        supabase.from('loyalty_settings').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('point_rewards').select('*').order('points_required', { ascending: true }),
        vouchersQuery,
        supabase.rpc('get_loyalty_dashboard_metrics'),
      ]);

      const currentSettings: LoyaltySettings = settingsRes.data || {
        id: 'default',
        monthly_budget_cap: 3000000,
        max_active_vouchers_per_member: 2,
        is_redemption_locked: false,
        point_to_idr_ratio: 1.0,
      };
      setSettings(currentSettings);
      setRewards((rewardsRes.data as PointReward[]) || []);
      setVouchers((vouchersRes.data as MemberVoucher[]) || []);
      setVoucherTotalCount(vouchersRes.count ?? 0);

      if (metricsRes.error) {
        throw metricsRes.error;
      }

      const rpcMetrics = (metricsRes.data || {}) as unknown as LoyaltyDashboardMetricsRpc;
      const committed = Number(rpcMetrics.committed_budget || 0);
      const realized = Number(rpcMetrics.realized_budget || 0);
      const budgetCap = Number(currentSettings.monthly_budget_cap) || 3000000;
      const remaining = Math.max(0, budgetCap - committed);
      const usagePercent = budgetCap > 0 ? (committed / budgetCap) * 100 : 0;

      setMetrics({
        monthlyBudgetCap: budgetCap,
        committedBudget: committed,
        realizedBudget: realized,
        remainingBudget: remaining,
        usagePercentage: usagePercent,
        isLocked: currentSettings.is_redemption_locked || committed >= budgetCap,
        activeVouchersCount: Number(rpcMetrics.active_vouchers_count || 0),
        usedVouchersCount: Number(rpcMetrics.used_vouchers_count || 0),
        totalMembersCount: Number(rpcMetrics.total_members_count || 0),
        activeFcmDevicesCount: Number(rpcMetrics.active_fcm_devices_count || 0),
        totalPointsInCirculation: Number(rpcMetrics.total_points_in_circulation || 0),
        totalPointsRedeemed: committed,
      });
    } catch (err: any) {
      console.error('Error loading loyalty data:', err);
      toast.error('Gagal memuat data loyalitas: ' + (err?.message || 'Error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [voucherPage, voucherStatusFilter, debouncedVoucherSearch]);

  useEffect(() => {
    if (initialized && isAdmin()) {
      loadAllData();
    }
  }, [initialized, isAdmin, loadAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    toast.success('Data loyalitas berhasil diperbarui');
  };

  if (!initialized || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <PageLoadingSpinner />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-12">
        {/* Breadcrumb & Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <Link href="/dashboard" className="hover:text-neutral-800 dark:hover:text-neutral-200">
                Dashboard
              </Link>
              <IconChevronRight className="h-3.5 w-3.5" />
              <span className="text-neutral-900 dark:text-white">Program Loyalitas</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Manajemen App Loyalty (Kawan Bagus)
              </h1>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Pusat kendali reward poin, kuota anggaran diskon voucher, dan push notification ke aplikasi mobile pelanggan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <IconRefresh className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Ringkasan & Anggaran', icon: IconChartBar },
              { id: 'rewards', label: 'Katalog Reward', icon: IconGift, count: rewards.length },
              { id: 'vouchers', label: 'Voucher Member', icon: IconReceipt2, count: voucherTotalCount },
              { id: 'broadcast', label: 'Broadcast Notifikasi (FCM)', icon: IconBellRinging },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 border-b-2 py-3.5 text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                      : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Panels */}
        <div>
          {activeTab === 'overview' && (
            <LoyaltyOverviewTab
              metrics={metrics}
              settings={settings}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'rewards' && (
            <LoyaltyRewardsTab rewards={rewards} onRefresh={loadAllData} />
          )}

          {activeTab === 'vouchers' && (
            <LoyaltyVouchersTab
              vouchers={vouchers}
              onRefresh={loadAllData}
              page={voucherPage}
              totalCount={voucherTotalCount}
              limit={VOUCHER_LIMIT}
              onPageChange={setVoucherPage}
              statusFilter={voucherStatusFilter}
              onStatusFilterChange={setVoucherStatusFilter}
              searchQuery={voucherSearch}
              onSearchQueryChange={setVoucherSearch}
            />
          )}

          {activeTab === 'broadcast' && <LoyaltyBroadcastTab />}
        </div>
      </div>
    </PullToRefresh>
  );
}
