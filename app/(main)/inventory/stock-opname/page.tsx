'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StockOpname, StockOpnameWithProfile, stockOpnameApi } from '@/lib/api';
import {
  IconPlus,
  IconEye,
  IconCheck,
  IconX,
  IconTrash,
  IconClipboardCheck,
  IconSearch,
  IconChevronRight,
  IconArrowDown,
} from '@tabler/icons-react';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Breadcrumb, Button, Badge, AmbientLayout } from '@/components/ui';
import { toast } from 'sonner';
import { API_ERROR_MESSAGES, UI_MESSAGES, STOCK_OPNAME_MESSAGES } from '@/lib/constants';
import { formatDateWIB } from '@/lib/utils';

const statusBadgeVariant: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  draft: 'warning',
  pending: 'info',
  approved: 'success',
  rejected: 'danger',
  completed: 'success',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending: 'Menunggu Approval',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
};

export default function StockOpnameListPage() {
  const router = useRouter();
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
      router.push(`/inventory/stock-opname/${result.data.id}`);
    } else if (result.error) {
      toast.error(result.error.message || API_ERROR_MESSAGES.SAVE_FAILED);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      const result = await stockOpnameApi.delete(deleteId);
      if (result.error) {
        toast.error(result.error.message || 'Gagal menghapus stock opname');
      } else {
        toast.success('Stock opname berhasil dihapus');
        fetchOpnames();
      }
      setDeleteId(null);
    }
  };

  const handleRefresh = async () => {
    const result = await stockOpnameApi.getAll();
    if (!result.error && result.data) {
      setOpnames(result.data);
    }
  };

  return (
    <AmbientLayout>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div className="flex items-center justify-center py-4 text-neutral-400">
            <IconArrowDown className="h-5 w-5 animate-bounce" />
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <div className="border-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        }
      >
        <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)] lg:min-h-0">
          {/* Header Area */}
          <div className="animate-fade-in-up mb-2 flex-shrink-0 lg:mb-4">
            <div className="mb-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <IconClipboardCheck
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Stock Opname
                  </h1>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Rekonsiliasi stok fisik dan sistem
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                variant="primary"
                className="shadow-brand rounded-xl whitespace-nowrap"
              >
                <IconPlus className="h-5 w-5" />
                <span className="hidden sm:inline">Buat Opname Baru</span>
                <span className="sm:hidden">Buat Baru</span>
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div
            className="shadow-elevated animate-fade-in-up mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '100ms' }}
          >
            {loading ? (
              <div className="m-auto flex h-32 items-center justify-center">
                <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="text-danger-600 bg-danger-50/50 dark:bg-danger-900/20 border-danger-200/50 dark:border-danger-800/50 m-auto max-w-md rounded-3xl border p-8 text-center shadow-sm backdrop-blur-md">
                <p>{error}</p>
                <button onClick={fetchOpnames} className="mt-2 text-sm font-medium underline">
                  {UI_MESSAGES.TRY_AGAIN}
                </button>
              </div>
            ) : opnames.length === 0 ? (
              <div className="m-auto flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/50 dark:bg-neutral-950/50">
                  <IconSearch className="h-8 w-8 text-neutral-400" />
                </div>
                <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">
                  {STOCK_OPNAME_MESSAGES.NO_OPNAME}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{STOCK_OPNAME_MESSAGES.CREATE_HINT}</p>
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="custom-scrollbar block h-full space-y-3 overflow-y-auto p-3 lg:hidden">
                  {opnames.map((opname) => (
                    <Link
                      key={opname.id}
                      href={`/inventory/stock-opname/${opname.id}`}
                      className="block rounded-2xl border border-neutral-200/50 bg-white/50 p-3 shadow-sm transition-colors hover:bg-white active:scale-[0.98] dark:border-neutral-800/50 dark:bg-neutral-950/50 dark:hover:bg-neutral-900"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="mb-0.5 text-base font-bold text-neutral-900 dark:text-white">
                            {formatDateWIB(opname.opname_date)}
                          </p>
                          <p className="mb-2 text-sm text-neutral-500">
                            Oleh: {opname.profiles?.nama || opname.created_by || '-'}
                          </p>
                        </div>
                        <Badge
                          variant={statusBadgeVariant[opname.status]}
                          size="sm"
                          className="ml-2 shrink-0"
                        >
                          {statusLabels[opname.status]}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800/50">
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-neutral-400">Total Item</span>
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              {opname.total_items ?? 0}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-neutral-400">Selisih</span>
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              {opname.total_selisih
                                ? opname.total_selisih > 0
                                  ? `+${opname.total_selisih}`
                                  : opname.total_selisih
                                : 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {opname.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(opname.id);
                              }}
                              className="btn-press mr-1 rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            >
                              <IconTrash className="h-5 w-5" />
                            </button>
                          )}
                          <IconChevronRight className="h-5 w-5 text-neutral-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Desktop Table List */}
                <div className="custom-scrollbar hidden h-full overflow-x-auto lg:block">
                  <table className="w-full min-w-[800px]">
                    <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                      <tr>
                        <th className="w-16 px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          #
                        </th>
                        <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Tanggal
                        </th>
                        <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Status
                        </th>
                        <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Dibuat Oleh
                        </th>
                        <th className="w-24 px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                      {opnames.map((opname, index) => (
                        <tr
                          key={opname.id}
                          className="transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {index + 1}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {formatDateWIB(opname.opname_date)}
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant={statusBadgeVariant[opname.status]} size="sm">
                              {statusLabels[opname.status]}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {opname.profiles?.nama || opname.created_by || '-'}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/inventory/stock-opname/${opname.id}`}
                                className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:text-brand-300 dark:hover:bg-brand-900/30 btn-press rounded-xl p-2 transition-colors"
                                title="Lihat Detail"
                              >
                                <IconEye className="h-5 w-5" />
                              </Link>
                              {opname.status === 'draft' ? (
                                <button
                                  onClick={() => handleDelete(opname.id)}
                                  className="btn-press rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                  title="Hapus Draft"
                                >
                                  <IconTrash className="h-5 w-5" />
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
      </PullToRefresh>
    </AmbientLayout>
  );
}
