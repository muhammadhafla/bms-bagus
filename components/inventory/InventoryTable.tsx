'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface UndoHistory {
  id: string;
  previousData: Partial<InventoryItem>;
  timestamp: number;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete?: (id: string) => void;
}

export function InventoryTable({ items, onUpdate, onDelete }: InventoryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'harga_jual' | 'diskon' | 'minimum_stock' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [undoHistory, setUndoHistory] = useState<UndoHistory[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string | null }>({
    isOpen: false,
    itemId: null,
  });
  const { showToast } = useToast();
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const UNDO_DURATION = 10000;

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const startEdit = useCallback((item: InventoryItem, field: 'harga_jual' | 'diskon' | 'minimum_stock') => {
    setEditingId(item.id);
    setEditField(field);
    setEditValue(String(item[field]));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editField) return;

    const item = items.find(i => i.id === editingId);
    if (!item) return;

    const value = editField === 'diskon' || editField === 'minimum_stock' 
      ? parseInt(editValue) 
      : parseFloat(editValue);

    if (isNaN(value)) {
      setEditingId(null);
      setEditField(null);
      return;
    }

    const previousData = { [editField]: item[editField] };

    setUndoHistory(prev => {
      const newHistory = [...prev, { id: editingId, previousData, timestamp: Date.now() }];
      
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      
      undoTimeoutRef.current = setTimeout(() => {
        setUndoHistory(h => h.filter(history => history.id !== editingId));
      }, UNDO_DURATION);
      
      return newHistory;
    });

    await onUpdate(editingId, { [editField]: value });
    setEditingId(null);
    setEditField(null);
  }, [editingId, editField, editValue, items, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditField(null);
  }, []);

  const handleUndo = useCallback((id: string) => {
    const history = undoHistory.find(h => h.id === id);
    if (!history) return;

    onUpdate(id, history.previousData);
    setUndoHistory(prev => prev.filter(h => h.id !== id));
    showToast('Edit dibatalkan', 'info');
  }, [undoHistory, onUpdate, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm.itemId || !onDelete) return;
    await onDelete(deleteConfirm.itemId);
    setDeleteConfirm({ isOpen: false, itemId: null });
  }, [deleteConfirm.itemId, onDelete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <span className="text-5xl mb-4">📦</span>
        <p className="text-lg font-medium">Tidak ada data inventory</p>
        <p className="text-sm">Tambahkan barang melalui halaman Pembelian</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      {undoHistory.length > 0 && (
        <div className="bg-brand-50 dark:bg-brand-900/30 border-b border-brand-200 dark:border-brand-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-brand-700 dark:text-brand-300">
            Perubahan tersimpan. Klik undo untuk membatalkan.
          </span>
          <div className="flex items-center gap-2">
            {undoHistory.map((history) => (
              <button
                key={history.id}
                onClick={() => handleUndo(history.id)}
                className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 font-medium"
              >
                Undo
              </button>
            ))}
          </div>
        </div>
      )}
      <table className="w-full min-w-[900px]">
        <thead className="bg-neutral-50 dark:bg-neutral-950 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Barcode</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Kategori</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Jual</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Diskon</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Stok</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Min Stock</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => {
            const isLowStock = item.stok <= (item.minimum_stock || 0);
            const isEditing = editingId === item.id;

            return (
              <tr 
                key={item.id} 
                className={isLowStock ? 'bg-red-50/50 dark:bg-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/50' : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'}
              >
                <td className="px-4 py-3 text-sm font-mono text-neutral-900 dark:text-neutral-100">{item.barcode}</td>
                <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {item.kategori?.nama || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isEditing && editField === 'harga_jual' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      autoFocus
                      className="w-28 px-3 py-2 text-right border-2 border-brand-500 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(item, 'harga_jual')}
                      className="px-3 py-2 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-28 block ml-auto font-medium text-neutral-900 dark:text-neutral-100"
                    >
                      {formatCurrency(item.harga_jual)}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isEditing && editField === 'diskon' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      autoFocus
                      className="w-24 px-3 py-2 text-right border-2 border-brand-500 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(item, 'diskon')}
                      className="px-3 py-2 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-24 block ml-auto text-neutral-600 dark:text-neutral-300"
                    >
                      {formatCurrency(item.diskon)}
                    </button>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${isLowStock ? 'text-red-600 dark:text-red-300' : 'text-neutral-900 dark:text-neutral-100'}`}>
                  {item.stok}
                </td>
                <td className="px-4 py-3 text-right">
                  {isEditing && editField === 'minimum_stock' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      autoFocus
                      className="w-20 px-3 py-2 text-right border-2 border-brand-500 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(item, 'minimum_stock')}
                      className="px-3 py-2 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-20 block ml-auto text-neutral-500 dark:text-neutral-300"
                    >
                      {item.minimum_stock}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {onDelete && (
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, itemId: item.id })}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      aria-label={`Hapus ${item.nama_barang}`}
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Hapus Barang"
        message={`Apakah Anda yakin ingin menghapus "${items.find(i => i.id === deleteConfirm.itemId)?.nama_barang}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, itemId: null })}
        danger
      />
    </div>
  );
}