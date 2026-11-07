'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MemberVoucher } from '@/lib/types/loyalty';
import {
  IconSearch,
  IconBarcode,
  IconCheck,
  IconClock,
  IconX,
  IconCalendarPlus,
  IconCopy,
  IconExternalLink,
  IconFilter,
} from '@tabler/icons-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDateWIB } from '@/lib/utils';

interface LoyaltyVouchersTabProps {
  vouchers: MemberVoucher[];
  onRefresh: () => void;
}

export default function LoyaltyVouchersTab({
  vouchers,
  onRefresh,
}: LoyaltyVouchersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [selectedBarcodeVoucher, setSelectedBarcodeVoucher] = useState<MemberVoucher | null>(null);

  // Operational dialogs
  const [markUsedConfirmVoucher, setMarkUsedConfirmVoucher] = useState<MemberVoucher | null>(null);
  const [extendExpiryVoucher, setExtendExpiryVoucher] = useState<MemberVoucher | null>(null);
  const [extendDays, setExtendDays] = useState(14);
  const [actionLoading, setActionLoading] = useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Kode voucher ${text} disalin`);
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const isExpired = new Date(v.expires_at) < new Date();
      let actualStatus = v.status;
      if (actualStatus === 'active' && isExpired) {
        actualStatus = 'expired';
      }

      if (statusFilter !== 'all' && actualStatus !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = v.voucher_code.toLowerCase().includes(q);
        const memberName = v.members?.name?.toLowerCase() || '';
        const memberPhone = v.members?.whatsapp_number?.toLowerCase() || '';
        const titleMatch = v.title.toLowerCase().includes(q);
        return codeMatch || memberName.includes(q) || memberPhone.includes(q) || titleMatch;
      }

      return true;
    });
  }, [vouchers, statusFilter, searchQuery]);

  const handleMarkAsUsed = async () => {
    if (!markUsedConfirmVoucher) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('member_vouchers')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', markUsedConfirmVoucher.id);

      if (error) throw error;
      toast.success(`Voucher ${markUsedConfirmVoucher.voucher_code} berhasil ditandai TERPAKAI`);
      setMarkUsedConfirmVoucher(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memperbarui voucher: ' + (err?.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendExpiry = async () => {
    if (!extendExpiryVoucher) return;
    setActionLoading(true);
    try {
      const currentExpiry = new Date(extendExpiryVoucher.expires_at);
      const newExpiry = new Date(Math.max(Date.now(), currentExpiry.getTime()) + extendDays * 86400000);

      const { error } = await supabase
        .from('member_vouchers')
        .update({
          status: 'active',
          expires_at: newExpiry.toISOString(),
        })
        .eq('id', extendExpiryVoucher.id);

      if (error) throw error;
      toast.success(`Masa berlaku voucher berhasil diperpanjang hingga ${newExpiry.toLocaleDateString('id-ID')}`);
      setExtendExpiryVoucher(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memperpanjang masa aktif: ' + (err?.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header, Search & Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {(
            [
              { key: 'all', label: 'Semua Status' },
              { key: 'active', label: 'Aktif' },
              { key: 'used', label: 'Terpakai' },
              { key: 'expired', label: 'Kedaluwarsa' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                statusFilter === t.key
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode (KB-...), nama, no WA..."
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
      </div>

      {/* Tabel Voucher */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-3">Kode Voucher</th>
                <th className="px-4 py-3">Member Pemilik</th>
                <th className="px-4 py-3">Reward / Diskon</th>
                <th className="px-4 py-3">Min. Belanja</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Masa Berlaku</th>
                <th className="px-4 py-3">Tanggal Pakai</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    Tidak ada data voucher yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isExpired = new Date(v.expires_at) < new Date();
                  const isEffectiveActive = v.status === 'active' && !isExpired;
                  const isEffectiveExpired = v.status === 'active' && isExpired;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Kode Voucher */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                            {v.voucher_code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(v.voucher_code)}
                            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                            title="Salin Kode"
                          >
                            <IconCopy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Member */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-neutral-900 dark:text-white block">
                          {v.members?.name || 'Pelanggan'}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {v.members?.whatsapp_number || '-'}
                        </span>
                      </td>

                      {/* Diskon & Judul */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-neutral-900 dark:text-white block">
                          {formatRupiah(v.discount_nominal)}
                        </span>
                        <span className="text-[11px] text-neutral-400 line-clamp-1 max-w-[180px]">
                          {v.title}
                        </span>
                      </td>

                      {/* Min. Belanja */}
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                        {v.min_purchase_amount > 0 ? (
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {formatRupiah(v.min_purchase_amount)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {v.status === 'used' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            <IconCheck className="h-3 w-3" />
                            Terpakai
                          </span>
                        ) : isEffectiveExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            <IconClock className="h-3 w-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Masa Berlaku */}
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        <span>s/d {formatDateWIB(v.expires_at)}</span>
                      </td>

                      {/* Tanggal Pakai */}
                      <td className="px-4 py-3 text-neutral-500">
                        {v.used_at ? formatDateWIB(v.used_at) : '-'}
                      </td>

                      {/* Aksi Operasional */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Tombol Lihat Barcode */}
                          <button
                            onClick={() => setSelectedBarcodeVoucher(v)}
                            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                            title="Tampilkan Barcode Voucher"
                          >
                            <IconBarcode className="h-4 w-4" />
                          </button>

                          {/* Tombol Tandai Digunakan (hanya jika aktif) */}
                          {isEffectiveActive && (
                            <button
                              onClick={() => setMarkUsedConfirmVoucher(v)}
                              className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                              title="Tandai Terpakai di Kasir"
                            >
                              <IconCheck className="h-4 w-4" />
                            </button>
                          )}

                          {/* Tombol Perpanjang Masa Aktif */}
                          <button
                            onClick={() => setExtendExpiryVoucher(v)}
                            className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                            title="Perpanjang Masa Aktif"
                          >
                            <IconCalendarPlus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tampilan Barcode / Verifikasi Fisik */}
      {selectedBarcodeVoucher && (
        <Modal
          isOpen={!!selectedBarcodeVoucher}
          onClose={() => setSelectedBarcodeVoucher(null)}
          title="Verifikasi Kode Voucher Member"
        >
          <div className="space-y-4 py-2 text-center">
            <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-6 dark:border-brand-800 dark:bg-brand-950/30">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Kode E-Voucher Belanja
              </span>
              <p className="mt-2 font-mono text-2xl font-black tracking-widest text-brand-700 dark:text-brand-300">
                {selectedBarcodeVoucher.voucher_code}
              </p>
              <div className="mt-4 flex items-center justify-center">
                {/* Visual Barcode bars mockup */}
                <div className="flex h-16 items-center gap-[2px] bg-white p-3 rounded-lg shadow-xs dark:bg-neutral-800">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${
                        (i % 3 === 0 || i % 7 === 0) ? 'w-1 bg-black dark:bg-white' : 'w-0.5 bg-black dark:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3 text-left text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Reward:</span>
                <span className="font-semibold">{selectedBarcodeVoucher.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Potongan Diskon:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {formatRupiah(selectedBarcodeVoucher.discount_nominal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Min. Belanja Transaksi:</span>
                <span className="font-semibold">
                  {selectedBarcodeVoucher.min_purchase_amount > 0
                    ? formatRupiah(selectedBarcodeVoucher.min_purchase_amount)
                    : 'Tanpa batas'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Pemilik Akun:</span>
                <span className="font-semibold">
                  {selectedBarcodeVoucher.members?.name || 'Pelanggan'} ({selectedBarcodeVoucher.members?.whatsapp_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Masa Berlaku:</span>
                <span className="font-semibold">
                  s/d {formatDateWIB(selectedBarcodeVoucher.expires_at)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedBarcodeVoucher(null)}
                className="w-full rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dialog Konfirmasi Mark As Used */}
      {markUsedConfirmVoucher && (
        <ConfirmDialog
          isOpen={!!markUsedConfirmVoucher}
          title="Tandai Voucher Digunakan?"
          message={`Apakah Anda yakin ingin memvalidasi voucher "${markUsedConfirmVoucher.voucher_code}" (${formatRupiah(
            markUsedConfirmVoucher.discount_nominal,
          )}) sebagai telah terpakai oleh ${markUsedConfirmVoucher.members?.name}?`}
          confirmLabel="Ya, Tandai Terpakai"
          onConfirm={handleMarkAsUsed}
          onCancel={() => setMarkUsedConfirmVoucher(null)}
        />
      )}

      {/* Modal Perpanjang Masa Aktif */}
      {extendExpiryVoucher && (
        <Modal
          isOpen={!!extendExpiryVoucher}
          onClose={() => setExtendExpiryVoucher(null)}
          title="Perpanjang Masa Aktif Voucher"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Perpanjang masa aktif voucher <strong>{extendExpiryVoucher.voucher_code}</strong> milik{' '}
              <strong>{extendExpiryVoucher.members?.name}</strong>. Status voucher akan kembali menjadi aktif jika sebelumnya telah kedaluwarsa.
            </p>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tambah Masa Berlaku
              </label>
              <select
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value={7}>+ 7 Hari</option>
                <option value={14}>+ 14 Hari (2 Minggu)</option>
                <option value={30}>+ 30 Hari (1 Bulan)</option>
                <option value={60}>+ 60 Hari (2 Bulan)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setExtendExpiryVoucher(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExtendExpiry}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Perpanjang Sekarang'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
