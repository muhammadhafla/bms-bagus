'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  IconShieldCheck,
  IconClock,
  IconBuildingStore,
  IconAlertCircle,
  IconLock,
  IconSparkles,
  IconCheck,
  IconCopy,
  IconBrandWhatsapp,
  IconShare,
  IconArrowBackUp,
  IconArrowsExchange,
  IconX,
} from '@tabler/icons-react';
import { PosAuthorization } from '@/types/pos-auth';
import { Spinner } from '@/components/ui';
import { useHaptic } from '@/hooks/useHaptic';
import { PosActionConfigItem } from '../_hooks/usePosAuthData';
import { ActionBadge, MetadataDetailedView } from './PosAuthBadges';

interface PosActiveRequestsTabProps {
  activeRequests: PosAuthorization[];
  isLoading: boolean;
  currentUserId: string;
  actionConfig: Record<string, PosActionConfigItem>;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  onTakeover: (id: string, ownerName: string) => void;
  onCopyPin: (pin: string, cashierName: string) => void;
  onShareWa: (req: PosAuthorization) => void;
  onReject: (id: string) => void;
  claimingId: string | null;
  releasingId: string | null;
}

export function PosActiveRequestsTab({
  activeRequests,
  isLoading,
  currentUserId,
  actionConfig,
  onClaim,
  onRelease,
  onTakeover,
  onCopyPin,
  onShareWa,
  onReject,
  claimingId,
  releasingId,
}: PosActiveRequestsTabProps) {
  return (
    <div className="space-y-4">
      {isLoading ? (
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
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Saat kasir meminta otorisasi di POS (Pengaturan, Void, Diskon, Ubah Harga, Retur),
            kartu tugas akan muncul di sini secara real-time untuk ditarik.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeRequests.map((req) => (
            <ActiveAuthCard
              key={req.id}
              request={req}
              currentUserId={currentUserId}
              actionConfig={actionConfig}
              onClaim={() => onClaim(req.id)}
              onRelease={() => onRelease(req.id)}
              onTakeover={() => onTakeover(req.id, req.claimed_by_name || 'Admin')}
              onCopyPin={() => onCopyPin(req.pin_code, req.cashier_name)}
              onShareWa={() => onShareWa(req)}
              onReject={() => onReject(req.id)}
              isClaiming={claimingId === req.id}
              isReleasing={releasingId === req.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
      <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border-2 border-dashed border-emerald-300/90 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 p-3 shadow-xs dark:border-emerald-700/70 dark:from-emerald-950/40 dark:via-neutral-900 dark:to-emerald-950/20">
        <div className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-emerald-200 bg-white dark:border-emerald-800 dark:bg-neutral-900" />
        <div className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-emerald-200 bg-white dark:border-emerald-800 dark:bg-neutral-900" />

        <div className="pl-3 sm:pl-4">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <IconSparkles className="h-3 w-3" />
            <span>PIN Otorisasi Aktif</span>
          </div>
          <div className="select-all font-mono text-2xl font-black tracking-[0.28em] text-neutral-900 sm:text-3xl dark:text-white">
            {pin}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Salin kode PIN ke clipboard"
          title="Salin PIN"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
            copied
              ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500'
              : 'border border-emerald-200 bg-white text-emerald-700 shadow-2xs hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:bg-neutral-800 dark:text-emerald-300 dark:hover:bg-neutral-700'
          }`}
        >
          {copied ? (
            <IconCheck className="h-5 w-5 stroke-[2.5]" />
          ) : (
            <IconCopy className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <button
          type="button"
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
          Kasir:{' '}
          <strong className="text-neutral-600 dark:text-neutral-300">{cashierName}</strong>
        </span>
      </div>
    </div>
  );
}

function ActiveAuthCard({
  request,
  currentUserId,
  actionConfig,
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
  actionConfig: Record<string, PosActionConfigItem>;
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

  const isCriticalTime = secondsLeft < 120;
  const isUnclaimed = !request.claimed_by_id;
  const isClaimedByMe = request.claimed_by_id === currentUserId;
  const isClaimedByOther =
    Boolean(request.claimed_by_id) && request.claimed_by_id !== currentUserId;

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
        <div className="flex items-start justify-between gap-2">
          <ActionBadge actionType={request.action_type} actionConfig={actionConfig} />

          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
              isCriticalTime
                ? 'animate-pulse bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
            }`}
          >
            <IconClock className="h-3.5 w-3.5" />
            <span>{formattedTimer}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-sm font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
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

        {request.action_metadata && Object.keys(request.action_metadata).length > 0 && (
          <div className="mt-3 rounded-xl border border-neutral-200/80 bg-neutral-50 p-2.5 text-xs dark:border-neutral-800 dark:bg-neutral-800/40">
            <MetadataDetailedView metadata={request.action_metadata} />
          </div>
        )}

        {isUnclaimed ? (
          <div className="my-3.5 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/70 p-4 text-center dark:border-neutral-800 dark:bg-neutral-800/40">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <IconAlertCircle className="h-3.5 w-3.5" />
              Belum Ada Penangan
            </span>
            <div className="my-1 select-none font-mono text-2xl font-black tracking-[0.3em] text-neutral-300 dark:text-neutral-600">
              ••••••
            </div>
            <p className="text-[11px] text-neutral-400">
              Tarik permohonan untuk membuka kode PIN
            </p>
          </div>
        ) : isClaimedByMe ? (
          <OtpPaperSlip
            pin={request.pin_code}
            cashierName={request.cashier_name}
            onCopyPin={onCopyPin}
            onShareWa={onShareWa}
          />
        ) : (
          <div className="my-3.5 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/70 p-4 text-center dark:border-neutral-800 dark:bg-neutral-800/40">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              <IconLock className="h-3.5 w-3.5" />
              Ditangani: {request.claimed_by_name}
            </span>
            <div className="my-1 select-none font-mono text-2xl font-black tracking-[0.3em] text-neutral-300 dark:text-neutral-600">
              ••••••
            </div>
            <p className="text-[11px] text-neutral-400">
              PIN hanya terbuka untuk admin penangan
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800/80">
        {isUnclaimed && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
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
              type="button"
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
            <button
              type="button"
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

            <button
              type="button"
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
              type="button"
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
              type="button"
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
