'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  IconUsersGroup,
  IconChevronRight,
  IconUserPlus,
  IconShieldLock,
  IconArrowDown,
  IconSearch,
} from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { AmbientLayout, DropdownMenu, ModernPagination } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AdminOnly } from '@/components/role';
import MemberModal from './MemberModal';
import { formatDateWIB } from '@/lib/utils';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
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
  const [searchQuery, setSearchQuery] = useState('');
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
      .select(
        `
        *,
        member_tiers ( id, name, discount_percentage )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal memuat data member');
      console.error(error);
    } else {
      setMembers((data as Member[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized && isAdmin()) {
      fetchMembers();
    }
  }, [fetchMembers, initialized, isAdmin, profile]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const lowerQuery = searchQuery.toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(lowerQuery) || m.whatsapp_number.includes(lowerQuery),
    );
  }, [members, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

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

  const totalPages = Math.ceil(filteredMembers.length / LIMIT) || 1;
  const pagedMembers = filteredMembers.slice((page - 1) * LIMIT, page * LIMIT);

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
                <IconUsersGroup
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Master Data Member
                  </h1>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Kelola pelanggan dan poin mereka
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-3 lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                    <IconSearch size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama atau WhatsApp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="focus:border-brand-500 focus:shadow-brand w-full rounded-xl border border-white/40 bg-white/70 py-2 pr-3 pl-9 text-sm shadow-sm backdrop-blur-md transition-all focus:outline-none dark:border-white/10 dark:bg-neutral-900/60"
                  />
                </div>
                <AdminOnly>
                  <button
                    onClick={openCreateModal}
                    className="bg-brand-500 hover:bg-brand-600 flex shrink-0 items-center justify-center rounded-xl p-2.5 text-white shadow-sm transition-colors"
                    title="Daftar Member"
                  >
                    <IconUserPlus className="h-5 w-5" />
                  </button>
                </AdminOnly>
              </div>
            </div>
          </div>

          <div
            className="shadow-elevated animate-fade-in-up mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '100ms' }}
          >
            {/* Desktop View Table */}
            <div className="custom-scrollbar hidden h-full overflow-x-auto lg:block">
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Nama Pelanggan
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      WhatsApp
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Tier / Tingkat
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Poin Terkumpul
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Bergabung Sejak
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Struk Digital
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-5 py-4">
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="mx-auto h-6 w-16 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="mx-auto h-8 w-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                      </tr>
                    ))
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                        {searchQuery
                          ? 'Pelanggan tidak ditemukan.'
                          : 'Belum ada pelanggan terdaftar.'}
                      </td>
                    </tr>
                  ) : (
                    pagedMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="group cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        onClick={() => openEditModal(member)}
                      >
                        <td className="px-5 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                          {member.name}
                        </td>
                        <td className="px-5 py-4 font-mono text-sm text-neutral-600 dark:text-neutral-400">
                          {member.whatsapp_number}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                              member.member_tiers?.name === 'GOLD'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                : member.member_tiers?.name === 'SILVER'
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            }`}
                          >
                            {member.member_tiers?.name || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="text-brand-600 dark:text-brand-400 px-5 py-4 font-semibold">
                          {member.points.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm text-neutral-500">
                          {formatDateWIB(member.created_at)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {member.prefer_digital_receipt ? (
                            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                              Tidak
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <IconChevronRight className="group-hover:text-brand-500 mx-auto h-5 w-5 text-neutral-400 transition-colors" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View List */}
            <div className="block flex-1 space-y-4 overflow-y-auto p-4 pb-4 lg:hidden">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-neutral-100 bg-white/50 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50"
                  >
                    <div className="mb-2 h-5 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="mb-3 h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-5 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                ))
              ) : filteredMembers.length === 0 ? (
                <div className="rounded-2xl border border-neutral-100 bg-white/50 py-12 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50">
                  {searchQuery ? 'Pelanggan tidak ditemukan.' : 'Belum ada pelanggan terdaftar.'}
                </div>
              ) : (
                pagedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="hover:border-brand-500/30 group flex cursor-pointer flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm transition-all active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900"
                    onClick={() => openEditModal(member)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="group-hover:text-brand-600 dark:group-hover:text-brand-400 text-base font-bold text-neutral-900 transition-colors dark:text-white">
                          {member.name}
                        </h3>
                        <p className="mt-0.5 font-mono text-sm text-neutral-500">
                          {member.whatsapp_number}
                        </p>
                      </div>
                      <IconChevronRight className="group-hover:text-brand-500 mt-1 h-5 w-5 text-neutral-400 transition-colors" />
                    </div>

                    <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${
                            member.member_tiers?.name === 'GOLD'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : member.member_tiers?.name === 'SILVER'
                                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}
                        >
                          {member.member_tiers?.name || 'UNKNOWN'}
                        </span>

                        {member.prefer_digital_receipt && (
                          <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-800 uppercase dark:bg-emerald-900/30 dark:text-emerald-300">
                            Digital
                          </span>
                        )}
                      </div>

                      <div className="bg-brand-50 dark:bg-brand-900/20 flex items-center gap-1.5 rounded-lg px-2.5 py-1">
                        <span className="text-brand-600 dark:text-brand-400 text-[10px] font-bold tracking-wider uppercase">
                          Poin
                        </span>
                        <span className="text-brand-700 dark:text-brand-300 text-sm font-extrabold">
                          {member.points.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!loading && filteredMembers.length > LIMIT && (
              <ModernPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="z-10 mt-auto rounded-none rounded-b-3xl border-x-0 border-b-0"
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
