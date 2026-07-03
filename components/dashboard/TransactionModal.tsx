import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { penjualanApi } from '@/lib/api/penjualan';
import { purchasesApi } from '@/lib/api/pembelian';
import { Button } from '@/components/ui/Button';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  transactionType: 'penjualan' | 'pembelian' | null;
}

export function TransactionModal({ isOpen, onClose, transactionId, transactionType }: TransactionModalProps) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detail ${transactionType === 'penjualan' ? 'Penjualan' : 'Pembelian'}`} size="lg">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">
            Gagal memuat data transaksi.
          </div>
        ) : data ? (
          <>
            <div className="flex justify-between items-start text-sm border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">ID Transaksi</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{data.id}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 dark:text-neutral-400">Tanggal</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatDate(data.created_at || data.tanggal)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Daftar Item</h4>
              <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                {data.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {item.qty} x {formatCurrency(item.harga_jual || item.harga_beli || 0)}
                        {item.diskon > 0 && <span className="text-red-500 ml-1">(Diskon {formatCurrency(item.diskon)})</span>}
                      </p>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(item.subtotal || ((item.harga_final || ((item.harga_jual || item.harga_beli || 0) - (item.diskon || 0))) * item.qty))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <p className="font-bold text-lg text-neutral-900 dark:text-neutral-100">Total</p>
              <p className="font-bold text-xl text-brand-600 dark:text-brand-400">
                {formatCurrency(data.total || data.total_sistem || 0)}
              </p>
            </div>
            
            <div className="flex justify-end pt-4">
               <Button onClick={onClose} variant="secondary">Tutup</Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
