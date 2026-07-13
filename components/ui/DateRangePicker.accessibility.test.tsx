import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateRangePicker } from './DateRangePicker';

describe('DateRangePicker Accessibility', () => {
  it('has correct accessibility attributes on trigger and popover', () => {
    const handleChange = vi.fn();
    render(
      <DateRangePicker
        startDate="2026-07-01"
        endDate="2026-07-07"
        onChange={handleChange}
        label="Pilih Periode Laporan"
      />
    );

    // Get trigger button
    const trigger = screen.getByRole('button', { name: /1 Jul - 7 Jul/i });
    expect(trigger).toBeInTheDocument();
    
    // Check initial attributes when closed
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const popoverId = trigger.getAttribute('aria-controls');
    expect(popoverId).toBeTruthy();

    // Open popover
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Popover elements
    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveAttribute('id', popoverId);
    expect(popover).toHaveAttribute('aria-label', 'Pilih Periode Laporan');

    // Inside the popover, look for role="group"
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBe(2);

    // Group 1: Custom date inputs
    const customGroup = groups[0];
    expect(customGroup).toHaveAttribute('aria-label', 'Input tanggal kustom');

    // Group 2: Presets
    const presetGroup = groups[1];
    expect(presetGroup).toHaveAttribute('aria-labelledby', `${popoverId}-presets-label`);
    const presetLabel = screen.getByText('Preset Cepat');
    expect(presetLabel).toBeInTheDocument();
    expect(presetLabel).toHaveAttribute('id', `${popoverId}-presets-label`);
  });

  it('uses default aria-label when no label is provided', () => {
    const handleChange = vi.fn();
    render(
      <DateRangePicker
        startDate="2026-07-01"
        endDate="2026-07-07"
        onChange={handleChange}
      />
    );

    const trigger = screen.getByRole('button', { name: /1 Jul - 7 Jul/i });
    fireEvent.click(trigger);

    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveAttribute('aria-label', 'Pilih rentang tanggal');
  });
});
