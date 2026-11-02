'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { waBridgeApi } from '@/lib/api/wa-bridge';
import { WaBridgeStatus, WaOutboxItem, WaOutboxFilter, WaSettings } from '@/types/wa-bridge';
import { toast } from 'sonner';

export function useWaBridge() {
  const [status, setStatus] = useState<WaBridgeStatus | null>(null);
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [outboxItems, setOutboxItems] = useState<WaOutboxItem[]>([]);
  const [outboxTotal, setOutboxTotal] = useState<number>(0);
  const [gudangList, setGudangList] = useState<{ id: string; kode_gudang: string; nama: string }[]>([]);
  const [filter, setFilter] = useState<WaOutboxFilter>({
    gudangId: 'all',
    status: 'all',
    search: '',
    page: 1,
    limit: 20,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [qrSecondsRemaining, setQrSecondsRemaining] = useState<number>(0);
  const [isBridgeOnline, setIsBridgeOnline] = useState<boolean>(false);

  // 1. Fetch data methods
  const loadStatus = useCallback(async () => {
    const res = await waBridgeApi.getBridgeStatus();
    if (!res.error && res.data) {
      setStatus(res.data);
      if (res.data.updated_at) {
        const lastUpdated = new Date(res.data.updated_at).getTime();
        const diffMinutes = (Date.now() - lastUpdated) / (1000 * 60);
        setIsBridgeOnline(diffMinutes < 3);
      }
    } else {
      setIsBridgeOnline(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await waBridgeApi.getSettings();
    if (!res.error && res.data) {
      setSettings(res.data);
    }
  }, []);

  const loadGudangList = useCallback(async () => {
    const res = await waBridgeApi.getGudangList();
    if (!res.error && res.data) {
      setGudangList(res.data);
    }
  }, []);

  const loadOutbox = useCallback(async () => {
    const res = await waBridgeApi.getOutboxHistory(filter);
    if (!res.error && res.data) {
      setOutboxItems(res.data.items);
      setOutboxTotal(res.data.total);
    }
  }, [filter]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadStatus(), loadSettings(), loadGudangList(), loadOutbox()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadStatus, loadSettings, loadGudangList, loadOutbox]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Load outbox when filter changes
  useEffect(() => {
    loadOutbox();
  }, [filter, loadOutbox]);

  // 2. Realtime Subscriptions on wa_bridge_status and wa_outbox
  useEffect(() => {
    const channelName = `wa_bridge_web_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_bridge_status' },
        (payload) => {
          if (payload.new) {
            const newStatus = payload.new as WaBridgeStatus;
            setStatus(newStatus);
            if (newStatus.updated_at) {
              const diffMinutes = (Date.now() - new Date(newStatus.updated_at).getTime()) / (1000 * 60);
              setIsBridgeOnline(diffMinutes < 3);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_outbox' },
        () => {
          loadOutbox();
          loadStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOutbox, loadStatus]);

  // 3. QR Countdown timer
  useEffect(() => {
    if (!status?.qr_expires_at || status.connected) {
      setQrSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const exp = new Date(status.qr_expires_at!).getTime();
      return Math.max(0, Math.floor((exp - Date.now()) / 1000));
    };

    setQrSecondsRemaining(calculateRemaining());
    const interval = setInterval(() => {
      const rem = calculateRemaining();
      setQrSecondsRemaining(rem);
      if (rem <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.qr_expires_at, status?.connected]);

  // 4. Command Actions
  const resetSession = async () => {
    setIsActionLoading(true);
    try {
      const res = await waBridgeApi.sendSystemCommand('RESET_SESSION');
      if (!res.error && res.data) {
        toast.success('Perintah Reset Sesi dikirim ke VPS Bridge. Menunggu QR baru...');
        setTimeout(() => loadStatus(), 1500);
      } else {
        toast.error(`Gagal reset sesi: ${res.error?.message || 'Error tidak diketahui'}`);
      }
    } catch (err: any) {
      toast.error(`Gagal reset sesi: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const logoutSession = async () => {
    setIsActionLoading(true);
    try {
      const res = await waBridgeApi.sendSystemCommand('LOGOUT');
      if (!res.error && res.data) {
        toast.success('Perintah Logout berhasil dikirim ke VPS Bridge.');
        setTimeout(() => loadStatus(), 1500);
      } else {
        toast.error(`Gagal logout: ${res.error?.message || 'Error tidak diketahui'}`);
      }
    } catch (err: any) {
      toast.error(`Gagal logout: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const sendTestMessage = async (phone: string, text: string) => {
    setIsActionLoading(true);
    try {
      const res = await waBridgeApi.sendTestMessage(phone, text);
      if (!res.error && res.data) {
        toast.success(`Pesan uji coba berhasil dimasukkan ke antrean untuk ${phone}`);
        loadOutbox();
      } else {
        toast.error(`Gagal mengirim pesan test: ${res.error?.message || 'Error'}`);
      }
    } catch (err: any) {
      toast.error(`Gagal mengirim pesan test: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const retryMessage = async (id: string) => {
    try {
      const res = await waBridgeApi.retryMessage(id);
      if (!res.error && res.data) {
        toast.success('Pesan dimasukkan kembali ke antrean pending.');
        loadOutbox();
      } else {
        toast.error(`Gagal mengulang pesan: ${res.error?.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const cancelMessage = async (id: string) => {
    try {
      const res = await waBridgeApi.cancelMessage(id);
      if (!res.error && res.data) {
        toast.success('Pesan berhasil dibatalkan.');
        loadOutbox();
      } else {
        toast.error(`Gagal membatalkan pesan: ${res.error?.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const updateSettings = async (payload: Partial<WaSettings>) => {
    setIsActionLoading(true);
    try {
      const res = await waBridgeApi.updateSettings(payload);
      if (!res.error && res.data) {
        setSettings(res.data);
        toast.success('Pengaturan WhatsApp berhasil disimpan');
      } else {
        toast.error(`Gagal menyimpan pengaturan: ${res.error?.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan pengaturan: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const resetInactivityDate = async () => {
    setIsActionLoading(true);
    try {
      const res = await waBridgeApi.resetInactivityDate();
      if (!res.error && res.data) {
        toast.success('Hitungan inaktivitas HP berhasil di-reset ke Hari 0.');
        loadSettings();
      } else {
        toast.error(`Gagal mereset hari: ${res.error?.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal mereset hari: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    status,
    settings,
    outboxItems,
    outboxTotal,
    gudangList,
    filter,
    setFilter,
    isLoading,
    isActionLoading,
    isBridgeOnline,
    qrSecondsRemaining,
    resetSession,
    logoutSession,
    sendTestMessage,
    retryMessage,
    cancelMessage,
    updateSettings,
    resetInactivityDate,
    refreshAll,
  };
}
