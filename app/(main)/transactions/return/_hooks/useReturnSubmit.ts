'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  returnApi,
  AggregatedReturnItem,
  MetodeKompensasi,
} from '@/lib/api/return';
import { getLocalDateString } from '@/lib/utils';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { queryKeys } from '@/lib/queryKeys';
import { Supplier } from '@/lib/api/supplier';

export interface ReturnPreviewData {
  tanggal: string;
  supplierNama: string;
  supplierId: string;
  gudangId: string;
  metodeKompensasi: MetodeKompensasi;
  note: string;
  items: AggregatedReturnItem[];
  totalAmount: number;
  totalQty: number;
}

export interface ReturnSuccessModalData {
  returnId: string;
  total: number;
  itemCount: number;
  supplierNama: string;
}

interface UseReturnSubmitParams {
  selectedSupplier: Supplier | null;
  selectedGudangId: string;
  activeCartItems: AggregatedReturnItem[];
  metodeKompensasi: MetodeKompensasi;
  note: string;
  totalReturnAmount: number;
  totalReturnQty: number;
  setError: (msg: string | null) => void;
  clearAfterSubmit: () => void;
}

export function useReturnSubmit({
  selectedSupplier,
  selectedGudangId,
  activeCartItems,
  metodeKompensasi,
  note,
  totalReturnAmount,
  totalReturnQty,
  setError,
  clearAfterSubmit,
}: UseReturnSubmitParams) {
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ReturnPreviewData | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [successModalData, setSuccessModalData] = useState<ReturnSuccessModalData | null>(null);

  const handlePrepareSubmit = useCallback(() => {
    if (!selectedSupplier) {
      setError('Pilih supplier terlebih dahulu.');
      return;
    }
    if (activeCartItems.length === 0) {
      setError('Keranjang retur masih kosong.');
      return;
    }

    setError(null);
    setPreviewData({
      tanggal: getLocalDateString(),
      supplierNama: selectedSupplier.nama,
      supplierId: selectedSupplier.id,
      gudangId: selectedGudangId,
      metodeKompensasi,
      note,
      items: activeCartItems,
      totalAmount: totalReturnAmount,
      totalQty: totalReturnQty,
    });
    setShowPreview(true);
  }, [
    selectedSupplier,
    activeCartItems,
    selectedGudangId,
    metodeKompensasi,
    note,
    totalReturnAmount,
    totalReturnQty,
    setError,
  ]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!previewData || !selectedSupplier) return;
    setSubmitting(true);
    setError(null);

    const itemsPayload: { pembelian_item_id: string; inventory_id: string; qty: number }[] = [];
    previewData.items.forEach((item) => {
      item.batches.forEach((batch) => {
        if (batch.allocated_qty > 0) {
          itemsPayload.push({
            pembelian_item_id: batch.pembelian_item_id,
            inventory_id: item.inventory_id,
            qty: batch.allocated_qty,
          });
        }
      });
    });

    if (itemsPayload.length === 0) {
      setError('Tidak ada rincian nota yang valid untuk disimpan.');
      setSubmitting(false);
      return;
    }

    const kompensasiLabel =
      metodeKompensasi === 'potong_hutang'
        ? 'Potong Hutang'
        : metodeKompensasi === 'refund_kas'
          ? 'Refund Kas/Tunai'
          : 'Tukar Barang';

    const alasanSummary = previewData.items
      .map((i) => `${i.nama_barang} (${i.alasan})`)
      .join(', ');

    const fullNote = [
      `[Penyelesaian: ${kompensasiLabel}]`,
      `[Alasan: ${alasanSummary}]`,
      note ? `Catatan: ${note}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const result = await returnApi.submitBatchReturn({
        supplier_id: selectedSupplier.id,
        supplier_nama: selectedSupplier.nama,
        tanggal: previewData.tanggal,
        note: fullNote,
        gudang_id: selectedGudangId || undefined,
        items: itemsPayload,
      });

      if (result.error) {
        setError(result.error.message || 'Gagal menyimpan transaksi retur.');
      } else {
        const returnId = result.data as string;
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.returPembelianAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.pembelianAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

        clearAfterSubmit();
        setShowPreview(false);
        setSuccessModalData({
          returnId,
          total: totalReturnAmount,
          itemCount: totalReturnQty,
          supplierNama: selectedSupplier.nama,
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat menyimpan retur.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    previewData,
    selectedSupplier,
    selectedGudangId,
    metodeKompensasi,
    note,
    totalReturnAmount,
    totalReturnQty,
    queryClient,
    setError,
    clearAfterSubmit,
  ]);

  const handleExportPdf = useCallback(async (returnId: string) => {
    setExportingPdf(true);
    setPdfError(null);
    try {
      await downloadOrShareFile(
        `/api/export/inventory/return/${returnId}`,
        `Surat_Retur_${returnId.slice(0, 8)}.pdf`,
        'Surat Retur Barang',
      );
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : 'Gagal mengunduh Surat Retur PDF');
    } finally {
      setExportingPdf(false);
    }
  }, []);

  return {
    submitting,
    showPreview,
    setShowPreview,
    previewData,
    exportingPdf,
    pdfError,
    successModalData,
    setSuccessModalData,
    handlePrepareSubmit,
    handleConfirmSubmit,
    handleExportPdf,
  };
}
