'use client';

import React, { useState, useEffect } from 'react';
import { IconSparkles, IconDeviceMobile, IconDeviceFloppy, IconInfoCircle } from '@tabler/icons-react';

interface PromoFooterCardProps {
  currentFooter: string;
  isActionLoading: boolean;
  onSaveFooter: (text: string) => Promise<void>;
}

export function PromoFooterCard({
  currentFooter,
  isActionLoading,
  onSaveFooter,
}: PromoFooterCardProps) {
  const [footerText, setFooterText] = useState(currentFooter || '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setFooterText(currentFooter || '');
  }, [currentFooter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveFooter(footerText.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Input Form */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <IconSparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Footer Promosi Dinamis untuk Struk WhatsApp
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pesan ini otomatis ditempelkan di bagian bawah struk belanja pelanggan dari semua cabang.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Teks Catatan Kaki / Promo Berjalan
              </label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Contoh: 🎉 Promo Gajian: Tunjukkan struk ini di kunjungan berikutnya untuk diskon 15%! Follow IG kami @toko.bms"
                rows={4}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 dark:placeholder:text-neutral-500 transition"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Mendukung emoji WhatsApp. Kosongkan jika tidak ingin menambahkan catatan kaki promosi.
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <IconInfoCircle className="h-4 w-4 text-neutral-400" />
                <span>Diinjeksi otomatis oleh Supabase tanpa perlu restart POS kasir.</span>
              </div>

              <button
                type="submit"
                disabled={isActionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
              >
                <IconDeviceFloppy className="h-4 w-4" />
                {isActionLoading ? 'Menyimpan...' : isSaved ? 'Tersimpan ✓' : 'Simpan Footer'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Simulated WhatsApp Chat Bubble Preview */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
            Pratinjau di Layar Pelanggan:
          </span>

          <div className="rounded-2xl border border-neutral-200 bg-[#EFEAE2] p-3 shadow-inner dark:border-neutral-700 dark:bg-neutral-950">
            <div className="rounded-xl bg-white p-3 text-xs shadow-sm dark:bg-[#1F2C34] text-neutral-800 dark:text-neutral-200 space-y-2">
              <div className="border-b border-dashed border-neutral-200 dark:border-neutral-700 pb-2">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">🧾 Struk Belanja Digital</p>
                <p className="text-[11px] text-neutral-500">Halo Kak Budi, terima kasih sudah berbelanja!</p>
                <p className="text-[11px] font-mono mt-1">No: TRX-20261102-001</p>
                <p className="text-[11px]">Total: Rp 150.000 (Tunai)</p>
              </div>

              {/* Dynamic Footer Section */}
              {footerText.trim() ? (
                <div className="pt-1 text-[11px] leading-relaxed text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg border border-purple-200 dark:border-purple-900/40">
                  <span className="font-semibold block mb-0.5">📢 Info & Promo Toko:</span>
                  <p className="whitespace-pre-wrap">{footerText}</p>
                </div>
              ) : (
                <p className="text-[10px] italic text-neutral-400 pt-1">
                  (Tidak ada footer promosi aktif)
                </p>
              )}

              <div className="flex justify-end pt-1 text-[10px] text-neutral-400">
                10:35 ✓✓
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
