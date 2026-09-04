'use client';
import { toast } from 'sonner';
import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePembelianStore, useBulkPrintStore } from '@/lib/store';
import {
  inventoryApi,
  PembelianItem,
  purchaseApi,
  purchasesApi,
  kategoriApi,
  supplierApi,
  Supplier,
} from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { InventoryItem } from '@/types/inventory';
import {
  formatCurrency,
  normalizeBarcode,
  generateIdempotencyKey,
  generateAutoBarcode,
  debounce,
} from '@/lib/utils';
import {
  IconShoppingCart,
  IconCamera,
  IconFileImport,
  IconX,
  IconCheck,
  IconDeviceFloppy,
  IconRefresh,
  IconSearch,
  IconPlus,
  IconPrinter,
  IconChevronUp,
  IconArrowRight,
  IconScan,
  IconArrowLeft,
} from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, Badge, Banner, Modal, TextInput } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Portal } from '@/components/ui/Portal';
import { AdminOnly } from '@/components/role';
import { useHotkeys } from 'react-hotkeys-hook';
import { NewItemDialog } from './NewItemDialog';
import { ItemCart } from './ItemCart';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import dynamic from 'next/dynamic';

const ImportCSVWizard = dynamic(() => import('@/components/purchasing/ImportCSVWizard'), {
  loading: () => <div className="skeleton-shimmer h-64 rounded-2xl" />,
  ssr: false,
});

import { useSuppliers } from '@/lib/hooks/useSuppliers';

import { useTableNavigation } from '@/components/inventory/useTableNavigation';
import { usePembelianShortcuts } from '@/components/purchasing/usePembelianShortcuts';
import { SharedBarcodeSearch } from '@/components/inventory/SharedBarcodeSearch';
import { CheckoutPanel } from '@/components/purchasing/CheckoutPanel';

// Then the component:
function PembelianPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('editId');
  const queryClient = useQueryClient();

  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);

  const {
    items,
    addItem,
    updateQty,
    updateHargaBeli,
    updateHargaJual,
    removeItem,
    reset,
    getTotalSistem,
    getSelisih,
    setTotalSupplier,
    setTanggal,
    totalSupplier,
    tanggal,
    nomorNota,
    setNomorNota,
    editId,
    loadPembelian,
  } = usePembelianStore();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastPurchaseItems, setLastPurchaseItems] = useState<typeof items>([]);
  const loadedEditIdRef = useRef<string | null>(null);

  // Load existing purchase if editId is provided
  useEffect(() => {
    if (editIdParam) {
      if (loadedEditIdRef.current === editIdParam) {
        return;
      }
      let cancelled = false;
      setLoading(true);
      purchasesApi.getById(editIdParam).then((res: any) => {
        if (cancelled) return;
        if (res.data) {
          loadedEditIdRef.current = editIdParam;
          loadPembelian(res.data);
          if (res.data.supplier_id) {
            setSelectedSupplierId(res.data.supplier_id);
          }
        } else {
          toast.error('Gagal memuat data transaksi');
        }
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    } else {
      if (loadedEditIdRef.current !== null) {
        loadedEditIdRef.current = null;
        reset();
        setSelectedSupplierId(null);
        setSupplier('');
      }
    }
  }, [editIdParam, loadPembelian, reset]);

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [confirmDiscontinuedItem, setConfirmDiscontinuedItem] = useState<
    (import('@/types/inventory').InventoryItem & { barcode?: string }) | null
  >(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const { data: supplierList = [] } = useSuppliers();

  // Focus management
  const searchRef = useRef<import('@/components/inventory/SharedBarcodeSearch').SharedBarcodeSearchRef>(null);
  
  const focusInput = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const {
    selectedIndex,
    setSelectedIndex,
    editMode,
    setEditMode,
    editValue,
    setEditValue,
    handleEditSubmit,
    handleEditKeyDown,
  } = useTableNavigation({
    items,
    onRemoveItem: removeItem,
    onUpdateQty: updateQty,
    onUpdateHarga: updateHargaBeli,
    onUpdateHargaJual: updateHargaJual,
    focusInput,
  });

  const handleSimpan = async () => {
    if (items.length === 0) {
      toast.error('Keranjang belanja kosong');
      return;
    }

    setSubmitting(true);

    try {
      if (editId) {
        const result = await purchaseApi.updateBatch({
          pembelian_id: editId,
          supplier_id: selectedSupplierId,
          tanggal,
          nomor_nota: nomorNota,
          items: items.map((item) => ({
            id: item.id,
            nama_barang: item.nama_barang,
            qty: item.qty,
            harga_final: item.harga_beli || 0,
            harga_jual: item.harga_jual,
            diskon: item.diskon,
          })),
        });

        if (result.error) {
          throw new Error(result.error.message || 'Gagal merevisi transaksi');
        }

        toast.success('Revisi transaksi berhasil disimpan');
        setLastPurchaseItems([...items]);
        loadedEditIdRef.current = null;
        reset();
        setSelectedSupplierId(null);
        setSupplier('');

        // Invalidate stale caches across modules
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.pembelianAll });
        queryClient.invalidateQueries({ queryKey: ['kas_log'] });
        queryClient.invalidateQueries({ queryKey: ['cash_flow_summary'] });
        queryClient.invalidateQueries({ queryKey: ['buku_besar'] });

        router.push('/transactions/history?type=pembelian');
      } else {
        const pembelianItems = items.map((item) => ({
          inventory_id: item.id,
          barcode: item.barcode,
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_beli: item.harga_beli,
          harga_jual: item.harga_jual,
          diskon: item.diskon,
          harga_final: item.harga_final,
          subtotal: item.subtotal,
        }));

        const result = await purchaseApi.submit({
          supplier_id: selectedSupplierId,
          tanggal,
          nomor_nota: nomorNota,
          items: pembelianItems as any[],
          total_supplier: totalSupplier,
        });

        if (result.error) {
          throw new Error(result.error.message || 'Gagal menyimpan transaksi');
        }

        toast.success('Transaksi berhasil disimpan');
        setLastPurchaseItems([...items]);
        setShowSuccessDialog(true);
        reset();
        setSelectedSupplierId(null);
        setSupplier('');

        // Invalidate stale caches across modules
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.pembelianAll });
        queryClient.invalidateQueries({ queryKey: ['kas_log'] });
        queryClient.invalidateQueries({ queryKey: ['cash_flow_summary'] });
        queryClient.invalidateQueries({ queryKey: ['buku_besar'] });
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const isAnyModalOpen =
    showNewItemDialog ||
    showImportWizard ||
    showSuccessDialog ||
    showResetConfirm ||
    Boolean(confirmDiscontinuedItem);

  usePembelianShortcuts({
    items,
    setSelectedIndex,
    setEditMode,
    setEditValue,
    removeItem,
    selectedIndex,
    setShowResetConfirm,
    handleSimpan,
    submitting,
    enabled: !isAnyModalOpen,
  });

  const performAddItem = useCallback(
    (item: import('@/types/inventory').InventoryItem & { barcode?: string }) => {
      addItem({
        id: item.id,
        barcode: item.kode_barcode,
        nama_barang: item.nama_barang,
        harga_jual: item.harga_jual,
        harga_beli: item.harga_beli_terakhir || 0,
        diskon: item.diskon || 0,
        stok: item.stok,
        minimum_stock: item.minimum_stock,
        kategori: item.kategori,
      });
      focusInput();
      setLoading(false);
    },
    [addItem, focusInput],
  );

  const handleAddResolvedItem = useCallback(
    (item: import('@/types/inventory').InventoryItem & { barcode?: string }) => {
      if (item.is_discontinued) {
        setConfirmDiscontinuedItem(item);
        return;
      }
      performAddItem(item);
    },
    [performAddItem],
  );

  const handleConfirmDiscontinued = useCallback(async () => {
    if (!confirmDiscontinuedItem) return;
    try {
      setLoading(true);
      await inventoryApi.update(confirmDiscontinuedItem.id, { is_discontinued: false });
      performAddItem(confirmDiscontinuedItem);
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengaktifkan barang.');
      setLoading(false);
    } finally {
      setConfirmDiscontinuedItem(null);
    }
  }, [confirmDiscontinuedItem, performAddItem]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleCreateNewItem = useCallback(
    async (data: {
      nama_barang: string;
      barcode: string;
      kategori: string;
      id_kategori?: string;
      harga_beli: number;
      harga_jual: number;
      diskon: number;
    }) => {
      try {
        const result = await inventoryApi.create({
          nama_barang: data.nama_barang,
          kode_barcode: data.barcode,
          id_kategori: data.id_kategori,
          harga_beli_terakhir: data.harga_beli,
          harga_jual: data.harga_jual,
          diskon: data.diskon,
        });
        if (!result.error && result.data) {
          handleAddResolvedItem({
            ...result.data,
            kategori: result.data.id_kategori ?? { id: '', nama: data.kategori },
          });
          setShowNewItemDialog(false);
          searchRef.current?.clearInput();
        } else if (result.error) {
          setError(result.error.message || 'Gagal membuat barang baru');
        }
      } catch (err) {
        console.error('Error creating item:', err);
        setError('Gagal membuat barang baru');
      }
    },
    [handleAddResolvedItem],
  );

  const totalSistem = getTotalSistem();
  const selisih = getSelisih();
  const isValid = selisih === 0;

  return (
    <ErrorBoundary>
      <AmbientLayout>
        <AdminOnly>
          <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)]">
            {/* Header Section */}
            <div className="mb-4 flex-shrink-0 lg:mb-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 pl-2 lg:gap-4 lg:pl-0">
                  <button
                    onClick={() => router.back()}
                    className="-ml-2 rounded-xl p-2 text-neutral-600 transition-all hover:bg-neutral-100 active:scale-95 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    <IconArrowLeft className="h-6 w-6" />
                  </button>
                  <IconShoppingCart
                    className="text-brand-500 hidden h-6 w-6 shrink-0 lg:block lg:h-8 lg:w-8"
                    stroke={1.5}
                  />
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                      {editId ? 'Revisi Transaksi' : 'Transaksi Baru'}
                    </h1>
                    <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                      {editId
                        ? 'Ubah detail barang, supplier, dan faktur untuk transaksi pembelian'
                        : 'Catat pembelian barang dari supplier (barang masuk)'}
                    </p>
                  </div>
                </div>

                <div className="hidden items-end gap-3 lg:gap-4 xl:flex">
                  <div className="min-w-[140px] flex-1">
                    <DateInput
                      value={tanggal}
                      onChange={setTanggal}
                      label="Tanggal:"
                      inputSize="md"
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <TextInput
                      label="Nota:"
                      value={nomorNota}
                      onChange={(e) => setNomorNota(e.target.value)}
                      placeholder="Nomor nota..."
                      inputSize="md"
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex w-full flex-1 gap-2">
                  <SharedBarcodeSearch
                    ref={searchRef}
                    onItemSelected={handleAddResolvedItem}
                    allowCreateNew={true}
                    onCreateNew={(barcode) => {
                      const isLikelyBarcode = /^[A-Z0-9]{4,}$/i.test(barcode);
                      setNewItemBarcode(isLikelyBarcode ? barcode : '');
                      setNewItemName(isLikelyBarcode ? '' : barcode);
                      setShowNewItemDialog(true);
                    }}
                    disabled={loading || submitting}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setShowImportWizard(true)}
                    className="flex w-[54px] shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white !p-0 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                    title="Import CSV"
                  >
                    <IconFileImport size={22} className="text-neutral-600 dark:text-neutral-400" />
                  </Button>
                </div>

                <div className="animate-fade-in-up hidden xl:block">
                  <SelectInput
                    label="Supplier"
                    value={selectedSupplierId || ''}
                    onChange={(id) => {
                      const s = supplierList.find((x) => x.id === id);
                      setSelectedSupplierId(id || null);
                      setSupplier(s ? s.nama : '');
                    }}
                    options={(Array.isArray(supplierList) ? supplierList : []).map((s) => ({
                      value: s.id,
                      label: s.nama + (s.kontak ? ` (${s.kontak})` : ''),
                    }))}
                    placeholder="-- Pilih Supplier --"
                    className="min-w-[18rem]"
                  />
                </div>

                <div className="hidden min-w-[18rem] flex-col gap-2 xl:flex">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                    Total Tagihan:
                  </label>
                  <PriceInput
                    value={totalSupplier || 0}
                    onChange={setTotalSupplier}
                    className="focus:border-brand-500 focus:shadow-brand w-full rounded-xl border border-white/40 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-md transition-all focus:outline-none dark:border-white/10 dark:bg-neutral-900/50"
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200/50 bg-red-50/80 p-3 text-sm text-red-600 shadow-sm backdrop-blur-md dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-brand-50/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border-brand-200/50 dark:border-brand-800/50 mt-4 rounded-xl border p-3 text-sm shadow-sm backdrop-blur-md">
                  {success}
                </div>
              )}
            </div>

            {/* Main Table Area */}
            <div className="shadow-elevated mb-6 flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:min-h-0 dark:border-white/10 dark:bg-neutral-900/60">
              <ItemCart
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
              />
            </div>

            <CheckoutPanel
              totalSistem={totalSistem}
              totalSupplier={totalSupplier}
              selisih={selisih}
              isValid={isValid}
              setShowResetConfirm={setShowResetConfirm}
              handleSimpan={handleSimpan}
              submitting={submitting}
              itemsCount={items.length}
              editId={editId}
              isBottomSheetOpen={isBottomSheetOpen}
              setIsBottomSheetOpen={setIsBottomSheetOpen}
              tanggal={tanggal}
              setTanggal={setTanggal}
              nomorNota={nomorNota}
              setNomorNota={setNomorNota}
              selectedSupplierId={selectedSupplierId}
              setSelectedSupplierId={setSelectedSupplierId}
              setSupplierName={setSupplier}
              supplierList={supplierList}
              setTotalSupplier={setTotalSupplier}
            />
          </div>

          <NewItemDialog
            open={showNewItemDialog}
            initialBarcode={newItemBarcode}
            initialName={newItemName}
            onClose={() => {
              setShowNewItemDialog(false);
              focusInput();
            }}
            onSubmit={handleCreateNewItem}
          />

          <ImportCSVWizard
            open={showImportWizard}
            onClose={() => {
              setShowImportWizard(false);
              focusInput();
            }}
            onComplete={(
              importedItems: {
                item: import('@/types/inventory').InventoryItem;
                qty: number;
                harga_beli: number;
              }[],
            ) => {
              importedItems.forEach(({ item, qty, harga_beli }) => {
                addItem(
                  {
                    ...item,
                    barcode: item.kode_barcode || item.barcode,
                    harga_beli: harga_beli || item.harga_beli_terakhir || 0,
                    diskon: item.diskon || 0,
                  },
                  qty,
                );
              });
              setShowImportWizard(false);
              setSuccess(`${importedItems.length} macam barang berhasil diimpor`);
              focusInput();
            }}
          />

          <Modal
            isOpen={showSuccessDialog}
            onClose={() => setShowSuccessDialog(false)}
            title="Pembelian Berhasil"
          >
            <div className="p-6">
              <p className="mb-6 text-neutral-600 dark:text-neutral-400">
                Transaksi pembelian berhasil disimpan. Apakah Anda ingin langsung mencetak label
                barcode untuk barang-barang ini?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowSuccessDialog(false)}>
                  Nanti Saja
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<IconPrinter className="h-5 w-5" />}
                  onClick={() => {
                    resetBulkPrint();
                    lastPurchaseItems.forEach((item) => {
                      if (item.qty > 0) {
                        addBulkPrintItem(item, item.qty);
                      }
                    });
                    router.push('/bulk-print');
                  }}
                >
                  Cetak Label Sekarang
                </Button>
              </div>
            </div>
          </Modal>

          <ConfirmDialog
            isOpen={showResetConfirm}
            title="Konfirmasi Reset"
            message="Apakah Anda yakin ingin mengosongkan daftar pembelian? Semua item yang telah dimasukkan akan dihapus."
            confirmLabel="Ya, Reset"
            cancelLabel="Batal"
            onConfirm={() => {
              reset();
              setTotalSupplier(0);
              focusInput();
              setShowResetConfirm(false);
              setIsBottomSheetOpen(false);
            }}
            onCancel={() => setShowResetConfirm(false)}
            danger={true}
          />

          <ConfirmDialog
            isOpen={!!confirmDiscontinuedItem}
            title="Aktifkan Barang"
            message={`Barang "${confirmDiscontinuedItem?.nama_barang}" saat ini berstatus Discontinue. Yakin ingin menambahkannya ke daftar pembelian? (Status barang akan otomatis kembali aktif).`}
            confirmLabel="Ya, Aktifkan & Tambahkan"
            cancelLabel="Batal"
            onConfirm={handleConfirmDiscontinued}
            onCancel={() => {
              setConfirmDiscontinuedItem(null);
              focusInput();
            }}
          />
        </AdminOnly>
      </AmbientLayout>
    </ErrorBoundary>
  );
}

export default function PembelianPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      }
    >
      <PembelianPageContent />
    </Suspense>
  );
}
