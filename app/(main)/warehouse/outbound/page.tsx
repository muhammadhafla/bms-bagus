'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconTrashX,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  DataTable,
  type Column,
  Modal,
  TextInput,
  SelectInput,
  ModernPagination,
} from '@/components/ui';
import { pengeluaranGudangApi, gudangApi, warehouseStockApi } from '@/lib/api/warehouse';
import { PengeluaranGudang, TipePengeluaranGudang, Gudang } from '@/types/warehouse';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';

interface OutboundCartItem {
  inventory_id: string;
  nama_barang: string;
  kode_barcode: string;
  stok_tersedia: number;
  harga_beli_terakhir: number;
  qty: number;
  alasan: string;
}

export default function WarehouseOutboundPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat data pengeluaran gudang...</div>}>
      <WarehouseOutboundContent />
    </Suspense>
  );
}

function WarehouseOutboundContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
  const [selectedTipe, setSelectedTipe] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formGudangId, setFormGudangId] = useState('');
  const [formTipe, setFormTipe] = useState<TipePengeluaranGudang>('RUSAK');
  const [formCatatan, setFormCatatan] = useState('');
  const [cartItems, setCartItems] = useState<OutboundCartItem[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);

  // Detail Modal State
  const [selectedDoc, setSelectedDoc] = useState<PengeluaranGudang | null>(null);

  // Fetch Gudangs
  const { data: gudangRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });
  const gudangList: Gudang[] = useMemo(() => gudangRes?.data || [], [gudangRes?.data]);

  // Default warehouse when modal opens
  useEffect(() => {
    if (gudangList.length > 0 && !formGudangId) {
      const def = gudangList.find((g) => g.is_default) || gudangList[0];
      setFormGudangId(def.id);
    }
  }, [gudangList, formGudangId]);

  // Handle URL query
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Outbounds
  const { data: outboundRes, isLoading } = useQuery({
    queryKey: ['warehouse-outbounds', selectedGudangId, selectedTipe, page],
    queryFn: () =>
      pengeluaranGudangApi.getAll({
        gudangId: selectedGudangId || undefined,
        tipe: (selectedTipe as TipePengeluaranGudang) || undefined,
        page,
        limit,
      }),
  });

  const outbounds = outboundRes?.data?.data || [];
  const totalCount = outboundRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Search Items in Selected Warehouse
  useEffect(() => {
    if (!searchItem.trim() || !formGudangId) {
      setItemSearchResults([]);
      return;
    }
    let cancelled = false;

    warehouseStockApi
      .getStocksByGudang(formGudangId, { search: searchItem, limit: 8 })
      .then((res) => {
        if (cancelled) return;
        setItemSearchResults(res.data?.data || []);
      });

    return () => {
      cancelled = true;
    };
  }, [searchItem, formGudangId]);

  // Cart Handlers
  const handleAddItemToCart = (item: any) => {
    const existing = cartItems.find((ci) => ci.inventory_id === item.inventory_id);
    if (existing) {
      toast.info('Barang sudah ada di daftar pengeluaran');
      return;
    }
    setCartItems((prev) => [
      ...prev,
      {
        inventory_id: item.inventory_id,
        nama_barang: item.nama_barang,
        kode_barcode: item.kode_barcode,
        stok_tersedia: item.stok_gudang,
        harga_beli_terakhir: item.harga_beli_terakhir || 0,
        qty: 1,
        alasan: '',
      },
    ]);
    setSearchItem('');
    setItemSearchResults([]);
  };

  const handleRemoveCartItem = (inventoryId: string) => {
    setCartItems((prev) => prev.filter((it) => it.inventory_id !== inventoryId));
  };

  const handleUpdateQty = (inventoryId: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((it) => (it.inventory_id === inventoryId ? { ...it, qty: Math.max(1, qty) } : it)),
    );
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!formGudangId) throw new Error('Pilih lokasi gudang');
      if (cartItems.length === 0) throw new Error('Daftar barang keluar tidak boleh kosong');

      for (const item of cartItems) {
        if (item.qty > item.stok_tersedia) {
          throw new Error(
            `Stok untuk ${item.nama_barang} tidak mencukupi (Tersedia: ${item.stok_tersedia}, Dikeluarkan: ${item.qty})`,
          );
        }
      }

      const res = await pengeluaranGudangApi.create(
        {
          gudang_id: formGudangId,
          tipe: formTipe,
          catatan: formCatatan || null,
          items: cartItems.map((it) => ({
            inventory_id: it.inventory_id,
            qty: it.qty,
            harga_pokok: it.harga_beli_terakhir,
            alasan: it.alasan || null,
          })),
        },
        user?.id,
      );

      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengeluaran barang berhasil dicatat & stok telah dipotong');
      queryClient.invalidateQueries({ queryKey: ['warehouse-outbounds'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
      setIsModalOpen(false);
      setCartItems([]);
      setFormCatatan('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mencatat pengeluaran barang');
    },
  });

  const tipeBadges: Record<TipePengeluaranGudang, 'danger' | 'warning' | 'info' | 'default'> = {
    RUSAK: 'danger',
    KADALUARSA: 'warning',
    PEMAKAIAN_SENDIRI: 'info',
    SAMPEL_PROMOSI: 'info',
    SELISIH_HILANG: 'danger',
    LAINNYA: 'default',
  };

  const columns: Column<PengeluaranGudang>[] = [
    {
      key: 'nomor_dokumen',
      header: 'No. Dokumen',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.nomor_dokumen}
        </span>
      ),
    },
    {
      key: 'gudang',
      header: 'Lokasi Gudang',
      render: (row) => (
        <span className="font-medium text-neutral-800 dark:text-neutral-200 text-xs">
          {row.gudang?.nama} ({row.gudang?.kode_gudang})
        </span>
      ),
    },
    {
      key: 'tipe',
      header: 'Kategori Pengeluaran',
      render: (row) => (
        <Badge variant={tipeBadges[row.tipe] || 'default'} size="sm">
          {row.tipe.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'tanggal',
      header: 'Tanggal',
      render: (row) => <span className="text-xs text-neutral-600">{row.tanggal}</span>,
    },
    {
      key: 'items',
      header: 'Jumlah / Nilai HPP',
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-900 dark:text-white block">
            {row.total_qty} pcs ({row.total_items} item)
          </span>
          {row.total_nominal ? (
            <span className="text-neutral-500 font-mono">
              {formatCurrency(row.total_nominal)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <Button size="sm" variant="secondary" onClick={() => setSelectedDoc(row)}>
          Detail
        </Button>
      ),
    },
  ];

  return (
    <AmbientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <IconTrashX className="h-7 w-7 text-rose-600 dark:text-rose-400" />
              Pengeluaran Khusus & Waste Gudang
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Pencatatan pemusnahan barang rusak, kadaluarsa, sampel, atau pemakaian internal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Catat Pengeluaran Baru
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Filter Lokasi Gudang:
                </label>
                <SelectInput
                  value={selectedGudangId}
                  onChange={(val) => {
                    setSelectedGudangId(val);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'Semua Gudang' },
                    ...gudangList.map((g) => ({
                      value: g.id,
                      label: `${g.nama} (${g.kode_gudang})`,
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Filter Tipe:
                </label>
                <SelectInput
                  value={selectedTipe}
                  onChange={(val) => {
                    setSelectedTipe(val);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'Semua Kategori' },
                    { value: 'RUSAK', label: 'Barang Rusak / Pecah' },
                    { value: 'KADALUARSA', label: 'Barang Kadaluarsa (Expired)' },
                    { value: 'PEMAKAIAN_SENDIRI', label: 'Pemakaian Sendiri / Operasional' },
                    { value: 'SAMPEL_PROMOSI', label: 'Sampel / Tester Promosi' },
                    { value: 'SELISIH_HILANG', label: 'Selisih Hilang / Susut' },
                    { value: 'LAINNYA', label: 'Lainnya' },
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outbound Table */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-row items-center justify-between p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <CardTitle className="text-base font-semibold">Riwayat Pengeluaran Non-Penjualan</CardTitle>
              <p className="text-xs text-neutral-500 mt-0.5">
                Total {totalCount} dokumen pengeluaran tercatat
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={outbounds}
            keyField="id"
            loading={isLoading}
            className="rounded-none border-0"
            emptyState={
              <div className="p-8 text-center text-xs text-neutral-400">
                Belum ada riwayat pengeluaran barang non-penjualan.
              </div>
            }
          />

          {totalPages > 1 && (
            <ModernPagination
              page={page}
              totalPages={totalPages}
              total={totalCount}
              limit={limit}
              onPageChange={setPage}
              className="rounded-none border-x-0 border-b-0"
            />
          )}
        </Card>

        {/* MODAL: Input Pengeluaran Baru */}
        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Catat Pengeluaran Barang (Non-Penjualan)"
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Gudang Sumber:
                  </label>
                  <SelectInput
                    value={formGudangId}
                    onChange={(val) => {
                      setFormGudangId(val);
                      setCartItems([]);
                    }}
                    options={gudangList.map((g) => ({
                      value: g.id,
                      label: `${g.nama} (${g.kode_gudang})`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Alasan / Kategori Pengeluaran:
                  </label>
                  <SelectInput
                    value={formTipe}
                    onChange={(val) => setFormTipe(val as TipePengeluaranGudang)}
                    options={[
                      { value: 'RUSAK', label: 'Barang Rusak / Pecah' },
                      { value: 'KADALUARSA', label: 'Barang Kadaluarsa (Expired)' },
                      { value: 'PEMAKAIAN_SENDIRI', label: 'Pemakaian Sendiri / Toko' },
                      { value: 'SAMPEL_PROMOSI', label: 'Sampel / Tester Promosi' },
                      { value: 'SELISIH_HILANG', label: 'Selisih Hilang / Susut' },
                      { value: 'LAINNYA', label: 'Lainnya' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Catatan Tambahan:
                </label>
                <TextInput
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Contoh: Pecah saat penataan rak / Kadaluarsa batch Juli"
                />
              </div>

              {/* Item Search */}
              <div className="relative pt-2">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Cari Barang di Gudang Terpilih:
                </label>
                <TextInput
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Scan barcode atau ketik nama barang..."
                />

                {itemSearchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 max-h-52 overflow-y-auto">
                    {itemSearchResults.map((res) => (
                      <button
                        key={res.inventory_id}
                        type="button"
                        onClick={() => handleAddItemToCart(res)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                      >
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {res.nama_barang}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {res.kode_barcode}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            Stok: {res.stok_gudang}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Table */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <div className="bg-neutral-50 dark:bg-neutral-900 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Daftar Barang Dikeluarkan ({cartItems.length} item)
                </div>

                {cartItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400">
                    Belum ada barang dipilih.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                    {cartItems.map((item) => (
                      <div
                        key={item.inventory_id}
                        className="p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {item.nama_barang}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            Stok Tersedia: {item.stok_tersedia}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-neutral-500 text-[11px]">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max={item.stok_tersedia}
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateQty(item.inventory_id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 rounded border border-neutral-300 bg-white px-2 py-1 text-center font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<IconX className="h-4 w-4 text-rose-500" />}
                            onClick={() => handleRemoveCartItem(item.inventory_id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  variant="primary"
                  loading={submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  Eksekusi & Potong Stok
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: Detail Dokumen */}
        {selectedDoc && (
          <Modal
            isOpen={!!selectedDoc}
            onClose={() => setSelectedDoc(null)}
            title={`Dokumen Pengeluaran: ${selectedDoc.nomor_dokumen}`}
            size="md"
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <div>
                  <span className="text-neutral-500 block">Gudang:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedDoc.gudang?.nama}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Kategori:</span>
                  <Badge variant={tipeBadges[selectedDoc.tipe] || 'default'} size="sm">
                    {selectedDoc.tipe.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="text-neutral-500 block">Tanggal:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">{selectedDoc.tanggal}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Dibuat Oleh:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedDoc.created_by_profile?.nama || 'Admin'}
                  </span>
                </div>
              </div>

              {selectedDoc.catatan && (
                <p className="text-neutral-600 dark:text-neutral-400 italic">
                  Catatan: {selectedDoc.catatan}
                </p>
              )}

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Barang</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">HPP Satuan</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {(selectedDoc.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-neutral-900 dark:text-white block">
                            {item.inventory?.nama_barang}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            {item.inventory?.kode_barcode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{item.qty} pcs</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(item.harga_pokok || 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {formatCurrency(item.qty * (item.harga_pokok || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3">
                <Button variant="secondary" onClick={() => setSelectedDoc(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AmbientLayout>
  );
}
