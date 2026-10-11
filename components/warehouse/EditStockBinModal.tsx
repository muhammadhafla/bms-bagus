'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, TextInput, Button } from '@/components/ui';
import { warehouseStockApi } from '@/lib/api/warehouse';
import { WarehouseItemStock } from '@/types/warehouse';

export interface EditStockBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WarehouseItemStock | null;
  activeGudangId: string;
  activeGudangKode?: string;
  canEditThresholds: boolean;
  onSuccess?: () => void;
}

export default function EditStockBinModal({
  isOpen,
  onClose,
  item,
  activeGudangId,
  activeGudangKode,
  canEditThresholds,
  onSuccess,
}: EditStockBinModalProps) {
  const [rakLokasi, setRakLokasi] = useState('');
  const [minStok, setMinStok] = useState<number>(0);
  const [maxStok, setMaxStok] = useState<string>('');

  useEffect(() => {
    if (item) {
      setRakLokasi(item.rak_lokasi || '');
      setMinStok(item.min_stok || 0);
      setMaxStok(item.max_stok ? String(item.max_stok) : '');
    }
  }, [item]);

  const updateBinMutation = useMutation({
    mutationFn: async () => {
      if (!item || !activeGudangId) return;
      const res = await warehouseStockApi.updateStockBin(item.inventory_id, activeGudangId, {
        rak_lokasi: rakLokasi.trim() || null,
        min_stok: Number(minStok) || 0,
        max_stok: maxStok ? Number(maxStok) : null,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Lokasi rak & batas stok berhasil diperbarui');
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    },
  });

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen && !!item}
      onClose={onClose}
      title={`Atur Rak & Batas Stok - ${activeGudangKode || ''}`}
      isFullScreenOnMobile
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">
            {item.nama_barang}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="font-mono">Barcode: {item.kode_barcode}</span>
            <span>•</span>
            <span>
              Stok Saat Ini:{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {item.stok_gudang} {item.unit || 'pcs'}
              </strong>
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="input-rak-lokasi" className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Posisi Rak / Bin (Contoh: Rak A-02-B, Bin 12):
          </label>
          <TextInput
            id="input-rak-lokasi"
            value={rakLokasi}
            onChange={(e) => setRakLokasi(e.target.value)}
            placeholder="Masukkan kode rak atau bin..."
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="input-min-stok" className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Stok Minimum (Alert Peringatan):
            </label>
            <TextInput
              id="input-min-stok"
              type="number"
              value={String(minStok)}
              onChange={(e) => setMinStok(Number(e.target.value))}
              placeholder="0"
              disabled={!canEditThresholds}
            />
          </div>
          <div>
            <label htmlFor="input-max-stok" className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Stok Maksimum (Kapasitas Rak):
            </label>
            <TextInput
              id="input-max-stok"
              type="number"
              value={maxStok}
              onChange={(e) => setMaxStok(e.target.value)}
              placeholder="Opsional"
              disabled={!canEditThresholds}
            />
          </div>
          {!canEditThresholds && (
            <p className="col-span-2 text-[11px] text-amber-600 dark:text-amber-400">
              * Batas stok minimum dan maksimum hanya dapat diubah oleh Admin atau Kepala Gudang.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={updateBinMutation.isPending}
            onClick={() => updateBinMutation.mutate()}
          >
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
