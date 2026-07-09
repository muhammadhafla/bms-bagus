import { useState, useEffect } from 'react';
import { kategoriApi } from '@/lib/api';
import { generateAutoBarcode } from '@/lib/utils';
import { IconCheck } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';

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
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [showKategoriSuggestions, setShowKategoriSuggestions] = useState(false);
  const [filteredKategori, setFilteredKategori] = useState<string[]>([]);
  const [kategoriSelectedIndex, setKategoriSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    const loadKategori = async () => {
      const result = await kategoriApi.getAll();
      if (result.data) {
        setKategoriList(result.data.map(k => k.nama));
      }
    };
    loadKategori();
  }, []);

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
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-neutral-900/60" onClick={onClose} />
        <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-elevated w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Barang Baru</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Nama Barang</label>
            <input
              type="text"
              value={nama_barang}
              onChange={(e) => setNamaBarang(e.target.value)}
              className="w-full px-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-neutral-100"
              autoFocus
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Barcode 
              <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-2">(kosongkan untuk auto generate)</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={handleBarcodeChange}
              className="w-full px-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all font-mono text-neutral-900 dark:text-neutral-100"
            />
            {barcode.startsWith('AUTO-') && (
              <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5 flex items-center gap-1">
                <IconCheck size={14} /> Barcode dihasilkan otomatis oleh sistem
              </p>
            )}
          </div>
          
          <div className="mb-5 relative">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Kategori</label>
            <input
              type="text"
              value={kategori}
              onChange={handleKategoriChange}
              onFocus={() => {
                if (kategoriList.length > 0) {
                  setShowKategoriSuggestions(true);
                  if (kategori.trim().length === 0) {
                    setFilteredKategori(kategoriList.slice(0, 5));
                  }
                }
              }}
              onBlur={() => setTimeout(() => setShowKategoriSuggestions(false), 200)}
              onKeyDown={(e) => {
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
              }}
              className="w-full px-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-neutral-100"
              placeholder="Masukkan nama kategori"
              autoComplete="off"
            />
            
            {showKategoriSuggestions && (
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
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
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
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button variant="primary" type="submit" className="flex-1">
              Simpan
            </Button>
          </div>
        </form>
      </div>
      </div>
    </Portal>
  );
}
