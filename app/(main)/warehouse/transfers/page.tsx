'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconTruckDelivery,
  IconPlus,
  IconPrinter,
  IconCheck,
  IconTrash,
  IconChevronRight,
  IconSend,
  IconFileText,
  IconX,
  IconList,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Card,
  CardTitle,
  Button,
  Badge,
  DataTable,
  type Column,
  Modal,
  ConfirmDialog,
  Tabs,
  ModernPagination,
} from '@/components/ui';
import { transferStokApi } from '@/lib/api/warehouse';
import { TransferStok, StatusTransfer } from '@/types/warehouse';
import { generateSuratJalanPDF } from '@/lib/warehouse-pdf-utils';
import { useAuthStore } from '@/lib/auth';

export default function WarehouseTransfersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat transfer stok...</div>}>
      <WarehouseTransfersContent />
    </Suspense>
  );
}

function WarehouseTransfersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, profile, hasRole } = useAuthStore();
  const canCancelTransfer = profile?.role === 'admin' || hasRole('kepala_gudang') || hasRole('admin');

  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modal: Detail / Receive Transfer
  const [selectedTransfer, setSelectedTransfer] = useState<TransferStok | null>(null);
  const [receiveItems, setReceiveItems] = useState<Array<{ inventory_id: string; qty_terima: number; catatan: string }>>([]);

  // Confirm dialog for cancellation
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);

  const handleOpenDetail = useCallback((transfer: TransferStok) => {
    setSelectedTransfer(transfer);
    // Initialize receive items
    setReceiveItems(
      (transfer.items || []).map((it) => ({
        inventory_id: it.inventory_id,
        qty_terima: it.qty_terima || it.qty_kirim,
        catatan: it.catatan || '',
      })),
    );
  }, []);

  // Handle URL query action=new and detailId
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      router.push('/warehouse/transfers/new');
      return;
    }
    const detailId = searchParams.get('detailId');
    if (detailId) {
      transferStokApi.getById(detailId).then((res) => {
        if (res.data) handleOpenDetail(res.data);
      });
    }
  }, [searchParams, handleOpenDetail, router]);

  // Fetch Transfers
  const statusFilter = activeTab === 'ALL' ? undefined : (activeTab as StatusTransfer);
  const { data: transfersRes, isLoading: transfersLoading } = useQuery({
    queryKey: ['warehouse-transfers', statusFilter, page],
    queryFn: () =>
      transferStokApi.getAll({
        status: statusFilter,
        page,
        limit,
      }),
  });

  const transfers = transfersRes?.data?.data || [];
  const totalCount = transfersRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Kirim Mutation
  const kirimMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await transferStokApi.kirim(transferId, user?.id || '');
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Barang berhasil dikirim (Status: IN_TRANSIT)');
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
      setSelectedTransfer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengirim transfer');
    },
  });

  // Terima Mutation
  const terimaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransfer) return;
      const res = await transferStokApi.terima(selectedTransfer.id, receiveItems, user?.id || '');
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Penerimaan barang berhasil dikonfirmasi (Status: RECEIVED)');
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
      setSelectedTransfer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengonfirmasi penerimaan');
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await transferStokApi.cancel(transferId, 'Dibatalkan oleh user');
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success('Transfer stok dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      setCancelTransferId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membatalkan transfer');
    },
  });

  const columns: Column<TransferStok>[] = [
    {
      key: 'nomor_transfer',
      header: 'No. Transfer',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.nomor_transfer}
        </span>
      ),
    },
    {
      key: 'rute',
      header: 'Rute Gudang',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {row.gudang_asal?.nama}
          </span>
          <IconChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="font-semibold text-neutral-900 dark:text-white">
            {row.gudang_tujuan?.nama}
          </span>
        </div>
      ),
    },
    {
      key: 'total_items',
      header: 'Total Muatan',
      render: (row) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {row.total_items} jenis ({row.total_qty_kirim} pcs)
        </span>
      ),
    },
    {
      key: 'kurir',
      header: 'Kurir / Ekspedisi',
      render: (row) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {row.kurir_pengirim || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variantMap: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
          DRAFT: 'default',
          REQUESTED: 'warning',
          APPROVED: 'info',
          IN_TRANSIT: 'warning',
          RECEIVED: 'success',
          CANCELED: 'danger',
        };
        return (
          <Badge variant={variantMap[row.status] || 'default'} size="sm">
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenDetail(row)}
          >
            Detail
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconPrinter className="h-4 w-4 text-neutral-600" />}
            onClick={() => generateSuratJalanPDF(row)}
            title="Cetak Surat Jalan"
          />
          {row.status === 'DRAFT' && canCancelTransfer && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<IconTrash className="h-4 w-4 text-rose-500" />}
              onClick={() => setCancelTransferId(row.id)}
              title="Batalkan Transfer"
            />
          )}
        </div>
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
              <IconTruckDelivery className="h-7 w-7 text-brand-600 dark:text-brand-400" />
              Mutasi & Transfer Stok Antar Gudang
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Distribusi stok antar cabang, pelacakan pengiriman (in-transit), dan verifikasi surat jalan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => router.push('/warehouse/transfers/new')}
            >
              Transfer Stok Baru
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs
          activeId={activeTab}
          onChange={(tab) => {
            setActiveTab(tab as any);
            setPage(1);
          }}
          items={[
            { id: 'ALL', label: 'Semua Status', icon: <IconList className="h-4 w-4" /> },
            { id: 'IN_TRANSIT', label: 'Sedang Dikirim (In Transit)', icon: <IconTruckDelivery className="h-4 w-4" /> },
            { id: 'DRAFT', label: 'Draft / Permintaan', icon: <IconFileText className="h-4 w-4" /> },
            { id: 'RECEIVED', label: 'Diterima (Selesai)', icon: <IconCheck className="h-4 w-4" /> },
            { id: 'CANCELED', label: 'Dibatalkan', icon: <IconX className="h-4 w-4" /> },
          ]}
        />

        {/* Transfers Table */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-row items-center justify-between p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <CardTitle className="text-base font-semibold">Daftar Dokumen Transfer</CardTitle>
              <p className="text-xs text-neutral-500 mt-0.5">
                Total {totalCount} transaksi transfer tercatat
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={transfers}
            keyField="id"
            loading={transfersLoading}
            className="rounded-none border-0"
            emptyState={
              <div className="p-8 text-center text-xs text-neutral-400">
                Tidak ada transaksi transfer pada filter ini.
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

        {/* MODAL: Detail & Penerimaan Transfer */}
        {selectedTransfer && (
          <Modal
            isOpen={!!selectedTransfer}
            onClose={() => setSelectedTransfer(null)}
            title={`Dokumen Transfer: ${selectedTransfer.nomor_transfer}`}
            size="lg"
          >
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-xs">
                <div>
                  <span className="text-neutral-500 block">Gudang Pengirim:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedTransfer.gudang_asal?.nama}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Gudang Penerima:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedTransfer.gudang_tujuan?.nama}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Status:</span>
                  <Badge
                    variant={
                      selectedTransfer.status === 'RECEIVED'
                        ? 'success'
                        : selectedTransfer.status === 'IN_TRANSIT'
                        ? 'warning'
                        : 'default'
                    }
                    size="sm"
                  >
                    {selectedTransfer.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-neutral-500 block">Kurir / Pengantar:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.kurir_pengirim || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Tanggal Kirim:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.tanggal_kirim
                      ? new Date(selectedTransfer.tanggal_kirim).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Tanggal Terima:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.tanggal_terima
                      ? new Date(selectedTransfer.tanggal_terima).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Items Checklist Table */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Nama Barang</th>
                      <th className="px-3 py-2 text-center">Qty Kirim</th>
                      <th className="px-3 py-2 text-center">Qty Terima</th>
                      <th className="px-3 py-2 text-left">Catatan Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {(selectedTransfer.items || []).map((item) => {
                      const isEditable = selectedTransfer.status === 'IN_TRANSIT';
                      const receiveState = receiveItems.find(
                        (ri) => ri.inventory_id === item.inventory_id,
                      );

                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-neutral-900 dark:text-white block">
                              {item.inventory?.nama_barang}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {item.inventory?.kode_barcode}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-neutral-800 dark:text-neutral-200">
                            {item.qty_kirim} {item.inventory?.unit || 'pcs'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                max={item.qty_kirim}
                                value={receiveState?.qty_terima ?? item.qty_kirim}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setReceiveItems((prev) =>
                                    prev.map((ri) =>
                                      ri.inventory_id === item.inventory_id
                                        ? { ...ri, qty_terima: val }
                                        : ri,
                                    ),
                                  );
                                }}
                                className="w-16 rounded border border-neutral-300 bg-white px-2 py-1 text-center font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {item.qty_terima} {item.inventory?.unit || 'pcs'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditable ? (
                              <input
                                type="text"
                                value={receiveState?.catatan ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReceiveItems((prev) =>
                                    prev.map((ri) =>
                                      ri.inventory_id === item.inventory_id
                                        ? { ...ri, catatan: val }
                                        : ri,
                                    ),
                                  );
                                }}
                                placeholder="Jika ada barang rusak / kurang..."
                                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                              />
                            ) : (
                              <span className="text-neutral-500">{item.catatan || '-'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  leftIcon={<IconPrinter className="h-4 w-4" />}
                  onClick={() => generateSuratJalanPDF(selectedTransfer)}
                >
                  Cetak Surat Jalan (PDF)
                </Button>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSelectedTransfer(null)}>
                    Tutup
                  </Button>

                  {selectedTransfer.status === 'DRAFT' && (
                    <Button
                      variant="primary"
                      leftIcon={<IconSend className="h-4 w-4" />}
                      loading={kirimMutation.isPending}
                      onClick={() => kirimMutation.mutate(selectedTransfer.id)}
                    >
                      Kirim Barang Sekarang
                    </Button>
                  )}

                  {selectedTransfer.status === 'IN_TRANSIT' && (
                    <Button
                      variant="primary"
                      leftIcon={<IconCheck className="h-4 w-4" />}
                      loading={terimaMutation.isPending}
                      onClick={() => terimaMutation.mutate()}
                    >
                      Konfirmasi Penerimaan Fisik
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Confirm Dialog Cancel */}
        {cancelTransferId && (
          <ConfirmDialog
            isOpen={!!cancelTransferId}
            onCancel={() => setCancelTransferId(null)}
            onConfirm={() => cancelMutation.mutate(cancelTransferId)}
            title="Batalkan Draft Transfer"
            message="Apakah Anda yakin ingin membatalkan dokumen transfer ini? Data draft akan dihapus dari antrean."
            confirmLabel="Ya, Batalkan"
            cancelLabel="Kembali"
            danger={true}
          />
        )}
      </div>
    </AmbientLayout>
  );
}
