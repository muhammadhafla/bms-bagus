'use client';

import React, { useState } from 'react';
import { IconSend, IconX, IconBrandWhatsapp } from '@tabler/icons-react';

interface TestMessageModalProps {
  isOpen: boolean;
  isActionLoading: boolean;
  onClose: () => void;
  onSend: (phone: string, text: string) => Promise<void>;
}

export function TestMessageModal({
  isOpen,
  isActionLoading,
  onClose,
  onSend,
}: TestMessageModalProps) {
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('Halo! Ini adalah pesan pengujian dari BMS Web App WhatsApp Bridge.');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      alert('Masukkan nomor HP penerima');
      return;
    }
    await onSend(phone.trim(), text.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <IconBrandWhatsapp className="h-5 w-5 text-emerald-600" />
            <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
              Kirim Pesan Uji Coba WhatsApp
            </h4>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Nomor WhatsApp Tujuan
            </label>
            <input
              type="tel"
              placeholder="Contoh: 6281234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Isi Pesan Uji Coba
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none justify-center rounded-xl px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 active:scale-95 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition"
            >
              <IconSend className="h-4 w-4" />
              {isActionLoading ? 'Mengirim...' : 'Kirim Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
