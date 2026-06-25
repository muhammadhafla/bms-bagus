'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StockOpname, StockOpnameWithProfile, stockOpnameApi } from '@/lib/api';
import { IconPlus, IconEye, IconCheck, IconX, IconTrash, IconClipboardCheck, IconSearch } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Breadcrumb, Button, Badge, AmbientLayout } from '@/components/ui';
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
  const [opnames, setOpnames] = useState<StockOpnameWithProfile[]>([]);
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
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        
        {/* Header Area */}
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconClipboardCheck className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Stock Opname</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-xs lg:text-base font-medium">Rekonsiliasi stok fisik dan sistem</p>
              </div>
            </div>
            
            <Button
              onClick={handleCreate}
              disabled={creating}
              variant="primary"
              className="shadow-brand rounded-xl whitespace-nowrap"
            >
              <IconPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Buat Opname Baru</span>
              <span className="sm:hidden">Buat Baru</span>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          {loading ? (
            <div className="flex justify-center items-center h-32 m-auto">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="m-auto text-center p-8 text-danger-600 bg-danger-50/50 dark:bg-danger-900/20 backdrop-blur-md rounded-3xl border border-danger-200/50 dark:border-danger-800/50 shadow-sm max-w-md">
              <p>{error}</p>
              <button onClick={fetchOpnames} className="text-sm underline mt-2 font-medium">{UI_MESSAGES.TRY_AGAIN}</button>
            </div>
          ) : opnames.length === 0 ? (
            <div className="m-auto text-center p-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/50 dark:bg-neutral-950/50 rounded-2xl flex items-center justify-center mb-4">
                <IconSearch className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">{STOCK_OPNAME_MESSAGES.NO_OPNAME}</p>
              <p className="text-sm text-neutral-500 mt-1">{STOCK_OPNAME_MESSAGES.CREATE_HINT}</p>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="block lg:hidden space-y-4 p-4 overflow-y-auto h-full custom-scrollbar">
                {opnames.map((opname) => (
                  <div key={opname.id} className="bg-white/50 dark:bg-neutral-950/50 rounded-2xl p-4 shadow-sm border border-neutral-200/50 dark:border-neutral-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">{new Date(opname.opname_date).toLocaleDateString('id-ID')}</p>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          Oleh: {opname.profiles?.nama || opname.created_by || '-'}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant[opname.status]} size="sm">
                        {statusLabels[opname.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-200/50 dark:border-neutral-800/50">
                      <Link
                        href={`/inventory/stock-opname/${opname.id}`}
                        className="p-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:text-brand-300 dark:hover:bg-brand-900/30 rounded-xl transition-colors btn-press"
                      >
                        <IconEye className="w-5 h-5" />
                      </Link>
                      {opname.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(opname.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 rounded-xl transition-colors btn-press"
                        >
                          <IconTrash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table List */}
              <div className="hidden lg:block overflow-x-auto h-full custom-scrollbar">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">#</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tanggal</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Dibuat Oleh</th>
                      <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {opnames.map((opname, index) => (
                      <tr key={opname.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">{index + 1}</td>
                        <td className="px-5 py-4 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{new Date(opname.opname_date).toLocaleDateString('id-ID')}</td>
                        <td className="px-5 py-4">
                          <Badge variant={statusBadgeVariant[opname.status]} size="sm">
                            {statusLabels[opname.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">{opname.profiles?.nama || opname.created_by || '-'}</td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/inventory/stock-opname/${opname.id}`}
                              className="p-2 rounded-xl text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:text-brand-300 dark:hover:bg-brand-900/30 transition-colors btn-press"
                              title="Lihat Detail"
                            >
                              <IconEye className="w-5 h-5" />
                            </Link>
                            {opname.status === 'draft' ? (
                              <button
                                onClick={() => handleDelete(opname.id)}
                                className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 transition-colors btn-press"
                                title="Hapus Draft"
                              >
                                <IconTrash className="w-5 h-5" />
                              </button>
                            ) : (
                              <div className="w-9" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Hapus Stock Opname"
        message={STOCK_OPNAME_MESSAGES.DELETE_CONFIRM}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </AmbientLayout>
  );
}
