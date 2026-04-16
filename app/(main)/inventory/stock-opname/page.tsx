'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StockOpname } from '@/lib/api/stockOpname';
import { stockOpnameApi } from '@/lib/api';
import { IconPlus, IconEye, IconCheck, IconX, IconTrash } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending: 'Menunggu Approval',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai'
};

export default function StockOpnameListPage() {
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchOpnames = useCallback(async () => {
    setLoading(true);
    const result = await stockOpnameApi.getAll();
    if (!result.error && result.data) {
      setOpnames(result.data);
    } else if (result.error) {
      console.error('Error fetching opnames:', result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOpnames();
  }, [fetchOpnames]);

  const handleCreate = async () => {
    setCreating(true);
    const result = await stockOpnameApi.create();
    if (!result.error && result.data && 'id' in result.data) {
      window.location.href = `/stock-opname/${result.data.id}`;
    } else if (result.error) {
      console.error('Error creating opname:', result.error);
      alert('Gagal membuat stock opname: ' + result.error.message);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await stockOpnameApi.delete(deleteId);
      fetchOpnames();
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Stock Opname</h1>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            <IconPlus size={18} />
            Buat Opname Baru
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : opnames.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-500">Belum ada stock opname</p>
            <p className="text-sm text-neutral-400 mt-1">Klik tombol di atas untuk membuat opname baru</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left p-4 font-medium">Tanggal</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Dibuat Oleh</th>
                  <th className="text-right p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {opnames.map((opname) => (
                  <tr key={opname.id} className="border-b border-neutral-100 dark:border-neutral-800/50">
                    <td className="p-4">{new Date(opname.opname_date).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[opname.status]}`}>
                        {statusLabels[opname.status]}
                      </span>
                    </td>
                    <td className="p-4">{opname.profiles?.nama || opname.created_by}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/stock-opname/${opname.id}`}
                          className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded"
                        >
                          <IconEye size={18} />
                        </Link>
                        {opname.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(opname.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <IconTrash size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Hapus Stock Opname"
        message="Yakin ingin menghapus stock opname ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
