'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { PointReward } from '@/lib/types/loyalty';
import {
  IconGift,
  IconUpload,
  IconPhoto,
  IconCoins,
  IconReceipt2,
  IconAlertCircle,
} from '@tabler/icons-react';
import Image from 'next/image';

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward?: PointReward | null;
  onSaved: () => void;
}

export default function RewardModal({
  isOpen,
  onClose,
  reward,
  onSaved,
}: RewardModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState<'voucher_discount' | 'product'>('voucher_discount');
  const [pointsRequired, setPointsRequired] = useState(10000);
  const [discountNominal, setDiscountNominal] = useState(10000);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState(30000);
  const [stock, setStock] = useState(100);
  const [maxClaimsPerMember, setMaxClaimsPerMember] = useState(1);
  const [validDays, setValidDays] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (reward) {
      setTitle(reward.title || '');
      setDescription(reward.description || '');
      setRewardType(reward.reward_type || 'voucher_discount');
      setPointsRequired(reward.points_required || 10000);
      setDiscountNominal(reward.discount_nominal || 0);
      setMinPurchaseAmount(reward.min_purchase_amount || 0);
      setStock(reward.stock ?? 100);
      setMaxClaimsPerMember(reward.max_claims_per_member ?? 1);
      setValidDays(reward.valid_days || 30);
      setIsActive(reward.is_active ?? true);
      setImageUrl(reward.image_url || '');
    } else {
      // Default new reward
      setTitle('');
      setDescription('');
      setRewardType('voucher_discount');
      setPointsRequired(10000);
      setDiscountNominal(10000);
      setMinPurchaseAmount(30000);
      setStock(100);
      setMaxClaimsPerMember(1);
      setValidDays(30);
      setIsActive(true);
      setImageUrl('');
    }
  }, [reward, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 3MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `reward_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('rewards')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('rewards').getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success('Foto reward berhasil diunggah!');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengunggah foto: ' + (err?.message || 'Error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Judul reward wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        reward_type: rewardType,
        points_required: Number(pointsRequired),
        discount_nominal: Number(discountNominal),
        min_purchase_amount: Number(minPurchaseAmount),
        stock: Number(stock),
        max_claims_per_member: Number(maxClaimsPerMember),
        valid_days: Number(validDays),
        is_active: isActive,
        image_url: imageUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (reward?.id) {
        const { error } = await supabase
          .from('point_rewards')
          .update(payload)
          .eq('id', reward.id);
        if (error) throw error;
        toast.success('Reward berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('point_rewards').insert(payload);
        if (error) throw error;
        toast.success('Reward baru berhasil dibuat!');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan reward: ' + (err?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={reward ? 'Edit Reward Poin' : 'Tambah Reward Poin Baru'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pt-1">
        {/* Foto Banner */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Foto / Banner Reward
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Reward banner"
                  className="h-full w-full object-cover"
                />
              ) : (
                <IconPhoto className="h-8 w-8 text-neutral-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                <IconUpload className="h-4 w-4" />
                <span>{uploadingImage ? 'Mengunggah...' : 'Pilih Foto dari Komputer'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Atau tempel link URL foto (https://...)"
                className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Judul & Tipe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Judul Reward <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Voucher Diskon Rp 25.000"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tipe Reward
            </label>
            <select
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="voucher_discount">Potongan Belanja</option>
              <option value="product">Produk Gratis</option>
            </select>
          </div>
        </div>

        {/* Deskripsi */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Deskripsi / Ketentuan Singkat
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Potongan langsung saat pembayaran kasir untuk semua kategori produk..."
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>

        {/* Poin, Diskon, Min Belanja */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Poin Penukaran <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                min="100"
                step="100"
                required
                value={pointsRequired}
                onChange={(e) => setPointsRequired(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-12 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-neutral-500">
                Poin
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nilai Diskon (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-neutral-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={discountNominal}
                onChange={(e) => setDiscountNominal(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Min. Belanja Kasir (Rp)
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-neutral-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="5000"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="50000"
              />
            </div>
          </div>
        </div>

        {/* Stok, Batas Klaim, Masa Aktif */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Kuota Stok Tersedia
            </label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <p className="mt-0.5 text-[11px] text-neutral-500">Otomatis -1 saat ditukar</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Maks. Klaim / Member
            </label>
            <input
              type="number"
              min="1"
              max="10"
              required
              value={maxClaimsPerMember}
              onChange={(e) => setMaxClaimsPerMember(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <p className="mt-0.5 text-[11px] text-neutral-500">Batas klaim per bulan</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Masa Berlaku Voucher
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                min="1"
                max="365"
                required
                value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-12 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-neutral-500">
                Hari
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500">Setelah voucher ditukar</p>
          </div>
        </div>

        {/* Toggle Status Aktif */}
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <div>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Status Reward Aktif
            </span>
            <p className="text-xs text-neutral-500">
              Tampilkan reward ini di katalog aplikasi mobile Kawan Bagus.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
        </div>

        {/* Buttons */}
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
            disabled={loading || uploadingImage}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : reward ? 'Simpan Perubahan' : 'Buat Reward'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
