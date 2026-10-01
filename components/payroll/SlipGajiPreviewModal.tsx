import { Modal, Button } from '@/components/ui';
import { IconDownload, IconShare } from '@tabler/icons-react';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { SlipGaji } from '@/lib/api/payroll';

interface SlipGajiPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: SlipGaji | null;
}

const formatCurrency = (amount: number | string | undefined | null) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rp 0';
  if (num < 0) return `-Rp ${Math.abs(num).toLocaleString('id-ID')}`;
  return `Rp ${num.toLocaleString('id-ID')}`;
};

export default function SlipGajiPreviewModal({ isOpen, onClose, slip }: SlipGajiPreviewModalProps) {
  if (!slip) return null;

  const namaKaryawan = slip.profiles?.nama || 'Karyawan';
  const totalPotongan = Number(slip.total_denda_telat || 0) + Number(slip.total_potongan_kasbon || 0) + Number(slip.total_potongan_libur || 0) + Number(slip.total_potongan_lain || 0);
  const totalPendapatan = Number(slip.total_gaji_harian || 0) + Number(slip.total_gaji_lembur || 0) + Number(slip.total_bonus || 0);
  const isMinus = Number(slip.gaji_bersih) < 0;

  const handleShareOrDownload = async () => {
    const filename = `Slip_Gaji_${namaKaryawan.replace(/\s+/g, '_')}_${slip.periode_bulan}.pdf`;
    await downloadOrShareFile(`/api/export/payroll/slip-gaji/${slip.id}`, filename, 'Slip Gaji');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Slip Gaji - ${slip.periode_bulan}`}
      size="2xl"
      isBottomSheetOnMobile={true}
      footer={
        <div className="flex justify-end gap-3">
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
      <div className="flex flex-col gap-6 p-2">
        {/* Info Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Nama Karyawan</p>
            <p className="font-bold text-neutral-900 dark:text-white">{namaKaryawan}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Total Kehadiran</p>
              <p className="font-bold text-neutral-900 dark:text-white">{slip.total_hari_hadir} Hari</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Total Jam Telat</p>
              <p className="font-bold text-neutral-900 dark:text-white">{Number(slip.total_jam_telat || 0).toFixed(1)} Jam</p>
            </div>
          </div>
        </div>

        {/* 2-Column Grid on Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Pendapatan */}
          <div className="flex flex-col">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
              PENDAPATAN
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">{slip.tipe_gaji === 'bulanan' ? 'Gaji Pokok (Bulanan)' : 'Gaji Pokok (Hadir)'}</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_gaji_harian)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Uang Lembur</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_gaji_lembur)}</span>
              </div>
              {Number(slip.total_bonus) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Bonus / Insentif</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_bonus)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Total Pendapatan</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPendapatan)}</span>
            </div>
          </div>

          {/* Potongan */}
          <div className="flex flex-col">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
              POTONGAN & PENCAIRAN
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Pencairan / Kasbon</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_potongan_kasbon)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Denda Keterlambatan</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_denda_telat)}</span>
              </div>
              {Number(slip.total_potongan_libur) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Potongan Absen/Libur</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_potongan_libur)}</span>
                </div>
              )}
              {Number(slip.total_potongan_lain) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Potongan Lainnya</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(slip.total_potongan_lain)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Total Potongan</span>
              <span className="font-bold text-orange-600 dark:text-orange-500">{formatCurrency(totalPotongan)}</span>
            </div>
          </div>
          
        </div>

        {/* Total Bersih */}
        <div className={`mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-4 rounded-xl border ${isMinus ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900/50'}`}>
          <span className={`text-sm sm:text-base font-bold ${isMinus ? 'text-red-700 dark:text-red-400' : 'text-brand-700 dark:text-brand-400'}`}>
            {isMinus ? 'TANGGUNGAN KASBON (MINUS)' : 'TOTAL SISA GAJI BERSIH'}
          </span>
          <span className={`text-lg sm:text-xl font-black ${isMinus ? 'text-red-700 dark:text-red-400' : 'text-brand-700 dark:text-brand-400'}`}>
            {formatCurrency(slip.gaji_bersih)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
