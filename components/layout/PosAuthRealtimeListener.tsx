'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth';
import { playChime } from '@/lib/utils/audio-feedback';
import { toast } from 'sonner';
import { PosAuthorization } from '@/types/pos-auth';
import {
  IconShieldLock,
  IconSettings,
  IconTrash,
  IconTicket,
  IconFileInvoice,
  IconArrowsExchange,
  IconBuildingStore,
  IconX,
  IconArrowRight,
} from '@tabler/icons-react';

interface ActionStyle {
  label: string;
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconColor: string;
  btnBg: string;
}

const ACTION_CONFIG_MAP: Record<string, ActionStyle> = {
  access_settings: {
    label: 'Pengaturan POS',
    icon: IconSettings,
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    btnBg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  },
  void_transaction: {
    label: 'Void Transaksi',
    icon: IconTrash,
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
    btnBg: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
  },
  manual_discount: {
    label: 'Diskon Manual',
    icon: IconTicket,
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    btnBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
  },
  price_override: {
    label: 'Ubah Harga',
    icon: IconFileInvoice,
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    btnBg: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
  },
  return_approval: {
    label: 'Retur Penjualan',
    icon: IconArrowsExchange,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
  },
};

const DEFAULT_ACTION_STYLE: ActionStyle = {
  label: 'Otorisasi POS',
  icon: IconShieldLock,
  badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
  badgeText: 'text-amber-700 dark:text-amber-300',
  badgeBorder: 'border-amber-200 dark:border-amber-800',
  iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  iconColor: 'text-amber-600 dark:text-amber-400',
  btnBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
};

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
            playChime();

            const config = ACTION_CONFIG_MAP[newReq.action_type] || DEFAULT_ACTION_STYLE;
            const ActionIcon = config.icon;
            const cashierName = newReq.cashier_name || 'Staff Kasir';
            const storeName = newReq.gudang_name || 'Toko';

            // Tampilkan custom card toast interaktif
            toast.custom(
              (t) => (
                <div className="w-[360px] max-w-full bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl p-3.5 shadow-xl shadow-zinc-950/10 dark:shadow-black/40 flex flex-col gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${config.iconBg} ${config.iconColor}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 truncate">
                        {config.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Live Indicator Pulse */}
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <span>Menunggu</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => toast.dismiss(t)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded transition"
                        aria-label="Tutup notifikasi"
                      >
                        <IconX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{cashierName}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <IconBuildingStore className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{storeName}</span>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Kasir meminta otorisasi untuk{' '}
                      <span
                        className={`inline-block font-semibold px-1.5 py-0.5 rounded text-[11px] border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                      >
                        {config.label}
                      </span>
                    </p>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => toast.dismiss(t)}
                      className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                    >
                      Nanti
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.dismiss(t);
                        router.push('/admin/pos-auth');
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white ${config.btnBg} rounded-lg shadow-sm transition active:scale-95`}
                    >
                      <span>Tinjau Permintaan</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ),
              { duration: 12000 }
            );
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
