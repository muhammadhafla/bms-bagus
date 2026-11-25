'use client';

import React from 'react';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPrinter,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Button,
  Modal,
  SelectInput,
  TextInput,
  TextareaInput,
} from '@/components/ui';
import {
  LedgerTipe,
  LedgerSumber,
  LedgerPaginatedItem,
} from '@/lib/api/ledger';
import { Gudang } from '@/types/warehouse';

interface LedgerModalsProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  modalTipe: LedgerTipe;
  onChangeModalTipe: (tipe: LedgerTipe) => void;
  modalSumber: LedgerSumber;
  onChangeModalSumber: (sumber: LedgerSumber) => void;
  modalGudangId: string;
  onChangeModalGudangId: (gudangId: string) => void;
  modalTanggal: string;
  onChangeModalTanggal: (val: string) => void;
  nominal: string;
  onChangeNominal: (val: string) => void;
  keterangan: string;
  onChangeKeterangan: (val: string) => void;
  gudangList: Gudang[];
  isSubmittingSaldo: boolean;
  onSubmitSaldo: (e: React.FormEvent) => void;
  isPrintModalOpen: boolean;
  onClosePrintModal: () => void;
  startDateStr: string;
  endDateStr: string;
  baselineOpeningBalance: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  printItems: LedgerPaginatedItem[];
  onPrint: () => void;
}

export function LedgerModals({
  isModalOpen,
  onCloseModal,
  modalTipe,
  onChangeModalTipe,
  modalSumber,
  onChangeModalSumber,
  modalGudangId,
  onChangeModalGudangId,
  modalTanggal,
  onChangeModalTanggal,
  nominal,
  onChangeNominal,
  keterangan,
  onChangeKeterangan,
  gudangList,
  isSubmittingSaldo,
  onSubmitSaldo,
  isPrintModalOpen,
  onClosePrintModal,
  startDateStr,
  endDateStr,
  baselineOpeningBalance,
  totalPemasukan,
  totalPengeluaran,
  saldoAkhir,
  printItems,
  onPrint,
}: LedgerModalsProps) {
  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        title={`Penyesuaian Saldo Kas (${modalTipe === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'})`}
        isBottomSheetOnMobile
      >
        <form onSubmit={onSubmitSaldo} className="mt-3 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => {
                onChangeModalTipe('PEMASUKAN');
                if (keterangan.includes('Penarikan')) {
                  onChangeKeterangan('Setor Modal / Tambahan Kas');
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                modalTipe === 'PEMASUKAN'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              <IconArrowDownLeft size={16} />
              Tambah Saldo (Masuk)
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeModalTipe('PENGELUARAN');
                if (keterangan.includes('Setor')) {
                  onChangeKeterangan('Penarikan Modal (Prive) / Koreksi');
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                modalTipe === 'PENGELUARAN'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              <IconArrowUpRight size={16} />
              Kurang Saldo (Keluar)
            </button>
          </div>

          <div
            className={`rounded-xl border p-3 text-xs ${
              modalTipe === 'PEMASUKAN'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300'
            }`}
          >
            {modalTipe === 'PEMASUKAN'
              ? 'Transaksi ini akan menambah saldo kas toko dan tercatat sebagai Debit (Pemasukan).'
              : 'Transaksi ini akan mengurangi saldo kas toko dan tercatat sebagai Kredit (Pengeluaran).'}
          </div>

          <SelectInput
            label="Lokasi Toko / Cabang"
            value={modalGudangId}
            onChange={(val) => onChangeModalGudangId(val)}
            options={gudangList.map((g) => ({
              label: `${g.nama} (${g.kode_gudang})`,
              value: g.id,
            }))}
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectInput
              label="Kategori Sumber"
              value={modalSumber}
              onChange={(val) => onChangeModalSumber(val as LedgerSumber)}
              options={[
                { label: 'Modal / Pemilik', value: 'MODAL' },
                { label: 'Lain-lain', value: 'LAIN_LAIN' },
              ]}
            />
            <TextInput
              label="Tanggal Transaksi"
              type="date"
              value={modalTanggal}
              onChange={(e) => onChangeModalTanggal(e.target.value)}
              required
            />
          </div>

          <TextInput
            label="Nominal (Rp)"
            value={nominal}
            onChange={(e) => {
              const num = e.target.value.replace(/\D/g, '');
              onChangeNominal(num ? Number(num).toLocaleString('id-ID') : '');
            }}
            placeholder="0"
            required
            className="text-lg font-bold"
          />

          <TextareaInput
            label="Keterangan / Alasan Penyesuaian"
            value={keterangan}
            onChange={(e) => onChangeKeterangan(e.target.value)}
            placeholder="Contoh: Setoran modal awal kasir, penarikan prive pemilik, selisih fisik opname..."
            required
            rows={2}
          />

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={onCloseModal} type="button">
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmittingSaldo}
              className={
                modalTipe === 'PEMASUKAN'
                  ? '!bg-emerald-600 hover:!bg-emerald-700'
                  : '!bg-rose-600 hover:!bg-rose-700'
              }
            >
              {isSubmittingSaldo ? 'Menyimpan...' : 'Simpan Penyesuaian'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPrintModalOpen}
        onClose={onClosePrintModal}
        title="Laporan Rekening Koran Buku Besar"
        size="xl"
      >
        <div className="mt-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500">
                Periode:{' '}
                <span className="font-bold text-neutral-900 dark:text-white">
                  {startDateStr
                    ? `${format(new Date(startDateStr), 'd MMM yyyy', { locale: localeId })} s/d ${endDateStr ? format(new Date(endDateStr), 'd MMM yyyy', { locale: localeId }) : 'Sekarang'}`
                    : 'Semua Periode Transaksi'}
                </span>
              </p>
              <p className="text-[11px] text-neutral-400">
                Dicetak pada:{' '}
                {format(new Date(), 'd MMMM yyyy HH:mm', { locale: localeId })}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={onPrint}
              className="flex items-center gap-2"
            >
              <IconPrinter size={16} />
              Cetak Dokumen / Simpan PDF
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-4 border-b border-neutral-300 pb-4 text-center dark:border-neutral-700">
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                LAPORAN REKENING KORAN BUKU BESAR
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Toko Inventory &amp; POS BMS
              </p>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] font-bold uppercase text-neutral-400">
                  Saldo Awal
                </p>
                <p className="mt-0.5 text-xs font-black text-neutral-900 dark:text-white">
                  Rp {baselineOpeningBalance.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] font-bold uppercase text-emerald-500">
                  Total Debit
                </p>
                <p className="mt-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  + Rp {totalPemasukan.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] font-bold uppercase text-rose-500">
                  Total Kredit
                </p>
                <p className="mt-0.5 text-xs font-black text-rose-600 dark:text-rose-400">
                  - Rp {totalPengeluaran.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="rounded-xl bg-brand-500 p-2.5 text-white">
                <p className="text-[10px] font-bold uppercase text-brand-100">
                  Saldo Akhir
                </p>
                <p className="mt-0.5 text-xs font-black">
                  Rp {saldoAkhir.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-300 bg-neutral-100 text-[10px] font-bold uppercase text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-2 py-2">Tanggal</th>
                  <th className="px-2 py-2">Keterangan</th>
                  <th className="px-2 py-2">Sumber</th>
                  <th className="px-2 py-2 text-right">Debit (Rp)</th>
                  <th className="px-2 py-2 text-right">Kredit (Rp)</th>
                  <th className="px-2 py-2 text-right">Saldo (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {printItems.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-2 py-2">
                      {format(new Date(item.tanggal), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-2 py-2">{item.keterangan}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-[10px]">
                      {item.sumber.replace(/_/g, ' ')}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-emerald-600">
                      {item.tipe_transaksi === 'PEMASUKAN'
                        ? Number(item.nominal).toLocaleString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-rose-600">
                      {item.tipe_transaksi === 'PENGELUARAN'
                        ? Number(item.nominal).toLocaleString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-2 py-2 text-right font-bold">
                      {Number(item.saldo_berjalan).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClosePrintModal}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
