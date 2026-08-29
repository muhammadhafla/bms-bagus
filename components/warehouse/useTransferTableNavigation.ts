import { useState, useCallback } from 'react';
import { TransferCartItem } from '@/lib/store/useTransferStore';

type EditMode = 'qty' | 'catatan' | null;

interface TransferTableNavigationProps {
  items: TransferCartItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQty: (id: string, value: number) => void;
  onUpdateCatatan: (id: string, value: string) => void;
  focusInput: () => void;
}

export function useTransferTableNavigation({
  items,
  onRemoveItem,
  onUpdateQty,
  onUpdateCatatan,
  focusInput,
}: TransferTableNavigationProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState<any>('');

  const handleEditSubmit = useCallback(() => {
    if (selectedIndex === null || !editMode) return;

    const item = items[selectedIndex];
    if (!item) return;

    if (editMode === 'qty') {
      const num = parseInt(editValue);
      if (!isNaN(num)) {
        if (num <= 0) {
          onRemoveItem(item.inventory_id);
        } else {
          onUpdateQty(item.inventory_id, num);
        }
      }
    } else if (editMode === 'catatan') {
      onUpdateCatatan(item.inventory_id, String(editValue || ''));
    }

    setEditMode(null);
    setSelectedIndex(null);
    focusInput();
  }, [items, selectedIndex, editMode, editValue, onUpdateQty, onUpdateCatatan, onRemoveItem, focusInput]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (['Enter', 'ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        const item = items[index];
        if (item) {
          if (editMode === 'qty') {
            const num = parseInt(editValue);
            if (!isNaN(num)) {
              if (num <= 0) onRemoveItem(item.inventory_id);
              else onUpdateQty(item.inventory_id, num);
            }
          } else if (editMode === 'catatan') {
            onUpdateCatatan(item.inventory_id, String(editValue || ''));
          }
        }

        let nextIndex = index;
        let nextMode = editMode;

        if (e.key === 'Enter') {
          setEditMode(null);
          setSelectedIndex(null);
          focusInput();
          return;
        } else if (e.key === 'ArrowUp') {
          nextIndex = Math.max(0, index - 1);
        } else if (e.key === 'ArrowDown') {
          nextIndex = index + 1;
        } else if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (editMode === 'catatan') nextMode = 'qty';
            else if (editMode === 'qty') {
              nextMode = 'catatan';
              nextIndex = Math.max(0, index - 1);
            }
          } else {
            if (editMode === 'qty') nextMode = 'catatan';
            else if (editMode === 'catatan') {
              nextMode = 'qty';
              nextIndex = index + 1;
            }
          }
        }

        if (items[nextIndex] && nextMode) {
          setSelectedIndex(nextIndex);
          setEditMode(nextMode);
          const nextItem = items[nextIndex];
          if (nextMode === 'qty') setEditValue(nextItem.qty_kirim);
          else if (nextMode === 'catatan') setEditValue(nextItem.catatan || '');
        } else {
          setEditMode(null);
          setSelectedIndex(null);
          focusInput();
        }
      }
    },
    [items, editMode, editValue, onUpdateQty, onUpdateCatatan, onRemoveItem, focusInput],
  );

  return {
    selectedIndex,
    setSelectedIndex,
    editMode,
    setEditMode,
    editValue,
    setEditValue,
    handleEditSubmit,
    handleEditKeyDown,
  };
}
