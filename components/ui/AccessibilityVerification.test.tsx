import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateRangePicker } from './DateRangePicker';
import { DataTable } from './DataTable/DataTable';
import { Pagination } from './DataTable/Pagination';

describe('Accessibility Verification Tests', () => {
  
  describe('DateRangePicker Accessibility', () => {
    it('1. Escape key closes DateRangePicker', async () => {
      const handleChange = vi.fn();
      render(
        <DateRangePicker
          startDate="2026-07-01"
          endDate="2026-07-07"
          onChange={handleChange}
          label="Pilih Periode Laporan"
        />
      );

      // Open popover
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      // Verify popover is open (role="dialog" is in the document)
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape key on document
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Verify popover is closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('2. Focus is trapped inside DateRangePicker popover when open and restored to trigger button when closed', async () => {
      const handleChange = vi.fn();
      render(
        <DateRangePicker
          startDate="2026-07-01"
          endDate="2026-07-07"
          onChange={handleChange}
          label="Pilih Periode Laporan"
        />
      );

      const trigger = screen.getByRole('button');
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      // Open popover
      fireEvent.click(trigger);

      // Wait for useFocusTrap setTimeout (50ms)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const popover = screen.getByRole('dialog');
      
      // Get all focusable elements inside popover
      const focusable = Array.from(
        popover.querySelectorAll('button:not([disabled]), input:not([disabled])')
      ) as HTMLElement[];

      expect(focusable.length).toBeGreaterThan(0);
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      // Focus should start on the first focusable element (the close button)
      expect(document.activeElement).toBe(firstFocusable);

      // Tab on the last element should wrap around to the first element
      lastFocusable.focus();
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Tab', code: 'Tab' });
      expect(document.activeElement).toBe(firstFocusable);

      // Shift+Tab on the first element should wrap around to the last element
      firstFocusable.focus();
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Tab', code: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastFocusable);

      // Close popover
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Focus should be restored to the trigger button
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('DataTable Mobile Accessibility', () => {
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Nama' }
    ];
    const data = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ];

    it('3. Mobile DataTable elements have correct list roles (when non-interactive)', () => {
      render(
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          mobileRender={(item) => <div>{item.name}</div>}
        />
      );

      // Mobile view parent should have role="list"
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      // Mobile view children should have role="listitem"
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('3. Mobile DataTable elements role when interactive (onRowClick is provided)', () => {
      const handleRowClick = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          onRowClick={handleRowClick}
          mobileRender={(item) => <div>{item.name}</div>}
        />
      );

      // Mobile view parent should have role="list"
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      // Mapped items have role="button" instead of "listitem" when onRowClick is provided
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Pagination Accessibility', () => {
    it('4. Pagination has correct nav roles, labels, and aria-current page values', () => {
      const handlePageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      );

      // Nav role and label
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Navigasi paginasi');

      // Buttons labels
      const prevButton = screen.getByRole('button', { name: 'Halaman sebelumnya' });
      const nextButton = screen.getByRole('button', { name: 'Halaman berikutnya' });
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();

      // Page buttons and aria-current
      const pageButtons = screen.getAllByRole('button').filter(btn => {
        const text = btn.textContent;
        return text && /^[0-9]+$/.test(text);
      });

      // Total page buttons rendered should be 5
      expect(pageButtons).toHaveLength(5);

      // Active page (2) should have aria-current="page"
      const activePageBtn = pageButtons.find(btn => btn.textContent === '2');
      expect(activePageBtn).toHaveAttribute('aria-current', 'page');

      // Inactive pages should not have aria-current
      const inactivePageBtn = pageButtons.find(btn => btn.textContent === '1');
      expect(inactivePageBtn).not.toHaveAttribute('aria-current');
    });
  });
});
