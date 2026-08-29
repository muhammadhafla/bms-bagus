import { useHotkeys } from 'react-hotkeys-hook';
import { TransferCartItem } from '@/lib/store/useTransferStore';

interface TransferShortcutsProps {
  items: TransferCartItem[];
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setEditMode: (mode: 'qty' | 'catatan' | null) => void;
  setEditValue: (value: any) => void;
  removeItem: (id: string) => void;
  selectedIndex: number | null;
  setShowResetConfirm: (show: boolean) => void;
  handleSimpan: () => void;
  submitting: boolean;
  enabled?: boolean;
}

export function useTransferShortcuts({
  items,
  setSelectedIndex,
  setEditMode,
  setEditValue,
  removeItem,
  selectedIndex,
  setShowResetConfirm,
  handleSimpan,
  submitting,
  enabled = true,
}: TransferShortcutsProps) {
  // F2: Edit Qty on active or first item
  useHotkeys(
    'f2',
    (e) => {
      e.preventDefault();
      if (items.length > 0) {
        const targetIndex = selectedIndex !== null && selectedIndex < items.length ? selectedIndex : 0;
        setSelectedIndex(targetIndex);
        setEditMode('qty');
        setEditValue(items[targetIndex].qty_kirim);
      }
    },
    { enableOnFormTags: true, enabled },
  );

  // Delete key: Remove active row
  useHotkeys(
    'delete',
    (e) => {
      e.preventDefault();
      if (selectedIndex !== null && items[selectedIndex]) {
        removeItem(items[selectedIndex].inventory_id);
        setSelectedIndex((prev) => (prev === null ? null : Math.max(0, prev - 1)));
      }
    },
    { enableOnFormTags: true, enabled },
  );

  // Escape key: Cancel inline edit
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      setEditMode(null);
      setSelectedIndex(null);
    },
    { enableOnFormTags: true, enabled },
  );

  // F6: Trigger reset confirm dialog
  useHotkeys(
    'f6',
    (e) => {
      e.preventDefault();
      if (items.length > 0) {
        setShowResetConfirm(true);
      }
    },
    { enableOnFormTags: true, enabled },
  );

  // F9: Trigger Simpan & Langsung Kirim
  useHotkeys(
    'f9',
    (e) => {
      e.preventDefault();
      if (items.length > 0 && !submitting) {
        handleSimpan();
      }
    },
    { enableOnFormTags: true, enabled },
  );
}
