'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  IconTruckDelivery,
  IconArrowLeft,
  IconPrinter,
  IconPlus,
  IconHistory,
  IconCheck,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Button,
  Modal,
  ConfirmDialog,
  TextInput,
  SelectInput,
} from '@/components/ui';
import DateInput from '@/components/ui/DateInput';
import { gudangApi, transferStokApi } from '@/lib/api/warehouse';
import { inventoryApi } from '@/lib/api';
import { supabase } from '@/lib/api/client';
import { Gudang, TransferStok } from '@/types/warehouse';
import { useAuthStore } from '@/lib/auth';
import { useTransferStore } from '@/lib/store/useTransferStore';
import { WarehouseBarcodeSearch, WarehouseBarcodeSearchRef, WarehouseSearchResultItem } from '@/components/warehouse/WarehouseBarcodeSearch';
import { TransferItemCart } from '@/components/warehouse/TransferItemCart';
import { TransferCheckoutPanel } from '@/components/warehouse/TransferCheckoutPanel';
import { useTransferShortcuts } from '@/components/warehouse/useTransferShortcuts';
import { useTransferTableNavigation } from '@/components/warehouse/useTransferTableNavigation';
import { generateSuratJalanPDF } from '@/lib/warehouse-pdf-utils';

export default function NewTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      }
    >
      <NewTransferContent />
    </Suspense>
  );
}

function NewTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const paramAsal = searchParams.get('asal');
  const paramBarcode = searchParams.get('itemBarcode');
  const initialParamsHandledRef = useRef(false);

  const searchRef = useRef<WarehouseBarcodeSearchRef>(null);
  const focusSearchInput = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  // Zustand Store
  const {
    items,
    gudangAsalId,
    gudangTujuanId,
    kurir,
    catatan,
    tanggalKirim,
    highlightedItemId,
    setGudangAsalId,
    setGudangTujuanId,
    setKurir,
    setCatatan,
    setTanggalKirim,
    setHighlightedItemId,
    addItem,
    updateQty,
    updateCatatan,
    removeItem,
    reset,
    clearItemsOnly,
    getTotalItems,
    getTotalQty,
  } = useTransferStore();

  // Local state for modals & confirmations
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingGudangAsalId, setPendingGudangAsalId] = useState<string | null>(null);
  const [showWarehouseChangeConfirm, setShowWarehouseChangeConfirm] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState<TransferStok | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch Gudang List
  const { data: gudangRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });
  const gudangList: Gudang[] = useMemo(() => gudangRes?.data || [], [gudangRes?.data]);

  // Set default warehouses or handle URL params
  useEffect(() => {
    if (gudangList.length >= 2) {
      if (paramAsal && gudangList.some((g) => g.id === paramAsal)) {
        setGudangAsalId(paramAsal);
        if (!gudangTujuanId || gudangTujuanId === paramAsal) {
          const other = gudangList.find((g) => g.id !== paramAsal);
          if (other) setGudangTujuanId(other.id);
        }
      } else if (!gudangAsalId && !gudangTujuanId) {
        const def = gudangList.find((g) => g.is_default) || gudangList[0];
        const other = gudangList.find((g) => g.id !== def.id) || gudangList[1];
        setGudangAsalId(def.id);
        setGudangTujuanId(other?.id || '');
      }
    }
  }, [gudangList, gudangAsalId, gudangTujuanId, paramAsal, setGudangAsalId, setGudangTujuanId]);

  // Handle auto-adding item from barcode param
  useEffect(() => {
    if (paramBarcode && gudangAsalId && !initialParamsHandledRef.current) {
      initialParamsHandledRef.current = true;
      inventoryApi.getByExactBarcode(paramBarcode).then(async (res) => {
        if (res.data && !res.data.is_discontinued) {
          const item = res.data;
          const { data: stockData } = await supabase
            .from('inventory_stocks')
            .select('stok, rak_lokasi')
            .eq('gudang_id', gudangAsalId)
            .eq('inventory_id', item.id)
            .maybeSingle();

          addItem({
            inventory_id: item.id,
            nama_barang: item.nama_barang,
            kode_barcode: item.kode_barcode || '',
            unit: item.unit || 'pcs',
            stok_tersedia: stockData?.stok || 0,
            rak_lokasi: stockData?.rak_lokasi || null,
          });
        }
      });
    }
  }, [paramBarcode, gudangAsalId, addItem]);

  // Clear highlighted item after animation
  useEffect(() => {
    if (highlightedItemId) {
      const timer = setTimeout(() => {
        setHighlightedItemId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId, setHighlightedItemId]);

  // Handle warehouse origin change with confirmation
  const handleOriginWarehouseChange = (newGudangId: string) => {
    if (newGudangId === gudangAsalId) return;

    if (items.length > 0) {
      setPendingGudangAsalId(newGudangId);
      setShowWarehouseChangeConfirm(true);
    } else {
      setGudangAsalId(newGudangId);
      if (gudangTujuanId === newGudangId) {
        const other = gudangList.find((g) => g.id !== newGudangId);
        if (other) setGudangTujuanId(other.id);
      }
    }
  };

  const confirmWarehouseChange = () => {
    if (pendingGudangAsalId) {
      clearItemsOnly();
      setGudangAsalId(pendingGudangAsalId);
      if (gudangTujuanId === pendingGudangAsalId) {
        const other = gudangList.find((g) => g.id !== pendingGudangAsalId);
        if (other) setGudangTujuanId(other.id);
      }
      toast.info('Gudang asal diubah. Daftar barang telah dikosongkan.');
    }
    setPendingGudangAsalId(null);
    setShowWarehouseChangeConfirm(false);
    focusSearchInput();
  };

  // Handle item selected from search
  const handleItemSelected = (item: WarehouseSearchResultItem) => {
    if (!gudangAsalId) {
      toast.error('Pilih gudang asal terlebih dahulu');
      return;
    }

    const result = addItem({
      inventory_id: item.inventory_id,
      nama_barang: item.nama_barang,
      kode_barcode: item.kode_barcode,
      unit: item.unit,
      stok_tersedia: item.stok_tersedia,
      rak_lokasi: item.rak_lokasi,
    });

    if (result.added) {
      if (result.isIncremented) {
        toast.info(`Qty ${item.nama_barang} ditambah (+1)`);
      }
    } else if (result.message) {
      toast.error(result.message);
    }

    focusSearchInput();
  };

  // Table Navigation
  const {
    selectedIndex,
    setSelectedIndex,
    editMode,
    setEditMode,
    editValue,
    setEditValue,
    handleEditSubmit,
    handleEditKeyDown,
  } = useTransferTableNavigation({
    items,
    onRemoveItem: removeItem,
    onUpdateQty: updateQty,
    onUpdateCatatan: updateCatatan,
    focusInput: focusSearchInput,
  });

  // Submit Mutation
  const submitTransfer = async (autoKirim: boolean) => {
    if (!gudangAsalId || !gudangTujuanId) {
      toast.error('Pilih gudang asal dan gudang tujuan');
      return;
    }
    if (gudangAsalId === gudangTujuanId) {
      toast.error('Gudang asal dan tujuan tidak boleh sama');
      return;
    }
    if (items.length === 0) {
      toast.error('Daftar barang kirim tidak boleh kosong');
      return;
    }

    // Double check stock availability
    for (const item of items) {
      if (item.qty_kirim > item.stok_tersedia) {
        toast.error(
          `Stok untuk ${item.nama_barang} tidak mencukupi (Tersedia: ${item.stok_tersedia}, Diminta: ${item.qty_kirim})`,
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        gudang_asal_id: gudangAsalId,
        gudang_tujuan_id: gudangTujuanId,
        kurir_pengirim: kurir || null,
        catatan: catatan || null,
        autoKirim,
        items: items.map((ci) => ({
          inventory_id: ci.inventory_id,
          qty_kirim: ci.qty_kirim,
          catatan: ci.catatan || null,
        })),
      };

      const res = await transferStokApi.create(payload, user?.id);
      if (res.error) throw res.error;

      // Fetch full transfer for PDF generation
      const fullRes = await transferStokApi.getById(res.data!.id);
      const transferDoc = fullRes.data || res.data!;
      setCreatedTransfer(transferDoc);

      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });

      toast.success(
        autoKirim
          ? 'Transfer berhasil dibuat dan langsung berstatus IN_TRANSIT'
          : 'Draft transfer berhasil disimpan',
      );

      setIsBottomSheetOpen(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat transfer stok');
    } finally {
      setSubmitting(false);
    }
  };

  const isAnyModalOpen =
    showResetConfirm ||
    showWarehouseChangeConfirm ||
    showSuccessModal ||
    isBottomSheetOpen;

  // Shortcuts hook
  useTransferShortcuts({
    items,
    setSelectedIndex,
    setEditMode,
    setEditValue,
    removeItem,
    selectedIndex,
    setShowResetConfirm,
    handleSimpan: () => submitTransfer(true),
    submitting,
    enabled: !isAnyModalOpen,
  });

  const gudangAsalNama =
    gudangList.find((g) => g.id === gudangAsalId)?.nama || 'Pilih Gudang Asal';
  const gudangTujuanNama =
    gudangList.find((g) => g.id === gudangTujuanId)?.nama || 'Pilih Gudang Tujuan';

  return (
    <AmbientLayout>
      <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)]">
        {/* Header Section */}
        <div className="mb-4 flex-shrink-0 lg:mb-5">
          {/* Top Row: Back button, Title & Form header */}
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 pl-1 lg:gap-4 lg:pl-0">
              <button
                onClick={() => router.push('/warehouse/transfers')}
                className="-ml-2 rounded-2xl p-2 text-neutral-600 transition-all hover:bg-neutral-100 active:scale-95 lg:p-2.5 dark:text-neutral-400 dark:hover:bg-neutral-800"
                title="Kembali ke Daftar Transfer"
              >
                <IconArrowLeft className="h-6 w-6" />
              </button>
              <div className="rounded-2xl bg-brand-500/10 p-2 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
                <IconTruckDelivery className="h-6 w-6 lg:h-7 lg:w-7" stroke={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-2xl dark:text-white">
                  Transfer Stok Antar Gudang
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Buat surat jalan & mutasi logistik persediaan antar cabang
                </p>
              </div>
            </div>

            {/* Desktop Quick Header Inputs: Kurir & Tanggal */}
            <div className="hidden items-end gap-3 xl:flex">
              <div className="w-44">
                <DateInput
                  label="Tanggal:"
                  value={tanggalKirim}
                  onChange={setTanggalKirim}
                  inputSize="md"
                />
              </div>
              <div className="w-56">
                <TextInput
                  label="Kurir / Armada:"
                  value={kurir}
                  onChange={(e) => setKurir(e.target.value)}
                  placeholder="Contoh: Pak Budi / Pickup"
                  inputSize="md"
                />
              </div>
            </div>
          </div>

          {/* Form Filter Row: Gudang Asal, Gudang Tujuan, Barcode Search */}
          <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-3">
              <SelectInput
                label="Gudang Asal (Pengirim)"
                value={gudangAsalId}
                onChange={handleOriginWarehouseChange}
                options={gudangList.map((g) => ({
                  value: g.id,
                  label: `${g.nama} (${g.kode_gudang})`,
                }))}
                placeholder="-- Pilih Gudang Asal --"
              />
            </div>

            <div className="lg:col-span-3">
              <SelectInput
                label="Gudang Tujuan (Penerima)"
                value={gudangTujuanId}
                onChange={setGudangTujuanId}
                options={gudangList
                  .filter((g) => g.id !== gudangAsalId)
                  .map((g) => ({
                    value: g.id,
                    label: `${g.nama} (${g.kode_gudang})`,
                  }))}
                placeholder="-- Pilih Gudang Tujuan --"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-6">
              <WarehouseBarcodeSearch
                ref={searchRef}
                gudangAsalId={gudangAsalId}
                onItemSelected={handleItemSelected}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Main Cart Table Area */}
        <div className="shadow-elevated mb-5 flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:min-h-0 dark:border-white/10 dark:bg-neutral-900/60">
          <TransferItemCart
            items={items}
            selectedIndex={selectedIndex}
            editMode={editMode}
            editValue={editValue}
            setSelectedIndex={setSelectedIndex}
            setEditMode={setEditMode}
            setEditValue={setEditValue}
            handleEditSubmit={handleEditSubmit}
            handleEditKeyDown={handleEditKeyDown}
            removeItem={removeItem}
            updateQty={updateQty}
            updateCatatan={updateCatatan}
            highlightedItemId={highlightedItemId}
          />
        </div>

        {/* Bottom Checkout / Dispatch Summary Panel */}
        <TransferCheckoutPanel
          totalItems={getTotalItems()}
          totalQty={getTotalQty()}
          gudangAsalNama={gudangAsalNama}
          gudangTujuanNama={gudangTujuanNama}
          submitting={submitting}
          onReset={() => setShowResetConfirm(true)}
          onSaveDraft={() => submitTransfer(false)}
          onSaveAndSend={() => submitTransfer(true)}
          isBottomSheetOpen={isBottomSheetOpen}
          setIsBottomSheetOpen={setIsBottomSheetOpen}
          kurir={kurir}
          setKurir={setKurir}
          catatan={catatan}
          setCatatan={setCatatan}
          tanggalKirim={tanggalKirim}
          setTanggalKirim={setTanggalKirim}
        />

        {/* Modal: Confirm Reset Cart (F6) */}
        <ConfirmDialog
          isOpen={showResetConfirm}
          title="Konfirmasi Reset Keranjang"
          message="Apakah Anda yakin ingin mengosongkan seluruh daftar transfer ini? Item yang sudah dimasukkan akan dihapus."
          confirmLabel="Ya, Kosongkan"
          cancelLabel="Batal"
          onConfirm={() => {
            reset();
            setShowResetConfirm(false);
            focusSearchInput();
          }}
          onCancel={() => setShowResetConfirm(false)}
          danger
        />

        {/* Modal: Confirm Origin Warehouse Change */}
        <ConfirmDialog
          isOpen={showWarehouseChangeConfirm}
          title="Ganti Gudang Asal"
          message="Mengubah Gudang Asal akan mengosongkan daftar barang yang sudah dipilih, karena stok barang terikat pada gudang pengirim. Lanjutkan perubahan gudang?"
          confirmLabel="Ya, Ganti & Reset"
          cancelLabel="Batalkan"
          onConfirm={confirmWarehouseChange}
          onCancel={() => {
            setPendingGudangAsalId(null);
            setShowWarehouseChangeConfirm(false);
          }}
          danger
        />

        {/* Modal: Transfer Success Dialog */}
        {createdTransfer && (
          <Modal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              reset();
              router.push('/warehouse/transfers');
            }}
            title="Transfer Stok Berhasil Dibuat"
            size="md"
          >
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <IconCheck className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {createdTransfer.nomor_transfer}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Status: <span className="font-semibold text-brand-600">{createdTransfer.status}</span> • {createdTransfer.total_items} jenis barang ({createdTransfer.total_qty_kirim} pcs)
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2">
                  Dokumen transfer telah tercatat dalam sistem logistik. Anda dapat langsung mencetak Surat Jalan fisik untuk kurir/sopir pengantar.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full shadow-brand"
                  leftIcon={<IconPrinter className="h-5 w-5" />}
                  onClick={() => generateSuratJalanPDF(createdTransfer)}
                >
                  Cetak Surat Jalan (PDF)
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    leftIcon={<IconPlus className="h-4 w-4" />}
                    onClick={() => {
                      setShowSuccessModal(false);
                      setCreatedTransfer(null);
                      reset();
                      focusSearchInput();
                    }}
                  >
                    Buat Baru Lagi
                  </Button>

                  <Button
                    variant="secondary"
                    className="flex-1"
                    leftIcon={<IconHistory className="h-4 w-4" />}
                    onClick={() => {
                      setShowSuccessModal(false);
                      reset();
                      router.push('/warehouse/transfers');
                    }}
                  >
                    Ke Riwayat Transfer
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AmbientLayout>
  );
}
