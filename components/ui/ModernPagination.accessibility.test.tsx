import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModernPagination } from './ModernPagination';

describe('ModernPagination Accessibility', () => {
  it('is wrapped in a nav with role="navigation" and has correct aria-labels', () => {
    const handlePageChange = vi.fn();
    render(
      <ModernPagination
        page={2}
        totalPages={5}
        total={100}
        limit={20}
        onPageChange={handlePageChange}
      />
    );

    // Verify navigation element and role
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Navigasi paginasi');

    // Verify previous page button has correct aria-label
    const prevButton = screen.getByRole('button', { name: 'Halaman sebelumnya' });
    expect(prevButton).toBeInTheDocument();

    // Verify next page button has correct aria-label
    const nextButton = screen.getByRole('button', { name: 'Halaman berikutnya' });
    expect(nextButton).toBeInTheDocument();
  });

  it('renders nothing when totalPages is 1 or less', () => {
    const handlePageChange = vi.fn();
    const { container } = render(
      <ModernPagination
        page={1}
        totalPages={1}
        total={20}
        limit={20}
        onPageChange={handlePageChange}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
