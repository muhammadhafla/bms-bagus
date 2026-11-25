'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posAuthApi } from '@/lib/api/pos-auth';
import { PosAuthorization, PosAuthStatus } from '@/types/pos-auth';
import { supabase } from '@/lib/supabase';
import { queryKeys, invalidatePosAuthMutation } from '@/lib/queryKeys';

export interface PosActionConfigItem {
  label: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

interface HapticController {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
}

interface UsePosAuthDataParams {
  queryClient: QueryClient;
  haptic: HapticController;
  actionConfig: Record<string, PosActionConfigItem>;
  activeTab: 'active' | 'history';
  historyStatus: PosAuthStatus | 'all';
  historyActionType: string;
  searchQuery: string;
  debouncedSearch: string;
  setDebouncedSearch: (val: string) => void;
  historyPage: number;
  setHistoryPage: (page: number) => void;
  setRejectConfirmId: (id: string | null) => void;
  setTakeoverConfirmId: (val: { id: string; ownerName: string } | null) => void;
}

export function usePosAuthData({
  queryClient,
  haptic,
  actionConfig,
  activeTab,
  historyStatus,
  historyActionType,
  searchQuery,
  debouncedSearch,
  setDebouncedSearch,
  historyPage,
  setHistoryPage,
  setRejectConfirmId,
  setTakeoverConfirmId,
}: UsePosAuthDataParams) {
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, setDebouncedSearch, setHistoryPage]);

  useEffect(() => {
    const channel = supabase
      .channel('pos-auth-page-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_authorizations',
        },
        () => {
          invalidatePosAuthMutation(queryClient);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const {
    data: activeRequests = [],
    isLoading: isLoadingActive,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['pos-auth-active'],
    queryFn: async () => {
      const res = await posAuthApi.getActiveRequests();
      if (res.error) throw res.error;
      return res.data || [];
    },
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: [
      'pos-auth-history',
      historyStatus,
      historyActionType,
      debouncedSearch,
      historyPage,
    ],
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

  const handlePullRefresh = useCallback(async () => {
    haptic.light();
    await Promise.all([
      refetchActive(),
      activeTab === 'history' ? refetchHistory() : Promise.resolve(),
    ]);
  }, [activeTab, haptic, refetchActive, refetchHistory]);

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
      invalidatePosAuthMutation(queryClient);
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal menarik permohonan: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await posAuthApi.release(id);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      haptic.medium();
      toast.info('Tugas berhasil dilepas kembali ke antrean umum.');
      invalidatePosAuthMutation(queryClient);
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal melepas tugas: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

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
      invalidatePosAuthMutation(queryClient);
      setTakeoverConfirmId(null);
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal mengambil alih tugas: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await posAuthApi.rejectRequest(id);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      haptic.medium();
      toast.success('Permohonan otorisasi berhasil ditolak.');
      invalidatePosAuthMutation(queryClient);
      setRejectConfirmId(null);
    },
    onError: (err: any) => {
      haptic.heavy();
      toast.error(`Gagal menolak permohonan: ${err.message || 'Terjadi kesalahan'}`);
    },
  });

  const handleCopyPin = useCallback(
    (pin: string, cashierName: string) => {
      navigator.clipboard.writeText(pin);
      haptic.success();
      toast.success(`PIN ${pin} berhasil disalin!`, {
        description: `Teruskan ke kasir ${cashierName}`,
      });
    },
    [haptic],
  );

  const handleShareWhatsApp = useCallback(
    async (req: PosAuthorization) => {
      const expiredTime = new Date(req.expires_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const actionLabel = actionConfig[req.action_type]?.label || req.action_type;
      const message = `Halo *${req.cashier_name}*, berikut kode PIN otorisasi *${actionLabel}* POS Toko *${req.gudang_name || 'Utama'}*:\n\n*${req.pin_code}*\n\n(Berlaku s.d. ${expiredTime} WIB, satu kali pakai).`;

      haptic.light();

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `PIN Otorisasi POS - ${actionLabel}`,
            text: message,
          });
          toast.success('Berhasil membuka lembar berbagi!');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      const opened = window.open(waUrl, '_blank');

      if (!opened) {
        navigator.clipboard.writeText(message);
        toast.success('Format pesan WhatsApp disalin ke clipboard!', {
          description: 'Tempel (paste) ke chat WhatsApp kasir.',
        });
      }
    },
    [actionConfig, haptic],
  );

  const activeFilterCount =
    (historyStatus !== 'all' ? 1 : 0) + (historyActionType !== 'all' ? 1 : 0);
  const totalHistoryCount = historyData?.count || 0;
  const totalHistoryPages = Math.ceil(totalHistoryCount / 15) || 1;

  return {
    activeRequests,
    isLoadingActive,
    historyData,
    isLoadingHistory,
    handlePullRefresh,
    claimMutation,
    releaseMutation,
    takeoverMutation,
    rejectMutation,
    handleCopyPin,
    handleShareWhatsApp,
    activeFilterCount,
    totalHistoryCount,
    totalHistoryPages,
  };
}
