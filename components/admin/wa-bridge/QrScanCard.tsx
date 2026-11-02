'use client';

import React from 'react';
import Image from 'next/image';
import { IconQrcode, IconRefresh, IconDeviceMobile, IconCamera, IconCheck } from '@tabler/icons-react';

interface QrScanCardProps {
  qrBase64: string | null;
  secondsRemaining: number;
  isActionLoading: boolean;
  onRefreshQr: () => void;
}

export function QrScanCard({
  qrBase64,
  secondsRemaining,
  isActionLoading,
  onRefreshQr,
}: QrScanCardProps) {
  const isExpired = secondsRemaining <= 0;
  const qrImageSrc = qrBase64
    ? qrBase64.startsWith('data:')
      ? qrBase64
      : `data:image/png;base64,${qrBase64}`
    : null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* QR Code Container */}
        <div className="flex flex-col items-center">
          <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-3 shadow-inner dark:border-neutral-700">
            {qrImageSrc && !isExpired ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageSrc}
                  alt="WhatsApp QR Code"
                  className="h-full w-full object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <IconQrcode className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {isExpired && qrBase64
                    ? 'QR Code telah kedaluwarsa'
                    : 'Menunggu QR Code dari VPS Bridge...'}
                </p>
                <button
                  onClick={onRefreshQr}
                  disabled={isActionLoading}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  <IconRefresh className={`h-3.5 w-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                  Minta QR Baru
                </button>
              </div>
            )}
          </div>

          {/* Countdown & Refresh Action */}
          {qrImageSrc && !isExpired && (
            <div className="mt-3 flex items-center justify-between w-64 text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">
                Berlaku hingga:{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {secondsRemaining}s
                </span>
              </span>
              <button
                onClick={onRefreshQr}
                disabled={isActionLoading}
                className="text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
              >
                <IconRefresh className="h-3 w-3" />
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Step-by-Step Instructions */}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Langkah Menghubungkan WhatsApp Toko
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Gunakan aplikasi WhatsApp resmi di ponsel utama toko atau nomor Customer Service Anda.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 text-xs font-bold">
                1
              </span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Buka Aplikasi WhatsApp di HP
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Buka aplikasi WhatsApp di Android atau iPhone yang menyimpan nomor WhatsApp resmi toko.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 text-xs font-bold">
                2
              </span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Pilih Menu Perangkat Tertaut
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Tekan menu titik tiga ⋮ (Android) atau Pengaturan ⚙️ (iOS) → lalu pilih{' '}
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Perangkat Tertaut (Linked Devices)
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 text-xs font-bold">
                3
              </span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Tautkan Perangkat & Pindai QR Code
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Tekan tombol <span className="font-semibold text-neutral-700 dark:text-neutral-300">"Tautkan Perangkat"</span>, lalu arahkan kamera ponsel ke QR Code di samping kiri.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            ℹ️ <strong>Tips:</strong> Begitu QR Code berhasil dipindai, status di halaman ini serta banner di seluruh terminal kasir cabang akan otomatis berubah menjadi <span className="text-emerald-600 dark:text-emerald-400 font-bold">Terhubung</span> dalam hitungan detik.
          </div>
        </div>
      </div>
    </div>
  );
}
