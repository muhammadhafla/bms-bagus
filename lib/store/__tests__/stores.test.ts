import { describe, it, expect, beforeEach } from 'vitest';
import { usePembelianStore } from '../../store';
import { useTransferStore } from '../useTransferStore';
import { getLocalDateString } from '../../utils';

describe('Zustand Cart Stores (WIB Date Defaults & Reset)', () => {
  beforeEach(() => {
    usePembelianStore.getState().reset();
    useTransferStore.getState().reset();
  });

  it('usePembelianStore initializes and resets tanggal using WIB local date', () => {
    const expectedToday = getLocalDateString();
    expect(usePembelianStore.getState().tanggal).toBe(expectedToday);

    usePembelianStore.getState().setTanggal('2025-01-01');
    usePembelianStore.getState().setNomorNota('INV-999');
    expect(usePembelianStore.getState().tanggal).toBe('2025-01-01');

    usePembelianStore.getState().reset();
    expect(usePembelianStore.getState().tanggal).toBe(getLocalDateString());
    expect(usePembelianStore.getState().nomorNota).toBe('');
    expect(usePembelianStore.getState().items).toHaveLength(0);
  });

  it('useTransferStore initializes and resets tanggalKirim using WIB local date', () => {
    const expectedToday = getLocalDateString();
    expect(useTransferStore.getState().tanggalKirim).toBe(expectedToday);

    useTransferStore.getState().setTanggalKirim('2025-02-02');
    useTransferStore.getState().setKurir('JNE');
    useTransferStore.getState().addItem({
      inventory_id: 'inv-1',
      nama_barang: 'Kertas A4',
      kode_barcode: '8991001',
      unit: 'rim',
      stok_tersedia: 20,
      qty_kirim: 5,
    });

    expect(useTransferStore.getState().getTotalItems()).toBe(1);
    expect(useTransferStore.getState().getTotalQty()).toBe(5);

    useTransferStore.getState().reset();
    expect(useTransferStore.getState().tanggalKirim).toBe(getLocalDateString());
    expect(useTransferStore.getState().kurir).toBe('');
    expect(useTransferStore.getState().items).toHaveLength(0);
  });
});
