import { useState, useCallback } from 'react';

type EditMode = 'qty' | 'harga' | 'harga_jual' | null;

interface TableNavigationProps<T extends { id: string }> {
  items: T[];
  onRemoveItem?: (id: string) => void;
  onUpdateQty?: (id: string, value: number) => void;
  onUpdateHarga?: (id: string, value: number) => void;
  onUpdateHargaJual?: (id: string, value: number) => void;
  focusInput: () => void;
}

export function useTableNavigation<T extends { id: string }>({
  items,
  onRemoveItem,
  onUpdateQty,
  onUpdateHarga,
  onUpdateHargaJual,
  focusInput,
}: TableNavigationProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const handleEditSubmit = useCallback(() => {
    if (selectedIndex === null || !editMode) return;

    const value = editValue;
    if (isNaN(value) || value < 0) return;

    const item = items[selectedIndex];
    if (!item) return;

    if (editMode === 'qty' && onUpdateQty) {
      if (value === 0 && onRemoveItem) {
        onRemoveItem(item.id);
      } else {
        onUpdateQty(item.id, value);
      }
    } else if (editMode === 'harga' && onUpdateHarga) {
      onUpdateHarga(item.id, value);
    } else if (editMode === 'harga_jual' && onUpdateHargaJual) {
      onUpdateHargaJual(item.id, value);
    }

    setEditMode(null);
    setSelectedIndex(null);
    focusInput();
  }, [
    items,
    selectedIndex,
    editMode,
    editValue,
    onUpdateQty,
    onUpdateHarga,
    onUpdateHargaJual,
    onRemoveItem,
    focusInput,
  ]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (['Enter', 'ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        const value = editValue;
        const item = items[index];
        
        if (item && !isNaN(value) && value >= 0) {
          if (editMode === 'qty' && onUpdateQty) {
            if (value === 0 && onRemoveItem) onRemoveItem(item.id);
            else onUpdateQty(item.id, value);
          } else if (editMode === 'harga' && onUpdateHarga) {
            onUpdateHarga(item.id, value);
          } else if (editMode === 'harga_jual' && onUpdateHargaJual) {
            onUpdateHargaJual(item.id, value);
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
            if (editMode === 'harga_jual' && onUpdateHarga) nextMode = 'harga';
            else if (editMode === 'harga' && onUpdateQty) nextMode = 'qty';
            else if (editMode === 'qty') {
              if (onUpdateHargaJual) nextMode = 'harga_jual';
              nextIndex = Math.max(0, index - 1);
            }
          } else {
            if (editMode === 'qty' && onUpdateHarga) nextMode = 'harga';
            else if (editMode === 'harga' && onUpdateHargaJual) nextMode = 'harga_jual';
            else if (editMode === 'harga_jual') {
              if (onUpdateQty) nextMode = 'qty';
              nextIndex = index + 1;
            }
          }
        }

        if (items[nextIndex] && nextMode) {
          setSelectedIndex(nextIndex);
          setEditMode(nextMode);
          const nextItem: any = items[nextIndex];
          if (nextMode === 'qty') setEditValue(nextItem.qty || 0);
          else if (nextMode === 'harga') setEditValue(nextItem.harga_beli || 0);
          else if (nextMode === 'harga_jual') setEditValue(nextItem.harga_jual || 0);
        } else {
          setEditMode(null);
          setSelectedIndex(null);
          focusInput();
        }
      }
    },
    [
      items,
      editMode,
      editValue,
      onUpdateQty,
      onUpdateHarga,
      onUpdateHargaJual,
      onRemoveItem,
      focusInput,
    ]
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
