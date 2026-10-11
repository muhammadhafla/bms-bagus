'use client';

import React, { useState, useEffect } from 'react';
import { IconPrinter } from '@tabler/icons-react';
import { Modal } from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import SelectInput from '@/components/ui/SelectInput';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { fetchApi } from '@/lib/fetchApi';
import { toast } from 'sonner';
import { InventoryItem } from '@/types/inventory';

export interface InventoryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  nested?: boolean;
}

export default function InventoryPrintModal({
  isOpen,
  onClose,
  item,
  nested,
}: InventoryPrintModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [printForm, setPrintForm] = useState({ template_id: '', qty: 1 });
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setPrintForm({ template_id: '', qty: 1 });
      const loadTemplates = async () => {
        try {
          const res = await fetchApi('/api/templates');
          const data = await res.json();
          if (data.templates) {
            setTemplates(data.templates);
            if (data.templates.length > 0) {
              setPrintForm((prev) => ({ ...prev, template_id: data.templates[0].id }));
            }
          }
        } catch (err) {
          console.error('Error fetching templates', err);
        }
      };
      loadTemplates();
    }
  }, [isOpen, item]);

  const handlePrintSubmit = async () => {
    if (!item || !printForm.template_id) return;
    setIsPrinting(true);
    try {
      // Harga akhir setelah diskon
      const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);

      const itemData = {
        name: item.nama_barang,
        price: formatCurrency(finalPrice),
        barcode: item.kode_barcode,
      };
      const payload_json = Array(printForm.qty).fill(itemData);

      const res = await fetchApi('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: printForm.template_id,
          payload_json,
        }),
      });

      if (res.ok) {
        toast.success('Antrean cetak berhasil dibuat');
        onClose();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Gagal membuat antrean cetak');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen && !!item}
      onClose={onClose}
      title="Cetak Label"
      size="sm"
      isBottomSheetOnMobile
      nested={nested}
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Cetak label untuk <strong>{item.nama_barang}</strong>
        </p>

        <SelectInput
          label="Template Label"
          value={printForm.template_id}
          onChange={(val) => setPrintForm((prev) => ({ ...prev, template_id: val }))}
          options={templates.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="Pilih template"
        />

        <TextInput
          label="Jumlah (Qty)"
          type="number"
          min={1}
          value={printForm.qty === 0 ? '' : printForm.qty}
          placeholder="1"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = e.target.value;
            setPrintForm((prev) => ({
              ...prev,
              qty: val === '' ? 0 : Math.max(1, parseInt(val, 10) || 1),
            }));
          }}
          onBlur={() => {
            if (!printForm.qty || printForm.qty < 1) {
              setPrintForm((prev) => ({ ...prev, qty: 1 }));
            }
          }}
          required
        />

        <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handlePrintSubmit}
            disabled={isPrinting || !printForm.template_id}
            className="flex-1"
            leftIcon={<IconPrinter size={18} />}
          >
            {isPrinting ? 'Memproses...' : 'Cetak'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
