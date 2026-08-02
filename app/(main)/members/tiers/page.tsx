'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IconSettings, IconChevronRight, IconShieldLock, IconArrowDown } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from "sonner";
import { AmbientLayout } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AdminOnly } from '@/components/role';
import EditTierModal from './EditTierModal';
import { formatDateWIB } from '@/lib/utils';

const PullToRefresh = dynamic(
  () => import('react-simple-pull-to-refresh'),
  { ssr: false }
);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <AmbientLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <IconShieldLock className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Akses Ditolak</h2>
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
            <IconArrowDown className="w-5 h-5 animate-bounce" />
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4">
              <IconSettings className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Konfigurasi Tier</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Atur persentase diskon dan nilai poin untuk tiap tingkatan member</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          <div className="overflow-x-auto h-full custom-scrollbar p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/50 dark:bg-neutral-950/50 rounded-2xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm animate-pulse">
                    <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
                    <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
                    <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
                  </div>
                ))
              ) : (
                tiers.map(tier => (
                  <div 
                    key={tier.id} 
                    className="bg-white/50 dark:bg-neutral-950/50 rounded-2xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col transition-all hover:shadow-md cursor-pointer active:scale-[0.98] hover:border-brand-500/30 group"
                    onClick={() => setEditTierModal({ isOpen: true, tier })}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <h3 className={`text-xl font-bold tracking-tight uppercase ${
                        tier.name === 'GOLD' ? 'text-amber-500' : 
                        tier.name === 'SILVER' ? 'text-slate-400' : 
                        'text-orange-700 dark:text-orange-600'
                      }`}>
                        {tier.name}
                      </h3>
                      <IconChevronRight className="w-6 h-6 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      <div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 font-medium">Persentase Diskon</div>
                        <div className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                          {tier.discount_percentage}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 font-medium">Pengali Poin (Multiplier)</div>
                        <div className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                          {tier.point_multiplier}x
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 font-medium">Syarat Poin Minimum</div>
                        <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {tier.min_points_required.toLocaleString()} Poin
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-neutral-200/50 dark:border-neutral-800/50 text-xs text-neutral-400">
                      Diperbarui: {formatDateWIB(tier.updated_at)}
                    </div>
                  </div>
                ))
              )}
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
