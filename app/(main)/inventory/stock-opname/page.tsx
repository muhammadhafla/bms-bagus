'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StockOpname, stockOpnameApi } from '@/lib/api';
import { IconPlus, IconEye, IconCheck, IconX, IconTrash } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Breadcrumb, Button, Badge } from '@/components/ui';
import { API_ERROR_MESSAGES, UI_MESSAGES, STOCK_OPNAME_MESSAGES } from '@/lib/constants';

const statusBadgeVariant: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  draft: 'warning',
  pending: 'info',
  approved: 'success',
  rejected: 'danger',
  completed: 'default'
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
  const [error, setError] = useState<string | null>(null);

  const fetchOpnames = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await stockOpnameApi.getAll();
    if (!result.error && result.data) {
      setOpnames(result.data);
    } else if (result.error) {
      setError(result.error.message || API_ERROR_MESSAGES.FETCH_FAILED);
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
      window.location.href = `/inventory/stock-opname/${result.data.id}`;
    } else if (result.error) {
      alert(result.error.message || API_ERROR_MESSAGES.SAVE_FAILED);
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <Breadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stock Opname', isActive: true },
        ]}
        className="mb-4"
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-h2 font-bold">Stock Opname</h1>
        <Button
          onClick={handleCreate}
          disabled={creating}
          variant="primary"
        >
          <IconPlus size={18} />
          Buat Opname Baru
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500">{UI_MESSAGES.LOADING}</div>
      ) : error ? (
        <div className="text-center py-12 text-danger-600 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
          <p>{error}</p>
          <button onClick={fetchOpnames} className="text-sm underline mt-2">{UI_MESSAGES.TRY_AGAIN}</button>
        </div>
      ) : opnames.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <p className="text-neutral-500">{STOCK_OPNAME_MESSAGES.NO_OPNAME}</p>
          <p className="text-sm text-neutral-400 mt-1">{STOCK_OPNAME_MESSAGES.CREATE_HINT}</p>
        </div>
       ) : (
         <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full min-w-[600px]">
               <thead>
                 <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                   <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                   <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                   <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Dibuat Oleh</th>
                   <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                 {opnames.map((opname) => (
                   <tr key={opname.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                     <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{new Date(opname.opname_date).toLocaleDateString('id-ID')}</td>
                     <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                       <Badge variant={statusBadgeVariant[opname.status]} size="sm">
                         {statusLabels[opname.status]}
                       </Badge>
                     </td>
                     <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{opname.created_by || '-'}</td>
                     <td className="px-4 py-3 text-right text-sm text-neutral-900 dark:text-neutral-100">
                       <div className="flex justify-end gap-2">
                         <Link
                           href={`/inventory/stock-opname/${opname.id}`}
                           className="p-2 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                         >
                           <IconEye size={18} />
                         </Link>
                         {opname.status === 'draft' && (
                           <button
                             onClick={() => handleDelete(opname.id)}
                             className="p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
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
         </div>
       )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title={STOCK_OPNAME_MESSAGES.NO_OPNAME.split('')[0] === 'B' ? 'Hapus Stock Opname' : 'Hapus Stock Opname'}
        message={STOCK_OPNAME_MESSAGES.DELETE_CONFIRM}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
