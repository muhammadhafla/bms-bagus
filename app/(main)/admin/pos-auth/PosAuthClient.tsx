'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posAuthApi } from '@/lib/api/pos-auth';
import { PosAuthorization, PosAuthStatus } from '@/types/pos-auth';
import { formatCurrency, formatDateTimeWIB } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import { useHaptic } from '@/hooks/useHaptic';
import { toast } from 'sonner';
import {
  IconShieldLock,
  IconShieldCheck,
  IconCopy,
  IconBrandWhatsapp,
  IconX,
  IconRefresh,
  IconClock,
  IconBuildingStore,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconHistory,
  IconSettings,
  IconTrash,
  IconTicket,
  IconArrowBack,
  IconArrowsExchange,
  IconArrowBackUp,
  IconLock,
  IconFileInvoice,
  IconShare,
  IconSparkles,
} from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FilterButton } from '@/components/ui/FilterButton';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { ModernPagination } from '@/components/ui/ModernPagination';
import SelectInput from '@/components/ui/SelectInput';
import { Spinner } from '@/components/ui';

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  access_settings: {
    label: 'Pengaturan POS',
    icon: IconSettings,
    colorClass: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-100 dark:bg-blue-950/70 border-blue-200 dark:border-blue-900',
  },
  void_transaction: {
    label: 'Void Transaksi',
    icon: IconTrash,
    colorClass: 'text-rose-700 dark:text-rose-300',
    bgClass: 'bg-rose-100 dark:bg-rose-950/70 border-rose-200 dark:border-rose-900',
  },
  manual_discount: {
    label: 'Diskon Manual',
    icon: IconTicket,
    colorClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900',
  },
  price_override: {
    label: 'Ubah Harga Satuan',
    icon: IconFileInvoice,
    colorClass: 'text-purple-700 dark:text-purple-300',
    bgClass: 'bg-purple-100 dark:bg-purple-950/70 border-purple-200 dark:border-purple-900',
  },
  return_approval: {
    label: 'Retur Penjualan',
    icon: IconArrowBack,
    colorClass: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900',
  },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'used', label: 'Digunakan' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'rejected', label: 'Ditolak' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'Semua Tipe Aksi' },
  { value: 'access_settings', label: 'Pengaturan POS' },
  { value: 'void_transaction', label: 'Void Transaksi' },
  { value: 'manual_discount', label: 'Diskon Manual' },
  { value: 'price_override', label: 'Ubah Harga Satuan' },
  { value: 'return_approval', label: 'Retur Penjualan' },
];

export default function PosAuthClient() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const haptic = useHaptic();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [historyStatus, setHistoryStatus] = useState<PosAuthStatus | 'all'>('all');
  const [historyActionType, setHistoryActionType] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Dialog State
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [takeoverConfirmId, setTakeoverConfirmId] = useState<{ id: string; ownerName: string } | null>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query Permohonan Aktif (Pending & Belum Kedaluwarsa)
  const {
    data: activeRequests = [],
    isLoading: isLoadingActive,
    isRefetching: isRefetchingActive,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['pos-auth-active'],
    queryFn: async () => {
      const res = await posAuthApi.getActiveRequests();
      if (res.error) throw res.error;
      return res.data || [];
    },
    refetchInterval: 10000,
  });

  // Query Riwayat
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['pos-auth-history', historyStatus, historyActionType, debouncedSearch, historyPage],
    queryFn: async () => {
      const res = await posAuthApi.getHistory({
        status: historyStatus,
        action_type: historyActionType,
        search: debouncedSearch,
        page: historyPage,
        limit: 15,
      });
      if (res.error) throw res.error;
      return res.data || { data: [], count: 0 };
    },
    enabled: activeTab === 'history',
  });

  // Mutasi Tarik Permintaan (Claim)
  const claimMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await posAuthApi.claim(id);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      haptic.success();
      toast.success('Permohonan berhasil ditarik!', {
        description: `PIN Otorisasi: ${data?.pin_code}. Tanggung jawab ada pada Anda.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pos-auth-active'] });
      queryClient.invalidateQueries({ queryKey: ['pos-auth-history'] });
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal menarik permohonan: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  // Mutasi Lepas Tugas (Release)
  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await posAuthApi.release(id);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      haptic.medium();
      toast.info('Tugas berhasil dilepas kembali ke antrean umum.');
      queryClient.invalidateQueries({ queryKey: ['pos-auth-active'] });
      queryClient.invalidateQueries({ queryKey: ['pos-auth-history'] });
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal melepas tugas: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  // Mutasi Ambil Alih Tugas (Takeover)
  const takeoverMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await posAuthApi.takeover(id);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      haptic.success();
      toast.success('Tugas berhasil diambil alih!', {
        description: `PIN Otorisasi: ${data?.pin_code}. Anda kini menjadi penanggung jawab.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pos-auth-active'] });
      queryClient.invalidateQueries({ queryKey: ['pos-auth-history'] });
      setTakeoverConfirmId(null);
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal mengambil alih tugas: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  // Mutasi Tolak Permohonan (Reject)
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await posAuthApi.rejectRequest(id);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      haptic.medium();
      toast.success('Permohonan otorisasi berhasil ditolak.');
      queryClient.invalidateQueries({ queryKey: ['pos-auth-active'] });
      queryClient.invalidateQueries({ queryKey: ['pos-auth-history'] });
      setRejectConfirmId(null);
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal menolak permohonan: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  // Handler Salin PIN
  const handleCopyPin = (pin: string, cashierName: string) => {
    navigator.clipboard.writeText(pin);
    haptic.success();
    toast.success(`PIN ${pin} berhasil disalin!`, {
      description: `Teruskan ke kasir ${cashierName}`,
    });
  };

  // Handler Kirim / Salin Pesan WA (Web Share API + direct wa.me fallback)
  const handleShareWhatsApp = async (req: PosAuthorization) => {
    const expiredTime = new Date(req.expires_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const actionLabel = ACTION_CONFIG[req.action_type]?.label || req.action_type;
    const message = `Halo *${req.cashier_name}*, berikut kode PIN otorisasi *${actionLabel}* POS Toko *${req.gudang_name || 'Utama'}*:\n\n*${req.pin_code}*\n\n(Berlaku s.d. ${expiredTime} WIB, satu kali pakai).`;

    haptic.light();

    // Prioritaskan Web Share API jika didukung di perangkat ponsel
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `PIN Otorisasi POS - ${actionLabel}`,
          text: message,
        });
        toast.success('Berhasil membuka lembar berbagi!');
        return;
      } catch (err: any) {
        // Jika user sengaja membatalkan share sheet, jangan anggap error fatal
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback 1: Buka WhatsApp Web/App langsung via link
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const opened = window.open(waUrl, '_blank');

    // Fallback 2: Jika diblokir pop-up blocker, salin ke clipboard
    if (!opened) {
      navigator.clipboard.writeText(message);
      toast.success('Format pesan WhatsApp disalin ke clipboard!', {
        description: 'Tempel (paste) ke chat WhatsApp kasir.',
      });
    }
  };

  // Hitung jumlah filter aktif untuk FilterButton
  const activeFilterCount =
    (historyStatus !== 'all' ? 1 : 0) + (historyActionType !== 'all' ? 1 : 0);

  const totalHistoryCount = historyData?.count || 0;
  const totalHistoryPages = Math.ceil(totalHistoryCount / 15) || 1;

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 shadow-xs dark:bg-brand-500/20 dark:text-brand-400">
            <IconShieldLock className="h-6 w-6" stroke={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
              Otorisasi Supervisor POS
            </h1>
            <p className="hidden sm:block text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
              Pusat penanganan otorisasi kasir (Pengaturan, Void, Diskon, Ubah Harga, Retur) dengan model Tarik Tugas.
            </p>
          </div>
        </div>

        {/* Indikator Realtime & Tombol Segarkan */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Real-time Aktif
          </div>

          <button
            onClick={() => {
              haptic.light();
              refetchActive();
              if (activeTab === 'history') refetchHistory();
            }}
            disabled={isLoadingActive || isRefetchingActive}
            aria-label="Segarkan data otorisasi"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-2xs transition-all hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <IconRefresh
              className={`h-4 w-4 ${isRefetchingActive ? 'animate-spin text-brand-600' : ''}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => {
            haptic.light();
            setActiveTab('active');
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
            activeTab === 'active'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <span>Antrean</span>
          {activeRequests.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-extrabold text-white shadow-sm animate-pulse">
              {activeRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            haptic.light();
            setActiveTab('history');
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <IconHistory className="h-4 w-4" />
          <span>Riwayat</span>
        </button>
      </div>

      {/* Konten Tab 1: Permohonan Aktif */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {isLoadingActive ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-72 animate-pulse rounded-2xl border border-neutral-200/70 bg-neutral-100/80 p-5 dark:border-neutral-800 dark:bg-neutral-800/40"
                />
              ))}
            </div>
          ) : activeRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300/80 bg-neutral-50/50 p-12 text-center backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/30">
              <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-400">
                <IconShieldCheck className="h-9 w-9" stroke={1.5} />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Tidak Ada Permohonan Aktif
              </h3>
              <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Saat kasir meminta otorisasi di POS (Pengaturan, Void, Diskon, Ubah Harga, Retur), kartu tugas akan muncul di sini secara real-time untuk ditarik.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRequests.map((req) => (
                <ActiveAuthCard
                  key={req.id}
                  request={req}
                  currentUserId={profile?.id || ''}
                  onClaim={() => claimMutation.mutate(req.id)}
                  onRelease={() => releaseMutation.mutate(req.id)}
                  onTakeover={() =>
                    setTakeoverConfirmId({ id: req.id, ownerName: req.claimed_by_name || 'Admin' })
                  }
                  onCopyPin={() => handleCopyPin(req.pin_code, req.cashier_name)}
                  onShareWa={() => handleShareWhatsApp(req)}
                  onReject={() => setRejectConfirmId(req.id)}
                  isClaiming={claimMutation.isPending && claimMutation.variables === req.id}
                  isReleasing={releaseMutation.isPending && releaseMutation.variables === req.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Konten Tab 2: Riwayat Audit (Format Mirip Inventory) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Baris Pencarian & Tombol Filter (Gaya InventoryPageClient) */}
          <div className="flex flex-col gap-3">
            <div className="flex w-full flex-row items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                  <IconSearch size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama kasir, penangan, outlet, atau nomor nota..."
                  aria-label="Cari riwayat otorisasi"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200/60 bg-white py-2.5 pr-9 pl-9 text-sm shadow-2xs transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-base dark:border-neutral-800/60 dark:bg-neutral-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setSearchQuery('');
                    }}
                    aria-label="Hapus pencarian"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>

              {/* Tombol Filter yang membuka BottomSheet / Drawer */}
              <FilterButton
                onClick={() => {
                  haptic.light();
                  setIsFilterPanelOpen(true);
                }}
                activeCount={activeFilterCount}
                className="h-11 sm:h-11"
              />
            </div>

            {/* Chip Filter Aktif yang bisa di-dismiss (Gaya Inventory) */}
            {activeFilterCount > 0 && (
              <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap">
                {historyStatus !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <span>
                      Status:{' '}
                      {historyStatus === 'used'
                        ? 'Digunakan'
                        : historyStatus === 'expired'
                          ? 'Kedaluwarsa'
                          : 'Ditolak'}
                    </span>
                    <button
                      onClick={() => {
                        haptic.light();
                        setHistoryStatus('all');
                        setHistoryPage(1);
                      }}
                      aria-label="Hapus filter status"
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}

                {historyActionType !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <span>
                      Aksi: {ACTION_CONFIG[historyActionType]?.label || historyActionType}
                    </span>
                    <button
                      onClick={() => {
                        haptic.light();
                        setHistoryActionType('all');
                        setHistoryPage(1);
                      }}
                      aria-label="Hapus filter tipe aksi"
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    haptic.light();
                    setHistoryStatus('all');
                    setHistoryActionType('all');
                    setHistoryPage(1);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Reset Semua
                </button>
              </div>
            )}
          </div>

          {/* BottomSheet / Drawer Filter Riwayat */}
          <ResponsivePanel
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            title="Filter Riwayat Otorisasi"
          >
            <div className="space-y-5 p-4 sm:p-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Status Otorisasi:
                </label>
                <SelectInput
                  value={historyStatus}
                  onChange={(val) => {
                    setHistoryStatus(val as any);
                    setHistoryPage(1);
                  }}
                  options={STATUS_OPTIONS}
                  clearable={false}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Tipe Aksi Kasir:
                </label>
                <SelectInput
                  value={historyActionType}
                  onChange={(val) => {
                    setHistoryActionType(val);
                    setHistoryPage(1);
                  }}
                  options={ACTION_TYPE_OPTIONS}
                  clearable={false}
                  className="w-full"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] dark:bg-brand-500"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </ResponsivePanel>

          {/* Tampilan Riwayat: Mobile Card List (sm:hidden) */}
          <div className="block space-y-3 sm:hidden">
            {isLoadingHistory ? (
              [1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-36 animate-pulse rounded-2xl border border-neutral-200/60 bg-neutral-100/70 p-3.5 dark:border-neutral-800/60 dark:bg-neutral-800/40"
                />
              ))
            ) : !historyData?.data || historyData.data.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200/70 bg-white/50 p-8 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/30">
                Tidak ada riwayat permohonan yang sesuai filter.
              </div>
            ) : (
              historyData.data.map((item) => (
                <HistoryMobileCard key={item.id} item={item} />
              ))
            )}
          </div>

          {/* Tampilan Riwayat: Desktop Table (hidden sm:block) Gaya InventoryTable */}
          <div className="shadow-elevated hidden overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/70 backdrop-blur-xl sm:block dark:border-neutral-800/70 dark:bg-neutral-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-neutral-50/80 font-bold text-neutral-600 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/80 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3.5">Waktu Pengajuan</th>
                    <th className="px-4 py-3.5">Tipe Aksi</th>
                    <th className="px-4 py-3.5">Kasir & Lokasi</th>
                    <th className="px-4 py-3.5">Konteks / Alasan</th>
                    <th className="px-4 py-3.5">Penanggung Jawab</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5">Waktu Eksekusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                        <div className="flex items-center justify-center gap-2">
                          <Spinner size="sm" />
                          <span>Memuat riwayat otorisasi...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !historyData?.data || historyData.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                        Tidak ada riwayat permohonan ditemukan.
                      </td>
                    </tr>
                  ) : (
                    historyData.data.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50"
                      >
                        <td className="px-4 py-3.5 font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {formatDateTimeWIB(item.created_at)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <ActionBadge actionType={item.action_type} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {item.cashier_name}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {item.gudang_name || 'Toko Utama'} {item.device_name ? `• ${item.device_name}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[220px]">
                          <MetadataSummary metadata={item.action_metadata} />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-neutral-800 dark:text-neutral-200">
                          {item.status === 'rejected' ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              Ditolak: {item.rejected_by_name || 'Admin'}
                            </span>
                          ) : item.claimed_by_name ? (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              {item.claimed_by_name}
                            </span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {item.used_at ? formatDateTimeWIB(item.used_at) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginasi Standar ModernPagination (Konsisten untuk Mobile & Desktop) */}
          <ModernPagination
            page={historyPage}
            totalPages={totalHistoryPages}
            total={totalHistoryCount}
            limit={15}
            onPageChange={(p) => {
              haptic.light();
              setHistoryPage(p);
            }}
          />
        </div>
      )}

      {/* Dialog Konfirmasi Tolak Permohonan */}
      <ConfirmDialog
        isOpen={!!rejectConfirmId}
        title="Tolak Permohonan Otorisasi?"
        message="Permohonan ini akan dibatalkan seketika dan kode PIN tidak akan dapat digunakan oleh kasir."
        confirmLabel="Ya, Tolak Permohonan"
        cancelLabel="Batal"
        danger={true}
        onConfirm={() => {
          if (rejectConfirmId) rejectMutation.mutate(rejectConfirmId);
        }}
        onCancel={() => setRejectConfirmId(null)}
      />

      {/* Dialog Konfirmasi Ambil Alih Tugas (Takeover) */}
      <ConfirmDialog
        isOpen={!!takeoverConfirmId}
        title="Ambil Alih Tugas Otorisasi?"
        message={`Tugas ini saat ini sedang ditangani oleh ${takeoverConfirmId?.ownerName}. Apakah Anda yakin ingin mengambil alih tanggung jawab pemberian PIN ke kasir?`}
        confirmLabel="Ya, Ambil Alih Tugas"
        cancelLabel="Batal"
        danger={false}
        onConfirm={() => {
          if (takeoverConfirmId) takeoverMutation.mutate(takeoverConfirmId.id);
        }}
        onCancel={() => setTakeoverConfirmId(null)}
      />
    </div>
  );
}

/**
 * Komponen Slip Kertas OTP (Paper Voucher Slip)
 */
function OtpPaperSlip({
  pin,
  cashierName,
  onCopyPin,
  onShareWa,
}: {
  pin: string;
  cashierName: string;
  onCopyPin: () => void;
  onShareWa: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const haptic = useHaptic();

  const handleCopy = () => {
    onCopyPin();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3.5 space-y-2">
      {/* Container Slip Kertas Tiket/Voucher */}
      <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border-2 border-dashed border-emerald-300/90 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 p-3 shadow-xs dark:border-emerald-700/70 dark:from-emerald-950/40 dark:via-neutral-900 dark:to-emerald-950/20">
        {/* Dekorasi lubang tiket kiri & kanan */}
        <div className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-emerald-200 bg-white dark:border-emerald-800 dark:bg-neutral-900" />
        <div className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-emerald-200 bg-white dark:border-emerald-800 dark:bg-neutral-900" />

        <div className="pl-3 sm:pl-4">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <IconSparkles className="h-3 w-3" />
            <span>PIN Otorisasi Aktif</span>
          </div>
          {/* Sederet Angka OTP */}
          <div className="select-all font-mono text-2xl font-black tracking-[0.28em] text-neutral-900 sm:text-3xl dark:text-white">
            {pin}
          </div>
        </div>

        {/* Tombol Copy di Sebelah Kanan Angka OTP */}
        <button
          onClick={handleCopy}
          aria-label="Salin kode PIN ke clipboard"
          title="Salin PIN"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
            copied
              ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500'
              : 'border border-emerald-200 bg-white text-emerald-700 shadow-2xs hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:bg-neutral-800 dark:text-emerald-300 dark:hover:bg-neutral-700'
          }`}
        >
          {copied ? <IconCheck className="h-5 w-5 stroke-[2.5]" /> : <IconCopy className="h-5 w-5" />}
        </button>
      </div>

      {/* Hyperlink Kirim via WhatsApp di Bawah Kertas */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => {
            haptic.light();
            onShareWa();
          }}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <IconBrandWhatsapp className="h-4 w-4 text-emerald-500 transition-transform group-hover:scale-110" />
          <span className="underline decoration-emerald-300 underline-offset-2 dark:decoration-emerald-700">
            Kirim via WhatsApp
          </span>
          <IconShare className="h-3 w-3 opacity-60" />
        </button>

        <span className="text-[11px] text-neutral-400">
          Kasir: <strong className="text-neutral-600 dark:text-neutral-300">{cashierName}</strong>
        </span>
      </div>
    </div>
  );
}

/**
 * Komponen Kartu Permohonan Aktif (Model Claim & Dispatch)
 */
function ActiveAuthCard({
  request,
  currentUserId,
  onClaim,
  onRelease,
  onTakeover,
  onCopyPin,
  onShareWa,
  onReject,
  isClaiming,
  isReleasing,
}: {
  request: PosAuthorization;
  currentUserId: string;
  onClaim: () => void;
  onRelease: () => void;
  onTakeover: () => void;
  onCopyPin: () => void;
  onShareWa: () => void;
  onReject: () => void;
  isClaiming: boolean;
  isReleasing: boolean;
}) {
  const haptic = useHaptic();
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [request.expires_at]);

  const formattedTimer = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const isCriticalTime = secondsLeft < 120; // < 2 menit

  // Kondisi Kepemilikan Tugas
  const isUnclaimed = !request.claimed_by_id;
  const isClaimedByMe = request.claimed_by_id === currentUserId;
  const isClaimedByOther = request.claimed_by_id && request.claimed_by_id !== currentUserId;

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4.5 shadow-sm transition hover:shadow-md ${
        isClaimedByMe
          ? 'border-emerald-200/90 bg-emerald-50/20 dark:border-emerald-800/60 dark:bg-emerald-950/20'
          : isClaimedByOther
            ? 'border-neutral-200/80 bg-neutral-50/40 opacity-90 dark:border-neutral-800/80 dark:bg-neutral-900/40'
            : 'border-neutral-200/90 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      }`}
    >
      <div>
        {/* Header Kartu: Tipe Aksi & Timer */}
        <div className="flex items-start justify-between gap-2">
          <ActionBadge actionType={request.action_type} />

          {/* Countdown Badge */}
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono font-bold ${
              isCriticalTime
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
            }`}
          >
            <IconClock className="h-3.5 w-3.5" />
            <span>{formattedTimer}</span>
          </div>
        </div>

        {/* Kasir & Outlet Info */}
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 font-bold text-sm dark:bg-neutral-800 dark:text-neutral-200">
            {request.cashier_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-neutral-900 dark:text-white">
              {request.cashier_name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <IconBuildingStore className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{request.gudang_name || 'Toko Utama'}</span>
              {request.device_name && (
                <span className="text-[11px] text-neutral-400">• {request.device_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Box Konteks / Alasan Metadata (Jika ada) */}
        {request.action_metadata && Object.keys(request.action_metadata).length > 0 && (
          <div className="mt-3 rounded-xl border border-neutral-200/80 bg-neutral-50 p-2.5 text-xs dark:border-neutral-800 dark:bg-neutral-800/40">
            <MetadataDetailedView metadata={request.action_metadata} />
          </div>
        )}

        {/* TAMPILAN SESUAI STATE */}
        {isUnclaimed ? (
          /* Slip Kertas Segel Terkunci */
          <div className="my-3.5 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/70 p-4 text-center dark:border-neutral-800 dark:bg-neutral-800/40">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <IconAlertCircle className="h-3.5 w-3.5" />
              Belum Ada Penangan
            </span>
            <div className="my-1 font-mono text-2xl font-black tracking-[0.3em] text-neutral-300 select-none dark:text-neutral-600">
              ••••••
            </div>
            <p className="text-[11px] text-neutral-400">
              Tarik permohonan untuk membuka kode PIN
            </p>
          </div>
        ) : isClaimedByMe ? (
          /* Slip Kertas OTP Aktif */
          <OtpPaperSlip
            pin={request.pin_code}
            cashierName={request.cashier_name}
            onCopyPin={onCopyPin}
            onShareWa={onShareWa}
          />
        ) : (
          /* Ditangani Supervisor Lain */
          <div className="my-3.5 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/70 p-4 text-center dark:border-neutral-800 dark:bg-neutral-800/40">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              <IconLock className="h-3.5 w-3.5" />
              Ditangani: {request.claimed_by_name}
            </span>
            <div className="my-1 font-mono text-2xl font-black tracking-[0.3em] text-neutral-300 select-none dark:text-neutral-600">
              ••••••
            </div>
            <p className="text-[11px] text-neutral-400">
              PIN hanya terbuka untuk admin penangan
            </p>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS (Touch Target Min 44px & Bebas Salah Sentuh) */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
        {isUnclaimed && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                haptic.medium();
                onClaim();
              }}
              disabled={isClaiming}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              {isClaiming ? <Spinner size="sm" /> : <IconLock className="h-4 w-4" />}
              <span>Tarik Permintaan (Klaim Tugas)</span>
            </button>
            <button
              onClick={() => {
                haptic.light();
                onReject();
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] dark:border-rose-900/60 dark:bg-neutral-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <IconX className="h-4 w-4" />
              <span>Tolak Permohonan</span>
            </button>
          </div>
        )}

        {isClaimedByMe && (
          <div className="flex items-center gap-2">
            {/* Tombol Lepas Tugas Outline */}
            <button
              onClick={() => {
                haptic.light();
                onRelease();
              }}
              disabled={isReleasing}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {isReleasing ? <Spinner size="sm" /> : <IconArrowBackUp className="h-4 w-4" />}
              <span>Lepas Tugas</span>
            </button>

            {/* Tombol Tolak Permohonan Outline (Rose) */}
            <button
              onClick={() => {
                haptic.light();
                onReject();
              }}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-2xs transition hover:bg-rose-50 active:scale-[0.98] dark:border-rose-900/80 dark:bg-neutral-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <IconX className="h-4 w-4" />
              <span>Tolak</span>
            </button>
          </div>
        )}

        {isClaimedByOther && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic.light();
                onTakeover();
              }}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100 active:scale-[0.98] dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <IconArrowsExchange className="h-4 w-4" />
              <span>Ambil Alih</span>
            </button>
            <button
              onClick={() => {
                haptic.light();
                onReject();
              }}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-2xs transition hover:bg-rose-50 active:scale-[0.98] dark:border-rose-900/80 dark:bg-neutral-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <IconX className="h-4 w-4" />
              <span>Tolak</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Komponen Kartu Riwayat Mobile (sm:hidden) Bergaya InventoryTable
 */
function HistoryMobileCard({ item }: { item: PosAuthorization }) {
  return (
    <div className="group flex flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white/70 p-3.5 shadow-xs backdrop-blur-xl transition-all duration-200 active:scale-[0.99] dark:border-neutral-800/60 dark:bg-neutral-900/60">
      {/* Header Kartu Mobile: Waktu, Aksi & Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <ActionBadge actionType={item.action_type} />
          <div className="mt-1 text-[11px] font-medium text-neutral-400">
            {formatDateTimeWIB(item.created_at)}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Kasir & Lokasi */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 font-bold text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {item.cashier_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
            {item.cashier_name}
          </div>
          <div className="text-[11px] text-neutral-400 truncate">
            {item.gudang_name || 'Toko Utama'} {item.device_name ? `• ${item.device_name}` : ''}
          </div>
        </div>
      </div>

      {/* Rincian Nota / Alasan (jika ada) */}
      {item.action_metadata && Object.keys(item.action_metadata).length > 0 && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-2 text-xs dark:border-neutral-800/60 dark:bg-neutral-800/40">
          <MetadataSummary metadata={item.action_metadata} />
        </div>
      )}

      {/* Grid 2-Kolom Key-Value di Bagian Bawah (Sesuai InventoryTable) */}
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-2 text-[12px] dark:border-neutral-800/60">
        <div className="flex flex-col">
          <span className="text-[11px] text-neutral-400">Penanggung Jawab</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            {item.status === 'rejected'
              ? `Ditolak: ${item.rejected_by_name || 'Admin'}`
              : item.claimed_by_name || '-'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-neutral-400">Waktu Eksekusi</span>
          <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
            {item.used_at ? formatDateTimeWIB(item.used_at) : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Badge Tipe Aksi Otorisasi
 */
function ActionBadge({ actionType }: { actionType: string }) {
  const config = ACTION_CONFIG[actionType] || {
    label: actionType,
    icon: IconShieldLock,
    colorClass: 'text-neutral-700 dark:text-neutral-300',
    bgClass: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${config.bgClass} ${config.colorClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Tampilan Ringkas Metadata di Tabel Riwayat & Mobile Card
 */
function MetadataSummary({ metadata }: { metadata: Record<string, any> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-neutral-400">-</span>;
  }

  return (
    <div className="text-[11px] space-y-0.5 text-neutral-600 dark:text-neutral-400">
      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
        {metadata.nota_no || metadata.item_nama || 'Detail Transaksi'}
        {metadata.total && (
          <span className="ml-1.5 text-brand-600 dark:text-brand-400 font-bold">
            ({formatCurrency(metadata.total)})
          </span>
        )}
      </div>
      {metadata.alasan && <div className="italic text-neutral-500">&ldquo;{metadata.alasan}&rdquo;</div>}
    </div>
  );
}

/**
 * Tampilan Detail Metadata di Kartu Aktif
 */
function MetadataDetailedView({ metadata }: { metadata: Record<string, any> }) {
  return (
    <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
      {metadata.nota_no && (
        <div className="flex justify-between">
          <span className="text-neutral-400">No. Nota:</span>
          <span className="font-mono font-bold">{metadata.nota_no}</span>
        </div>
      )}
      {metadata.total && (
        <div className="flex justify-between">
          <span className="text-neutral-400">Total:</span>
          <span className="font-bold text-neutral-900 dark:text-white">
            {formatCurrency(metadata.total)}
          </span>
        </div>
      )}
      {metadata.diskon_persen && (
        <div className="flex justify-between">
          <span className="text-neutral-400">Diskon:</span>
          <span className="font-bold text-amber-600">{metadata.diskon_persen}%</span>
        </div>
      )}
      {metadata.item_nama && (
        <div className="flex justify-between">
          <span className="text-neutral-400">Produk:</span>
          <span className="font-semibold">{metadata.item_nama}</span>
        </div>
      )}
      {metadata.alasan && (
        <div className="pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50 text-[11px] italic text-neutral-500">
          Alasan: &ldquo;{metadata.alasan}&rdquo;
        </div>
      )}
    </div>
  );
}

/**
 * Status Badge Riwayat
 */
function StatusBadge({ status }: { status: PosAuthStatus }) {
  switch (status) {
    case 'used':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <IconCheck className="h-3 w-3" />
          Digunakan
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          <IconX className="h-3 w-3" />
          Ditolak
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          <IconClock className="h-3 w-3" />
          Kedaluwarsa
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <IconAlertCircle className="h-3 w-3" />
          Menunggu
        </span>
      );
  }
}
