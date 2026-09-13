import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageLoadingSpinner, Spinner } from './PageLoadingSpinner';

describe('Spinner Component', () => {
  it('renders default md spinner with aria-hidden and animation classes', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('div[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
    expect(spinner).toHaveClass('border-brand-100');
    expect(spinner).toHaveClass('border-t-brand-500');
    expect(spinner).toHaveClass('h-8');
    expect(spinner).toHaveClass('w-8');
  });

  it('renders different sizes correctly', () => {
    const { container: containerXs } = render(<Spinner size="xs" />);
    expect(containerXs.querySelector('.h-4.w-4')).toBeInTheDocument();

    const { container: containerSm } = render(<Spinner size="sm" />);
    expect(containerSm.querySelector('.h-5.w-5')).toBeInTheDocument();

    const { container: containerLg } = render(<Spinner size="lg" />);
    expect(containerLg.querySelector('.h-10.w-10')).toBeInTheDocument();

    const { container: containerXl } = render(<Spinner size="xl" />);
    expect(containerXl.querySelector('.h-12.w-12')).toBeInTheDocument();
  });
});

describe('PageLoadingSpinner Component', () => {
  it('renders with default message, role="status", and aria-live="polite"', () => {
    render(<PageLoadingSpinner />);
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Memuat halaman...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<PageLoadingSpinner message="Memuat stok gudang..." />);
    expect(screen.getByText('Memuat stok gudang...')).toBeInTheDocument();
  });

  it('hides visual text but maintains sr-only fallback when message is false', () => {
    const { queryByText, getByText } = render(<PageLoadingSpinner message={false} />);
    expect(queryByText('Memuat halaman...')).toBeNull();
    expect(getByText('Sedang memuat...')).toHaveClass('sr-only');
  });

  it('adjusts padding when fullPage is false', () => {
    render(<PageLoadingSpinner fullPage={false} />);
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveClass('py-12');
    expect(statusRegion).not.toHaveClass('min-h-[60vh]');
  });

  it('wraps with AmbientLayout when withLayout is true', () => {
    const { container } = render(<PageLoadingSpinner withLayout={true} />);
    expect(container.querySelector('.relative.w-full')).toBeInTheDocument();
  });
});
