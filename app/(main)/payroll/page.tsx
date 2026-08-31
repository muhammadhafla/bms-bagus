// Force reload
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInMinutes, set, isAfter, isBefore, differenceInSeconds } from 'date-fns';
import { id } from 'date-fns/locale';
import { kehadiranApi, karyawanApi, lokasiKerjaApi } from '@/lib/api/payroll';
import { IconClock, IconFingerprint, IconLogout, IconCalendarEvent, IconHistory, IconCheck, IconMapPin, IconMapPinOff, IconLock } from '@tabler/icons-react';
import { toast } from 'sonner';

// Haversine formula in frontend
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371000; // Radius of the earth in m
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export default function PayrollDashboardPage() {
  const [time, setTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [workDuration, setWorkDuration] = useState<string>('--:--');
  const queryClient = useQueryClient();

  // GPS State
  const [coords, setCoords] = useState<{lat: number, lng: number, accuracy?: number} | null>(null);
  const [geoStatus, setGeoStatus] = useState<'checking' | 'valid' | 'out_of_bounds' | 'denied' | 'error'>('checking');
  const [closestStoreName, setClosestStoreName] = useState<string | null>(null);

  // Realtime clock
  useEffect(() => {
    setIsMounted(true);
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch lokasi kerja (toko/cabang)
  const { data: stores } = useQuery({
    queryKey: ['payroll', 'stores'],
    queryFn: () => lokasiKerjaApi.getActive().then((res) => res.data || []),
  });

  const [retryCount, setRetryCount] = useState(0);
  
  const handleManualRetry = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGeoStatus('checking');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCoords({ lat: latitude, lng: longitude, accuracy });
          setRetryCount(prev => prev + 1);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setGeoStatus('denied');
            toast.error(`Akses ditolak: ${error.message}`);
          } else {
            setGeoStatus('error');
            toast.error(`GPS Error (${error.code}): ${error.message}`);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  // Track GPS Location with accuracy
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('error');
      return;
    }

    setGeoStatus('checking');
    
    // Watch position to update constantly
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
        } else {
          setGeoStatus('error');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [retryCount]);

  // Validate coords against stores with dynamic accuracy tolerance (up to +30m buffer)
  useEffect(() => {
    if (!coords || !stores || stores.length === 0) return;
    
    let closestDist = 9999999;
    let closestName = null;
    let isValid = false;

    for (const store of stores) {
      const dist = getDistanceFromLatLonInM(coords.lat, coords.lng, store.latitude, store.longitude);
      if (dist < closestDist) {
        closestDist = dist;
        closestName = store.nama;
      }
      const effectiveRadius = store.radius_meter + Math.min(coords.accuracy || 0, 30);
      if (dist <= effectiveRadius) {
        isValid = true;
      }
    }

    setClosestStoreName(closestName);
    if (isValid) {
      setGeoStatus('valid');
    } else {
      setGeoStatus('out_of_bounds');
    }
  }, [coords, stores]);

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

  // Fetch profil karyawan (buat jam shift & info)
  const { data: profile } = useQuery({
    queryKey: ['payroll', 'profile'],
    queryFn: () => karyawanApi.getMine().then((res) => res.data),
  });

  // Live work duration counter
  useEffect(() => {
    if (todayStatus && todayStatus.status_hadir === 'hadir' && todayStatus.waktu_masuk) {
      if (!todayStatus.waktu_pulang && time) {
        const masuk = new Date(todayStatus.waktu_masuk);
        const diffSec = differenceInSeconds(time, masuk);
        if (diffSec >= 0) {
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          const s = diffSec % 60;
          setWorkDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      } else if (todayStatus.waktu_pulang) {
         const masuk = new Date(todayStatus.waktu_masuk);
         const pulang = new Date(todayStatus.waktu_pulang);
         const diffSec = differenceInSeconds(pulang, masuk);
         if (diffSec >= 0) {
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          setWorkDuration(`${h.toString().padStart(2, '0')}j ${m.toString().padStart(2, '0')}m`);
         }
      }
    } else {
      setWorkDuration('--:--:--');
    }
  }, [time, todayStatus]);

  // Mutasi Absen Masuk (Server-side calculation & timezone)
  const absenMasukMutation = useMutation({
    mutationFn: () => {
      if (!coords) throw new Error('Koordinat GPS belum ditemukan');
      return kehadiranApi.absenMasuk(coords.lat, coords.lng, coords.accuracy);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal absen masuk: ' + res.error.message);
        return;
      }
      toast.success('Berhasil absen masuk!');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => toast.error(err.message || 'Terjadi kesalahan sistem'),
  });

  // Mutasi Absen Pulang (Server-side calculation & timezone)
  const absenPulangMutation = useMutation({
    mutationFn: (args: { id: string }) => {
      if (!coords) throw new Error('Koordinat GPS belum ditemukan');
      return kehadiranApi.absenPulang(args.id, coords.lat, coords.lng, coords.accuracy);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal absen pulang: ' + res.error.message);
        return;
      }
      toast.success('Berhasil absen pulang! Hati-hati di jalan.');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => toast.error(err.message || 'Terjadi kesalahan sistem'),
  });

  // Check if current time is before scheduled jam_pulang
  let isBelumJamPulang = false;
  let targetPulangStr = '';
  let sisaWaktuPulangStr = '';

  if (todayStatus && todayStatus.status_hadir === 'hadir' && !todayStatus.waktu_pulang && profile?.jam_pulang && time) {
    const [pHour, pMin] = profile.jam_pulang.split(':');
    const standardPulang = set(new Date(time), {
      hours: Number(pHour),
      minutes: Number(pMin),
      seconds: 0,
      milliseconds: 0,
    });
    targetPulangStr = `${pHour.padStart(2, '0')}:${pMin.padStart(2, '0')}`;
    
    if (isBefore(time, standardPulang)) {
      isBelumJamPulang = true;
      const diffSec = differenceInSeconds(standardPulang, time);
      if (diffSec > 0) {
        const h = Math.floor(diffSec / 3600);
        const m = Math.floor((diffSec % 3600) / 60);
        const s = diffSec % 60;
        if (h > 0) {
          sisaWaktuPulangStr = `${h}j ${m}m`;
        } else if (m > 0) {
          sisaWaktuPulangStr = `${m}m ${s}d`;
        } else {
          sisaWaktuPulangStr = `${s}d`;
        }
      }
    }
  }

  const handleAbsenClick = () => {
    if (geoStatus !== 'valid') {
      toast.error('Anda belum berada di area toko atau akses lokasi ditolak.');
      return;
    }

    if (!todayStatus) {
      // Belum absen masuk
      absenMasukMutation.mutate();
    } else if (todayStatus && !todayStatus.waktu_pulang) {
      // Sudah absen masuk, belum pulang
      if (isBelumJamPulang) {
        toast.error(`Belum waktunya absen pulang. Jam pulang: ${targetPulangStr || profile?.jam_pulang?.substring(0, 5)}`);
        return;
      }

      absenPulangMutation.mutate({
        id: todayStatus.id
      });
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}j ${m}m` : `${h}j`;
  };

  const isSudahPulang = todayStatus && todayStatus.status_hadir === 'hadir' && todayStatus.waktu_pulang;
  const isTidakHadir = todayStatus && todayStatus.status_hadir !== 'hadir';
  const isSelesaiOrTidakHadir = isSudahPulang || isTidakHadir;

  const getGeoMessage = () => {
    if (geoStatus === 'checking') return 'Mencari lokasi...';
    if (geoStatus === 'denied') return 'Akses lokasi ditolak';
    if (geoStatus === 'error') return 'Gagal mendapat lokasi';
    if (geoStatus === 'out_of_bounds') return 'Di luar area toko';
    if (geoStatus === 'valid') return `Di area ${closestStoreName || 'Toko'}`;
    return '';
  };

  if (!isMounted) return null;

  return (
    <div className="-m-4 lg:-m-6 -mb-24 lg:-mb-6 px-4 lg:px-6 flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950 pb-24 overflow-x-hidden relative">
      <div className="relative z-10 flex-1 max-w-md w-full mx-auto flex flex-col gap-6 pt-8">
        
        {/* Header - Date & Clock */}
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 dark:bg-neutral-900/60 shadow-sm backdrop-blur-md mb-2">
            <IconCalendarEvent size={14} className="text-neutral-500" />
            <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest">
              {time ? format(time, 'EEEE, d MMM yyyy', { locale: id }) : 'Memuat...'}
            </p>
          </div>
          <div className="text-[4.5rem] leading-none font-black tracking-tighter text-slate-800 dark:text-white font-mono drop-shadow-sm flex items-end justify-center">
            {time ? format(time, 'HH:mm') : '--:--'}
            <span className="text-2xl text-slate-400 dark:text-neutral-500 font-medium ml-1 mb-2">
              {time ? format(time, 'ss') : '--'}
            </span>
          </div>
          {todayStatus && todayStatus.status_hadir === 'hadir' && (
            <div className="text-sm font-medium text-slate-500 dark:text-neutral-400 mt-2">
              Durasi Kerja Hari Ini:{' '}
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{workDuration}</span>
            </div>
          )}
        </div>

        {/* GPS Indicator Banner */}
        {!isSelesaiOrTidakHadir && (
          <div className="flex flex-col items-center gap-2">
            <div className={`mx-auto flex items-center justify-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-sm transition-all duration-300 ${
              geoStatus === 'valid' ? 'bg-emerald-100/50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' :
              geoStatus === 'checking' ? 'bg-blue-100/50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 animate-pulse' :
              'bg-rose-100/50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400'
            }`}>
              {geoStatus === 'valid' ? <IconMapPin size={16} /> : <IconMapPinOff size={16} />}
              <span className="text-xs font-bold uppercase tracking-wide">
                {getGeoMessage()}
              </span>
            </div>
            
            {(geoStatus === 'error' || geoStatus === 'denied') && (
              <button 
                onClick={handleManualRetry}
                className="text-xs text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-700 px-4 py-1"
              >
                Coba Deteksi Ulang
              </button>
            )}
          </div>
        )}

        {/* Main Action Button */}
        <div className="flex flex-col items-center justify-center py-2">
          {isLoadingStatus ? (
            <div className="h-44 w-44 animate-pulse rounded-full bg-white/50 dark:bg-neutral-800/50 border border-white/20" />
          ) : (
            <div className="relative group flex items-center justify-center w-full">
              {/* Outer Pulse Ring */}
              {!isSelesaiOrTidakHadir && geoStatus === 'valid' && !isBelumJamPulang && (
                <div className={`absolute inset-0 rounded-full animate-ping opacity-20 mx-auto ${
                  !todayStatus ? 'bg-blue-500 h-44 w-44' : 'bg-amber-500 h-44 w-44'
                }`} style={{ animationDuration: '3s' }} />
              )}
              
              <button
                onClick={handleAbsenClick}
                disabled={!!isSelesaiOrTidakHadir || absenMasukMutation.isPending || absenPulangMutation.isPending || geoStatus !== 'valid' || isBelumJamPulang}
                className={`
                  relative z-10 flex border-[5px] shadow-[0_15px_35px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden items-center justify-center
                  ${isSelesaiOrTidakHadir
                      ? 'flex-row h-20 w-full max-w-[300px] rounded-2xl border-white dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-not-allowed shadow-md px-4 gap-3.5'
                      : geoStatus !== 'valid'
                        ? 'flex-col h-44 w-44 rounded-full border-slate-200 dark:border-neutral-800 bg-slate-300 dark:bg-neutral-800 text-slate-500 cursor-not-allowed grayscale opacity-80'
                        : !todayStatus 
                          ? 'flex-col h-44 w-44 rounded-full border-blue-100 dark:border-blue-900/30 bg-gradient-to-b from-blue-500 to-indigo-600 hover:scale-[1.02] active:scale-[0.98]' 
                          : isBelumJamPulang
                            ? 'flex-col h-44 w-44 rounded-full border-slate-200 dark:border-neutral-800 bg-slate-200/90 dark:bg-neutral-800/90 text-slate-500 dark:text-neutral-400 cursor-not-allowed shadow-inner'
                            : 'flex-col h-44 w-44 rounded-full border-amber-100 dark:border-amber-900/30 bg-gradient-to-b from-amber-500 to-orange-600 hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                {/* Inner highlight for 3D effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent opacity-40 pointer-events-none" />
                
                {isSelesaiOrTidakHadir ? (
                  <>
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400">
                      <IconCheck size={20} stroke={2.5} />
                    </div>
                    <div className="flex flex-col items-start justify-center flex-1 z-10 text-left">
                      <span className="font-bold text-slate-700 dark:text-neutral-300 text-lg capitalize">
                        {todayStatus.status_hadir !== 'hadir' ? todayStatus.status_hadir : 'Selesai'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium mt-0.5">
                        {todayStatus.status_hadir !== 'hadir' ? 'Status hari ini.' : 'Sampai jumpa besok!'}
                      </span>
                    </div>
                  </>
                ) : !todayStatus ? (
                  <>
                    <div className="relative mb-1.5 z-10">
                      <IconFingerprint className={`h-14 w-14 drop-shadow-md ${geoStatus === 'valid' ? 'text-white' : 'text-slate-500'}`} stroke={1.2} />
                      {geoStatus === 'valid' && <div className="absolute top-0 left-0 w-full h-[2px] bg-white blur-[1px] animate-[scan_2s_ease-in-out_infinite]" />}
                    </div>
                    <span className={`text-xl font-black tracking-widest uppercase drop-shadow-sm z-10 ${geoStatus === 'valid' ? 'text-white' : 'text-slate-500'}`}>Masuk</span>
                    <span className={`text-[11px] mt-1.5 font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md z-10 ${geoStatus === 'valid' ? 'text-blue-100 bg-black/10' : 'text-slate-500 bg-slate-400/20'}`}>
                      {geoStatus === 'valid' ? 'Ketuk untuk Absen' : 'Lokasi Tidak Valid'}
                    </span>
                  </>
                ) : isBelumJamPulang ? (
                  <>
                    <div className="relative mb-1.5 z-10">
                      <div className="h-12 w-12 rounded-full bg-slate-300/80 dark:bg-neutral-700/80 flex items-center justify-center text-slate-600 dark:text-neutral-300 shadow-inner">
                        <IconLock size={24} stroke={2} />
                      </div>
                    </div>
                    <span className="text-lg font-black tracking-widest uppercase drop-shadow-sm z-10 text-slate-700 dark:text-neutral-200">
                      Pulang
                    </span>
                    <span className="text-[10px] mt-1 font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md z-10 text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60">
                      Buka pk. {targetPulangStr || profile?.jam_pulang?.substring(0, 5)}
                    </span>
                    {sisaWaktuPulangStr && (
                      <span className="text-[9px] mt-0.5 font-mono font-medium text-slate-500 dark:text-neutral-400 z-10">
                        (Sisa {sisaWaktuPulangStr})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <IconLogout className={`h-14 w-14 mb-1.5 drop-shadow-md z-10 ${geoStatus === 'valid' ? 'text-white' : 'text-slate-500'}`} stroke={1.5} />
                    <span className={`text-xl font-black tracking-widest uppercase drop-shadow-sm z-10 ${geoStatus === 'valid' ? 'text-white' : 'text-slate-500'}`}>Pulang</span>
                    <span className={`text-[11px] mt-1.5 font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md z-10 ${geoStatus === 'valid' ? 'text-orange-100 bg-black/10' : 'text-slate-500 bg-slate-400/20'}`}>
                      {geoStatus === 'valid' ? 'Ketuk untuk Akhiri' : 'Lokasi Tidak Valid'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Info Cards */}
        <div className="grid grid-cols-2 gap-4 w-full mt-2">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <IconClock size={24} stroke={1.5} className="text-slate-500 dark:text-neutral-400 mb-2" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Masuk</span>
            <p className="font-mono text-[20px] font-bold text-slate-800 dark:text-neutral-100">
              {todayStatus && todayStatus.waktu_masuk ? format(new Date(todayStatus.waktu_masuk), 'HH:mm') : '--:--'}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <IconLogout size={24} stroke={1.5} className="text-slate-500 dark:text-neutral-400 mb-2" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pulang</span>
            <p className="font-mono text-[20px] font-bold text-slate-800 dark:text-neutral-100">
              {todayStatus?.waktu_pulang ? format(new Date(todayStatus.waktu_pulang), 'HH:mm') : '--:--'}
            </p>
          </div>
        </div>

        {/* Timeline History List */}
        <div className="mt-2 bg-white dark:bg-neutral-900 rounded-[2rem] p-4 sm:p-5 shadow-md">
          <div className="flex items-center gap-2.5 mb-5 px-1">
            <div className="p-1.5 bg-slate-100 dark:bg-neutral-800 rounded-xl text-slate-600 dark:text-neutral-400">
              <IconHistory size={18} />
            </div>
            <h2 className="text-sm font-bold tracking-wide text-neutral-800 dark:text-neutral-200 uppercase">Riwayat 7 Hari</h2>
          </div>
          
          {isLoadingHistory ? (
            <div className="py-8 flex flex-col items-center justify-center text-neutral-400">
              <div className="h-6 w-6 rounded-full border-2 border-neutral-200 border-t-blue-500 animate-spin mb-2"></div>
              <span className="text-xs">Memuat...</span>
            </div>
          ) : history && history.length > 0 ? (
            <div className="relative pl-3 space-y-6 before:absolute before:inset-y-2 before:left-[15px] before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
              {history.map((item, idx) => (
                <div key={item.id} className="relative pl-6 flex items-start justify-between group">
                  {/* Timeline Dot */}
                  <div className={`absolute left-[11px] top-1.5 h-2 w-2 rounded-full ring-[3px] ring-white dark:ring-neutral-900 ${
                    item.menit_telat > 30 ? 'bg-rose-500' : item.menit_telat > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                      {format(new Date(item.tanggal), 'EEEE, d MMM', { locale: id })}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                      {item.status_hadir !== 'hadir' ? (
                        <span className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-2 py-0.5 rounded-md capitalize font-sans">
                          Status: {item.status_hadir}
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-2 py-0.5 rounded-md">
                            <IconClock size={12} className="text-slate-500 dark:text-neutral-400" />
                            {item.waktu_masuk ? format(new Date(item.waktu_masuk), 'HH:mm') : '--:--'}
                          </span>
                          <span>-</span>
                          <span className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-2 py-0.5 rounded-md">
                            <IconLogout size={12} className={item.waktu_pulang ? 'text-slate-500 dark:text-neutral-400' : 'text-neutral-400'} />
                            {item.waktu_pulang ? format(new Date(item.waktu_pulang), 'HH:mm') : '--:--'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 pt-0.5">
                    {item.menit_telat > 30 ? (
                      <span className="rounded-full bg-rose-100/80 dark:bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20">
                        Telat {formatDuration(item.menit_telat)}
                      </span>
                    ) : item.menit_telat > 0 ? (
                      <span className="rounded-full bg-amber-100/80 dark:bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/20">
                        Telat {item.menit_telat}m (Toleransi)
                      </span>
                    ) : null}
                    {item.status_lembur === 'disetujui' && (
                      <span className="rounded-full bg-indigo-100/80 dark:bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
                        + Lembur
                      </span>
                    )}
                    {item.menit_telat === 0 && item.waktu_pulang && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1 mt-1">
                        <IconCheck size={12} /> Tepat
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center flex flex-col items-center text-neutral-400">
              <IconCalendarEvent className="h-10 w-10 mb-2 opacity-20" />
              <span className="text-xs font-medium">Belum ada riwayat.</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Scan Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
