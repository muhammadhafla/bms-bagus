import { useState, useEffect } from 'react';
import { kategoriApi } from '@/lib/api';
import { generateAutoBarcode } from '@/lib/utils';
import { IconCheck, IconX, IconBarcode, IconSearch, IconAlertCircle } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button, Modal, MobileAutocompleteSheet, TextInput } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHotkeys } from 'react-hotkeys-hook';
import { useKategoris } from '@/lib/hooks/useKategoris';

interface NewItemDialogProps {
  open: boolean;
  initialBarcode?: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (data: {
    nama_barang: string;
    barcode: string;
    kategori: string;
    id_kategori?: string;
    harga_beli: number;
    harga_jual: number;
    diskon: number;
  }) => void;
}

export function NewItemDialog({
  open,
  initialBarcode,
  initialName,
  onClose,
  onSubmit,
}: NewItemDialogProps) {
  const [nama_barang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('Umum');
  const [barcode, setBarcode] = useState('');
  const [harga_beli, setHargaBeli] = useState(0);
  const [harga_jual, setHargaJual] = useState(0);
  const { data: kategoriResponse } = useKategoris();
  const kategoriList = kategoriResponse?.map((k) => k.nama) || [];
  const [showKategoriSuggestions, setShowKategoriSuggestions] = useState(false);
  const [filteredKategori, setFilteredKategori] = useState<string[]>([]);
  const [kategoriSelectedIndex, setKategoriSelectedIndex] = useState<number>(-1);
  const [marginWarning, setMarginWarning] = useState(false);
  const [showMobileKategori, setShowMobileKategori] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 640px)');

  useEffect(() => {
    if (harga_beli > 0 && harga_jual > 0 && harga_beli >= harga_jual) {
      setMarginWarning(true);
    } else {
      setMarginWarning(false);
    }
  }, [harga_beli, harga_jual]);

  useEffect(() => {
    if (open) {
      setNamaBarang(initialName || '');
      setKategori('Umum');
      setHargaBeli(0);
      setHargaJual(0);

      if (initialBarcode && initialBarcode.trim()) {
        setBarcode(initialBarcode);
      } else {
        setBarcode(generateAutoBarcode());
      }
    }
  }, [open, initialBarcode, initialName]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.trim() === '') {
      setBarcode(generateAutoBarcode());
    } else {
      setBarcode(value);
    }
  };

  const handleKategoriChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKategori(value);
    setKategoriSelectedIndex(-1);

    if (value.trim().length > 0) {
      const filtered = kategoriList
        .filter((k) => k.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setFilteredKategori(filtered);
      setShowKategoriSuggestions(filtered.length > 0);
    } else {
      setShowKategoriSuggestions(false);
    }
  };

  const handleSelectKategori = (nama: string) => {
    setKategori(nama);
    setShowKategoriSuggestions(false);
    setKategoriSelectedIndex(-1);
  };

  const handleSubmit = async (e: React.FormEvent | Event) => {
    e.preventDefault();
    if (marginWarning) return;

    if (nama_barang.trim()) {
      const kategoriResult = await kategoriApi.getOrCreate(kategori.trim());
      const id_kategori = kategoriResult.data?.id;

      onSubmit({
        nama_barang: nama_barang.trim(),
        barcode,
        kategori,
        id_kategori,
        harga_beli,
        harga_jual,
        diskon: 0,
      });
    }
  };

  useHotkeys('f9', (e) => {
    e.preventDefault();
    if (nama_barang.trim()) {
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }
  }, { enableOnFormTags: true, enabled: open });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Barang Baru" size="md" isBottomSheetOnMobile>
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            if (e.defaultPrevented) return;
            e.preventDefault();
            const form = e.currentTarget;
            const focusable = Array.from(
              form.querySelectorAll('input, button[type="submit"]'),
            ).filter((el) => !(el as HTMLInputElement).disabled) as HTMLElement[];
            const index = focusable.indexOf(e.target as HTMLElement);
            if (index > -1 && index < focusable.length - 1) {
              focusable[index + 1].focus();
            }
          }
        }}
      >
        <div className="mb-4">
          <TextInput
            label="Nama Barang"
            value={nama_barang}
            onChange={(e) => setNamaBarang(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mb-4">
          <TextInput
            label="Barcode"
            helperText="(kosongkan untuk auto generate)"
            value={barcode}
            onChange={handleBarcodeChange}
            className="font-mono"
          />
          {barcode.startsWith('AUTO-') && (
            <p className="text-brand-600 dark:text-brand-400 mt-1.5 flex items-center gap-1 text-xs">
              <IconCheck size={14} /> Barcode dihasilkan otomatis oleh sistem
            </p>
          )}
        </div>

        <div className="relative mb-5">
          <TextInput
            label="Kategori"
            placeholder="Masukkan nama kategori"
            value={kategori}
            onChange={isDesktop ? handleKategoriChange : undefined}
            onClick={() => {
              if (!isDesktop) setShowMobileKategori(true);
            }}
            readOnly={!isDesktop}
            onFocus={() => {
              if (isDesktop && kategoriList.length > 0) {
                setShowKategoriSuggestions(true);
                if (kategori.trim().length === 0) {
                  setFilteredKategori(kategoriList.slice(0, 5));
                }
              }
            }}
            onBlur={
              isDesktop ? () => setTimeout(() => setShowKategoriSuggestions(false), 200) : undefined
            }
            onKeyDown={
              isDesktop
                ? (e) => {
                    if (!showKategoriSuggestions) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setKategoriSelectedIndex((prev) =>
                        Math.min(prev + 1, filteredKategori.length - 1),
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setKategoriSelectedIndex((prev) => Math.max(prev - 1, -1));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (
                        kategoriSelectedIndex >= 0 &&
                        kategoriSelectedIndex < filteredKategori.length
                      ) {
                        handleSelectKategori(filteredKategori[kategoriSelectedIndex]);
                      }
                    }
                  }
                : undefined
            }
            className={!isDesktop ? 'cursor-pointer' : ''}
            autoComplete="off"
          />

          {isDesktop && showKategoriSuggestions && (
            <div className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-xl border border-white/40 bg-white/95 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95">
              {filteredKategori.map((nama, idx) => (
                <button
                  key={nama}
                  type="button"
                  onClick={() => handleSelectKategori(nama)}
                  className={`w-full px-4 py-2.5 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100/50 dark:text-neutral-100 dark:hover:bg-neutral-800/50 ${kategoriSelectedIndex === idx ? 'bg-neutral-100/50 dark:bg-neutral-800/50' : ''}`}
                >
                  {nama}
                </button>
              ))}
            </div>
          )}

          {!isDesktop && (
            <MobileAutocompleteSheet
              isOpen={showMobileKategori}
              onClose={() => setShowMobileKategori(false)}
              options={kategoriList}
              onSelect={(selected) => {
                setKategori(selected);
              }}
            />
          )}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Harga Beli
            </label>
            <PriceInput
              value={harga_beli}
              onChange={setHargaBeli}
              className="focus:border-brand-500 w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 shadow-sm backdrop-blur-sm transition-all focus:outline-none dark:border-white/10 dark:bg-neutral-950/50"
              min={0}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Harga Jual
            </label>
            <PriceInput
              value={harga_jual}
              onChange={setHargaJual}
              className="focus:border-brand-500 w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 shadow-sm backdrop-blur-sm transition-all focus:outline-none dark:border-white/10 dark:bg-neutral-950/50"
              min={0}
            />
          </div>
        </div>

        {marginWarning && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <IconAlertCircle className="h-5 w-5 shrink-0" />
            <p>
              Harga Beli lebih besar atau sama dengan Harga Jual. Silakan periksa kembali untuk
              menghindari margin negatif.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="primary" type="submit" className="w-full" disabled={marginWarning}>
            Simpan (F9)
          </Button>
        </div>
      </form>
    </Modal>
  );
}
