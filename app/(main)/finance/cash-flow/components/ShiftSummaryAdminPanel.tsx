import { Badge } from '@/components/ui';
import { formatDateTimeWIB, formatCurrency } from '@/lib/utils';

interface ShiftSummaryAdminPanelProps {
  shiftSummaryData: any;
  isLoading: boolean;
  targetDate: string;
  selectedGudangName?: string;
}

export function ShiftSummaryAdminPanel({
  shiftSummaryData,
  isLoading,
  targetDate,
  selectedGudangName,
}: ShiftSummaryAdminPanelProps) {
  return (
    <div className="flex w-full flex-col gap-4 xl:w-[400px]">
      <div>
        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
          Ringkasan Per Shift ({formatDateTimeWIB(targetDate).split(' ')[0]})
        </h2>
        {selectedGudangName && (
          <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mt-0.5">
            Outlet: {selectedGudangName}
          </p>
        )}
      </div>
      <div className="flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          </div>
        ) : shiftSummaryData?.data?.length === 0 ? (
          <p className="py-8 text-center text-neutral-500 dark:text-neutral-400">
            Tidak ada shift aktif pada tanggal ini.
          </p>
        ) : (
          <div className="space-y-4">
            {shiftSummaryData?.data?.map((shift: any) => (
              <div
                key={`${shift.userId}_${shift.gudangId || 'all'}`}
                className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-700/50 dark:bg-neutral-800/50"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-neutral-900 dark:text-white truncate">
                        {shift.userName}
                      </p>
                      {shift.gudangName && (
                        <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                          {shift.gudangName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Aktifitas Terakhir: {formatDateTimeWIB(shift.lastActivity).split(' ')[1]}
                    </p>
                  </div>
                  {shift.shiftClosed ? (
                    <Badge variant="default">Shift Ditutup</Badge>
                  ) : (
                    <Badge variant="warning">Shift Aktif</Badge>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Pemasukan</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(shift.pemasukan)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Pengeluaran</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(shift.pengeluaran)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold dark:border-neutral-700">
                    <span className="text-neutral-900 dark:text-white">Saldo</span>
                    <span className="text-brand-600 dark:text-brand-400">
                      {formatCurrency(shift.saldo)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
