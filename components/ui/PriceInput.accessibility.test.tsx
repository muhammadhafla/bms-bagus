import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PriceInput } from './PriceInput';

describe('PriceInput Accessibility', () => {
  it('associates label with input using passed id', () => {
    render(
      <PriceInput
        value={1000}
        onChange={vi.fn()}
        id="custom-price-input-id"
        label="Harga Barang"
      />
    );

    const label = screen.getByText('Harga Barang');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'custom-price-input-id');

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'custom-price-input-id');
  });

  it('associates label with input using auto-generated id when id is not provided', () => {
    render(
      <PriceInput
        value={2000}
        onChange={vi.fn()}
        label="Harga Otomatis"
      />
    );

    const label = screen.getByText('Harga Otomatis');
    expect(label).toBeInTheDocument();
    const htmlForAttr = label.getAttribute('for');
    expect(htmlForAttr).toBeTruthy();

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', htmlForAttr);
  });
});
