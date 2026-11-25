import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlideOver } from '../SlideOver';
import { CheckboxInput } from '../CheckboxInput';
import SelectInput from '../SelectInput';

describe('UI Primitives Accessibility', () => {
  describe('SlideOver', () => {
    it('exposes dialog role, aria-modal, aria-labelledby, and closes on Escape', () => {
      const onClose = vi.fn();
      render(
        <SlideOver isOpen={true} onClose={onClose} title="Detail Transaksi">
          <button type="button">Aksi</button>
        </SlideOver>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent('Detail Transaksi');

      expect(screen.getByRole('button', { name: 'Tutup panel' })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('CheckboxInput', () => {
    it('renders a single native checkbox associated with its label and toggles on change', () => {
      const handleChange = vi.fn();
      render(
        <CheckboxInput checked={false} onChange={handleChange} label="Aktifkan promo" />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Aktifkan promo' });
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('SelectInput', () => {
    it('renders trigger button separately from sibling clear button and opens accessible listbox', () => {
      function ControlledSelect() {
        const [val, setVal] = useState('opt-1');
        return (
          <SelectInput
            label="Kategori Produk"
            value={val}
            onChange={setVal}
            options={[
              { value: 'opt-1', label: 'Alat Tulis' },
              { value: 'opt-2', label: 'Kertas' },
            ]}
            searchable
            clearable
          />
        );
      }

      render(<ControlledSelect />);

      const clearBtn = screen.getByRole('button', { name: 'Kosongkan pilihan' });
      expect(clearBtn).toBeInTheDocument();

      const trigger = screen.getByRole('button', { name: 'Kategori Produk' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveTextContent('Alat Tulis');
      expect(clearBtn.contains(trigger)).toBe(false);
      expect(trigger.contains(clearBtn)).toBe(false);

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Alat Tulis' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('option', { name: 'Kertas' })).toHaveAttribute(
        'aria-selected',
        'false',
      );

      fireEvent.click(screen.getByRole('option', { name: 'Kertas' }));
      expect(screen.getByRole('button', { name: 'Kategori Produk' })).toHaveTextContent('Kertas');
    });
  });
});
