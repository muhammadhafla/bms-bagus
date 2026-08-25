'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { mutasiApi, gajiApi } from '@/lib/api/payroll';
import { Card, Button, Modal, CheckboxInput, MonthPicker, TextInput, ModernPagination } from '@/components/ui';
import { IconReport, IconCalculator, IconWallet, IconSearch, IconArrowRight } from '@tabler/icons-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function AdminGajiDashboard() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data: balancesData, isLoading, refetch } = useQuery({
    queryKey: ['admin_payroll_balances', { page, search }],
    queryFn: () => mutasiApi.getAllBalances({ page, limit, search }),
  });

  const list = balancesData?.data || [];
  const totalItems = balancesData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  // Tutup Buku / Proses Gaji State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const today = new Date();
  const currentPeriode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [periode, setPeriode] = useState(currentPeriode);

  const executeKalkulasi = async () => {
    setIsProcessing(true);
    const toastId = toast.loading(`Sedang memproses gaji periode ${periode}...`);
    try {
      const { error } = await gajiApi.prosesKalkulasi(periode);
      if (error) throw error;
      toast.success(`Berhasil memproses gaji periode ${periode}`, { id: toastId });
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memproses gaji', { id: toastId });
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
      setConfirmChecked(false);
    }
  };

  const totalCompanyDebt = list.reduce((sum, item) => sum + (item.total_saldo > 0 ? item.total_saldo : 0), 0);
  const totalEmployeeDebt = list.reduce((sum, item) => sum + (item.total_saldo < 0 ? Math.abs(item.total_saldo) : 0), 0);

  return (
    <PullToRefresh onRefresh={async () => { await refetch(); }}>
      <div className="flex flex-col gap-6 px-4 py-6 w-full md:p-6 lg:p-8 pb-20 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard Keuangan Karyawan</h1>
            <p className="hidden md:block text-neutral-500 mt-1">Pantau saldo hak gaji dan kasbon seluruh karyawan.</p>
          </div>
          
          <Button 
            variant="primary" 
            leftIcon={<IconCalculator size={18} />}
            onClick={() => setShowConfirmModal(true)}
            className="w-full sm:w-auto h-12"
          >
            Proses Gaji / Tutup Buku
          </Button>
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 border-none">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 p-3 rounded-2xl">
                <IconWallet className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-1">Tanggungan Gaji Belum Cair</p>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                  Rp {totalCompanyDebt.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 border-none">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-3 rounded-2xl">
                <IconWallet className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-1">Total Kasbon Karyawan</p>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                  Rp {totalEmployeeDebt.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari karyawan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />)}
          </div>
        ) : !list || list.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <IconReport className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Tidak ada data karyawan ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((item: any) => (
              <div 
                key={item.id}
                onClick={() => router.push(`/admin/payroll/gaji/${item.id}`)}
                className="group cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900 flex shrink-0 items-center justify-center font-bold text-brand-600">
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={item.nama} fill className="object-cover" />
                    ) : (
                      item.nama.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-neutral-900 dark:text-white truncate">{item.nama}</h3>
                    <p className="text-xs text-neutral-500 truncate">{item.jabatan || 'Staff'}</p>
                  </div>
                  <IconArrowRight className="text-neutral-300 group-hover:text-brand-500 transition-colors" />
                </div>
                
                <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-end justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {item.total_saldo < 0 ? 'Sisa Kasbon' : 'Tanggungan Gaji'}
                  </p>
                  <p className={`font-black text-lg ${
                    item.total_saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 
                    item.total_saldo > 0 ? 'text-emerald-600 dark:text-emerald-400' : 
                    'text-neutral-900 dark:text-white'
                  }`}>
                    {item.total_saldo < 0 ? '-' : ''}Rp {Math.abs(item.total_saldo).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <ModernPagination page={page} totalPages={totalPages} total={totalItems} limit={limit} onPageChange={setPage} />
        )}

        {/* Modal Proses Gaji */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Proses Gaji / Tutup Buku"
        >
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-xl bg-blue-50 p-4 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
              <p className="font-semibold mb-2">Informasi Proses Tutup Buku</p>
              <p className="text-sm">
                Sistem akan menghitung kehadiran dan lembur untuk periode yang dipilih, 
                lalu otomatis menambahkannya ke Saldo Gaji (Kredit) setiap karyawan.
              </p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Periode</label>
              <MonthPicker value={periode} onChange={setPeriode} />
            </div>

            <CheckboxInput
              id="confirm-proses"
              checked={confirmChecked}
              onChange={setConfirmChecked}
              label={`Saya yakin ingin memproses gaji untuk periode ${periode}`}
            />

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Batal</Button>
              <Button variant="primary" onClick={executeKalkulasi} disabled={!confirmChecked || isProcessing}>
                {isProcessing ? 'Memproses...' : 'Proses Gaji'}
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </PullToRefresh>
  );
}
