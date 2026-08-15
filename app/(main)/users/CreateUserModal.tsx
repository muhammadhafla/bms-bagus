import { useState } from 'react';
import { fetchApi } from '@/lib/fetchApi';
import { Modal, TextInput, Button } from '@/components/ui';
import { useAuthStore } from '@/lib/auth';

import { toast } from 'sonner';
import { IconUserPlus, IconLoader2 } from '@tabler/icons-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    nama: '',
    password: '',
    role: 'staff',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchApi('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat user');
      }

      toast.success('User berhasil dibuat');
      setFormData({ email: '', username: '', nama: '', password: '', role: 'staff' });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah User Baru" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
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

        <TextInput
          name="username"
          label="Username"
          placeholder="Opsional, untuk login tanpa email"
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

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="staff">Staff (Kasir)</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
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
