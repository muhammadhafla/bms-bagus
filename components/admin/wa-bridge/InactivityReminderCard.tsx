'use client';

import React, { useState, useEffect } from 'react';
import { WaSettings } from '@/types/wa-bridge';
import {
  IconCalendarEvent,
  IconDeviceMobile,
  IconCheck,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconSend,
  IconRotateClockwise,
} from '@tabler/icons-react';

interface InactivityReminderCardProps {
  settings: WaSettings | null;
  isActionLoading: boolean;
  onUpdateSettings: (payload: Partial<WaSettings>) => Promise<void>;
  onResetDays: () => Promise<void>;
  onSendTest: (phone: string, text: string) => Promise<void>;
}

export function InactivityReminderCard({
  settings,
  isActionLoading,
  onUpdateSettings,
  onResetDays,
  onSendTest,
}: InactivityReminderCardProps) {
  const [enabled, setEnabled] = useState(settings?.enable_inactivity_reminder ?? true);
  const [intervalDays, setIntervalDays] = useState(settings?.inactivity_reminder_interval_days ?? 10);
  const [targetPhone, setTargetPhone] = useState(settings?.inactivity_reminder_phone ?? '');
  const [testPhone, setTestPhone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [daysSinceActive, setDaysSinceActive] = useState(0);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enable_inactivity_reminder);
      setIntervalDays(settings.inactivity_reminder_interval_days);
      setTargetPhone(settings.inactivity_reminder_phone || '');

      if (settings.last_phone_active_date) {
        const lastActive = new Date(settings.last_phone_active_date).getTime();
        const diffTime = Math.max(0, Date.now() - lastActive);
        setDaysSinceActive(Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        setDaysSinceActive(0);
      }
    }
  }, [settings]);

  const daysRemaining = Math.max(0, 14 - daysSinceActive);
  const isWarning = daysSinceActive >= intervalDays;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      enable_inactivity_reminder: enabled,
      inactivity_reminder_interval_days: Math.max(1, Math.min(13, Number(intervalDays))),
      inactivity_reminder_phone: targetPhone.trim() || null,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendTestMessage = async () => {
    const phone = testPhone.trim() || targetPhone.trim();
    if (!phone) {
      alert('Masukkan nomor HP penerima terlebih dahulu.');
      return;
    }
    await onSendTest(
      phone,
      `[BMS Test] Halo Owner! Ini adalah pengujian pengingat inaktivitas WhatsApp (Aturan 14 Hari). Sesi WhatsApp toko Anda saat ini aktif di hari ke-${daysSinceActive}.`
    );
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
            <IconCalendarEvent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Pengingat Inaktivitas HP (Aturan 14 Hari WhatsApp)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              WhatsApp memutuskan sesi pairing secara otomatis jika ponsel utama toko tidak dibuka selama 14 hari.
            </p>
          </div>
        </div>

        {/* Status Chip */}
        <div
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold ${
            isWarning
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
          }`}
        >
          {isWarning ? (
            <IconAlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <IconCheck className="h-4 w-4 text-emerald-600" />
          )}
          <span>
            {isWarning
              ? `Hari ke-${daysSinceActive}! Sisa ${daysRemaining} hari sebelum putus`
              : `Aman (Hari ke-${daysSinceActive} dari batas ${intervalDays} hari)`}
          </span>
        </div>
      </div>

      {/* Reset Days Action Box */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Sudah membuka aplikasi WhatsApp di ponsel toko?
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tekan tombol ini untuk mereset hitungan kalender ke Hari 0.
          </p>
        </div>
        <button
          onClick={onResetDays}
          disabled={isActionLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition"
        >
          <IconRotateClockwise className="h-3.5 w-3.5" />
          Saya Sudah Buka HP (Reset Hari 0)
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Status Pengingat Otomatis
          </label>
          <select
            value={enabled ? 'true' : 'false'}
            onChange={(e) => setEnabled(e.target.value === 'true')}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="true">Aktif (Kirim Alert & PWA Push)</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Interval Pengingat (Hari)
          </label>
          <input
            type="number"
            min={1}
            max={13}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <span className="text-[10px] text-neutral-400">Peringatan muncul jika tidak aktif ≥ {intervalDays} hari</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Nomor WA Owner / Penerima Alert
          </label>
          <input
            type="text"
            placeholder="6281234567890"
            value={targetPhone}
            onChange={(e) => setTargetPhone(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-mono"
          />
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
          >
            <IconDeviceFloppy className="h-4 w-4" />
            {isActionLoading ? 'Menyimpan...' : isSaved ? 'Tersimpan ✓' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}
