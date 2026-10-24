'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TextInput, Modal } from '@/components/ui';

interface EditTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tierId: string;
  initialName: string;
  initialDiscount: number;
  initialMultiplier: number;
  initialMinPoints: number;
}

export default function EditTierModal({
  isOpen,
  onClose,
  onSuccess,
  tierId,
  initialName,
  initialDiscount,
  initialMultiplier,
  initialMinPoints,
}: EditTierModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    discount_percentage: number | string;
    point_multiplier: number | string;
    min_points_required: number | string;
  }>({
    discount_percentage: initialDiscount,
    point_multiplier: initialMultiplier,
    min_points_required: initialMinPoints,
  });

  useEffect(() => {
    setFormData({
      discount_percentage: initialDiscount,
      point_multiplier: initialMultiplier,
      min_points_required: initialMinPoints,
    });
  }, [initialDiscount, initialMultiplier, initialMinPoints, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('member_tiers')
        .update({
          discount_percentage: Number(formData.discount_percentage) || 0,
          point_multiplier: Number(formData.point_multiplier) || 0,
          min_points_required: Number(formData.min_points_required) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tierId);

      if (error) throw error;

      toast.success(`Tier ${initialName} berhasil diperbarui`);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memperbarui tier: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Tier ${initialName}`}
      size="md"
      isBottomSheetOnMobile={true}
    >
      <p className="-mt-2 mb-6 text-sm text-neutral-500">
        Ubah persentase diskon dan pengali poin untuk tier ini.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput
          label="Persentase Diskon (%)"
          type="number"
          step="0.01"
          min="0"
          required
          value={formData.discount_percentage}
          placeholder="0"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = e.target.value;
            setFormData({
              ...formData,
              discount_percentage: val === '' ? '' : parseFloat(val) || 0,
            });
          }}
          onBlur={() => {
            if (formData.discount_percentage === '' || formData.discount_percentage === null) {
              setFormData((prev) => ({ ...prev, discount_percentage: 0 }));
            }
          }}
        />

        <TextInput
          label="Pengali Poin (Multiplier)"
          type="number"
          step="0.01"
          min="0"
          required
          value={formData.point_multiplier}
          placeholder="1"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = e.target.value;
            setFormData({
              ...formData,
              point_multiplier: val === '' ? '' : parseFloat(val) || 0,
            });
          }}
          onBlur={() => {
            if (formData.point_multiplier === '' || formData.point_multiplier === null) {
              setFormData((prev) => ({ ...prev, point_multiplier: 0 }));
            }
          }}
          helperText="Misal: 1.5 untuk 1,5x lipat poin."
        />

        <TextInput
          label="Minimal Poin (Syarat Upgrade)"
          type="number"
          min="0"
          required
          value={formData.min_points_required}
          placeholder="0"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = e.target.value;
            setFormData({
              ...formData,
              min_points_required: val === '' ? '' : parseInt(val, 10) || 0,
            });
          }}
          onBlur={() => {
            if (formData.min_points_required === '' || formData.min_points_required === null) {
              setFormData((prev) => ({ ...prev, min_points_required: 0 }));
            }
          }}
        />

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-2.5 font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
