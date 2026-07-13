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
}

export function ReturnTransactionModal({ isOpen, onClose, transactionId, transactionType }: ReturnTransactionModalProps) {
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
    return formatDateTimeWIB(dateStr, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Calculate total return based on items
  const totalReturn = data?.items?.reduce((sum: number, item: any) => sum + (item.harga_final * item.qty), 0) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detail ${transactionType === 'penjualan_return' ? 'Retur Penjualan' : 'Retur Pembelian'}`} size="lg">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-accent-rose-500">
            Gagal memuat data retur.
          </div>
        ) : data ? (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-start border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5 uppercase tracking-wide font-medium">ID Retur</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-mono font-medium text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm break-all">{data.id}</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(data.id)} 
                    className="p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors shrink-0" 
                    title="Salin ID"
                  >
                    <IconCopy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5 uppercase tracking-wide font-medium">Tanggal Retur</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{formatDate(data.created_at || data.tanggal)}</p>
              </div>
            </div>

            {data.note && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800/30">
                <p className="text-xs text-orange-800 dark:text-orange-300 font-semibold mb-1 uppercase tracking-wider">Catatan / Alasan</p>
                <p className="text-sm text-orange-900 dark:text-orange-200">{data.note}</p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Daftar Item Retur</h4>
              <div className="max-h-60 overflow-y-auto pr-2">
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
                  {data.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start py-2.5">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {item.qty} x {formatCurrency(item.harga_final)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 pt-0.5">
                        {formatCurrency(item.harga_final * item.qty)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="font-bold text-base text-neutral-900 dark:text-neutral-100">Total Nominal Retur</p>
              <p className="font-bold text-lg text-accent-rose-600 dark:text-accent-rose-400">
                {formatCurrency(totalReturn)}
              </p>
            </div>
            
            <div className="pt-6">
               <Button onClick={onClose} variant="secondary" fullWidth>Tutup</Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
