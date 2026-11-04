import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandPaletteStore } from './useCommandPaletteStore';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';
import { getFilteredCommands, getSuggestedCommands } from './commandItems';

describe('CommandPalette Logic & Components', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ isOpen: false });
  });

  it('manages open and close state via store', () => {
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);

    useCommandPaletteStore.getState().open();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);

    useCommandPaletteStore.getState().close();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);

    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('renders CommandPaletteTrigger and opens store on click', () => {
    render(<CommandPaletteTrigger />);
    const triggerBtn = screen.getByRole('button', { name: /Buka Command Palette/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('filters commands correctly according to staff_gudang role', () => {
    const warehousePerms = {
      isAdminUser: false,
      isFinanceUser: false,
      isWarehouseUser: true,
      isKepalaGudang: false,
      isKasir: false,
    };

    const allowed = getFilteredCommands(warehousePerms);
    const suggested = getSuggestedCommands(warehousePerms);

    const allowedHrefs = allowed.map((c) => c.href).filter(Boolean);
    const suggestedHrefs = suggested.map((c) => c.href).filter(Boolean);

    // Staf gudang must see warehouse and bulk-print
    expect(allowedHrefs).toContain('/warehouse/stocks');
    expect(allowedHrefs).toContain('/warehouse/transfers');
    expect(allowedHrefs).toContain('/bulk-print');

    // Staf gudang must NOT see admin-only routes
    expect(allowedHrefs).not.toContain('/admin/pos-auth');
    expect(allowedHrefs).not.toContain('/admin/payroll/gaji');
    expect(allowedHrefs).not.toContain('/users');

    // Suggested items must include warehouse
    expect(suggestedHrefs).toContain('/warehouse/stocks');
  });

  it('filters commands correctly according to admin role', () => {
    const adminPerms = {
      isAdminUser: true,
      isFinanceUser: true,
      isWarehouseUser: true,
      isKepalaGudang: true,
      isKasir: true,
    };

    const allowed = getFilteredCommands(adminPerms);
    const allowedHrefs = allowed.map((c) => c.href).filter(Boolean);

    // Admin has access to all routes
    expect(allowedHrefs).toContain('/admin/pos-auth');
    expect(allowedHrefs).toContain('/finance/ledger');
    expect(allowedHrefs).toContain('/analytics');
    expect(allowedHrefs).toContain('/users');
    expect(allowedHrefs).toContain('/warehouse/stocks');
  });
});
