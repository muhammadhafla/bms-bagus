import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MonthPicker } from './MonthPicker';

describe('MonthPicker Component & Accessibility', () => {
  describe('Inline Variant', () => {
    it('renders inline calendar with all 12 months and year navigation', () => {
      const handleChange = vi.fn();
      render(
        <MonthPicker
          variant="inline"
          value="2026-09"
          onChange={handleChange}
        />
      );

      // Verify group container
      const group = screen.getByRole('group', { name: /Pilih Periode Bulan/i });
      expect(group).toBeInTheDocument();

      // Verify year display
      expect(screen.getByText('2026')).toBeInTheDocument();

      // Verify year navigation buttons
      const prevYearBtn = screen.getByRole('button', { name: /Tahun Sebelumnya/i });
      const nextYearBtn = screen.getByRole('button', { name: /Tahun Berikutnya/i });
      expect(prevYearBtn).toBeInTheDocument();
      expect(nextYearBtn).toBeInTheDocument();

      // Check selected month button
      const sepButton = screen.getByRole('button', { name: /September 2026/i });
      expect(sepButton).toBeInTheDocument();
      expect(sepButton).toHaveAttribute('aria-pressed', 'true');

      // Check another month button
      const augButton = screen.getByRole('button', { name: /Agustus 2026/i });
      expect(augButton).toBeInTheDocument();
      expect(augButton).toHaveAttribute('aria-pressed', 'false');

      // Click another month
      fireEvent.click(augButton);
      expect(handleChange).toHaveBeenCalledWith('2026-08');
    });

    it('navigates years correctly in inline variant', () => {
      const handleChange = vi.fn();
      render(
        <MonthPicker
          variant="inline"
          value="2026-05"
          onChange={handleChange}
        />
      );

      const nextYearBtn = screen.getByRole('button', { name: /Tahun Berikutnya/i });
      fireEvent.click(nextYearBtn);

      expect(screen.getByText('2027')).toBeInTheDocument();

      const jan2027 = screen.getByRole('button', { name: /Januari 2027/i });
      fireEvent.click(jan2027);

      expect(handleChange).toHaveBeenCalledWith('2027-01');
    });
  });

  describe('Popover Variant', () => {
    it('opens popover, allows month selection, and closes popover', () => {
      const handleChange = vi.fn();
      render(
        <MonthPicker
          variant="popover"
          value="2026-09"
          onChange={handleChange}
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      // Open popover
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      const dialog = screen.getByRole('dialog', { name: /Pilih Bulan/i });
      expect(dialog).toBeInTheDocument();

      // Select October
      const oktBtn = screen.getByRole('button', { name: /Oktober 2026/i });
      fireEvent.click(oktBtn);

      expect(handleChange).toHaveBeenCalledWith('2026-10');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes popover on Escape key', () => {
      const handleChange = vi.fn();
      render(
        <MonthPicker
          variant="popover"
          value="2026-09"
          onChange={handleChange}
        />
      );

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
