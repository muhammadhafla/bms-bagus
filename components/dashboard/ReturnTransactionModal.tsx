import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { returnApi } from '@/lib/api/return';
import { Button } from '@/components/ui/Button';
import { IconCopy } from '@tabler/icons-react';
import { formatCurrency, formatDateTimeWIB } from '@/lib/utils';

interface ReturnTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  transactionType: 'penjualan_return' | 'pembelian_return' | null;
  isBottomSheet?: boolean;
}

export function ReturnTransactionModal({
  isOpen,
  onClose,
  transactionId,
  transactionType,
  isBottomSheet = true,
}: ReturnTransactionModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['returnDetail', transactionType, transactionId],
    queryFn: async () => {
      if (!transactionId || !transactionType) return null;
      if (transactionType === 'penjualan_return') {
        const res = await returnApi.getPenjualanReturnDetail(transactionId);
        if (res.error) throw new Error(res.error.message);
        return res.data;
      } else {
        const res = await returnApi.getReturnDetail(transactionId);
        if (res.error) throw new Error(res.error.message);
        return res.data;
      }
    },
    enabled: isOpen && !!transactionId && !!transactionType,
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return formatDateTimeWIB(dateStr, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate total return based on items
  const totalReturn =
    data?.items?.reduce((sum: number, item: any) => sum + item.harga_final * item.qty, 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detail ${transactionType === 'penjualan_return' ? 'Retur Penjualan' : 'Retur Pembelian'}`}
      size="lg"
      isBottomSheetOnMobile={isBottomSheet}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-accent-rose-500 py-10 text-center">Gagal memuat data retur.</div>
        ) : data ? (
          <>
            <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-800">
              <div>
                <p className="mb-0.5 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  ID Retur
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="font-mono text-xs font-medium break-all text-neutral-900 sm:text-sm dark:text-neutral-100">
                    {data.id}
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(data.id)}
                    className="hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 shrink-0 rounded p-1 text-neutral-400 transition-colors"
                    title="Salin ID"
                  >
                    <IconCopy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="mb-0.5 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  Tanggal Retur
                </p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDate(data.created_at || data.tanggal)}
                </p>
              </div>
            </div>

            {data.note && (
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-3 dark:border-orange-800/30 dark:bg-orange-900/20">
                <p className="mb-1 text-xs font-semibold tracking-wider text-orange-800 uppercase dark:text-orange-300">
                  Catatan / Alasan
                </p>
                <p className="text-sm text-orange-900 dark:text-orange-200">{data.note}</p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Daftar Item Retur
              </h4>
              <div className="max-h-60 overflow-y-auto pr-2">
                <div className="divide-y divide-neutral-200 border-b border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {data.items?.map((item: any, index: number) => (
                    <div key={index} className="flex items-start justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.nama_barang}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {item.qty} x {formatCurrency(item.harga_final)}
                        </p>
                      </div>
                      <p className="pt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(item.harga_final * item.qty)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Total Nominal Retur
              </p>
              <p className="text-accent-rose-600 dark:text-accent-rose-400 text-lg font-bold">
                {formatCurrency(totalReturn)}
              </p>
            </div>

            <div className="pt-6">
              <Button onClick={onClose} variant="secondary" fullWidth>
                Tutup
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
