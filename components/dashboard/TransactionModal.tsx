import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { penjualanApi } from '@/lib/api/penjualan';
import { purchasesApi } from '@/lib/api/pembelian';
import { Button } from '@/components/ui/Button';
import { IconCopy } from '@tabler/icons-react';
import { formatCurrency, formatDateTimeWIB } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  transactionType: 'penjualan' | 'pembelian' | null;
  isBottomSheet?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  transactionId,
  transactionType,
  isBottomSheet = true,
}: TransactionModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactionDetail', transactionType, transactionId],
    queryFn: async () => {
      if (!transactionId || !transactionType) return null;
      if (transactionType === 'penjualan') {
        const res = await penjualanApi.getById(transactionId);
        if (res.error) throw new Error(res.error.message);
        return res.data;
      } else {
        const res = await purchasesApi.getById(transactionId);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detail ${transactionType === 'penjualan' ? 'Penjualan' : 'Pembelian'}`}
      size="lg"
      isBottomSheetOnMobile={isBottomSheet}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-accent-rose-500 py-10 text-center">Gagal memuat data transaksi.</div>
        ) : data ? (
          <>
            <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-800">
              <div>
                <p className="mb-0.5 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  ID Transaksi
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
                  Tanggal
                </p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDate(data.created_at || data.tanggal)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Daftar Item
              </h4>
              <div className="max-h-60 overflow-y-auto pr-2">
                <div className="divide-y divide-neutral-200 border-b border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {data.items?.map((item: any, index: number) => (
                    <div key={index} className="flex items-start justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.nama_barang}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {item.qty} x {formatCurrency(item.harga_jual || item.harga_beli || 0)}
                          {item.diskon > 0 && (
                            <span className="text-accent-rose-500 ml-1">
                              (Diskon {formatCurrency(item.diskon)})
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="pt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(
                          item.subtotal ||
                            (item.harga_final ||
                              (item.harga_jual || item.harga_beli || 0) - (item.diskon || 0)) *
                              item.qty,
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Total</p>
              <p className="text-brand-600 dark:text-brand-400 text-lg font-bold">
                {formatCurrency(data.total || data.total_sistem || 0)}
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
