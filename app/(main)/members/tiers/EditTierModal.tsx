'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TextInput } from '@/components/ui';

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
  const [formData, setFormData] = useState({
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
          discount_percentage: formData.discount_percentage,
          point_multiplier: formData.point_multiplier,
          min_points_required: formData.min_points_required,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
            Edit Tier {initialName}
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            Ubah persentase diskon dan pengali poin untuk tier ini.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <TextInput
              label="Persentase Diskon (%)"
              type="number"
              step="0.01"
              required
              value={formData.discount_percentage}
              onChange={e => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
            />

            <TextInput
              label="Pengali Poin (Multiplier)"
              type="number"
              step="0.01"
              required
              value={formData.point_multiplier}
              onChange={e => setFormData({ ...formData, point_multiplier: parseFloat(e.target.value) || 0 })}
              helperText="Misal: 1.5 untuk 1,5x lipat poin."
            />

            <TextInput
              label="Minimal Poin (Syarat Upgrade)"
              type="number"
              required
              value={formData.min_points_required}
              onChange={e => setFormData({ ...formData, min_points_required: parseInt(e.target.value) || 0 })}
            />

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
