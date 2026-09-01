'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconBuildingWarehouse,
  IconPackage,
  IconTruckDelivery,
  IconAlertTriangle,
  IconArrowsExchange,
  IconPlus,
  IconChevronRight,
  IconBuildingStore,
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
} from '@/components/ui';
import { warehouseStockApi, transferStokApi, gudangApi } from '@/lib/api/warehouse';
import { TransferStok } from '@/types/warehouse';
import { AdminOnly } from '@/components/role';

export default function WarehouseDashboardPage() {
  const router = useRouter();

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ['warehouse-summary'],
    queryFn: () => warehouseStockApi.getSummary(),
  });

  const { data: gudangRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });

  const { data: transfersRes, isLoading: transfersLoading } = useQuery({
    queryKey: ['warehouse-recent-transfers'],
    queryFn: () => transferStokApi.getAll({ limit: 5 }),
  });

  const summary = summaryRes?.data;
  const gudangList = gudangRes?.data || [];
  const recentTransfers = transfersRes?.data?.data || [];

  const transferColumns: Column<TransferStok>[] = [
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
      header: 'Rute Pengiriman',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {row.gudang_asal?.kode_gudang}
          </span>
          <IconChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="font-semibold text-neutral-900 dark:text-white">
            {row.gudang_tujuan?.kode_gudang}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Total Item / Qty',
      render: (row) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {row.total_items} item ({row.total_qty_kirim} pcs)
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
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/warehouse/transfers?detailId=${row.id}`)}
        >
          Lihat Detail
        </Button>
      ),
    },
  ];

  return (
    <AmbientLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <IconBuildingWarehouse className="h-7 w-7 text-brand-600 dark:text-brand-400" />
              Gudang & Multi-Outlet
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Monitoring persediaan pusat, stok cabang, dan pergerakan logistik antar toko
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<IconPackage className="h-4 w-4" />}
              onClick={() => router.push('/warehouse/stocks')}
            >
              Katalog Stok
            </Button>
            <Button
              variant="primary"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => router.push('/warehouse/transfers/new')}
            >
              Transfer Stok Baru
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-brand-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Stok Gudang Pusat</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                  {summaryLoading ? '...' : (summary?.total_stok_pusat || 0).toLocaleString('id-ID')}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">Gudang Utama & Toko 1</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                <IconBuildingWarehouse className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Stok Toko 2 (Cabang)</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                  {summaryLoading ? '...' : (summary?.total_stok_cabang || 0).toLocaleString('id-ID')}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">Cabang Mandiri</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <IconBuildingStore className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Transfer In-Transit</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                  {summaryLoading ? '...' : summary?.total_transfer_in_transit || 0}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">Sedang dalam perjalanan</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <IconTruckDelivery className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Stok Menipis (Gudang)</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                  {summaryLoading ? '...' : summary?.total_low_stock_items || 0}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">≤ 5 unit per gudang</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <IconAlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warehouse Outlets Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <IconBuildingWarehouse className="h-5 w-5 text-neutral-500" />
              Daftar Lokasi & Gudang Aktif
            </h2>
            <AdminOnly>
              <Link
                href="/warehouse/master"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Kelola Gudang &rarr;
              </Link>
            </AdminOnly>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {gudangList.map((g) => (
              <Card key={g.id} className="transition-all hover:border-brand-500/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white text-base">
                          {g.nama}
                        </span>
                        <Badge variant={g.tipe === 'PUSAT' ? 'info' : 'success'} size="sm">
                          {g.tipe}
                        </Badge>
                        {g.is_default && (
                          <Badge variant="default" size="sm">
                            DEFAULT
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Kode:{' '}
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {g.kode_gudang}
                        </span>{' '}
                        • PIC: {g.penanggung_jawab || '-'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Alamat: {g.alamat || '-'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/warehouse/stocks?gudangId=${g.id}`)}
                    >
                      Lihat Stok
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Transfer Shipments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <IconArrowsExchange className="h-5 w-5 text-neutral-500" />
                Pengiriman & Transfer Terbaru
              </CardTitle>
            </div>
            <Link
              href="/warehouse/transfers"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Semua Transfer &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={transferColumns}
              data={recentTransfers}
              keyField="id"
              loading={transfersLoading}
              emptyState={
                <div className="p-8 text-center text-xs text-neutral-400">
                  Belum ada transaksi transfer stok.
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    </AmbientLayout>
  );
}
