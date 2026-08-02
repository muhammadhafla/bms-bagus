'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/fetchApi';
import { Modal } from '@/components/ui';
import { toast } from "sonner";
import { IconUser, IconKey, IconShieldLock, IconLoader2, IconTrash } from '@tabler/icons-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  initialName: string;
  initialUsername?: string | null;
  initialRole: 'admin' | 'staff';
}

export default function EditUserModal({ isOpen, onClose, onSuccess, userId, initialName, initialUsername, initialRole }: EditUserModalProps) {
  const [nama, setNama] = useState(initialName);
  const [username, setUsername] = useState(initialUsername || '');
  const [role, setRole] = useState<'admin' | 'staff'>(initialRole);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setNama(initialName);
      setUsername(initialUsername || '');
      setRole(initialRole);
      setPassword('');
    }
  }, [isOpen, initialName, initialUsername, initialRole]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password && password.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nama, username, role, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memperbarui user');
      }

      toast.success('User berhasil diperbarui');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini secara permanen?')) return;
    
    setIsDeleting(true);
    try {
      const response = await fetchApi(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus user');
      }

      toast.success('User berhasil dihapus');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat menghapus user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={(loading || isDeleting) ? () => {} : onClose} title="Edit User" isBottomSheetOnMobile>
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
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <IconUser size={18} />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-shadow outline-none"
              placeholder="Opsional, untuk login tanpa email"
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

        <div className="pt-4 flex items-center gap-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || isDeleting}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0 disabled:opacity-50"
            title="Hapus Pengguna"
          >
            {isDeleting ? <IconLoader2 className="w-5 h-5 animate-spin" /> : <IconTrash className="w-5 h-5" />}
          </button>
          
          <button
            type="submit"
            disabled={loading || isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-semibold disabled:opacity-50 min-h-[44px]"
          >
            {loading ? <IconLoader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
