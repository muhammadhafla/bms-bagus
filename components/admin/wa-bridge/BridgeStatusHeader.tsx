'use client';

import React from 'react';
import { WaBridgeStatus } from '@/types/wa-bridge';
import {
  IconBrandWhatsapp,
  IconServer,
  IconRefresh,
  IconPower,
  IconAlertTriangle,
  IconDeviceMobile,
  IconCheck,
} from '@tabler/icons-react';

interface BridgeStatusHeaderProps {
  status: WaBridgeStatus | null;
  isOnline: boolean;
  isLoading: boolean;
  isActionLoading: boolean;
  onRefresh: () => void;
  onResetSession: () => void;
  onLogout: () => void;
}

export function BridgeStatusHeader({
  status,
  isOnline,
  isLoading,
  isActionLoading,
  onRefresh,
  onResetSession,
  onLogout,
}: BridgeStatusHeaderProps) {
  const isConnected = status?.connected === true;
  const isCorrupted = status?.is_session_corrupted === true;

  return (
    <div className="space-y-4">
      {/* Corrupt Session Alert Banner */}
      {isCorrupted && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 sm:p-4 text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-base">
                  Peringatan: Kunci Sesi WhatsApp Korup (SessionError)
                </h4>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                  Pesan struk kasir berisiko tertahan. Silakan reset sesi &amp; scan ulang QR code.
                </p>
              </div>
            </div>
            <button
              onClick={onResetSession}
              disabled={isActionLoading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50 active:scale-95 transition"
            >
              <IconRefresh className={`h-4 w-4 ${isActionLoading ? 'animate-spin' : ''}`} />
              Reset Sesi Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left: WhatsApp Account & VPS status */}
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
              }`}
            >
              <IconBrandWhatsapp className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {isConnected ? status?.name || 'Akun Toko' : 'WhatsApp Belum Terhubung'}
                </h2>
                {/* Connection Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isConnected ? 'Terhubung' : 'Terputus'}
                </span>

                {/* VPS Online Badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isOnline
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                  title="Status Heartbeat Remote Bridge"
                >
                  <IconServer className="h-3 w-3" />
                  VPS Bridge: {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                {isConnected && status?.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <IconDeviceMobile className="h-3.5 w-3.5" />
                    +{status.phone}
                  </span>
                )}
                {status?.updated_at && (
                  <span>
                    Heartbeat Terakhir:{' '}
                    {new Date(status.updated_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto pt-2 sm:pt-0">
            <button
              onClick={onRefresh}
              disabled={isLoading || isActionLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition"
              title="Segarkan data status dari server"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>

            {isConnected ? (
              <button
                onClick={onLogout}
                disabled={isActionLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60 active:scale-95 transition"
              >
                <IconPower className="h-3.5 w-3.5" />
                Logout WA
              </button>
            ) : (
              <button
                onClick={onResetSession}
                disabled={isActionLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60 active:scale-95 transition"
              >
                <IconRefresh className="h-3.5 w-3.5" />
                Reset Sesi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
