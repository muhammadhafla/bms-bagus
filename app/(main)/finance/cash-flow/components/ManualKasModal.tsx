'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import SelectInput from '@/components/ui/SelectInput';
import { PriceInput } from '@/components/ui/PriceInput';
import TextareaInput from '@/components/ui/TextareaInput';
import { kasApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';

interface ManualKasModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'SETOR' | 'TARIK';
}

export function ManualKasModal({ isOpen, onClose, defaultType = 'SETOR' }: ManualKasModalProps) {
  const [tipe, setTipe] = useState<'SETOR' | 'TARIK'>(defaultType);
  const [jumlah, setJumlah] = useState<number | null>(null);
  const [catatan, setCatatan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when opened with new type
  React.useEffect(() => {
    if (isOpen) {
      setTipe(defaultType);
      setJumlah(null);
      setCatatan('');
      setPaymentMethod('CASH');
    }
  }, [isOpen, defaultType]);

  const mutation = useMutation({
    mutationFn: kasApi.addManualEntry,
    onSuccess: (res) => {
      if (res.error) {
        showToast(res.error.message, 'error');
        return;
      }
      showToast('Pencatatan kas berhasil', 'success');
      queryClient.invalidateQueries({ queryKey: ['kas_log'] });
      queryClient.invalidateQueries({ queryKey: ['shift_balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || 'Terjadi kesalahan', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah || jumlah <= 0) {
      showToast('Jumlah harus lebih dari 0', 'error');
      return;
    }
    
    mutation.mutate({
      tipe,
      jumlah,
      catatan,
      payment_method: paymentMethod,
    });
  };

  const isSubmitting = mutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Catat ${tipe === 'SETOR' ? 'Pemasukan' : 'Pengeluaran'} Manual`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <SelectInput
          label="Tipe Kas"
          value={tipe}
          onChange={(val) => setTipe(val as 'SETOR' | 'TARIK')}
          options={[
            { label: 'Pemasukan (SETOR)', value: 'SETOR' },
            { label: 'Pengeluaran (TARIK)', value: 'TARIK' }
          ]}
          required
        />

        <PriceInput
          label="Nominal (Rp)"
          value={jumlah || 0}
          onChange={setJumlah}
          placeholder="0"
        />

        <SelectInput
          label="Metode Pembayaran"
          value={paymentMethod}
          onChange={(val) => setPaymentMethod(val)}
          options={[
            { label: 'CASH (Tunai)', value: 'CASH' },
            { label: 'QRIS', value: 'QRIS' },
            { label: 'TRANSFER', value: 'TRANSFER' }
          ]}
          required
        />

        <TextareaInput
          label="Catatan / Keterangan"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Misal: Uang kebersihan bulanan"
          rows={3}
          required={tipe === 'TARIK'} // Pengeluaran wajib ada catatan
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className={tipe === 'SETOR' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>

      </form>
    </Modal>
  );
}
