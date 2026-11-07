'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  IconSend,
  IconBellRinging,
  IconDeviceMobile,
  IconUsers,
  IconCheck,
  IconAlertCircle,
  IconFlame,
} from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface TierOption {
  id: string;
  name: string;
}

export default function LoyaltyBroadcastTab() {
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [promoUrl, setPromoUrl] = useState('');

  const [loadingTiers, setLoadingTiers] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetCount, setTargetCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchTiers = async () => {
      setLoadingTiers(true);
      const { data } = await supabase.from('member_tiers').select('id, name').order('min_points_required', { ascending: true });
      if (data) {
        setTiers(data);
      }
      setLoadingTiers(false);
    };

    fetchTiers();
  }, []);

  const handlePrepareSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Judul dan pesan notifikasi wajib diisi');
      return;
    }

    // Hitung estimasi target penerima
    let query = supabase.from('member_fcm_tokens').select('fcm_token, members!inner(id, tier_id)');
    if (selectedTier !== 'all') {
      query = query.eq('members.tier_id', selectedTier);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error('Gagal menghitung target penerima');
      return;
    }

    const uniqueCount = new Set(data?.map((d: any) => d.fcm_token) || []).size;
    setTargetCount(uniqueCount);
    setConfirmOpen(true);
  };

  const executeBroadcast = async () => {
    setSending(true);
    setConfirmOpen(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Sesi autentikasi telah berakhir. Silakan login kembali.');
        return;
      }

      const res = await fetch('/api/loyalty/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          message,
          tierId: selectedTier,
          promoUrl: promoUrl.trim() || undefined,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData?.error || 'Gagal mengirim broadcast');
      }

      toast.success(resData.message || 'Push notification broadcast berhasil dikirim!');
      setTitle('');
      setMessage('');
      setPromoUrl('');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengirim broadcast: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Formulir Pengiriman (Kiri) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <IconBellRinging className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Kirim Push Notifikasi Broadcast
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mb-5">
            Pesan pengumuman akan dikirimkan secara langsung ke ponsel seluruh pelanggan pengguna aplikasi Kawan Bagus via Firebase Cloud Messaging.
          </p>

          <form onSubmit={handlePrepareSend} className="space-y-4">
            {/* Target Audiens */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Target Audiens Penerima
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTier('all')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                    selectedTier === 'all'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-950/40 dark:text-brand-300'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  <IconUsers className="h-4 w-4" />
                  <span>Semua Member App</span>
                </button>

                <div className="relative">
                  <select
                    value={selectedTier === 'all' ? '' : selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value || 'all')}
                    className={`w-full rounded-lg border p-2.5 text-xs font-semibold focus:outline-none ${
                      selectedTier !== 'all'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    <option value="">Khusus Tier Tertentu...</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        Hanya Member {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Judul Notifikasi */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Judul Notifikasi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Voucher Diskon Baru Sudah Hadir! 🎁"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
                <span>Muncul tebal di baris atas notifikasi status bar HP.</span>
                <span>{title.length}/60</span>
              </div>
            </div>

            {/* Isi Pesan */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Isi Pesan Notifikasi <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                maxLength={160}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contoh: Tukarkan poinmu dengan potongan belanja spesial hingga Rp 50.000 hanya minggu ini di Toko Bagus..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
                <span>Rekomendasi pesan singkat dan jelas agar mudah dibaca sekilas.</span>
                <span>{message.length}/160</span>
              </div>
            </div>

            {/* Link Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Tautan Promo Tambahan (Opsional)
              </label>
              <input
                type="url"
                value={promoUrl}
                onChange={(e) => setPromoUrl(e.target.value)}
                placeholder="https://tokobagus.id/promo-weekend"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50"
              >
                <IconSend className="h-4 w-4" />
                <span>{sending ? 'Mengirim Broadcast...' : 'Kirim Notifikasi Broadcast'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pratinjau Tampilan HP (Kanan) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-3">
            Pratinjau Status Bar HP Pelanggan
          </span>

          {/* Device Mockup Card */}
          <div className="rounded-2xl border border-neutral-300 bg-neutral-900 p-4 text-white shadow-lg dark:border-neutral-700">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 pb-3 border-b border-neutral-800">
              <span>09:41</span>
              <div className="flex items-center gap-1.5">
                <span>4G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Push Notification Banner */}
            <div className="mt-3 rounded-xl bg-neutral-800/90 p-3.5 backdrop-blur-md shadow-md border border-neutral-700/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-brand-500 text-[10px] font-bold text-white">
                  KB
                </div>
                <span className="text-[11px] font-bold tracking-wide text-neutral-200 uppercase">
                  Kawan Bagus
                </span>
                <span className="text-[10px] text-neutral-400 ml-auto">Sekarang</span>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">
                  {title.trim() || 'Judul Notifikasi Broadcast'}
                </p>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {message.trim() || 'Isi pesan pengumuman promo, penawaran spesial, atau reward baru akan tampil di sini pada layar HP pelanggan...'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200">
              <IconDeviceMobile className="h-4 w-4 text-brand-600" />
              <span>Prioritas Notifikasi: HIGH Priority</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Notifikasi menggunakan Google FCM v1 API channel <code>kawan_bagus_receipts</code> sehingga bergetar dan muncul di status bar walau aplikasi Kawan Bagus sedang ditutup total.
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Dialog Broadcast */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Konfirmasi Pengiriman Broadcast"
        message={`Pesan ini akan dikirimkan ke estimasi ${targetCount ?? 0} perangkat member ${
          selectedTier === 'all'
            ? '(Semua Member)'
            : `(Khusus Tier ${tiers.find((t) => t.id === selectedTier)?.name || ''})`
        }. Lanjutkan?`}
        confirmLabel="Ya, Kirim Sekarang"
        onConfirm={executeBroadcast}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
