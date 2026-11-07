'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function LoyaltyPage() {
  const router = useRouter();
  const { isAdmin, initialized, user, profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'vouchers' | 'broadcast'>(
    'overview',
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [vouchers, setVouchers] = useState<MemberVoucher[]>([]);
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

  // Proteksi Akses Khusus Admin
  useEffect(() => {
    const isAuthFullyLoaded = initialized && (!user || profile !== null);
    if (isAuthFullyLoaded && !isAdmin()) {
      router.push('/');
    }
  }, [initialized, isAdmin, router, user, profile]);

  const loadAllData = useCallback(async () => {
    try {
      // 1. Ambil Pengaturan Anggaran Loyalitas
      const { data: settingsData } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      const currentSettings: LoyaltySettings = settingsData || {
        id: 'default',
        monthly_budget_cap: 3000000,
        max_active_vouchers_per_member: 2,
        is_redemption_locked: false,
        point_to_idr_ratio: 1.0,
      };
      setSettings(currentSettings);

      // 2. Ambil Katalog Rewards
      const { data: rewardsData } = await supabase
        .from('point_rewards')
        .select('*')
        .order('points_required', { ascending: true });

      setRewards((rewardsData as PointReward[]) || []);

      // 3. Ambil Voucher Member + Member detail
      const { data: vouchersData } = await supabase
        .from('member_vouchers')
        .select(
          `
          *,
          members ( name, whatsapp_number ),
          point_rewards ( title, image_url )
        `,
        )
        .order('created_at', { ascending: false });

      const parsedVouchers = (vouchersData as MemberVoucher[]) || [];
      setVouchers(parsedVouchers);

      // 4. Hitung Metrik & Pengendalian Anggaran (Bulan Berjalan)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let committed = 0;
      let realized = 0;
      let activeCount = 0;
      let usedCount = 0;

      parsedVouchers.forEach((v) => {
        const isCurrentMonth = new Date(v.created_at) >= new Date(startOfMonth);
        const isExpired = new Date(v.expires_at) < now;

        if (v.status === 'active' && !isExpired) {
          activeCount++;
          if (isCurrentMonth) {
            committed += Number(v.discount_nominal || 0);
          }
        } else if (v.status === 'used') {
          usedCount++;
          if (isCurrentMonth) {
            committed += Number(v.discount_nominal || 0);
            realized += Number(v.discount_nominal || 0);
          }
        }
      });

      // 5. Total Member & Saldo Poin
      const { count: memberCount, data: memberPointsData } = await supabase
        .from('members')
        .select('points', { count: 'exact' });

      let totalPoints = 0;
      if (memberPointsData) {
        totalPoints = memberPointsData.reduce(
          (sum: number, m: any) => sum + Number(m.points || 0),
          0,
        );
      }

      // 6. Total Token FCM aktif
      const { count: fcmCount } = await supabase
        .from('member_fcm_tokens')
        .select('*', { count: 'exact', head: true });

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
        activeVouchersCount: activeCount,
        usedVouchersCount: usedCount,
        totalMembersCount: memberCount || 0,
        activeFcmDevicesCount: fcmCount || 0,
        totalPointsInCirculation: totalPoints,
        totalPointsRedeemed: committed,
      });
    } catch (err: any) {
      console.error('Error loading loyalty data:', err);
      toast.error('Gagal memuat data loyalitas: ' + (err?.message || 'Error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
              { id: 'vouchers', label: 'Voucher Member', icon: IconReceipt2, count: vouchers.length },
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
            <LoyaltyVouchersTab vouchers={vouchers} onRefresh={loadAllData} />
          )}

          {activeTab === 'broadcast' && <LoyaltyBroadcastTab />}
        </div>
      </div>
    </PullToRefresh>
  );
}
