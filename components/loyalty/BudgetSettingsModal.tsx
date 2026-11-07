'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { LoyaltySettings } from '@/lib/types/loyalty';
import { IconCoins, IconLock, IconShieldCheck, IconAlertTriangle, IconFlame } from '@tabler/icons-react';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LoyaltySettings | null;
  onUpdated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

export default function BudgetSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdated,
}: BudgetSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [monthlyCap, setMonthlyCap] = useState(settings?.monthly_budget_cap ?? 3000000);
  const [maxActiveVouchers, setMaxActiveVouchers] = useState(
    settings?.max_active_vouchers_per_member ?? 2,
  );
  const [isLocked, setIsLocked] = useState(settings?.is_redemption_locked ?? false);
  const [doublePointsActive, setDoublePointsActive] = useState(
    settings?.double_points_active ?? false,
  );
  const [doublePointsDays, setDoublePointsDays] = useState<number[]>(
    settings?.double_points_days ?? [2, 3],
  );
  const [doublePointsMultiplier, setDoublePointsMultiplier] = useState(
    settings?.double_points_multiplier ?? 2.0,
  );

  const toggleDay = (dayVal: number) => {
    setDoublePointsDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal].sort(),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('loyalty_settings')
        .upsert({
          id: 'default',
          monthly_budget_cap: Number(monthlyCap),
          max_active_vouchers_per_member: Number(maxActiveVouchers),
          is_redemption_locked: isLocked,
          double_points_active: doublePointsActive,
          double_points_days: doublePointsDays,
          double_points_multiplier: Number(doublePointsMultiplier),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Pengaturan anggaran loyalitas berhasil disimpan!');
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan Anggaran & Pengaman Loyalitas">
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <IconAlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p>
              Plafon anggaran bulanan membatasi total nilai diskon voucher yang boleh beredar di aplikasi Kawan Bagus setiap bulannya. Jika terlampaui, sistem otomatis mengunci penukaran poin.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Plafon Anggaran Diskon Bulanan (Rp)
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-500">
              Rp
            </span>
            <input
              type="number"
              min="0"
              step="50000"
              required
              value={monthlyCap}
              onChange={(e) => setMonthlyCap(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-3 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              placeholder="3000000"
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Rekomendasi: Rp 2.000.000 - Rp 5.000.000 tergantung skala promosi toko.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Batas Maksimal Voucher Aktif per Member
          </label>
          <input
            type="number"
            min="1"
            max="10"
            required
            value={maxActiveVouchers}
            onChange={(e) => setMaxActiveVouchers(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Mencegah penimbunan (hoarding) voucher sebelum pelanggan benar-benar berbelanja di kasir.
          </p>
        </div>

        {/* PROMO DOUBLE POINTS DAY */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="flex items-center gap-1.5">
                <IconFlame className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Promo Pengganda Poin Mingguan (Double Points)
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                Otomatis melipatgandakan perolehan poin member yang berbelanja pada hari-hari pilihan.
              </p>
            </div>
            <input
              type="checkbox"
              checked={doublePointsActive}
              onChange={(e) => setDoublePointsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
          </label>

          {doublePointsActive && (
            <div className="mt-4 space-y-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Pilih Hari Aktif Promo:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = doublePointsDays.includes(day.value);
                    return (
                      <button
                        type="button"
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nilai Pengali Poin (Multiplier):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="10.0"
                    value={doublePointsMultiplier}
                    onChange={(e) => setDoublePointsMultiplier(Number(e.target.value))}
                    className="w-28 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                  <span className="text-xs text-neutral-500">kali lipat (contoh: 2.0x)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                Kunci Penukaran Poin (Emergency Lock)
              </span>
              <p className="text-xs text-neutral-500">
                Secara manual menjeda seluruh penukaran reward di aplikasi mobile pelanggan.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
