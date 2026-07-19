import { useState, useEffect } from 'react';
import { kategoriApi } from '@/lib/api';
import { generateAutoBarcode } from '@/lib/utils';
import { IconCheck, IconX, IconBarcode, IconSearch, IconAlertCircle } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button, Modal, MobileAutocompleteSheet, TextInput } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import { useKategoris } from '@/lib/hooks/useKategoris';

interface NewItemDialogProps {
  open: boolean;
  initialBarcode?: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (data: { nama_barang: string; barcode: string; kategori: string; id_kategori?: string; harga_beli: number; harga_jual: number; diskon: number }) => void;
}

export function NewItemDialog({ open, initialBarcode, initialName, onClose, onSubmit }: NewItemDialogProps) {
  const [nama_barang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('Umum');
  const [barcode, setBarcode] = useState('');
  const [harga_beli, setHargaBeli] = useState(0);
  const [harga_jual, setHargaJual] = useState(0);
  const [diskon, setDiskon] = useState(0);
  const { data: kategoriResponse } = useKategoris();
  const kategoriList = kategoriResponse?.map(k => k.nama) || [];
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
      setDiskon(0);
      
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
      const filtered = kategoriList.filter(k => 
        k.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
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
        diskon
      });
    }
  };

  useKeyboardShortcuts(
    open ? [
      {
        key: 's',
        ctrl: true,
        allowInInput: true,
        description: 'Simpan Data',
        handler: () => {
          if (nama_barang.trim()) {
            handleSubmit(new Event('submit') as unknown as React.FormEvent);
          }
        },
      }
    ] : []
  );

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
        <form onSubmit={handleSubmit}>
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
              <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5 flex items-center gap-1">
                <IconCheck size={14} /> Barcode dihasilkan otomatis oleh sistem
              </p>
            )}
          </div>
          
          <div className="mb-5 relative">
            <TextInput
              label="Kategori"
              placeholder="Masukkan nama kategori"
              value={kategori}
              onChange={isDesktop ? handleKategoriChange : undefined}
              onClick={() => { if (!isDesktop) setShowMobileKategori(true); }}
              readOnly={!isDesktop}
              onFocus={() => {
                if (isDesktop && kategoriList.length > 0) {
                  setShowKategoriSuggestions(true);
                  if (kategori.trim().length === 0) {
                    setFilteredKategori(kategoriList.slice(0, 5));
                  }
                }
              }}
              onBlur={isDesktop ? () => setTimeout(() => setShowKategoriSuggestions(false), 200) : undefined}
              onKeyDown={isDesktop ? (e) => {
                if (!showKategoriSuggestions) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setKategoriSelectedIndex(prev => Math.min(prev + 1, filteredKategori.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setKategoriSelectedIndex(prev => Math.max(prev - 1, -1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (kategoriSelectedIndex >= 0 && kategoriSelectedIndex < filteredKategori.length) {
                    handleSelectKategori(filteredKategori[kategoriSelectedIndex]);
                  }
                }
              } : undefined}
              className={!isDesktop ? 'cursor-pointer' : ''}
              autoComplete="off"
            />
            
            {isDesktop && showKategoriSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl shadow-lg z-10 overflow-hidden">
                {filteredKategori.map((nama, idx) => (
                  <button
                    key={nama}
                    type="button"
                    onClick={() => handleSelectKategori(nama)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 text-sm text-neutral-900 dark:text-neutral-100 transition-colors ${kategoriSelectedIndex === idx ? 'bg-neutral-100/50 dark:bg-neutral-800/50' : ''}`}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Harga Beli</label>
              <PriceInput
                value={harga_beli}
                onChange={setHargaBeli}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Harga Jual</label>
              <PriceInput
                value={harga_jual}
                onChange={setHargaJual}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Diskon (Rp)</label>
              <PriceInput
                value={diskon}
                onChange={setDiskon}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all"
                min={0}
              />
            </div>
          </div>
          
          {marginWarning && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2">
              <IconAlertCircle className="w-5 h-5 shrink-0" />
              <p>Harga Beli lebih besar atau sama dengan Harga Jual. Silakan periksa kembali untuk menghindari margin negatif.</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button variant="primary" type="submit" className="flex-1" disabled={marginWarning}>
              Simpan
            </Button>
          </div>
        </form>
    </Modal>
  );
}
