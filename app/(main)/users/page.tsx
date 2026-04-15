'use client';

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth';
import { IconUsers, IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  name: string;
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
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-md">
              <IconUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manajemen User</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Kelola user sistem</p>
            </div>
          </div>
          
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <IconRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full min-w-[800px]">
            <thead className="bg-neutral-50 dark:bg-neutral-950">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Terakhir Login</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    Tidak ada user terdaftar
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <td className="px-6 py-4 font-medium">{user.name}</td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{user.email}</td>
                    <td className="px-6 py-4">
                      {editingUserId === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'staff')}
                          className="px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                          autoFocus
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300' 
                            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID') 
                        : 'Belum pernah login'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <AdminOnly>
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, userId: user.id })}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          >
                            <IconTrash className="w-4 h-4" />
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
      </main>

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
    </div>
  );
}
