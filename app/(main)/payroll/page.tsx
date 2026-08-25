'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { kehadiranApi, karyawanApi } from '@/lib/api/payroll';
import { IconClock, IconFingerprint, IconLogout, IconCalendarEvent } from '@tabler/icons-react';
import { toast } from 'sonner';

export default function PayrollDashboardPage() {
  const [time, setTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const queryClient = useQueryClient();

  // Realtime clock
  useEffect(() => {
    setIsMounted(true);
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch status absen hari ini
  const { data: todayStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['payroll', 'today_status'],
    queryFn: () => kehadiranApi.getTodayStatus().then((res) => res.data),
  });

  // Fetch riwayat absen
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['payroll', 'history'],
    queryFn: () => kehadiranApi.getMine(7).then((res) => res.data),
  });

  // Fetch profil karyawan (buat estimasi gaji/lembur/telat)
  const { data: profile } = useQuery({
    queryKey: ['payroll', 'profile'],
    queryFn: () => karyawanApi.getMine().then((res) => res.data),
  });

  // Mutasi Absen Masuk
  const absenMasukMutation = useMutation({
    mutationFn: () => kehadiranApi.absenMasuk(),
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal absen masuk: ' + res.error.message);
        return;
      }
      toast.success('Berhasil absen masuk!');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  // Mutasi Absen Pulang
  const absenPulangMutation = useMutation({
    mutationFn: (args: { id: string, menit_kerja: number, menit_telat: number, menit_lembur: number }) => 
      kehadiranApi.absenPulang(args.id, args.menit_kerja, args.menit_telat, args.menit_lembur),
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal absen pulang: ' + res.error.message);
        return;
      }
      toast.success('Berhasil absen pulang! Hati-hati di jalan.');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  const handleAbsenClick = () => {
    if (!todayStatus) {
      // Belum absen masuk
      absenMasukMutation.mutate();
    } else if (todayStatus && !todayStatus.waktu_pulang) {
      // Sudah absen masuk, belum pulang
      const masuk = new Date(todayStatus.waktu_masuk);
      const sekarang = new Date();
      const menit_kerja = Math.floor((sekarang.getTime() - masuk.getTime()) / 60000);
      
      let menit_telat = 0;
      let menit_lembur = 0;
      if (profile) {
        const standardMasuk = new Date();
        const [mHour, mMin] = profile.jam_masuk.split(':');
        standardMasuk.setHours(Number(mHour), Number(mMin), 0, 0);
        
        if (masuk > standardMasuk) {
          menit_telat = Math.floor((masuk.getTime() - standardMasuk.getTime()) / 60000);
        }

        const standardPulang = new Date();
        const [pHour, pMin] = profile.jam_pulang.split(':');
        standardPulang.setHours(Number(pHour), Number(pMin), 0, 0);

        if (sekarang > standardPulang) {
          menit_lembur = Math.floor((sekarang.getTime() - standardPulang.getTime()) / 60000);
        }
      }

      absenPulangMutation.mutate({
        id: todayStatus.id,
        menit_kerja,
        menit_telat,
        menit_lembur
      });
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}j ${m}m` : `${h}j`;
  };

  const isSudahPulang = todayStatus && todayStatus.waktu_pulang;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header (Date & Digital Clock) - Unified seamless background */}
      <div className="px-6 pt-12 pb-6 relative z-10">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 tracking-widest uppercase">
            {time ? format(time, 'EEEE, d MMMM yyyy', { locale: id }) : 'Memuat...'}
          </p>
          <div className="text-6xl font-black tracking-tighter text-neutral-900 dark:text-white font-mono drop-shadow-md">
            {time ? format(time, 'HH:mm:ss') : '--:--:--'}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 sm:px-6 max-w-md w-full mx-auto flex flex-col gap-8">
        {/* Main Action Area (Big Button) */}
        <div className="flex flex-col items-center justify-center py-4">
          {isLoadingStatus ? (
            <div className="h-48 w-48 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          ) : (
            <div className="relative">
              {/* Outer Glow Effect - Softer */}
              <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-700
                ${!todayStatus 
                  ? 'bg-blue-500 opacity-20 dark:opacity-30' 
                  : !isSudahPulang 
                    ? 'bg-amber-500 opacity-20 dark:opacity-30'
                    : 'bg-neutral-300 dark:bg-neutral-800 opacity-20'
                }
              `} />
              
              <button
                onClick={handleAbsenClick}
                disabled={!!isSudahPulang || absenMasukMutation.isPending || absenPulangMutation.isPending}
                className={`
                  relative z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full border border-white/50 dark:border-white/10 shadow-2xl transition-all duration-300
                  ${!todayStatus 
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 hover:scale-[1.02] active:scale-[0.98]' 
                    : !isSudahPulang 
                      ? 'bg-gradient-to-b from-amber-500 to-orange-600 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-neutral-100 dark:bg-neutral-800/80 cursor-not-allowed border-neutral-200 dark:border-neutral-700'
                  }
                `}
              >
                {isSudahPulang ? (
                  <>
                    <div className="h-14 w-14 mb-2 rounded-full bg-neutral-200/50 dark:bg-neutral-700/50 flex items-center justify-center">
                      <IconLogout className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <span className="font-bold text-neutral-500 dark:text-neutral-400 text-lg">Selesai</span>
                    <span className="text-xs text-neutral-400 mt-1 font-medium">Sampai jumpa besok!</span>
                  </>
                ) : !todayStatus ? (
                  <>
                    <IconFingerprint className="h-16 w-16 text-white mb-2 drop-shadow-md" stroke={1.5} />
                    <span className="text-2xl font-black tracking-widest text-white uppercase drop-shadow-sm">Masuk</span>
                    <span className="text-blue-100 text-[11px] mt-1.5 font-medium tracking-wide">Ketuk untuk Absen</span>
                  </>
                ) : (
                  <>
                    <IconLogout className="h-16 w-16 text-white mb-2 drop-shadow-md" stroke={1.5} />
                    <span className="text-2xl font-black tracking-widest text-white uppercase drop-shadow-sm">Pulang</span>
                    <span className="text-orange-100 text-[11px] mt-1.5 font-medium tracking-wide">Ketuk untuk Mengakhiri</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Info Cards (Jam Masuk / Jam Pulang) */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-white/80 dark:bg-neutral-900/50 rounded-3xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-800/80 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2 leading-tight">
              Waktu<br />Masuk
            </span>
            <p className="font-mono text-2xl font-black text-neutral-800 dark:text-neutral-100 mt-1">
              {todayStatus ? format(new Date(todayStatus.waktu_masuk), 'HH:mm') : '--:--'}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-neutral-900/50 rounded-3xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-800/80 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2 leading-tight">
              Waktu<br />Pulang
            </span>
            <p className="font-mono text-2xl font-black text-neutral-800 dark:text-neutral-100 mt-1">
              {todayStatus?.waktu_pulang ? format(new Date(todayStatus.waktu_pulang), 'HH:mm') : '--:--'}
            </p>
          </div>
        </div>

        {/* Histori List */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-4 px-2">
            <IconCalendarEvent className="h-5 w-5 text-neutral-400" />
            <h2 className="text-sm font-bold tracking-wider text-neutral-700 dark:text-neutral-300 uppercase">Riwayat 7 Hari Terakhir</h2>
          </div>
          
          <div className="bg-white dark:bg-neutral-900/50 rounded-[2rem] shadow-sm border border-neutral-100 dark:border-neutral-800/80 overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-10 text-center text-sm text-neutral-500 flex flex-col items-center">
                <div className="h-6 w-6 rounded-full border-2 border-neutral-200 border-t-blue-500 animate-spin mb-3"></div>
                Memuat riwayat...
              </div>
            ) : history && history.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {history.map((item) => (
                  <div key={item.id} className="p-5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex flex-col gap-1.5">
                      <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {format(new Date(item.tanggal), 'EEEE, d MMM', { locale: id })}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1 text-xs font-mono text-neutral-500">
                          <span className="text-blue-500 font-black">M</span>
                          {format(new Date(item.waktu_masuk), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono text-neutral-500">
                          <span className="text-amber-500 font-black">P</span>
                          {item.waktu_pulang ? format(new Date(item.waktu_pulang), 'HH:mm') : '--:--'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      {item.menit_telat > 30 && (
                        <span className="rounded-full bg-rose-50 dark:bg-rose-500/10 px-3 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                          Telat {formatDuration(item.menit_telat)}
                        </span>
                      )}
                      {item.status_lembur === 'disetujui' && (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                          + Lembur
                        </span>
                      )}
                      {item.menit_telat <= 30 && item.waktu_pulang && (
                        <span className="rounded-full bg-blue-50 dark:bg-blue-500/10 px-3 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                          Tepat Waktu
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center flex flex-col items-center text-neutral-400">
                <IconCalendarEvent className="h-12 w-12 mb-3 opacity-20" />
                <span className="text-sm font-medium">Belum ada riwayat absensi.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
