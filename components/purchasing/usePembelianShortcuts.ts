import { useHotkeys } from 'react-hotkeys-hook';

interface PembelianShortcutsProps {
  items: any[];
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditMode: (mode: 'qty' | 'harga' | 'harga_jual' | null) => void;
  setEditValue: (value: number) => void;
  removeItem: (id: string) => void;
  selectedIndex: number | null;
  setShowResetConfirm: (show: boolean) => void;
  handleSimpan: () => void;
  submitting: boolean;
}

export function usePembelianShortcuts({
  items,
  setSelectedIndex,
  setEditMode,
  setEditValue,
  removeItem,
  selectedIndex,
  setShowResetConfirm,
  handleSimpan,
  submitting,
}: PembelianShortcutsProps) {
  useHotkeys('f2', (e) => {
    e.preventDefault();
    if (items.length > 0) {
      setSelectedIndex(0);
      setEditMode('qty');
      setEditValue(items[0].qty);
    }
  }, { enableOnFormTags: true });

  useHotkeys('f3', (e) => {
    e.preventDefault();
    if (items.length > 0) {
      setSelectedIndex(0);
      setEditMode('harga');
      setEditValue(items[0].harga_beli || 0);
    }
  }, { enableOnFormTags: true });

  useHotkeys('f4', (e) => {
    e.preventDefault();
    if (items.length > 0) {
      setSelectedIndex(0);
      setEditMode('harga_jual');
      setEditValue(items[0].harga_jual || 0);
    }
  }, { enableOnFormTags: true });

  useHotkeys('delete', (e) => {
    e.preventDefault();
    if (selectedIndex !== null && items[selectedIndex]) {
      removeItem(items[selectedIndex].id);
      setSelectedIndex((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    setEditMode(null);
    setSelectedIndex(null);
  }, { enableOnFormTags: true });

  useHotkeys('f6', (e) => {
    e.preventDefault();
    setShowResetConfirm(true);
  }, { enableOnFormTags: true });

  useHotkeys('f9', (e) => {
    e.preventDefault();
    if (items.length > 0 && !submitting) {
      handleSimpan();
    }
  }, { enableOnFormTags: true });
}
