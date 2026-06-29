import { useEffect } from 'react';
import { InventoryItem } from '@/types/inventory';
import { Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';

interface ItemSuggestionDialogProps {
  open: boolean;
  query: string;
  items: Array<InventoryItem & { similarity: number }>;
  onSelect: (item: InventoryItem) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export function ItemSuggestionDialog({ open, query, items, onSelect, onCreateNew, onClose }: ItemSuggestionDialogProps) {
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
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">Apakah maksud anda:</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Pencarian untuk: <span className="font-medium text-neutral-900 dark:text-neutral-100">{query}</span></p>
        
        <div className="space-y-2 mb-6 max-h-64 overflow-auto pr-2 custom-scrollbar">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left p-3 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/80 border border-white/20 dark:border-white/5 transition-all flex justify-between items-center btn-press shadow-sm"
            >
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.kode_barcode || 'Tanpa barcode'}</div>
              </div>
              <div className="text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full font-medium">
                {item.similarity}% cocok
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button variant="primary" onClick={onCreateNew} className="flex-1">
            Tambah Baru
          </Button>
        </div>
        </div>
      </div>
    </Portal>
  );
}
