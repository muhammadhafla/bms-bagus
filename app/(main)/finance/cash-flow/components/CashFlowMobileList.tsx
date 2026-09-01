import { Badge, ModernPagination } from '@/components/ui';
import { IconChevronRight } from '@tabler/icons-react';
import { formatDateTimeWIB, formatCurrency } from '@/lib/utils';
import { getTypeBadge } from './utils';

interface CashFlowMobileListProps {
  data: any[];
  isLoading: boolean;
  isAdmin: boolean;
  onRowClick: (row: any) => void;
  page: number;
  setPage: (page: number) => void;
  total: number;
  limit: number;
}

export function CashFlowMobileList({
  data,
  isLoading,
  isAdmin,
  onRowClick,
  page,
  setPage,
  total,
  limit,
}: CashFlowMobileListProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {isLoading ? (
        [...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-3 flex justify-between">
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700"></div>
              <div className="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
            <div className="mb-2 h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700"></div>
            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
              <div className="h-5 w-24 rounded bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
          </div>
        ))
      ) : data?.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-500 dark:text-neutral-400">Belum ada riwayat arus kas</p>
        </div>
      ) : (
        data?.map((item: any) => (
          <div
            key={item.id}
            onClick={() => onRowClick(item)}
            className={`flex flex-col gap-2 rounded-2xl border border-neutral-200/60 p-3 shadow-sm transition-all duration-200 sm:p-4 dark:border-neutral-800/60 ${item.tipe === 'JUAL' && item.referensi_id ? 'cursor-pointer hover:bg-neutral-50/90 active:scale-[0.98] dark:hover:bg-neutral-800/80' : 'bg-white/70 dark:bg-neutral-900/60'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500">
                    {formatDateTimeWIB(item.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(item.tipe, 'text-[10px] px-2 py-0.5')}
                  {isAdmin && (
                    <span className="line-clamp-1 text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {item.profiles?.nama || 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
              {item.tipe === 'JUAL' && item.referensi_id && (
                <div className="-mr-2 flex items-center justify-center rounded-lg p-1 text-neutral-400">
                  <IconChevronRight size={18} stroke={2.5} />
                </div>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {item.gudang?.nama && (
                <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                  {item.gudang.nama}
                </span>
              )}
              <p className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
                {item.catatan || (item.tipe === 'JUAL' ? `Ref: ${item.referensi_id?.slice(0, 8) || '-'}` : '-')}
              </p>
            </div>

            <div className="mt-2 flex items-end justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800/60">
              <Badge variant="default" className="inline-flex bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-800">
                {item.payment_method}
              </Badge>
              <span
                className={`text-sm font-bold ${
                  item.tipe === 'JUAL' || item.tipe === 'SETOR'
                    ? 'text-green-600 dark:text-green-400'
                    : item.tipe === 'TARIK' || item.tipe === 'RETURN'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {item.jumlah === 0
                  ? '-'
                  : `${item.tipe === 'TARIK' || item.tipe === 'RETURN' ? '-' : '+'}${formatCurrency(item.jumlah)}`}
              </span>
            </div>
          </div>
        ))
      )}

      {total > limit && (
        <ModernPagination
          page={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={setPage}
          className="sticky bottom-0 z-20 -mx-4 mt-2 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
        />
      )}
    </div>
  );
}
