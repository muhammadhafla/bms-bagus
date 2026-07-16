'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kasApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { DateRangePicker, Button, SelectInput, DataTable, Badge, FilterButton, AmbientLayout, ModernPagination } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IconReportMoney, IconArrowUpRight, IconArrowDownRight, IconWallet, IconChevronRight } from '@tabler/icons-react';
import { formatCurrency, formatDateTimeWIB, formatDateForInputWIB } from '@/lib/utils';
import { ManualKasModal } from './components/ManualKasModal';
import { TransactionModal } from '@/components/dashboard/TransactionModal';

export default function CashFlowPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const currentUserId = profile?.id;

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(formatDateForInputWIB(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDateForInputWIB(today));
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'SETOR' | 'TARIK'>('SETOR');
  
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Pagination for main table
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, typeFilter]);

  // Fetch paginated log
  const { data: kasLogData, isLoading: isLoadingLog } = useQuery({
    queryKey: ['kas_log', page, isAdmin ? startDate : null, isAdmin ? endDate : null, typeFilter, isAdmin ? null : currentUserId],
    queryFn: () => kasApi.getPaginated({
      page,
      limit: LIMIT,
      startDate: isAdmin ? startDate : undefined,
      endDate: isAdmin ? endDate : undefined,
      type: typeFilter,
      userId: isAdmin ? undefined : currentUserId,
    }),
    enabled: !!currentUserId
  });

  // Fetch summary based on role
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['kas_summary', isAdmin ? startDate : null, isAdmin ? endDate : null, isAdmin ? null : currentUserId],
    queryFn: async () => {
      if (isAdmin) {
        return await kasApi.getSummary({ startDate, endDate });
      } else {
        return await kasApi.getCurrentShiftBalance(currentUserId!);
      }
    },
    enabled: !!currentUserId
  });

  // Admin specific: Shift Summary Table
  const { data: shiftSummaryData, isLoading: isLoadingShiftSummary } = useQuery({
    queryKey: ['shift_summary', endDate], // Use end date as the target date for daily shift summary
    queryFn: () => kasApi.getShiftSummary(endDate),
    enabled: isAdmin && !!currentUserId
  });

  const handleOpenManualKas = (type: 'SETOR' | 'TARIK') => {
    setManualType(type);
    setIsManualModalOpen(true);
  };

  const handleRowClick = (row: any) => {
    if (row.tipe === 'JUAL' && row.referensi_id) {
      setSelectedTransactionId(row.referensi_id);
      setIsTransactionModalOpen(true);
    }
  };

  const getTypeBadge = (tipe: string, className?: string) => {
    switch (tipe) {
      case 'JUAL':
      case 'SETOR':
        return <Badge variant="success" className={className}>Pemasukan ({tipe})</Badge>;
      case 'TARIK':
      case 'RETURN':
        return <Badge variant="danger" className={className}>Pengeluaran ({tipe})</Badge>;
      case 'TUTUP_SHIFT':
        return <Badge variant="default" className={className}>TUTUP SHIFT</Badge>;
      default:
        return <Badge variant="default" className={className}>{tipe}</Badge>;
    }
  };

  return (
    <ErrorBoundary>
      <AmbientLayout>
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-row items-start lg:items-center justify-between gap-4 mb-4 lg:mb-5">
          <div className="flex items-center gap-3 lg:gap-4 animate-fade-in-up">
            <IconWallet className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                {isAdmin ? 'Arus Kas' : 'Kas Shift Anda'}
              </h1>
              <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">
                {isAdmin 
                  ? 'Pantau pergerakan kas dari semua pengguna.' 
                  : 'Pantau penerimaan dan pengeluaran kas.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-up">
            <Button 
              onClick={() => handleOpenManualKas('SETOR')}
              className="bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 rounded-xl shadow-sm hover:shadow-md transition-shadow h-10 w-10 sm:h-auto sm:w-auto !p-0 sm:!px-4 sm:!py-2 shrink-0"
              title="Setor Kas"
            >
              <IconArrowDownRight size={20} className="shrink-0" />
              <span className="hidden sm:inline font-medium">Setor Kas</span>
            </Button>
            <Button 
              onClick={() => handleOpenManualKas('TARIK')}
              variant="danger"
              className="flex items-center justify-center gap-2 rounded-xl shadow-sm hover:shadow-md transition-shadow h-10 w-10 sm:h-auto sm:w-auto !p-0 sm:!px-4 sm:!py-2 shrink-0"
              title="Tarik Kas"
            >
              <IconArrowUpRight size={20} className="shrink-0" />
              <span className="hidden sm:inline font-medium">Tarik Kas</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-elevated flex flex-col gap-1 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Pemasukan</p>
          <div className="flex items-center justify-between gap-2">
            {isLoadingSummary ? (
              <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 animate-pulse" />
            ) : (
              <p className="text-lg xl:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                {formatCurrency(summaryData?.pemasukan || 0)}
              </p>
            )}
            <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center text-green-600 dark:text-green-400">
              <IconArrowDownRight className="w-5 h-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-elevated flex flex-col gap-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Pengeluaran</p>
          <div className="flex items-center justify-between gap-2">
            {isLoadingSummary ? (
              <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 animate-pulse" />
            ) : (
              <p className="text-lg xl:text-2xl font-bold text-red-600 dark:text-red-400 truncate">
                {formatCurrency(summaryData?.pengeluaran || 0)}
              </p>
            )}
            <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center text-red-600 dark:text-red-400">
              <IconArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-800 rounded-3xl p-4 sm:p-6 shadow-elevated text-white flex flex-col gap-1 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <IconWallet className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-brand-100 relative z-10">Saldo Kas Akhir</p>
          <div className="flex items-center justify-between relative z-10 mt-1">
            {isLoadingSummary ? (
              <div className="h-8 bg-white/20 rounded w-1/2 animate-pulse" />
            ) : (
              <p className="text-3xl font-bold">
                {formatCurrency(summaryData?.saldo || 0)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse xl:flex-row gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {/* Main Log Table */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex-1">
              Riwayat Transaksi Kas
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isAdmin && (
                <div className="w-full sm:w-[260px]">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  />
                </div>
              )}
              <div className="w-full sm:w-48">
                <SelectInput
                  value={typeFilter}
                  onChange={(val) => setTypeFilter(val)}
                  inputSize="sm"
                  options={[
                    { label: 'Semua Tipe', value: 'all' },
                    { label: 'Penjualan (JUAL)', value: 'JUAL' },
                    { label: 'Setor Kas (SETOR)', value: 'SETOR' },
                    { label: 'Tarik Kas (TARIK)', value: 'TARIK' },
                    { label: 'Retur (RETURN)', value: 'RETURN' },
                    { label: 'Tutup Shift', value: 'TUTUP_SHIFT' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="hidden md:flex bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm flex-1 flex-col min-h-[400px]">
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[700px]">
                <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-40">Tanggal</th>
                    {isAdmin && <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Kasir</th>}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tipe</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Keterangan</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-32">Metode</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-40">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {isLoadingLog ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="px-5 py-3"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                        {isAdmin && <td className="px-5 py-3"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>}
                        <td className="px-5 py-3"><div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" /></td>
                        <td className="px-5 py-3"><div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                        <td className="px-5 py-3 text-right"><div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse ml-auto" /></td>
                        <td className="px-5 py-3 text-right"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : kasLogData?.data.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-5 py-12 text-center text-neutral-500 dark:text-neutral-400">
                        Belum ada riwayat arus kas
                      </td>
                    </tr>
                  ) : (
                    kasLogData?.data.map((item: any) => (
                      <tr 
                        key={item.id} 
                        onClick={() => handleRowClick(item)}
                        className={`transition-colors ${item.tipe === 'JUAL' && item.referensi_id ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer' : ''}`}
                      >
                        <td className="px-5 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {formatDateTimeWIB(item.created_at)}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {item.profiles?.nama || 'Unknown'}
                          </td>
                        )}
                        <td className="px-5 py-3 text-sm">
                          {getTypeBadge(item.tipe)}
                        </td>
                        <td className="px-5 py-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                          {item.catatan || (item.tipe === 'JUAL' ? `Ref: ${item.referensi_id?.slice(0, 8) || '-'}` : '-')}
                        </td>
                        <td className="px-5 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-right">
                          <Badge variant="default" className="inline-flex bg-neutral-100 dark:bg-neutral-800">
                            {item.payment_method}
                          </Badge>
                        </td>
                        <td className={`px-5 py-3 text-sm font-semibold text-right ${
                          item.tipe === 'JUAL' || item.tipe === 'SETOR' ? 'text-green-600 dark:text-green-400' :
                          item.tipe === 'TARIK' || item.tipe === 'RETURN' ? 'text-red-600 dark:text-red-400' :
                          'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {item.jumlah === 0 ? '-' : `${item.tipe === 'TARIK' || item.tipe === 'RETURN' ? '-' : '+'}${formatCurrency(item.jumlah)}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Desktop Pagination Controls */}
            {kasLogData && kasLogData.total > LIMIT && (
              <ModernPagination
                page={page}
                totalPages={Math.ceil(kasLogData.total / LIMIT)}
                onPageChange={setPage}
                className="border-x-0 border-b-0 rounded-none bg-neutral-50 dark:bg-neutral-900"
              />
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-3">
            {isLoadingLog ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 animate-pulse">
                  <div className="flex justify-between mb-3">
                    <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                    <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                  </div>
                  <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                    <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                  </div>
                </div>
              ))
            ) : kasLogData?.data.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-neutral-500 dark:text-neutral-400">Belum ada riwayat arus kas</p>
              </div>
            ) : (
              kasLogData?.data.map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className={`p-3 sm:p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm flex flex-col gap-2 transition-all duration-200 ${item.tipe === 'JUAL' && item.referensi_id ? 'cursor-pointer hover:bg-neutral-50/90 dark:hover:bg-neutral-800/80 active:scale-[0.98]' : 'bg-white/70 dark:bg-neutral-900/60'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-neutral-500">{formatDateTimeWIB(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(item.tipe, "text-[10px] px-2 py-0.5")}
                        {isAdmin && (
                          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">{item.profiles?.nama || 'Unknown'}</span>
                        )}
                      </div>
                    </div>
                    {item.tipe === 'JUAL' && item.referensi_id && (
                      <div className="p-1 -mr-2 rounded-lg text-neutral-400 flex items-center justify-center">
                        <IconChevronRight size={18} stroke={2.5} />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                    {item.catatan || (item.tipe === 'JUAL' ? `Ref: ${item.referensi_id?.slice(0, 8) || '-'}` : '-')}
                  </p>

                  <div className="flex justify-between items-end mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                    <Badge variant="default" className="inline-flex bg-neutral-100 dark:bg-neutral-800 text-[10px] px-2 py-0.5">
                      {item.payment_method}
                    </Badge>
                    <span className={`font-bold text-sm ${
                      item.tipe === 'JUAL' || item.tipe === 'SETOR' ? 'text-green-600 dark:text-green-400' :
                      item.tipe === 'TARIK' || item.tipe === 'RETURN' ? 'text-red-600 dark:text-red-400' :
                      'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {item.jumlah === 0 ? '-' : `${item.tipe === 'TARIK' || item.tipe === 'RETURN' ? '-' : '+'}${formatCurrency(item.jumlah)}`}
                    </span>
                  </div>
                </div>
              ))
            )}
            
            {/* Mobile Pagination */}
            {kasLogData && kasLogData.total > LIMIT && (
              <ModernPagination
                page={page}
                totalPages={Math.ceil(kasLogData.total / LIMIT)}
                onPageChange={setPage}
                className="sticky bottom-0 z-20 mt-2 -mx-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] rounded-none border-x-0 border-b-0"
              />
            )}
          </div>
        </div>

        {/* Admin: Shift Summary Table */}
        {isAdmin && (
          <div className="w-full xl:w-[400px] flex flex-col gap-4">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              Ringkasan Per Shift ({formatDateTimeWIB(endDate).split(' ')[0]})
            </h2>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm flex flex-col p-4">
              {isLoadingShiftSummary ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : shiftSummaryData?.data?.length === 0 ? (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">Tidak ada shift aktif pada tanggal ini.</p>
              ) : (
                <div className="space-y-4">
                  {shiftSummaryData?.data?.map((shift: any) => (
                    <div key={shift.userId} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{shift.userName}</p>
                          <p className="text-xs text-neutral-500">
                            Aktifitas Trakhir: {formatDateTimeWIB(shift.lastActivity).split(' ')[1]}
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
                          <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(shift.pemasukan)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500 dark:text-neutral-400">Pengeluaran</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(shift.pengeluaran)}</span>
                        </div>
                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 flex justify-between font-bold">
                          <span className="text-neutral-900 dark:text-white">Saldo</span>
                          <span className="text-brand-600 dark:text-brand-400">{formatCurrency(shift.saldo)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ManualKasModal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        defaultType={manualType} 
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        transactionId={selectedTransactionId}
        transactionType="penjualan"
      />
      </AmbientLayout>
    </ErrorBoundary>
  );
}
