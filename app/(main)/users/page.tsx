'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  IconUsers,
  IconUserPlus,
  IconSearch,
  IconX,
  IconChevronRight,
  IconArrowDown,
} from '@tabler/icons-react';
import { usePresenceStore } from '@/lib/presence';
import { toast } from 'sonner';
import { AmbientLayout, ModernPagination, FilterButton } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AdminOnly } from '@/components/role';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import { formatDateWIB } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

interface Profile {
  id: string;
  nama: string;
  email: string;
  username: string | null;
  role: 'admin' | 'staff';
  created_at: string;
  last_sign_in_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUserModal, setEditUserModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    initialUsername?: string | null;
    userRole: 'admin' | 'staff';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    initialUsername: null,
    userRole: 'staff',
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const LIMIT = 10;
  const { isAdmin, initialized, user, profile } = useAuthStore();
  const router = useRouter();
  const { onlineUsers } = usePresenceStore();

  useEffect(() => {
    const isAuthFullyLoaded = initialized && (!user || profile !== null);
    if (isAuthFullyLoaded && !isAdmin()) {
      router.push('/');
    }
  }, [initialized, isAdmin, router, user, profile]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal memuat data user');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized && isAdmin()) {
      fetchUsers();
    }
  }, [fetchUsers, initialized, isAdmin, profile]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.nama.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin()) {
    return null;
  }

  const totalPages = Math.ceil(filteredUsers.length / LIMIT) || 1;
  const pagedUsers = filteredUsers.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <AmbientLayout>
      <PullToRefresh
        onRefresh={fetchUsers}
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
                <IconUsers className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8" stroke={1.5} />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Manajemen User
                  </h1>
                  <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Kelola user sistem
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
                >
                  <IconUserPlus className="h-4 w-4" />
                  Tambah Akun
                </button>
              </div>
            </div>
          </div>

          <div
            className="animate-fade-in-up mb-4 flex flex-col gap-3 lg:mb-6"
            style={{ animationDelay: '50ms' }}
          >
            <div className="flex w-full flex-row items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                  <IconSearch size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama, email, atau username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="focus:border-brand-500 focus:shadow-brand w-full rounded-xl border border-white/40 bg-white/70 py-2 pr-3 pl-9 text-sm shadow-sm backdrop-blur-md transition-all focus:outline-none sm:py-3 sm:text-base dark:border-white/10 dark:bg-neutral-900/60"
                />
              </div>

              <FilterButton
                onClick={() => setIsFilterOpen(true)}
                activeCount={roleFilter !== 'all' ? 1 : 0}
                className="sm:h-[46px]"
              />
            </div>

            <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap">
              {roleFilter !== 'all' && (
                <div className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                  Role: {roleFilter === 'admin' ? 'Admin' : 'Staff'}
                  <button
                    onClick={() => setRoleFilter('all')}
                    className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <ResponsivePanel
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            title="Filter User"
          >
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Role:
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="focus:ring-brand-500/20 focus:border-brand-500 w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                >
                  <option value="all">Semua Role</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <button
                  className="w-1/2 rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  onClick={() => {
                    setRoleFilter('all');
                  }}
                >
                  Reset
                </button>
                <button
                  className="bg-brand-500 w-1/2 rounded-xl px-4 py-2 font-medium text-white"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Terapkan
                </button>
              </div>
            </div>
          </ResponsivePanel>

          <div
            className="shadow-elevated animate-fade-in-up mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '100ms' }}
          >
            {/* Mobile View */}
            <div className="block flex flex-1 flex-col gap-3 overflow-y-auto p-4 lg:hidden">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-2xl border border-neutral-200/50 bg-white/50 p-4 shadow-sm backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50"
                  >
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                ))
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-neutral-500">Tidak ada user terdaftar</div>
              ) : (
                pagedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="hover:border-brand-500/30 group flex cursor-pointer flex-col gap-3 rounded-2xl border border-neutral-200/50 bg-white/50 p-3 shadow-sm backdrop-blur-md transition-all active:scale-[0.98] sm:p-4 dark:border-neutral-800/50 dark:bg-neutral-950/50"
                    onClick={() =>
                      setEditUserModal({
                        isOpen: true,
                        userId: user.id,
                        userName: user.nama,
                        initialUsername: user.username,
                        userRole: user.role,
                      })
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="group-hover:text-brand-600 dark:group-hover:text-brand-400 mb-1 text-base leading-tight font-bold text-neutral-900 transition-colors dark:text-white">
                          {user.nama}
                        </div>
                        <div className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          {user.email} {user.username ? `• @${user.username}` : ''}
                        </div>
                      </div>
                      <IconChevronRight className="group-hover:text-brand-500 mt-1 h-5 w-5 text-neutral-400 transition-colors" />
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-200/50 pt-2 dark:border-neutral-800/50">
                      <div>
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {user.last_sign_in_at
                          ? formatDateWIB(user.last_sign_in_at)
                          : 'Belum pernah login'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="custom-scrollbar hidden h-full overflow-x-auto lg:block">
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Nama
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Role
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Terakhir Login
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
                          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="mx-auto h-8 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                        Tidak ada user terdaftar
                      </td>
                    </tr>
                  ) : (
                    pagedUsers.map((user) => {
                      const isOnline = onlineUsers.includes(user.id);
                      return (
                        <tr
                          key={user.id}
                          className="group cursor-pointer transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                          onClick={() =>
                            setEditUserModal({
                              isOpen: true,
                              userId: user.id,
                              userName: user.nama,
                              initialUsername: user.username,
                              userRole: user.role,
                            })
                          }
                        >
                          <td className="px-5 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                            <div className="flex items-center gap-2">
                              {user.nama}
                              {isOnline && (
                                <span className="relative flex h-2.5 w-2.5" title="Online">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-sm text-neutral-600 dark:text-neutral-400">
                            {user.email}{' '}
                            {user.username && (
                              <span className="ml-1 text-neutral-400 dark:text-neutral-500">
                                @{user.username}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                                user.role === 'admin'
                                  ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                                  : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                              }`}
                            >
                              {user.role === 'admin' ? 'Admin' : 'Staff'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-neutral-500">
                            {user.last_sign_in_at
                              ? formatDateWIB(user.last_sign_in_at)
                              : 'Belum pernah login'}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <IconChevronRight className="group-hover:text-brand-500 mx-auto h-5 w-5 text-neutral-400 transition-colors" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && users.length > LIMIT && (
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

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />

      <EditUserModal
        isOpen={editUserModal.isOpen}
        onClose={() => setEditUserModal({ ...editUserModal, isOpen: false })}
        onSuccess={() => {
          setEditUserModal({ ...editUserModal, isOpen: false });
          fetchUsers();
        }}
        userId={editUserModal.userId}
        initialName={editUserModal.userName}
        initialUsername={editUserModal.initialUsername}
        initialRole={editUserModal.userRole}
      />
    </AmbientLayout>
  );
}
