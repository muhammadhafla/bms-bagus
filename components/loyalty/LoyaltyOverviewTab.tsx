'use client';

import { useState } from 'react';
import { LoyaltyBudgetMetrics, LoyaltySettings } from '@/lib/types/loyalty';
import {
  IconCoins,
  IconReceipt2,
  IconUsers,
  IconDeviceMobile,
  IconLock,
  IconLockOpen,
  IconSettings,
  IconAlertTriangle,
  IconArrowRight,
  IconTrendingUp,
  IconGift,
  IconFlame,
} from '@tabler/icons-react';
import Link from 'next/link';
import BudgetSettingsModal from './BudgetSettingsModal';

interface LoyaltyOverviewTabProps {
  metrics: LoyaltyBudgetMetrics;
  settings: LoyaltySettings | null;
  onRefresh: () => void;
}

export default function LoyaltyOverviewTab({
  metrics,
  settings,
  onRefresh,
}: LoyaltyOverviewTabProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDaysOfWeek = (days?: number[]) => {
    if (!days || days.length === 0) return 'Belum dipilih';
    const dayMap: Record<number, string> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
      7: 'Minggu',
    };
    return days.map((d) => dayMap[d] || String(d)).join(', ');
  };

  const usagePercent = Math.min(100, Math.round(metrics.usagePercentage || 0));

  let progressColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
  let statusText = 'Anggaran Aman';

  if (metrics.isLocked) {
    progressColor = 'bg-rose-500';
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
    statusText = 'Penukaran Dikunci';
  } else if (usagePercent >= 90) {
    progressColor = 'bg-rose-500';
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
    statusText = 'Mendekati Plafon';
  } else if (usagePercent >= 70) {
    progressColor = 'bg-amber-500';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    statusText = 'Pengawasan';
  }

  return (
    <div className="space-y-6">
      {/* 1. KOTAK UTAMA: LOYALTY BUDGET METER */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <IconReceipt2 className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Loyalty Budget Meter (Bulan Ini)
              </h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                {statusText}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Pengawasan real-time komitmen liabilitas voucher belanja terhadap plafon anggaran bulanan toko.
            </p>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <IconSettings className="h-4 w-4" />
            <span>Atur Plafon & Pengaman</span>
          </button>
        </div>

        {/* Progress Bar Anggaran */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-neutral-600 dark:text-neutral-400">
              Komitmen Voucher:{' '}
              <strong className="text-neutral-900 dark:text-white">
                {formatRupiah(metrics.committedBudget)}
              </strong>{' '}
              ({usagePercent}%)
            </span>
            <span className="text-neutral-600 dark:text-neutral-400">
              Plafon Bulanan:{' '}
              <strong className="text-neutral-900 dark:text-white">
                {formatRupiah(metrics.monthlyBudgetCap)}
              </strong>
            </span>
          </div>

          <div className="h-3.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${Math.max(4, usagePercent)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-neutral-400">
            <span>Rp 0</span>
            <span>
              Sisa Kuota Aman: <strong>{formatRupiah(Math.max(0, metrics.remainingBudget))}</strong>
            </span>
          </div>
        </div>

        {/* Grid 4 Kartu Anggaran */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
            <span className="text-xs font-medium text-neutral-500">Plafon Anggaran</span>
            <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
              {formatRupiah(metrics.monthlyBudgetCap)}
            </p>
            <span className="mt-1 block text-[11px] text-neutral-400">Batas maksimal / bulan</span>
          </div>

          <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
            <span className="text-xs font-medium text-neutral-500">Komitmen Voucher Diterbitkan</span>
            <p className="mt-1 text-lg font-bold text-brand-600 dark:text-brand-400">
              {formatRupiah(metrics.committedBudget)}
            </p>
            <span className="mt-1 block text-[11px] text-neutral-400">
              {metrics.activeVouchersCount} voucher aktif beredar
            </span>
          </div>

          <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
            <span className="text-xs font-medium text-neutral-500">Realisasi Diskon di Kasir</span>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(metrics.realizedBudget)}
            </p>
            <span className="mt-1 block text-[11px] text-neutral-400">
              {metrics.usedVouchersCount} voucher telah dipotong
            </span>
          </div>

          <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
            <span className="text-xs font-medium text-neutral-500">Sisa Kuota Anggaran</span>
            <p
              className={`mt-1 text-lg font-bold ${
                metrics.remainingBudget <= 0
                  ? 'text-rose-600'
                  : 'text-neutral-900 dark:text-white'
              }`}
            >
              {formatRupiah(Math.max(0, metrics.remainingBudget))}
            </p>
            <span className="mt-1 block text-[11px] text-neutral-400">
              {metrics.remainingBudget <= 0 ? 'Anggaran telah habis' : 'Tersedia untuk klaim baru'}
            </span>
          </div>
        </div>

        {/* Peringatan Kunci Anggaran jika aktif */}
        {metrics.isLocked && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <IconAlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>
              <strong>Pemberitahuan:</strong> Penukaran reward saat ini dikunci. Pelanggan di aplikasi Kawan Bagus tidak dapat menukarkan poin hingga kunci dinonaktifkan atau plafon dinaikkan.
            </span>
          </div>
        )}
      </div>

      {/* 2. BANNER PROMO DOUBLE POINTS DAY */}
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-linear-to-r from-amber-50 to-orange-50/60 p-5 shadow-xs dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <IconFlame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Promo Double Points Day (Kasir)
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  settings?.double_points_active
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                    : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {settings?.double_points_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              {settings?.double_points_active ? (
                <>
                  Poin belanja otomatis dilipatgandakan{' '}
                  <strong className="text-amber-700 dark:text-amber-300">
                    {settings.double_points_multiplier ?? 2.0}x
                  </strong>{' '}
                  setiap hari{' '}
                  <strong className="text-neutral-900 dark:text-white">
                    {formatDaysOfWeek(settings.double_points_days)}
                  </strong>
                  .
                </>
              ) : (
                'Fitur pengganda poin mingguan sedang nonaktif. Aktifkan untuk mendongkrak omzet hari sepi.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-50 dark:border-amber-800 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
        >
          <IconSettings className="h-4 w-4" />
          <span>Atur Jadwal & Pengali</span>
        </button>
      </div>

      {/* 3. METRIK PENGGUNA & PERPUTARAN POIN */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Total Member Terdaftar</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <IconUsers className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics.totalMembersCount}
          </p>
          <Link
            href="/members"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <span>Kelola master member</span>
            <IconArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Pengguna App Kawan Bagus</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <IconDeviceMobile className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics.activeFcmDevicesCount}
          </p>
          <span className="mt-2 block text-xs text-neutral-400">
            Perangkat terhubung push FCM
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Saldo Poin Member Beredar</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <IconCoins className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {new Intl.NumberFormat('id-ID').format(metrics.totalPointsInCirculation)}
          </p>
          <span className="mt-2 block text-xs text-neutral-400">
            Akumulasi poin pelanggan toko
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Konfigurasi Member Tier</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <IconTrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">
            Bronze, Silver, Gold, Platinum
          </p>
          <Link
            href="/members/tiers"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <span>Sesuaikan level & diskon</span>
            <IconArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {isSettingsOpen && (
        <BudgetSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}
