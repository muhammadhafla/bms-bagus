'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TextInput, SelectInput, Modal } from '@/components/ui';

interface Tier {
  id: string;
  name: string;
}

interface Member {
  id?: string;
  whatsapp_number: string;
  name: string;
  points: number;
  tier_id: string;
  prefer_digital_receipt: boolean;
}

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Member; // If undefined, it's CREATE mode
}

export default function MemberModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: MemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  
  const [formData, setFormData] = useState<Member>({
    whatsapp_number: '',
    name: '',
    points: 0,
    tier_id: '',
    prefer_digital_receipt: false,
  });

  const isEditMode = !!initialData?.id;

  const fetchTiers = useCallback(async () => {
    const { data, error } = await supabase
      .from('member_tiers')
      .select('id, name')
      .order('min_points_required', { ascending: true });
      
    if (!error && data) {
      setTiers(data);
      // Auto-select first tier if creating new
      if (!initialData && data.length > 0) {
        setFormData(prev => {
          if (!prev.tier_id) {
            return { ...prev, tier_id: data[0].id };
          }
          return prev;
        });
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      fetchTiers();
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({
          whatsapp_number: '',
          name: '',
          points: 0,
          tier_id: '',
          prefer_digital_receipt: false,
        });
      }
    }
  }, [isOpen, initialData, fetchTiers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('members')
          .update({
            whatsapp_number: formData.whatsapp_number,
            name: formData.name,
            points: formData.points,
            tier_id: formData.tier_id,
            prefer_digital_receipt: formData.prefer_digital_receipt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success(`Member ${formData.name} berhasil diperbarui`);
      } else {
        const { error } = await supabase
          .from('members')
          .insert({
            whatsapp_number: formData.whatsapp_number,
            name: formData.name,
            points: formData.points, // Biasanya 0 saat daftar, tapi admin bisa set
            tier_id: formData.tier_id,
            prefer_digital_receipt: formData.prefer_digital_receipt,
          });
        if (error) throw error;
        toast.success(`Member ${formData.name} berhasil didaftarkan`);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Member' : 'Daftar Member Baru'}
      size="lg"
      isBottomSheetOnMobile={true}
    >
      <p className="text-sm text-neutral-500 mb-6 -mt-2">
        Lengkapi data pelanggan di bawah ini.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Nama Lengkap"
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
            />

            <TextInput
              label="Nomor WhatsApp"
              type="text"
              required
              value={formData.whatsapp_number}
              onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="Contoh: 081234567890"
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectInput
                label="Tingkat (Tier)"
                required
                value={formData.tier_id}
                onChange={value => setFormData({ ...formData, tier_id: value })}
                options={tiers.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Pilih Tier..."
              />

              <TextInput
                label="Saldo Poin"
                type="number"
                required
                value={formData.points}
                onChange={e => setFormData({ ...formData, points: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <label className="flex items-center gap-3 p-3 mt-2 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.prefer_digital_receipt}
                onChange={e => setFormData({ ...formData, prefer_digital_receipt: e.target.checked })}
                className="w-5 h-5 text-brand-500 rounded focus:ring-brand-500"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                Kirim Struk Digital via WhatsApp
              </span>
            </label>

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
                  isEditMode ? 'Simpan Perubahan' : 'Daftarkan Member'
                )}
              </button>
            </div>
      </form>
    </Modal>
  );
}
