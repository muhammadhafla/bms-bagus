'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mutasiApi, gajiApi, PayrollMutasi } from '@/lib/api/payroll';
import { downloadMutasiPdf, downloadSlipGajiPdf } from '@/lib/payroll-pdf-utils';
import { Card, Button, Modal, TextInput, TextareaInput, ModernPagination, MonthPicker } from '@/components/ui';
import { IconArrowLeft, IconWallet, IconCheck, IconX, IconArrowUpRight, IconArrowDownLeft, IconClock, IconPrinter, IconFileText } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EmployeeMutasiDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: saldoData } = useQuery({
    queryKey: ['admin_payroll_saldo', userId],
    queryFn: () => mutasiApi.getSaldoByUserId(userId),
  });

  const { data: mutasiData, isLoading } = useQuery({
    queryKey: ['admin_payroll_mutasi', userId, { page }],
    queryFn: () => mutasiApi.getByUserId(userId, { page, limit }),
  });

  const list = mutasiData?.data || [];
  const totalItems = mutasiData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const saldo = saldoData || 0;
  const profile = list.length > 0 ? list[0].profiles : null;

  // Approve/Reject Modal
  const [selectedMutasi, setSelectedMutasi] = useState<PayrollMutasi | null>(null);
  
  const approveMutation = useMutation({
    mutationFn: (id: string) => mutasiApi.approvePenarikan(id),
    onSuccess: () => {
      toast.success('Berhasil menyetujui penarikan');
      setSelectedMutasi(null);
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_saldo'] });
    },
    onError: (err: any) => toast.error(err.message || 'Gagal menyetujui')
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => mutasiApi.rejectPenarikan(id),
    onSuccess: () => {
      toast.success('Berhasil menolak penarikan');
      setSelectedMutasi(null);
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_mutasi'] });
    },
    onError: (err: any) => toast.error(err.message || 'Gagal menolak')
  });

  // Cairkan Gaji Modal
  const [isCairkanOpen, setIsCairkanOpen] = useState(false);
  const [cairkanNominal, setCairkanNominal] = useState('');
  const [cairkanKeterangan, setCairkanKeterangan] = useState('Pencairan Gaji');

  const cairkanMutation = useMutation({
    mutationFn: () => mutasiApi.insertMutasi({
      user_id: userId,
      jenis: 'debit',
      kategori: 'pencairan',
      nominal: Number(cairkanNominal.replace(/\D/g, '')),
      keterangan: cairkanKeterangan
    }),
    onSuccess: () => {
      toast.success('Pencairan berhasil dicatat');
      setIsCairkanOpen(false);
      setCairkanNominal('');
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_mutasi'] });
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_saldo'] });
    },
    onError: (err: any) => toast.error(err.message || 'Gagal mencatat pencairan')
  });

  const handleCairkan = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(cairkanNominal.replace(/\D/g, ''));
    if (num <= 0) return toast.error('Nominal harus lebih dari 0');
    cairkanMutation.mutate();
  };

  // Slip Gaji Modal
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [slipPeriode, setSlipPeriode] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isDownloadingSlip, setIsDownloadingSlip] = useState(false);

  const handleDownloadSlip = async () => {
    setIsDownloadingSlip(true);
    const toastId = toast.loading('Mengambil data slip gaji...');
    try {
      const res = await gajiApi.getByPeriode({ 
        periode: slipPeriode, 
        search: profile?.nama || '',
        limit: 100 
      });
      if (res.error) throw res.error;
      
      const slipData = res.data?.find((s: any) => s.user_id === userId || s.id === userId); 
      // Note: id fallback in case the preview returns `id` as the user_id field.
      
      if (!slipData && res.data && res.data.length > 0) {
        // If search returned only 1 result and it matches the name, we can use it just in case ID mapping fails
        const firstMatch = res.data[0];
        if (firstMatch.profiles?.nama === profile?.nama) {
          await downloadSlipGajiPdf(firstMatch as any);
          toast.success('Slip Gaji berhasil diunduh', { id: toastId });
          setIsSlipOpen(false);
          return;
        }
      }

      if (!slipData) {
        throw new Error('Data slip gaji tidak ditemukan untuk karyawan ini pada periode tersebut.');
      }
      
      await downloadSlipGajiPdf(slipData as any);
      toast.success('Slip Gaji berhasil diunduh', { id: toastId });
      setIsSlipOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengunduh slip gaji', { id: toastId });
    } finally {
      setIsDownloadingSlip(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 px-4 pt-1 pb-6 md:p-6 lg:p-8 md:pb-20 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.back()}
          className="p-1.5 md:p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
        >
          <IconArrowLeft className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
            {profile ? profile.nama : 'Detail Mutasi Karyawan'}
          </h1>
          <p className="text-neutral-500 mt-1 hidden md:block">Kelola pencairan dan kasbon karyawan ini.</p>
        </div>
      </div>

      {/* Saldo Card */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-sm">
        <div className="flex flex-row items-center gap-4">
          <div className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 p-3.5 rounded-2xl">
            <IconWallet className="h-9 w-9 md:h-10 md:w-10" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-neutral-500 uppercase tracking-wider mb-0.5 md:mb-1">
              {saldo < 0 ? 'Sisa Pinjaman/Kasbon' : 'Tanggungan Gaji Perusahaan'}
            </p>
            <h2 className={`text-2xl md:text-3xl font-black ${
              saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {saldo < 0 ? '-' : ''}Rp {Math.abs(saldo).toLocaleString('id-ID')}
            </h2>
          </div>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <Button 
            variant="secondary" 
            className="w-full md:w-auto"
            onClick={() => {
               // Pre-fill with positive saldo if any
               setCairkanNominal(saldo > 0 ? saldo.toString() : '');
               setIsCairkanOpen(true);
            }}
          >
            Cairkan Dana
          </Button>
        </div>
      </div>

      {/* Transaction List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Riwayat Mutasi</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              leftIcon={<IconFileText size={16} />}
              onClick={() => setIsSlipOpen(true)}
            >
              Slip Gaji
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              leftIcon={<IconPrinter size={16} />}
              onClick={() => {
                const name = profile?.nama || 'Karyawan';
                downloadMutasiPdf(list, name, saldo);
              }}
              disabled={!list || list.length === 0}
            >
              Mutasi PDF
            </Button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-neutral-500">Memuat data...</div>
          ) : !list || list.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">Belum ada riwayat mutasi.</div>
          ) : (
            <>
              {list.map((item: PayrollMutasi, index: number) => (
                <div 
                  key={item.id} 
                  className={`py-4 flex flex-row items-center justify-between gap-4 transition-all ${
                    index !== list.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                  } ${item.status === 'pending' ? 'bg-amber-50/50 dark:bg-amber-900/10 -mx-4 px-4 rounded-xl' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      item.status === 'pending' 
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                        : item.jenis === 'kredit' 
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                    }`}>
                      {item.status === 'pending' ? (
                        <IconClock className="h-5 w-5" />
                      ) : item.jenis === 'kredit' ? (
                        <IconArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <IconArrowUpRight className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="min-w-0 truncate">
                      <p className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                        {item.keterangan}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {format(new Date(item.tanggal), 'd MMM yyyy, HH:mm', { locale: localeId })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm md:text-base font-black ${
                        item.status === 'pending' 
                          ? 'text-amber-600 dark:text-amber-500' 
                          : item.jenis === 'kredit' 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-neutral-900 dark:text-white'
                      }`}>
                        {item.jenis === 'kredit' ? '' : '-'}Rp {item.nominal.toLocaleString('id-ID')}
                      </p>
                      {item.status !== 'disetujui' && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-0.5">
                          {item.status}
                        </p>
                      )}
                    </div>
                    
                    {item.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="primary" 
                        className="shrink-0 bg-amber-500 hover:bg-amber-600 border-none px-3 py-1 min-h-0 text-xs mt-1 sm:mt-0"
                        onClick={() => setSelectedMutasi(item)}
                      >
                        Proses
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {totalPages > 1 && (
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <ModernPagination page={page} totalPages={totalPages} total={totalItems} limit={limit} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Persetujuan Kasbon */}
      <Modal
        isOpen={!!selectedMutasi}
        onClose={() => setSelectedMutasi(null)}
        title="Persetujuan Penarikan / Kasbon"
      >
        {selectedMutasi && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 mb-1">Nominal Pengajuan</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-white mb-4">
                Rp {selectedMutasi.nominal.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-neutral-500 mb-1">Keterangan</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
                {selectedMutasi.keterangan || '-'}
              </p>

              {/* Saldo Prediction */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-500">Saldo Saat Ini</span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    {saldo < 0 ? '-' : ''}Rp {Math.abs(saldo).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-500">Penarikan</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    - Rp {selectedMutasi.nominal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-neutral-300 dark:border-neutral-600">
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">Prediksi Saldo Baru</span>
                  <span className={`text-lg font-black ${
                    (saldo - selectedMutasi.nominal) < 0 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {(saldo - selectedMutasi.nominal) < 0 ? '-' : ''}Rp {Math.abs(saldo - selectedMutasi.nominal).toLocaleString('id-ID')}
                  </span>
                </div>
                {(saldo - selectedMutasi.nominal) < 0 && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 text-right">
                    ⚠️ Karyawan akan berhutang pada perusahaan
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-sm text-neutral-500 text-center mt-2">
              Pilih tindakan untuk pengajuan dana ini. Jika disetujui, saldo karyawan akan otomatis terpotong.
            </p>

            <div className="mt-2 flex gap-3">
              <Button 
                variant="secondary" 
                className="w-1/2 !bg-rose-50 !text-rose-600 hover:!bg-rose-100 !border-rose-200" 
                leftIcon={<IconX size={18} />}
                onClick={() => rejectMutation.mutate(selectedMutasi.id)}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                Tolak
              </Button>
              <Button 
                variant="primary" 
                className="w-1/2 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600"
                leftIcon={<IconCheck size={18} />}
                onClick={() => approveMutation.mutate(selectedMutasi.id)}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                Setujui
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cairkan Dana */}
      <Modal
        isOpen={isCairkanOpen}
        onClose={() => setIsCairkanOpen(false)}
        title="Cairkan Dana Manual"
      >
        <form onSubmit={handleCairkan} className="flex flex-col gap-4 mt-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-sm">
            Gunakan fitur ini saat Anda mencairkan (transfer/cash) gaji ke karyawan. Transaksi ini akan memotong saldo karyawan.
          </div>
          
          <TextInput
            label="Nominal (Rp)"
            value={cairkanNominal}
            onChange={(e) => {
              const num = e.target.value.replace(/\D/g, '');
              setCairkanNominal(num ? Number(num).toLocaleString('id-ID') : '');
            }}
            placeholder="0"
            required
            className="text-lg font-bold"
          />
          
          <TextInput
            label="Keterangan"
            value={cairkanKeterangan}
            onChange={(e) => setCairkanKeterangan(e.target.value)}
            required
          />
          
          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsCairkanOpen(false)} type="button">
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={cairkanMutation.isPending}>
              {cairkanMutation.isPending ? 'Mencatat...' : 'Catat Pencairan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Cetak Slip Gaji */}
      <Modal
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        title="Cetak Slip Gaji"
      >
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-sm">
            Pilih periode bulan untuk mengunduh slip gaji karyawan ini.
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Periode</label>
            <MonthPicker value={slipPeriode} onChange={setSlipPeriode} />
          </div>
          
          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsSlipOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleDownloadSlip} disabled={isDownloadingSlip}>
              {isDownloadingSlip ? 'Mengunduh...' : 'Unduh PDF'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
