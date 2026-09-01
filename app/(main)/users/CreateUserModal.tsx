'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/fetchApi';
import { Modal, TextInput, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { IconUserPlus, IconLoader2, IconBuildingWarehouse, IconShieldLock } from '@tabler/icons-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [gudangList, setGudangList] = useState<GudangOption[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    nama: '',
    password: '',
    roles: ['kasir', 'staff_gudang'] as string[],
    default_gudang_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch list of active warehouses
      const fetchGudang = async () => {
        const { data } = await supabase
          .from('gudang')
          .select('id, kode_gudang, nama, is_default')
          .eq('is_active', true)
          .order('is_default', { ascending: false });

        if (data && data.length > 0) {
          setGudangList(data);
          const def = data.find((g) => g.is_default) || data[0];
          setFormData((prev) => ({
            ...prev,
            default_gudang_id: prev.default_gudang_id || def.id,
          }));
        }
      };
      fetchGudang();
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(roleId);
      let nextRoles = exists
        ? prev.roles.filter((r) => r !== roleId)
        : [...prev.roles, roleId];

      if (nextRoles.length === 0) {
        nextRoles = [roleId]; // Prevent empty roles
      }
      return { ...prev, roles: nextRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.roles.length === 0) {
      toast.error('Pilih setidaknya satu role untuk pengguna');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchApi('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username || null,
          nama: formData.nama,
          password: formData.password,
          roles: formData.roles,
          default_gudang_id: formData.default_gudang_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat user');
      }

      toast.success('User berhasil dibuat');
      setFormData({
        email: '',
        username: '',
        nama: '',
        password: '',
        roles: ['kasir', 'staff_gudang'],
        default_gudang_id: '',
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah User Baru" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            name="nama"
            label="Nama Lengkap"
            value={formData.nama}
            onChange={handleChange}
            required
          />

          <TextInput
            type="email"
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            name="username"
            label="Username"
            placeholder="Opsional, login tanpa email"
            value={formData.username}
            onChange={(e) =>
              setFormData({
                ...formData,
                username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''),
              })
            }
          />

          <TextInput
            type="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        {/* Multi-Role Selection */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <IconShieldLock size={16} className="text-brand-500" />
            Hak Akses & Peran (Multi-Role) <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AVAILABLE_ROLES.map((r) => {
              const isChecked = formData.roles.includes(r.id);
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
                    onChange={() => {}} // Handled by container
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
            name="default_gudang_id"
            value={formData.default_gudang_id}
            onChange={handleChange}
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

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconUserPlus className="h-4 w-4" />
            )}
            Tambah Akun
          </Button>
        </div>
      </form>
    </Modal>
  );
}
