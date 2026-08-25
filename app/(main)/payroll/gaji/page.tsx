'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { mutasiApi, PayrollMutasi } from '@/lib/api/payroll';
import { Card, Button, ModernPagination, Modal, TextInput, TextareaInput } from '@/components/ui';
import { IconWallet, IconArrowUpRight, IconArrowDownLeft, IconClock, IconReceipt2 } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

import { Suspense } from 'react';

function DompetContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const page = Number(searchParams.get('page')) || 1;
  const limit = 20;

  const updatePage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: saldoData, isLoading: isLoadingSaldo } = useQuery({
    queryKey: ['payroll', 'my_saldo'],
    queryFn: () => mutasiApi.getMySaldo(),
  });

  const { data: mutasiData, isLoading: isLoadingMutasi } = useQuery({
    queryKey: ['payroll', 'my_mutasi', { page }],
    queryFn: () => mutasiApi.getMine({ page, limit }),
  });

  const list = mutasiData?.data || [];
  const totalItems = mutasiData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const saldo = saldoData || 0;

  // Kasbon/Withdrawal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => mutasiApi.requestPenarikan(Number(nominal.replace(/\D/g, '')), keterangan),
    onSuccess: (res) => {
      toast.success('Pengajuan penarikan dana / kasbon berhasil dikirim.');
      setIsModalOpen(false);
      setNominal('');
      setKeterangan('');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengajukan penarikan');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(nominal.replace(/\D/g, ''));
    if (num <= 0) return toast.error('Nominal harus lebih dari 0');
    if (!keterangan) return toast.error('Keterangan wajib diisi');
    submitMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-md mx-auto md:max-w-4xl pt-8 pb-20">
      
      {/* Header & Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-xl">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="text-brand-100 mb-1 text-sm font-medium">
            {saldo < 0 ? 'Total Pinjaman/Kasbon' : 'Total Saldo Saat Ini'}
          </p>
          <h1 className="text-4xl font-black tracking-tight mb-6">
            {saldo < 0 ? '-' : ''}Rp {Math.abs(saldo).toLocaleString('id-ID')}
          </h1>
          
          <Button 
            variant="secondary" 
            className="bg-white text-brand-700 hover:bg-neutral-50 border-none w-full max-w-xs shadow-lg font-bold"
            leftIcon={<IconWallet size={20} />}
            onClick={() => setIsModalOpen(true)}
          >
            Tarik Dana / Kasbon
          </Button>
          
          <button 
            onClick={() => toast.info('Fitur Slip Gaji akan segera hadir')}
            className="mt-4 text-sm font-medium text-brand-100 hover:text-white underline decoration-brand-400/50 hover:decoration-white underline-offset-4 transition-all"
          >
            Lihat Rincian / Slip Gaji
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Riwayat Mutasi</h2>
        
        <div className="flex flex-col gap-3">
          {isLoadingMutasi ? (
            <Card className="p-8 text-center text-sm text-neutral-500">Memuat data...</Card>
          ) : !list || list.length === 0 ? (
            <Card className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-3 border-dashed">
              <IconReceipt2 className="h-10 w-10 text-neutral-300" />
              <p>Belum ada riwayat transaksi.</p>
            </Card>
          ) : (
            <>
              {list.map((item: PayrollMutasi) => (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    item.status === 'pending' 
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                      : item.jenis === 'kredit' 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                  }`}>
                    {item.status === 'pending' ? (
                      <IconClock className="h-6 w-6" />
                    ) : item.jenis === 'kredit' ? (
                      <IconArrowDownLeft className="h-6 w-6" />
                    ) : (
                      <IconArrowUpRight className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.keterangan || (item.kategori === 'gaji' ? 'Penerimaan Gaji' : 'Penarikan Dana')}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {format(new Date(item.tanggal), 'd MMM yyyy, HH:mm', { locale: localeId })}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className={`font-black ${
                      item.status === 'pending' 
                        ? 'text-amber-600 dark:text-amber-500' 
                        : item.jenis === 'kredit' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-neutral-900 dark:text-white'
                    }`}>
                      {item.jenis === 'kredit' ? '+' : '-'} Rp {item.nominal.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">
                      {item.status === 'pending' ? 'PENDING' : item.status === 'ditolak' ? 'DITOLAK' : 'BERHASIL'}
                    </p>
                  </div>
                </div>
              ))}
              
              {totalPages > 1 && (
                <div className="mt-4">
                  <ModernPagination
                    page={page}
                    totalPages={totalPages}
                    total={totalItems}
                    limit={limit}
                    onPageChange={updatePage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Pengajuan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajukan Penarikan / Kasbon"
        isBottomSheetOnMobile={true}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {(() => {
            const num = Number(nominal.replace(/\D/g, ''));
            const isKasbon = num > saldo;
            return (
              <div className={`rounded-xl p-3 text-sm border ${
                isKasbon 
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' 
                  : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
              }`}>
                {isKasbon 
                  ? 'Nominal pengajuan melebihi saldo. Pengajuan ini akan dicatat sebagai Kasbon (Pinjaman).' 
                  : 'Pengajuan ini akan memotong saldo Anda setelah disetujui.'}
              </div>
            );
          })()}
          
          <TextInput
            label="Nominal (Rp)"
            value={nominal}
            onChange={(e) => {
              const num = e.target.value.replace(/\D/g, '');
              setNominal(num ? Number(num).toLocaleString('id-ID') : '');
            }}
            placeholder="0"
            required
            className="text-lg font-bold"
          />
          
          <TextareaInput
            label="Keterangan / Keperluan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Misal: Biaya sekolah anak"
            required
            rows={3}
          />
          
          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function DompetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat Dompet...</div>}>
      <DompetContent />
    </Suspense>
  );
}
