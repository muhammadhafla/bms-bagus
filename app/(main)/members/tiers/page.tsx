'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IconSettings, IconChevronRight, IconShieldLock, IconArrowDown } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { AmbientLayout } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AdminOnly } from '@/components/role';
import EditTierModal from './EditTierModal';
import { formatDateWIB } from '@/lib/utils';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
interface MemberTier {
  id: string;
  name: string;
  discount_percentage: number;
  point_multiplier: number;
  min_points_required: number;
  updated_at: string;
}

export default function MemberTiersPage() {
  const [tiers, setTiers] = useState<MemberTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTierModal, setEditTierModal] = useState<{ isOpen: boolean; tier: MemberTier | null }>({
    isOpen: false,
    tier: null,
  });

  const { isAdmin, initialized, user, profile } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const isAuthFullyLoaded = initialized && (!user || profile !== null);
    if (isAuthFullyLoaded && !isAdmin()) {
      router.push('/');
    }
  }, [initialized, isAdmin, router, user, profile]);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('member_tiers')
      .select('*')
      .order('min_points_required', { ascending: true });

    if (error) {
      toast.error('Gagal memuat data tier');
    } else {
      setTiers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized && isAdmin()) {
      fetchTiers();
    }
  }, [fetchTiers, initialized, isAdmin]);

  const isAuthFullyLoaded = initialized && (!user || profile !== null);

  if (!isAuthFullyLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <AmbientLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <IconShieldLock className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-700" />
          <h2 className="mb-2 text-xl font-bold text-neutral-900 dark:text-white">Akses Ditolak</h2>
          <p className="text-neutral-500">Halaman ini hanya dapat diakses oleh Administrator.</p>
        </div>
      </AmbientLayout>
    );
  }

  return (
    <AmbientLayout>
      <PullToRefresh
        onRefresh={fetchTiers}
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
        <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)] lg:min-h-0">
          <div className="animate-fade-in-up mb-4 flex-shrink-0 lg:mb-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <IconSettings
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Konfigurasi Tier
                  </h1>
                  <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Atur persentase diskon dan nilai poin untuk tiap tingkatan member
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="shadow-elevated animate-fade-in-up mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '100ms' }}
          >
            <div className="custom-scrollbar h-full overflow-x-auto p-4 lg:p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {loading
                  ? [...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-2xl border border-neutral-200/50 bg-white/50 p-6 shadow-sm dark:border-neutral-800/50 dark:bg-neutral-950/50"
                      >
                        <div className="mb-4 h-6 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="mb-4 h-10 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-10 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                    ))
                  : tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="hover:border-brand-500/30 group flex cursor-pointer flex-col rounded-2xl border border-neutral-200/50 bg-white/50 p-6 shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-neutral-800/50 dark:bg-neutral-950/50"
                        onClick={() => setEditTierModal({ isOpen: true, tier })}
                      >
                        <div className="mb-6 flex items-start justify-between">
                          <h3
                            className={`text-xl font-bold tracking-tight uppercase ${
                              tier.name === 'GOLD'
                                ? 'text-amber-500'
                                : tier.name === 'SILVER'
                                  ? 'text-slate-400'
                                  : 'text-orange-700 dark:text-orange-600'
                            }`}
                          >
                            {tier.name}
                          </h3>
                          <IconChevronRight className="group-hover:text-brand-500 h-6 w-6 text-neutral-400 transition-colors" />
                        </div>

                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                              Persentase Diskon
                            </div>
                            <div className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                              {tier.discount_percentage}%
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                              Pengali Poin (Multiplier)
                            </div>
                            <div className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                              {tier.point_multiplier}x
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                              Syarat Poin Minimum
                            </div>
                            <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                              {tier.min_points_required.toLocaleString()} Poin
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-neutral-200/50 pt-4 text-xs text-neutral-400 dark:border-neutral-800/50">
                          Diperbarui: {formatDateWIB(tier.updated_at)}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {editTierModal.tier && (
        <EditTierModal
          isOpen={editTierModal.isOpen}
          onClose={() => setEditTierModal({ isOpen: false, tier: null })}
          onSuccess={() => {
            setEditTierModal({ isOpen: false, tier: null });
            fetchTiers();
          }}
          tierId={editTierModal.tier.id}
          initialName={editTierModal.tier.name}
          initialDiscount={editTierModal.tier.discount_percentage}
          initialMultiplier={editTierModal.tier.point_multiplier}
          initialMinPoints={editTierModal.tier.min_points_required}
        />
      )}
    </AmbientLayout>
  );
}
