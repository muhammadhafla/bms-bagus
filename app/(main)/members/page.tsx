'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IconUsersGroup, IconChevronRight, IconUserPlus, IconShieldLock, IconArrowDown } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from "sonner";
import { AmbientLayout, DropdownMenu, ModernPagination } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AdminOnly } from '@/components/role';
import MemberModal from './MemberModal';
import { formatDateWIB } from '@/lib/utils';

const PullToRefresh = dynamic(
  () => import('react-simple-pull-to-refresh'),
  { ssr: false }
);
interface MemberTier {
  id: string;
  name: string;
  discount_percentage: number;
}

interface Member {
  id: string;
  whatsapp_number: string;
  name: string;
  points: number;
  tier_id: string;
  prefer_digital_receipt: boolean;
  created_at: string;
  member_tiers: MemberTier; // Joined data
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMemberData, setEditMemberData] = useState<Member | undefined>(undefined);
  
  const [page, setPage] = useState(1);
  const LIMIT = 10;
  
  const { isAdmin, initialized, user, profile } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const isAuthFullyLoaded = initialized && (!user || profile !== null);
    if (isAuthFullyLoaded && !isAdmin()) {
      router.push('/');
    }
  }, [initialized, isAdmin, router, user, profile]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    // Kita mengambil data member dan melakukan join ke member_tiers
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        member_tiers ( id, name, discount_percentage )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal memuat data member');
      console.error(error);
    } else {
      setMembers(data as Member[] || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized && isAdmin()) {
      fetchMembers();
    }
  }, [fetchMembers, initialized, isAdmin]);

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

  const totalPages = Math.ceil(members.length / LIMIT) || 1;
  const pagedMembers = members.slice((page - 1) * LIMIT, page * LIMIT);

  const openEditModal = (member: Member) => {
    setEditMemberData(member);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditMemberData(undefined);
    setIsModalOpen(true);
  };

  return (
    <AmbientLayout>
      <PullToRefresh
        onRefresh={fetchMembers}
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
              <IconUsersGroup className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Master Data Member</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Kelola pelanggan dan poin mereka</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AdminOnly>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white shadow-sm rounded-xl hover:bg-brand-600 transition-colors font-medium text-sm"
                >
                  <IconUserPlus className="w-4 h-4" />
                  Daftar Member
                </button>
              </AdminOnly>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          {/* Desktop View Table */}
          <div className="hidden lg:block overflow-x-auto h-full custom-scrollbar">
            <table className="w-full min-w-[800px]">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Pelanggan</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">WhatsApp</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tier / Tingkat</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Poin Terkumpul</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Bergabung Sejak</th>
                  <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-8 w-10 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                      Belum ada pelanggan terdaftar.
                    </td>
                  </tr>
                ) : (
                  pagedMembers.map(member => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                      onClick={() => openEditModal(member)}
                    >
                      <td className="px-5 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                        {member.name}
                      </td>
                      <td className="px-5 py-4 text-neutral-600 dark:text-neutral-400 font-mono text-sm">
                        {member.whatsapp_number}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                          member.member_tiers?.name === 'GOLD' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                          member.member_tiers?.name === 'SILVER' ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {member.member_tiers?.name || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-brand-600 dark:text-brand-400">
                        {member.points.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-500">
                        {formatDateWIB(member.created_at)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <IconChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-brand-500 transition-colors mx-auto" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View List */}
          <div className="block lg:hidden flex-1 overflow-y-auto pb-4 p-4 space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/50 dark:bg-neutral-900/50 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800 animate-pulse">
                  <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                  <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                    <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  </div>
                </div>
              ))
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 bg-white/50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                Belum ada pelanggan terdaftar.
              </div>
            ) : (
              pagedMembers.map(member => (
                <div 
                  key={member.id} 
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800 flex flex-col gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-500/30 group"
                  onClick={() => openEditModal(member)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{member.name}</h3>
                      <p className="text-sm text-neutral-500 font-mono mt-0.5">{member.whatsapp_number}</p>
                    </div>
                    <IconChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-brand-500 transition-colors mt-1" />
                  </div>
                  
                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      member.member_tiers?.name === 'GOLD' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                      member.member_tiers?.name === 'SILVER' ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
                      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    }`}>
                      {member.member_tiers?.name || 'UNKNOWN'}
                    </span>
                    
                    <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Poin</span>
                      <span className="font-extrabold text-brand-700 dark:text-brand-300 text-sm">{member.points.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && members.length > LIMIT && (
            <ModernPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="border-x-0 border-b-0 rounded-none rounded-b-3xl mt-auto z-10"
            />
          )}
        </div>
        </div>
      </PullToRefresh>

      <MemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchMembers();
        }}
        initialData={editMemberData}
      />
    </AmbientLayout>
  );
}
