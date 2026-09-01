import { Badge, ModernPagination } from '@/components/ui';
import { formatDateTimeWIB, formatCurrency } from '@/lib/utils';
import { getTypeBadge } from './utils';

interface CashFlowDesktopTableProps {
  data: any[];
  isLoading: boolean;
  isAdmin: boolean;
  onRowClick: (row: any) => void;
  page: number;
  setPage: (page: number) => void;
  total: number;
  limit: number;
}

export function CashFlowDesktopTable({
  data,
  isLoading,
  isAdmin,
  onRowClick,
  page,
  setPage,
  total,
  limit,
}: CashFlowDesktopTableProps) {
  return (
    <div className="hidden min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm md:flex dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className="w-40 px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Tanggal
              </th>
              {isAdmin && (
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  Kasir
                </th>
              )}
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Tipe
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Keterangan
              </th>
              <th className="w-32 px-5 py-3 text-right text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Metode
              </th>
              <th className="w-40 px-5 py-3 text-right text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Nominal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-5 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <div className="h-5 w-24 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                  <td className="px-5 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                </tr>
              ))
            ) : data?.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-5 py-12 text-center text-neutral-500 dark:text-neutral-400"
                >
                  Belum ada riwayat arus kas
                </td>
              </tr>
            ) : (
              data?.map((item: any) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick(item)}
                  className={`transition-colors ${item.tipe === 'JUAL' && item.referensi_id ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''}`}
                >
                  <td className="px-5 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                    {formatDateTimeWIB(item.created_at)}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {item.profiles?.nama || 'Unknown'}
                    </td>
                  )}
                  <td className="px-5 py-3 text-sm">{getTypeBadge(item.tipe)}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {item.gudang?.nama && (
                      <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 mr-1.5 border border-neutral-200/60 dark:border-neutral-700/50">
                        {item.gudang.nama}
                      </span>
                    )}
                    {item.catatan ||
                      (item.tipe === 'JUAL' ? `Ref: ${item.referensi_id?.slice(0, 8) || '-'}` : '-')}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-neutral-500 dark:text-neutral-400">
                    <Badge variant="default" className="inline-flex bg-neutral-100 dark:bg-neutral-800">
                      {item.payment_method}
                    </Badge>
                  </td>
                  <td
                    className={`px-5 py-3 text-right text-sm font-semibold ${
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <ModernPagination
          page={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={setPage}
          className="rounded-none border-x-0 border-b-0 bg-neutral-50 dark:bg-neutral-900"
        />
      )}
    </div>
  );
}
