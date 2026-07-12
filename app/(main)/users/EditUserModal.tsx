'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { IconUser, IconKey, IconShieldLock, IconLoader2, IconTrash } from '@tabler/icons-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  initialName: string;
  initialRole: 'admin' | 'staff';
}

export default function EditUserModal({ isOpen, onClose, onSuccess, userId, initialName, initialRole }: EditUserModalProps) {
  const [nama, setNama] = useState(initialName);
  const [role, setRole] = useState<'admin' | 'staff'>(initialRole);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNama(initialName);
      setRole(initialRole);
      setPassword('');
    }
  }, [isOpen, initialName, initialRole]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password && password.length < 6) {
      showToast('Password baru minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        showToast('Sesi tidak valid, harap login kembali', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nama, role, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memperbarui user');
      }

      showToast('User berhasil diperbarui', 'success');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini secara permanen?')) return;
    
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        showToast('Sesi tidak valid, harap login kembali', 'error');
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus user');
      }

      showToast('User berhasil dihapus', 'success');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat menghapus user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={(loading || isDeleting) ? () => {} : onClose} title="Edit User">
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Nama Lengkap
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <IconUser size={18} />
            </div>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-shadow outline-none"
              placeholder="Nama pengguna"
              required
              disabled={loading || isDeleting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Hak Akses (Role)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <IconShieldLock size={18} />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'staff')}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-shadow outline-none appearance-none"
              disabled={loading || isDeleting}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Ganti Password <span className="text-neutral-400 font-normal">(Opsional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <IconKey size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-shadow outline-none"
              placeholder="Kosongkan jika tidak ingin ganti password"
              disabled={loading || isDeleting}
              minLength={6}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || isDeleting}
            className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
            title="Hapus Pengguna"
          >
            {isDeleting ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconTrash className="w-4 h-4" />}
            <span className="hidden sm:inline">Hapus Akun</span>
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || isDeleting}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium text-sm disabled:opacity-50 min-w-[100px]"
            >
              {loading ? <IconLoader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
