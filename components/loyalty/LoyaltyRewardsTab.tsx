'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PointReward } from '@/lib/types/loyalty';
import {
  IconPlus,
  IconGift,
  IconEdit,
  IconTrash,
  IconCoins,
  IconReceipt2,
  IconPhoto,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import RewardModal from './RewardModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface LoyaltyRewardsTabProps {
  rewards: PointReward[];
  onRefresh: () => void;
}

export default function LoyaltyRewardsTab({ rewards, onRefresh }: LoyaltyRewardsTabProps) {
  const [selectedReward, setSelectedReward] = useState<PointReward | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleToggleActive = async (reward: PointReward) => {
    setTogglingId(reward.id);
    try {
      const nextStatus = !reward.is_active;
      const { error } = await supabase
        .from('point_rewards')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', reward.id);

      if (error) throw error;
      toast.success(`Reward berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memperbarui status: ' + (err?.message || 'Error'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase
        .from('point_rewards')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;
      toast.success('Reward berhasil dihapus');
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghapus reward: ' + (err?.message || 'Error'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Aksi Tambah */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Katalog Reward & Kuota Penukaran Poin
          </h3>
          <p className="text-xs text-neutral-500">
            Kelola e-voucher diskon belanja dan barang gratis yang dapat ditukarkan member di aplikasi Kawan Bagus.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedReward(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          <span>Tambah Reward Baru</span>
        </button>
      </div>

      {/* Tabel Reward */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Poin Diperlukan</th>
                <th className="px-4 py-3">Nilai Diskon</th>
                <th className="px-4 py-3">Min. Belanja</th>
                <th className="px-4 py-3">Stok Kuota</th>
                <th className="px-4 py-3">Masa Berlaku</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {rewards.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
                    Belum ada reward yang dibuat. Klik tombol &quot;Tambah Reward Baru&quot; di atas.
                  </td>
                </tr>
              ) : (
                rewards.map((r) => {
                  const isOutOfStock = r.stock <= 0;
                  const isLowStock = r.stock > 0 && r.stock <= 10;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Banner + Judul */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 flex items-center justify-center">
                            {r.image_url ? (
                              <img
                                src={r.image_url}
                                alt={r.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <IconGift className="h-5 w-5 text-neutral-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                              {r.title}
                            </span>
                            {r.description && (
                              <p className="text-[11px] text-neutral-400 line-clamp-1 max-w-[200px]">
                                {r.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipe */}
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {r.reward_type === 'voucher_discount' ? 'Diskon Belanja' : 'Produk Gratis'}
                        </span>
                      </td>

                      {/* Poin Diperlukan */}
                      <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">
                        {new Intl.NumberFormat('id-ID').format(r.points_required)} Poin
                      </td>

                      {/* Nilai Diskon */}
                      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">
                        {formatRupiah(r.discount_nominal)}
                      </td>

                      {/* Min. Belanja */}
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                        {r.min_purchase_amount > 0 ? (
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {formatRupiah(r.min_purchase_amount)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Tanpa min. belanja</span>
                        )}
                      </td>

                      {/* Stok Kuota */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isOutOfStock ? 'Habis (0)' : `${r.stock} kuota`}
                        </span>
                      </td>

                      {/* Masa Berlaku */}
                      <td className="px-4 py-3 text-neutral-500">
                        {r.valid_days} Hari
                        <span className="block text-[10px] text-neutral-400">
                          Maks {r.max_claims_per_member}x / bln
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(r)}
                          disabled={togglingId === r.id}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            r.is_active ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              r.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedReward(r);
                              setIsModalOpen(true);
                            }}
                            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            title="Edit Reward"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(r.id)}
                            className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            title="Hapus Reward"
                          >
                            <IconTrash className="h-4 w-4" />
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <RewardModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedReward(null);
          }}
          reward={selectedReward}
          onSaved={onRefresh}
        />
      )}

      {/* Confirm Dialog Delete */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Reward Poin?"
        message="Reward yang dihapus tidak akan lagi tersedia di katalog aplikasi pelanggan. Voucher yang sudah telanjur diterbitkan member tetap dapat digunakan hingga masa berlakunya habis."
        confirmLabel="Hapus"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
