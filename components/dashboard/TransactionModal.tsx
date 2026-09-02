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
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
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
                {data.profiles?.nama && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Kasir:{' '}
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {data.profiles.nama}
                    </span>
                  </p>
                )}
                {data.members?.name && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Member:{' '}
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {data.members.name}
                      {data.members.whatsapp_number && ` (${data.members.whatsapp_number})`}
                    </span>
                  </p>
                )}
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
              <div className="max-h-56 overflow-y-auto pr-1">
                <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
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

            {/* Rincian Kalkulasi & Diskon */}
            <div className="space-y-1.5 border-b border-neutral-200 pb-3 text-sm dark:border-neutral-800">
              {transactionType === 'penjualan' &&
                ((data.subtotal_sebelum_diskon != null &&
                  Number(data.subtotal_sebelum_diskon) > Number(data.total)) ||
                  Number(data.diskon_nominal) > 0 ||
                  Number(data.discount_member_amount) > 0) && (
                  <>
                    <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Subtotal</span>
                      <span>
                        {formatCurrency(data.subtotal_sebelum_diskon || data.total || 0)}
                      </span>
                    </div>
                    {Number(data.diskon_nominal) > 0 && (
                      <div className="text-accent-rose-500 flex items-center justify-between">
                        <span>Diskon Transaksi</span>
                        <span>-{formatCurrency(data.diskon_nominal)}</span>
                      </div>
                    )}
                    {Number(data.discount_member_amount) > 0 && (
                      <div className="text-accent-rose-500 flex items-center justify-between">
                        <span>Diskon Member</span>
                        <span>-{formatCurrency(data.discount_member_amount)}</span>
                      </div>
                    )}
                  </>
                )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Total
                </span>
                <span className="text-brand-600 dark:text-brand-400 text-lg font-bold">
                  {formatCurrency(data.total || data.total_sistem || 0)}
                </span>
              </div>
            </div>

            {/* Rincian Pembayaran (Khusus Transaksi Penjualan) */}
            {transactionType === 'penjualan' && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-2.5 dark:border-neutral-800 dark:bg-neutral-900/60">
                <p className="text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  Rincian Pembayaran
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Metode</span>
                  <div>
                    {(() => {
                      const method = (data.payment_method || 'CASH').toUpperCase();
                      if (method === 'CASH') {
                        return (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Tunai (Cash)
                          </span>
                        );
                      }
                      if (method === 'QRIS') {
                        return (
                          <span className="inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400">
                            QRIS
                          </span>
                        );
                      }
                      if (method === 'CASH_QRIS') {
                        return (
                          <span className="inline-flex items-center rounded-full border border-purple-200/60 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-400">
                            Tunai + QRIS
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {data.payment_method}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {(data.payment_method === 'CASH' ||
                  data.payment_method === 'CASH_QRIS' ||
                  Number(data.cash_amount) > 0) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Bayar Tunai (Cash)
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(data.cash_amount || 0)}
                    </span>
                  </div>
                )}

                {(data.payment_method === 'QRIS' ||
                  data.payment_method === 'CASH_QRIS' ||
                  Number(data.qris_amount) > 0) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">Bayar QRIS</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(data.qris_amount || 0)}
                    </span>
                  </div>
                )}

                {(data.payment_method === 'CASH' ||
                  data.payment_method === 'CASH_QRIS' ||
                  Number(data.kembalian) > 0) && (
                  <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2 text-sm dark:border-neutral-800/60">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Kembalian
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.kembalian || 0)}
                    </span>
                  </div>
                )}

                {Number(data.points_earned) > 0 && (
                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Poin Didapat</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      +{data.points_earned} poin
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
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
