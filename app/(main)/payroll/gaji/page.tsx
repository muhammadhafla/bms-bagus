'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { mutasiApi, PayrollMutasi } from '@/lib/api/payroll';
import { Card, Button, ModernPagination, Modal, TextInput, TextareaInput, DataTable, type Column, Badge } from '@/components/ui';
import { IconWallet, IconArrowUpRight, IconArrowDownLeft, IconClock, IconReceipt2, IconCalendarEvent, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth';
import { useRealtimeQuery } from '@/lib/hooks/useRealtimeQuery';

import { Suspense } from 'react';

function DompetContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const page = Number(searchParams.get('page')) || 1;
  const limit = 20;

  const updatePage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: saldoData, isLoading: isLoadingSaldo } = useQuery({
    queryKey: ['payroll', 'my_saldo'],
    queryFn: () => mutasiApi.getMySaldo(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: mutasiData, isLoading: isLoadingMutasi } = useQuery({
    queryKey: ['payroll', 'my_mutasi', { page }],
    queryFn: () => mutasiApi.getMine({ page, limit }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription untuk mutasi gaji / kasbon karyawan ini
  useRealtimeQuery({
    table: 'payroll_mutasi',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    queryKeys: [['payroll']],
    enabled: !!user?.id,
  });

  const list = mutasiData?.data || [];
  const totalItems = mutasiData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const saldo = saldoData || 0;

  // Kasbon/Withdrawal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Calendar Modal State
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const startDateStr = format(monthStart, 'yyyy-MM-dd');
  const endDateStr = format(monthEnd, 'yyyy-MM-dd');

  const { data: mutasiMonthData, isLoading: isLoadingMutasiMonth } = useQuery({
    queryKey: ['payroll', 'my_mutasi_month', startDateStr, endDateStr],
    queryFn: () => mutasiApi.getMyMutasiByRange(startDateStr, endDateStr).then(res => res.data),
    enabled: isCalendarModalOpen,
  });

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate || !mutasiMonthData) return [];
    return mutasiMonthData.filter(m => isSameDay(new Date(m.tanggal), selectedDate));
  }, [selectedDate, mutasiMonthData]);

  const submitMutation = useMutation({
    mutationFn: () => mutasiApi.requestPenarikan(Number(nominal.replace(/\D/g, '')), keterangan),
    onSuccess: (res) => {
      toast.success('Pengajuan penarikan dana / kasbon berhasil dikirim.');
      setIsModalOpen(false);
      setNominal('');
      setKeterangan('');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengajukan penarikan');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(nominal.replace(/\D/g, ''));
    if (num <= 0) return toast.error('Nominal harus lebih dari 0');
    if (!keterangan) return toast.error('Keterangan wajib diisi');
    submitMutation.mutate();
  };

  const columns: Column<PayrollMutasi>[] = [
    { 
      key: 'tanggal',
      header: 'Tanggal', 
      render: (row) => format(new Date(row.tanggal), 'd MMM yyyy, HH:mm', { locale: localeId }) 
    },
    { key: 'keterangan', header: 'Keterangan', render: (row) => row.keterangan || (row.kategori === 'gaji' ? 'Penerimaan Gaji' : 'Penarikan Dana') },
    { 
      key: 'nominal', 
      header: 'Nominal', 
      render: (row) => (
        <span className={`font-bold ${
          row.status === 'pending' 
            ? 'text-amber-600 dark:text-amber-500' 
            : row.jenis === 'kredit' 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-neutral-900 dark:text-white'
        }`}>
          {row.jenis === 'kredit' ? '+' : '-'}Rp {row.nominal.toLocaleString('id-ID')}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row) => {
        let variant: 'warning' | 'success' | 'danger' | 'default' = 'default';
        if (row.status === 'pending') variant = 'warning';
        if (row.status === 'disetujui') variant = 'success';
        if (row.status === 'ditolak') variant = 'danger';
        
        return (
          <Badge variant={variant}>
            {row.status === 'pending' ? 'PENDING' : row.status === 'ditolak' ? 'DITOLAK' : 'BERHASIL'}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-4 w-full mx-auto pt-8 pb-20">
      
      {/* Header & Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-xl">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        
        {/* Top Right Calendar Button */}
        <button
          onClick={() => setIsCalendarModalOpen(true)}
          className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          title="Lihat Kalender Gaji"
        >
          <IconCalendarEvent size={20} />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center mt-2">
          <p className="text-brand-100 mb-1 text-sm font-medium">
            {saldo < 0 ? 'Total Pinjaman/Kasbon' : 'Total Saldo Saat Ini'}
          </p>
          <h1 className="text-4xl font-black tracking-tight mb-6">
            {saldo < 0 ? '-' : ''}Rp {Math.abs(saldo).toLocaleString('id-ID')}
          </h1>
          
          <Button 
            variant="secondary" 
            className="bg-white text-brand-700 hover:bg-neutral-50 border-none w-full max-w-xs shadow-lg font-bold"
            leftIcon={<IconWallet size={20} />}
            onClick={() => setIsModalOpen(true)}
          >
            Tarik Dana / Kasbon
          </Button>
          
          <button 
            onClick={() => router.push('/payroll/slip')}
            className="mt-4 text-sm font-medium text-brand-100 hover:text-white underline decoration-brand-400/50 hover:decoration-white underline-offset-4 transition-all"
          >
            Lihat Rincian / Slip Gaji
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Riwayat Mutasi</h2>
        
        {/* Desktop Table Layout */}
        <div className="hidden md:flex overflow-hidden flex-col rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {isLoadingMutasi ? (
            <div className="p-8 text-center text-sm text-neutral-500">Memuat data...</div>
          ) : !list || list.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-3">
              <IconReceipt2 className="h-10 w-10 text-neutral-300" />
              <p>Belum ada riwayat transaksi.</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <DataTable 
                columns={columns}
                data={list}
                keyField="id"
                className="border-none flex-1"
              />
              {totalPages > 1 && (
                <div className="mt-4 pb-4">
                  <ModernPagination
                    page={page}
                    totalPages={totalPages}
                    total={totalItems}
                    limit={limit}
                    onPageChange={updatePage}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Card Layout */}
        <div className="flex md:hidden flex-col gap-3">
          {isLoadingMutasi ? (
            <Card className="p-8 text-center text-sm text-neutral-500">Memuat data...</Card>
          ) : !list || list.length === 0 ? (
            <Card className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-3 border-dashed">
              <IconReceipt2 className="h-10 w-10 text-neutral-300" />
              <p>Belum ada riwayat transaksi.</p>
            </Card>
          ) : (
            <>
              {list.map((item: PayrollMutasi) => (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    item.status === 'pending' 
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                      : item.jenis === 'kredit' 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                  }`}>
                    {item.status === 'pending' ? (
                      <IconClock className="h-6 w-6" />
                    ) : item.jenis === 'kredit' ? (
                      <IconArrowDownLeft className="h-6 w-6" />
                    ) : (
                      <IconArrowUpRight className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.keterangan || (item.kategori === 'gaji' ? 'Penerimaan Gaji' : 'Penarikan Dana')}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {format(new Date(item.tanggal), 'd MMM yyyy, HH:mm', { locale: localeId })}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className={`font-black ${
                      item.status === 'pending' 
                        ? 'text-amber-600 dark:text-amber-500' 
                        : item.jenis === 'kredit' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-neutral-900 dark:text-white'
                    }`}>
                      {item.jenis === 'kredit' ? '+' : '-'} Rp {item.nominal.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">
                      {item.status === 'pending' ? 'PENDING' : item.status === 'ditolak' ? 'DITOLAK' : 'BERHASIL'}
                    </p>
                  </div>
                </div>
              ))}
              
              {totalPages > 1 && (
                <div className="mt-4">
                  <ModernPagination
                    page={page}
                    totalPages={totalPages}
                    total={totalItems}
                    limit={limit}
                    onPageChange={updatePage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Pengajuan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajukan Penarikan / Kasbon"
        isBottomSheetOnMobile={true}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {(() => {
            const num = Number(nominal.replace(/\D/g, ''));
            const isKasbon = num > saldo;
            return (
              <div className={`rounded-xl p-3 text-sm border ${
                isKasbon 
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' 
                  : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
              }`}>
                {isKasbon 
                  ? 'Nominal pengajuan melebihi saldo. Pengajuan ini akan dicatat sebagai Kasbon (Pinjaman).' 
                  : 'Pengajuan ini akan memotong saldo Anda setelah disetujui.'}
              </div>
            );
          })()}
          
          <TextInput
            label="Nominal (Rp)"
            value={nominal}
            onChange={(e) => {
              const num = e.target.value.replace(/\D/g, '');
              setNominal(num ? Number(num).toLocaleString('id-ID') : '');
            }}
            placeholder="0"
            required
            className="text-lg font-bold"
          />
          
          <TextareaInput
            label="Keterangan / Keperluan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Misal: Biaya sekolah anak"
            required
            rows={3}
          />
          
          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Kalender */}
      {isMounted && (
        <Modal
          isOpen={isCalendarModalOpen}
          onClose={() => {
            setIsCalendarModalOpen(false);
            setSelectedDate(null);
          }}
          title="Kalender Gaji & Kasbon"
          isBottomSheetOnMobile={true}
        >
        <div className="flex flex-col mt-2">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <IconChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            <h3 className="font-bold text-neutral-900 dark:text-white capitalize">
              {format(calendarMonth, 'MMMM yyyy', { locale: localeId })}
            </h3>
            <button 
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <IconChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, calendarMonth);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayDate = isToday(day);
              
              // Find events for this day
              const dayEvents = mutasiMonthData?.filter(m => isSameDay(new Date(m.tanggal), day)) || [];
              
              return (
                <button 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square p-1 flex flex-col items-center justify-start rounded-lg border transition-all
                    ${!isCurrentMonth ? 'opacity-30 border-transparent' : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}
                    ${isSelected ? 'ring-2 ring-brand-500 bg-brand-50/50 dark:bg-brand-900/20' : ''}
                    ${isTodayDate && !isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
                  `}
                >
                  <span className={`text-xs ${isTodayDate ? 'font-bold text-brand-600 dark:text-brand-400' : 'font-medium text-neutral-700 dark:text-neutral-300'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Dots Container */}
                  <div className="mt-auto flex flex-wrap gap-0.5 justify-center pb-1 px-0.5">
                    {dayEvents.map(m => (
                      <div 
                        key={m.id} 
                        className={`w-1.5 h-1.5 rounded-full ${m.jenis === 'kredit' ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {isLoadingMutasiMonth && (
            <div className="mt-4 flex justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-neutral-200 border-t-brand-500 animate-spin"></div>
            </div>
          )}

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Penerimaan/Gaji</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Penarikan/Kasbon</span>
            </div>
          </div>
          
          {/* Selected Date Details */}
          {selectedDate && (
            <div className="mt-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 capitalize">
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: localeId })}
              </h4>
              
              {selectedDateEvents.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedDateEvents.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700 shadow-sm">
                      <div>
                        <p className="font-semibold text-xs text-neutral-900 dark:text-white">
                          {m.keterangan || (m.kategori === 'gaji' ? 'Penerimaan Gaji' : 'Penarikan Dana')}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Jam {format(new Date(m.tanggal), 'HH:mm')}
                        </p>
                      </div>
                      <span className={`font-bold text-sm ${m.jenis === 'kredit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-500'}`}>
                        {m.jenis === 'kredit' ? '+' : '-'} Rp {m.nominal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Tidak ada transaksi mutasi pada tanggal ini.</p>
                </div>
              )}
            </div>
          )}
        </div>
        </Modal>
      )}
    </div>
  );
}

export default function DompetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat Dompet...</div>}>
      <DompetContent />
    </Suspense>
  );
}
