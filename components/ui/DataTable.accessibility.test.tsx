import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, type Column } from './DataTable/DataTable';

interface TestData {
  id: string;
  name: string;
  count: number;
}

describe('DataTable Accessibility', () => {
  const columns: Column<TestData>[] = [
    { key: 'id', header: 'ID', sortable: false },
    { key: 'name', header: 'Nama', sortable: true },
    { key: 'count', header: 'Jumlah', sortable: true },
  ];

  const data: TestData[] = [
    { id: '1', name: 'Barang A', count: 10 },
    { id: '2', name: 'Barang B', count: 20 },
  ];

  it('renders table headers with correct aria-sort when not sorted', () => {
    const handleSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        onSort={handleSort}
      />
    );

    // ID column is not sortable, so should not have aria-sort
    const idHeader = screen.getByRole('columnheader', { name: 'ID' });
    expect(idHeader).not.toHaveAttribute('aria-sort');

    // Name column is sortable, should have aria-sort="none" because sortKey is undefined
    const nameHeader = screen.getByRole('columnheader', { name: 'Nama' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');

    // Count column is sortable, should have aria-sort="none"
    const countHeader = screen.getByRole('columnheader', { name: 'Jumlah' });
    expect(countHeader).toHaveAttribute('aria-sort', 'none');
  }, 10000);

  it('renders table headers with correct aria-sort when sorted asc', () => {
    const handleSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        sortKey="name"
        sortDirection="asc"
        onSort={handleSort}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Nama' })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Jumlah' })).toHaveAttribute('aria-sort', 'none');
  }, 10000);

  it('renders table headers with correct aria-sort when sorted desc', () => {
    const handleSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        sortKey="count"
        sortDirection="desc"
        onSort={handleSort}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Nama' })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Jumlah' })).toHaveAttribute('aria-sort', 'descending');
  }, 10000);
});
