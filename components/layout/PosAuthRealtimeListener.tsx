'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth';
import { soundEffects } from '@/lib/audio';
import { toast } from 'sonner';
import { PosAuthorization } from '@/types/pos-auth';

export function PosAuthRealtimeListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isAdmin, isKepalaGudang, isKepalaCabang } = useAuthStore();

  useEffect(() => {
    // Hanya pasang listener jika user adalah Admin, Kepala Gudang, atau Kepala Cabang
    const canAuthorize = Boolean(isAdmin?.() || isKepalaGudang?.() || isKepalaCabang?.());
    if (!profile || !canAuthorize) return;

    const channel = supabase
      .channel('pos-authorizations-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_authorizations',
        },
        (payload) => {
          // Invalidate cache query agar UI auto-update
          queryClient.invalidateQueries({ queryKey: ['pos-auth-active'] });
          queryClient.invalidateQueries({ queryKey: ['pos-auth-history'] });

          // Tangani event INSERT baru
          if (payload.eventType === 'INSERT') {
            const newReq = payload.new as PosAuthorization;

            // Jika kepala gudang / kepala cabang (non-admin), verifikasi kesesuaian cabang
            if (!isAdmin?.() && (isKepalaGudang?.() || isKepalaCabang?.())) {
              if (newReq.gudang_id && newReq.gudang_id !== profile.default_gudang_id) {
                return; // Bukan untuk cabang user ini
              }
            }

            // Bunyikan chime notifikasi audio
            soundEffects.playChime();

            const actionLabelMap: Record<string, string> = {
              access_settings: 'Pengaturan POS',
              void_transaction: 'Void Transaksi',
              manual_discount: 'Diskon Manual',
              price_override: 'Ubah Harga',
              return_approval: 'Retur Penjualan',
            };
            const actionText = actionLabelMap[newReq.action_type] || 'Otorisasi';

            // Tampilkan pop-up toast interaktif (PIN disembunyikan sampai ditarik)
            toast.warning(`🔐 Permintaan Otorisasi POS Masuk!`, {
              description: `${newReq.cashier_name} (${newReq.gudang_name || 'Toko'}) meminta ${actionText}. Klik untuk menarik permintaan.`,
              duration: 10000,
              action: {
                label: 'Tarik / Tangani',
                onClick: () => router.push('/admin/pos-auth'),
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, isAdmin, isKepalaGudang, isKepalaCabang, queryClient, router]);

  return null;
}
