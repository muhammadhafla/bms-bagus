import { Modal, Button, Badge } from '@/components/ui';
import { IconShare } from '@tabler/icons-react';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { PayrollMutasi } from '@/lib/api/payroll';

interface MutasiPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mutasiData: PayrollMutasi[] | undefined;
  startDateStr: string;
  endDateStr: string;
  saldo: number;
  userId: string;
  namaKaryawan: string;
}

const formatCurrency = (amount: number | string | undefined | null) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rp 0';
  if (num < 0) return `-Rp ${Math.abs(num).toLocaleString('id-ID')}`;
  return `Rp ${num.toLocaleString('id-ID')}`;
};

export default function MutasiPreviewModal({ 
  isOpen, 
  onClose, 
  mutasiData,
  startDateStr,
  endDateStr,
  saldo,
  userId,
  namaKaryawan
}: MutasiPreviewModalProps) {
  
  const handleShareOrDownload = async () => {
    const url = `/api/export/payroll/mutasi/${userId}?startDate=${startDateStr}&endDate=${endDateStr}&saldo=${saldo}`;
    const filename = `Mutasi_${namaKaryawan.replace(/\s+/g, '_')}_${startDateStr}_${endDateStr}.pdf`;
    await downloadOrShareFile(url, filename, 'Riwayat Mutasi');
  };

  const periodText = `${format(new Date(startDateStr), 'dd MMM yyyy', { locale: localeId })} - ${format(new Date(endDateStr), 'dd MMM yyyy', { locale: localeId })}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Preview Mutasi"
      size="2xl"
      isBottomSheetOnMobile={true}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} type="button">
            Tutup
          </Button>
          <Button 
            variant="primary" 
            onClick={handleShareOrDownload}
            leftIcon={<IconShare size={18} />}
          >
            Bagikan / Unduh PDF
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-2">
        {/* Info Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Nama Karyawan</p>
            <p className="font-bold text-neutral-900 dark:text-white">{namaKaryawan}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Periode Mutasi</p>
            <p className="font-bold text-neutral-900 dark:text-white">{periodText}</p>
          </div>
        </div>

        {/* List Mutasi */}
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {(!mutasiData || mutasiData.length === 0) ? (
            <div className="text-center py-8 text-neutral-500">
              Tidak ada data mutasi pada periode ini.
            </div>
          ) : (
            mutasiData.map((mutasi) => (
              <div 
                key={mutasi.id}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    {mutasi.keterangan || mutasi.kategori}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {format(new Date(mutasi.tanggal), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={mutasi.jenis === 'kredit' ? 'success' : 'warning'}>
                    {mutasi.jenis.toUpperCase()}
                  </Badge>
                  <span className={`font-bold text-sm ${mutasi.jenis === 'kredit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-500'}`}>
                    {mutasi.jenis === 'kredit' ? '+' : '-'} {formatCurrency(mutasi.nominal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Saldo Akhir */}
        <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-4 rounded-xl border bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900/50">
          <span className="text-sm sm:text-base font-bold text-brand-700 dark:text-brand-400">
            TOTAL SALDO / TANGGUNGAN
          </span>
          <span className="text-lg sm:text-xl font-black text-brand-700 dark:text-brand-400">
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
