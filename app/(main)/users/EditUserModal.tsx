'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/fetchApi';
import { Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  IconUser,
  IconKey,
  IconShieldLock,
  IconBuildingWarehouse,
  IconLoader2,
  IconTrash,
} from '@tabler/icons-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  initialName: string;
  initialUsername?: string | null;
  initialRole?: string;
  initialRoles?: string[];
  initialDefaultGudangId?: string | null;
}

interface GudangOption {
  id: string;
  kode_gudang: string;
  nama: string;
  is_default: boolean;
}

const AVAILABLE_ROLES = [
  { id: 'admin', label: 'Admin (Super Admin)', desc: 'Akses penuh seluruh modul & pengaturan' },
  { id: 'kepala_gudang', label: 'Kepala Gudang', desc: 'Approval waste, opname, cancel transfer & threshold stok' },
  { id: 'staff_gudang', label: 'Staf Gudang', desc: 'Kirim/terima transfer, draft waste & susun rak' },
  { id: 'kasir', label: 'Kasir', desc: 'Transaksi kasir POS & retur penjualan' },
  { id: 'finance', label: 'Finance / Keuangan', desc: 'Buku besar, arus kas, operasional & payroll' },
];

export default function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  initialName,
  initialUsername,
  initialRole,
  initialRoles,
  initialDefaultGudangId,
}: EditUserModalProps) {
  const [nama, setNama] = useState(initialName);
  const [username, setUsername] = useState(initialUsername || '');
  const [roles, setRoles] = useState<string[]>(
    initialRoles && initialRoles.length > 0
      ? initialRoles
      : initialRole === 'admin'
        ? ['admin']
        : ['kasir', 'staff_gudang'],
  );
  const [defaultGudangId, setDefaultGudangId] = useState<string>(initialDefaultGudangId || '');
  const [gudangList, setGudangList] = useState<GudangOption[]>([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNama(initialName);
      setUsername(initialUsername || '');
      setRoles(
        initialRoles && initialRoles.length > 0
          ? initialRoles
          : initialRole === 'admin'
            ? ['admin']
            : ['kasir', 'staff_gudang'],
      );
      setDefaultGudangId(initialDefaultGudangId || '');
      setPassword('');

      // Fetch warehouse list
      const fetchGudang = async () => {
        const { data } = await supabase
          .from('gudang')
          .select('id, kode_gudang, nama, is_default')
          .eq('is_active', true)
          .order('is_default', { ascending: false });

        if (data) {
          setGudangList(data);
        }
      };
      fetchGudang();
    }
  }, [isOpen, initialName, initialUsername, initialRole, initialRoles, initialDefaultGudangId]);

  const handleRoleToggle = (roleId: string) => {
    setRoles((prev) => {
      const exists = prev.includes(roleId);
      let next = exists ? prev.filter((r) => r !== roleId) : [...prev, roleId];
      if (next.length === 0) {
        next = [roleId]; // Prevent empty
      }
      return next;
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (roles.length === 0) {
      toast.error('Pilih setidaknya satu role untuk pengguna');
      return;
    }

    if (password && password.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama,
          username: username || null,
          roles,
          default_gudang_id: defaultGudangId || null,
          password: password.trim() ? password : undefined,
        }),
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
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus user');
      }

      toast.success('User berhasil dihapus');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat menghapus user',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading || isDeleting ? () => {} : onClose}
      title="Edit User & Hak Akses"
      size="lg"
      isBottomSheetOnMobile
    >
      <form onSubmit={handleUpdate} className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <IconUser size={18} />
              </div>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-200 bg-white py-2 pr-4 pl-10 transition-shadow outline-none focus:ring-2 focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900"
                placeholder="Nama pengguna"
                required
                disabled={loading || isDeleting}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Username
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <IconUser size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                }
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-200 bg-white py-2 pr-4 pl-10 transition-shadow outline-none focus:ring-2 focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900"
                placeholder="Opsional, login tanpa email"
                disabled={loading || isDeleting}
              />
            </div>
          </div>
        </div>

        {/* Multi-Role Section */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <IconShieldLock size={16} className="text-brand-500" />
            Hak Akses & Peran (Multi-Role) <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AVAILABLE_ROLES.map((r) => {
              const isChecked = roles.includes(r.id);
              return (
                <label
                  key={r.id}
                  onClick={() => handleRoleToggle(r.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                    isChecked
                      ? 'border-brand-500 bg-brand-50/60 dark:border-brand-500/80 dark:bg-brand-950/20'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="text-brand-600 focus:ring-brand-500 mt-1 h-4 w-4 rounded border-neutral-300"
                  />
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {r.label}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {r.desc}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Location Assignment */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <IconBuildingWarehouse size={16} className="text-brand-500" />
            Lokasi Penugasan Gudang / Cabang
          </label>
          <select
            value={defaultGudangId}
            onChange={(e) => setDefaultGudangId(e.target.value)}
            disabled={loading || isDeleting}
            className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">Semua Cabang / Fleksibel (Khusus Admin/Pusat)</option>
            {gudangList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.kode_gudang} - {g.nama} {g.is_default ? '(Gudang Utama)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Staf cabang akan otomatis diarahkan ke gudang ini saat membuat transfer stok atau membuka katalog gudang.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ganti Password <span className="font-normal text-neutral-400">(Opsional)</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <IconKey size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-200 bg-white py-2 pr-4 pl-10 transition-shadow outline-none focus:ring-2 focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="Kosongkan jika tidak ingin ganti password"
              disabled={loading || isDeleting}
              minLength={6}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || isDeleting}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            title="Hapus Pengguna"
          >
            {isDeleting ? (
              <IconLoader2 className="h-5 w-5 animate-spin" />
            ) : (
              <IconTrash className="h-5 w-5" />
            )}
          </button>

          <button
            type="submit"
            disabled={loading || isDeleting}
            className="bg-brand-500 hover:bg-brand-600 flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-white transition-colors disabled:opacity-50"
          >
            {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
