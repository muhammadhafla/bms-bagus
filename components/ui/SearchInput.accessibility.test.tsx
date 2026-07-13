import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TextInput } from './TextInput';

describe('SearchInput / TextInput Accessibility', () => {
  it('correctly passes type="search" and aria-label to the input element', () => {
    render(
      <TextInput
        type="search"
        aria-label="Cari nama barang"
        placeholder="Cari..."
      />
    );

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'search');
    expect(searchInput).toHaveAttribute('aria-label', 'Cari nama barang');
  });

  it('correctly associates input with label for screen readers', () => {
    render(
      <TextInput
        id="search-input"
        label="Cari Produk"
        type="search"
      />
    );

    const label = screen.getByText('Cari Produk');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'search-input');

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('id', 'search-input');
  });

  it('sets aria-describedby for helper text when error is not present', () => {
    render(
      <TextInput
        id="search-input-desc"
        helperText="Masukkan minimal 3 karakter untuk mulai mencari"
        type="search"
      />
    );

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-describedby', 'search-input-desc-helper');
    
    const helper = screen.getByText('Masukkan minimal 3 karakter untuk mulai mencari');
    expect(helper).toHaveAttribute('id', 'search-input-desc-helper');
  });

  it('prioritizes error over helper text for aria-describedby', () => {
    render(
      <TextInput
        id="search-input-err"
        error="Karakter tidak valid"
        helperText="Masukkan minimal 3 karakter untuk mulai mencari"
        type="search"
      />
    );

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-describedby', 'search-input-err-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    
    const errorText = screen.getByText('Karakter tidak valid');
    expect(errorText).toHaveAttribute('id', 'search-input-err-error');
  });
});
