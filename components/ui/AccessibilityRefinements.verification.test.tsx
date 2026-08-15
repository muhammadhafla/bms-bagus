import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateRangePicker from './DateRangePicker';
import { DataTable, type Column } from './DataTable/DataTable';
import { Pagination } from './DataTable/Pagination';

describe('Accessibility Refinements Verification', () => {
  describe('DateRangePicker Refinements', () => {
    it('closes the popover when Escape key is pressed', async () => {
      const handleChange = vi.fn();
      render(
        <DateRangePicker
          startDate="2026-07-01"
          endDate="2026-07-07"
          onChange={handleChange}
          label="Pilih Periode Laporan"
        />,
      );

      // Open popover
      const trigger = screen.getByRole('button', { name: /Jul/i });
      fireEvent.click(trigger);

      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      // Dialog should not be visible anymore
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('traps focus inside popover when open and restores focus to trigger button when closed', async () => {
      const handleChange = vi.fn();
      render(
        <DateRangePicker
          startDate="2026-07-01"
          endDate="2026-07-07"
          onChange={handleChange}
          label="Pilih Periode Laporan"
        />,
      );

      const trigger = screen.getByRole('button', { name: /Jul/i });

      // Initial focus can be anywhere, let's focus trigger
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      // Open popover by clicking trigger
      fireEvent.click(trigger);

      // Wait for focus trap timeout (50ms in hook)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const popover = screen.getByRole('dialog');
      expect(popover).toBeInTheDocument();

      // Focus should have moved inside the popover. Let's find all focusable elements inside popover.
      const focusableElements = popover.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      // The hook focuses the first element after 50ms
      expect(document.activeElement).toBe(firstFocusable);

      // Tab key wrapping: Focus last element, then Tab key should wrap focus back to first element
      lastFocusable.focus();
      expect(document.activeElement).toBe(lastFocusable);

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);
      expect(document.activeElement).toBe(firstFocusable);

      // Shift+Tab wrapping: Focus first element, then Shift+Tab key should wrap focus to last element
      firstFocusable.focus();
      expect(document.activeElement).toBe(firstFocusable);

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftTabEvent);
      expect(document.activeElement).toBe(lastFocusable);

      // Close popover
      const closeButton = screen.getByRole('button', { name: /Tutup dialog/i });
      fireEvent.click(closeButton);

      // Focus should be restored to trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });

  describe('DataTable Mobile Refinements', () => {
    interface TestData {
      id: string;
      name: string;
    }

    const columns: Column<TestData>[] = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Nama' },
    ];

    const data: TestData[] = [
      { id: '1', name: 'Barang A' },
      { id: '2', name: 'Barang B' },
    ];

    it('uses correct list and listitem roles in mobile view when row click is NOT configured', () => {
      render(
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          mobileRender={(item) => <div>{item.name}</div>}
        />,
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Barang A');
      expect(items[1]).toHaveTextContent('Barang B');
    });

    it('uses role="button" for list items in mobile view when row click IS configured', () => {
      const handleRowClick = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          onRowClick={handleRowClick}
          mobileRender={(item) => <div>{item.name}</div>}
        />,
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      // The items should have role="button" instead of "listitem"
      const listItems = list.children;
      expect(listItems).toHaveLength(2);
      expect(listItems[0]).toHaveAttribute('role', 'button');
      expect(listItems[1]).toHaveAttribute('role', 'button');
      expect(listItems[0]).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Pagination Refinements', () => {
    it('has correct nav roles, labels, and aria-current page values', () => {
      const handlePageChange = vi.fn();
      render(<Pagination currentPage={2} totalPages={5} onPageChange={handlePageChange} />);

      // 1. Navigation role and label
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Navigasi paginasi');

      // 2. Previous/Next buttons have labels
      const prevButton = screen.getByRole('button', { name: 'Halaman sebelumnya' });
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).not.toBeDisabled();

      const nextButton = screen.getByRole('button', { name: 'Halaman berikutnya' });
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();

      // 3. Current page button has aria-current="page"
      const activePageButton = screen.getByRole('button', { name: '2' });
      expect(activePageButton).toHaveAttribute('aria-current', 'page');

      const inactivePageButton = screen.getByRole('button', { name: '1' });
      expect(inactivePageButton).not.toHaveAttribute('aria-current');
    });
  });
});
