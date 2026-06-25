'use client';

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth';
import { IconUsers, IconEdit, IconTrash, IconRefresh, IconDotsVertical } from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AmbientLayout, DropdownMenu } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  nama: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
  last_sign_in_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null,
  });
  const { showToast } = useToast();
  const { isAdmin, initialized, supabase } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !isAdmin()) {
      router.push('/');
    }
  }, [initialized, isAdmin, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat data user', 'error');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    if (initialized && isAdmin()) {
      fetchUsers();
    }
  }, [fetchUsers, initialized, isAdmin]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin()) {
    return null;
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'staff') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      showToast('Gagal mengubah role user', 'error');
    } else {
      showToast('Role user berhasil diubah', 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setEditingUserId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.userId) return;

    // Note: User deletion should be handled via backend API/RPC
    // Frontend can only update profile status
    const { error } = await supabase
      .from('profiles')
      .update({ disabled: true })
      .eq('id', deleteConfirm.userId);

    if (error) {
      showToast('Gagal menonaktifkan user', 'error');
    } else {
      showToast('User berhasil dinonaktifkan', 'success');
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.userId));
    }
    setDeleteConfirm({ isOpen: false, userId: null });
  };

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconUsers className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Manajemen User</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Kelola user sistem</p>
              </div>
            </div>
            
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-colors"
            >
              <IconRefresh className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Mobile View */}
          <div className="block lg:hidden overflow-y-auto p-4 space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-4 space-y-3 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-neutral-500">
                Tidak ada user terdaftar
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} className="p-4 flex flex-col gap-3 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight mb-1">{user.nama}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{user.email}</div>
                    </div>
                    <div className="relative">
                      <DropdownMenu
                        align="right"
                        trigger={
                          <div className="p-2 -mr-2 -mt-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                            <IconDotsVertical size={18} stroke={2} />
                          </div>
                        }
                        items={[
                          { label: 'Ubah Role', value: 'edit', icon: <IconEdit size={16} /> },
                          ...(isAdmin() ? [{ label: 'Hapus User', value: 'delete', icon: <IconTrash size={16} className="text-red-500" /> }] : [])
                        ]}
                        onSelect={(value) => {
                          if (value === 'edit') setEditingUserId(editingUserId === user.id ? null : user.id);
                          if (value === 'delete') setDeleteConfirm({ isOpen: true, userId: user.id });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                    <div>
                      {editingUserId === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'staff')}
                          className="px-3 py-1.5 text-sm rounded-lg border-2 border-brand-500 bg-white dark:bg-neutral-800 focus:outline-none focus:shadow-brand"
                          autoFocus
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300' 
                            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID') 
                        : 'Belum pernah login'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto h-full custom-scrollbar">
            <table className="w-full min-w-[800px]">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Email</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Role</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Terakhir Login</th>
                <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                    Tidak ada user terdaftar
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-neutral-900 dark:text-neutral-100">{user.nama}</td>
                    <td className="px-5 py-4 text-neutral-600 dark:text-neutral-400 font-mono text-sm">{user.email}</td>
                    <td className="px-5 py-4">
                      {editingUserId === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'staff')}
                          className="px-3 py-1.5 rounded-lg border-2 border-brand-500 bg-white dark:bg-neutral-800 focus:outline-none focus:shadow-brand text-sm"
                          autoFocus
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300' 
                            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-neutral-500">
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID') 
                        : 'Belum pernah login'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                          className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 btn-press transition-colors"
                        >
                          <IconEdit className="w-5 h-5" />
                        </button>
                        <AdminOnly>
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, userId: user.id })}
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 btn-press transition-colors"
                          >
                            <IconTrash className="w-5 h-5" />
                          </button>
                        </AdminOnly>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Hapus User"
        message="Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, userId: null })}
        danger
      />
    </AmbientLayout>
  );
}
