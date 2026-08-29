import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tooltip from './Tooltip';
import { ConfirmDialog } from './ConfirmDialog';
import { Toaster, toast } from 'sonner';
import MainLayout from '@/app/(main)/layout';
import { useSidebarState } from '@/hooks/useSidebarState';

// Mocks for Next.js and layout dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

vi.mock('@/lib/auth', () => {
  const store = {
    user: { id: 'user-id', email: 'test@example.com' },
    profile: { nama: 'Test User', role: 'admin' },
    initialized: true,
    initialize: vi.fn(),
    cleanup: vi.fn(),
    checkAndRefreshSession: vi.fn(),
    signOut: vi.fn(),
  };
  const useAuthStore = vi.fn((selector?: any) => (selector ? selector(store) : store)) as any;
  useAuthStore.getState = () => store;
  return {
    useAuthStore,
    useIsAdmin: vi.fn(() => true),
  };
});

vi.mock('@/lib/presence', () => ({
  usePresenceStore: vi.fn(() => ({
    initializePresence: vi.fn(),
    cleanupPresence: vi.fn(),
  })),
}));

vi.mock('@/components/DarkModeProvider', () => ({
  useDarkMode: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
}));

const mockSidebarCollapsed = vi.fn();
const mockAutoHideEnabled = vi.fn();

vi.mock('@/hooks/useSidebarState', () => ({
  useSidebarState: vi.fn(() => ({
    operasionalExpanded: true,
    inventoryExpanded: true,
    financeExpanded: true,
    payrollExpanded: true,
    reportsExpanded: true,
    masterExpanded: true,
    autoHideEnabled: false,
    sidebarCollapsed: false,
    setSidebarCollapsed: mockSidebarCollapsed,
    setOperasionalExpanded: vi.fn(),
    setInventoryExpanded: vi.fn(),
    setFinanceExpanded: vi.fn(),
    setPayrollExpanded: vi.fn(),
    setReportsExpanded: vi.fn(),
    setMasterExpanded: vi.fn(),
    setAutoHideEnabled: mockAutoHideEnabled,
  })),
}));

describe('UI Polish Verification Tests', () => {
  describe('1. Tooltip Position Classes', () => {
    const positions = ['top', 'right', 'bottom', 'left'] as const;

    positions.forEach((position) => {
      it(`renders correctly with position="${position}"`, () => {
        render(
          <Tooltip content={`Tooltip content ${position}`} position={position}>
            <button>Hover me</button>
          </Tooltip>,
        );

        const trigger = screen.getByRole('button', { name: 'Hover me' });

        // Initially, the tooltip panel should not be visible or rendered
        expect(screen.queryByText(`Tooltip content ${position}`)).not.toBeInTheDocument();

        // Simulate hover
        fireEvent.mouseEnter(trigger);

        // Tooltip panel should now be in the document
        const tooltipPanel = screen.getByText(`Tooltip content ${position}`);
        expect(tooltipPanel).toBeInTheDocument();

        // Check for specific position classes on panel and arrow
        const panelClasses = tooltipPanel.className;
        const arrowElement = tooltipPanel.querySelector('.absolute');
        expect(arrowElement).not.toBeNull();
        const arrowClasses = arrowElement!.className;

        if (position === 'top') {
          expect(panelClasses).toContain('bottom-full');
          expect(panelClasses).toContain('left-1/2');
          expect(panelClasses).toContain('-translate-x-1/2');
          expect(panelClasses).toContain('mb-2');
          expect(arrowClasses).toContain('top-full');
          expect(arrowClasses).toContain('left-1/2');
          expect(arrowClasses).toContain('-translate-x-1/2');
          expect(arrowClasses).toContain('border-t-neutral-900');
        } else if (position === 'right') {
          expect(panelClasses).toContain('left-full');
          expect(panelClasses).toContain('top-1/2');
          expect(panelClasses).toContain('-translate-y-1/2');
          expect(panelClasses).toContain('ml-2');
          expect(arrowClasses).toContain('right-full');
          expect(arrowClasses).toContain('top-1/2');
          expect(arrowClasses).toContain('-translate-y-1/2');
          expect(arrowClasses).toContain('border-r-neutral-900');
        } else if (position === 'bottom') {
          expect(panelClasses).toContain('top-full');
          expect(panelClasses).toContain('left-1/2');
          expect(panelClasses).toContain('-translate-x-1/2');
          expect(panelClasses).toContain('mt-2');
          expect(arrowClasses).toContain('bottom-full');
          expect(arrowClasses).toContain('left-1/2');
          expect(arrowClasses).toContain('-translate-x-1/2');
          expect(arrowClasses).toContain('border-b-neutral-900');
        } else if (position === 'left') {
          expect(panelClasses).toContain('right-full');
          expect(panelClasses).toContain('top-1/2');
          expect(panelClasses).toContain('-translate-y-1/2');
          expect(panelClasses).toContain('mr-2');
          expect(arrowClasses).toContain('left-full');
          expect(arrowClasses).toContain('top-1/2');
          expect(arrowClasses).toContain('-translate-y-1/2');
          expect(arrowClasses).toContain('border-l-neutral-900');
        }

        // Simulate leave
        fireEvent.mouseLeave(trigger);
        expect(screen.queryByText(`Tooltip content ${position}`)).not.toBeInTheDocument();
      });
    });
  });

  describe('2. ConfirmDialog Focus Behavior', () => {
    it('focuses the confirm button via autoFocus and does not manually focus the container', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message content"
          confirmLabel="Ya, Lanjutkan"
          cancelLabel="Batal"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />,
      );

      // ConfirmDialog is rendered within a Portal, which appends to document.body.
      const confirmButton = screen.getByRole('button', { name: 'Ya, Lanjutkan' });
      expect(confirmButton).toBeInTheDocument();

      // Wait a short time to allow autofocus to trigger in jsdom
      await waitFor(() => {
        expect(document.activeElement).toBe(confirmButton);
      });

      // Find the dialog container (it has tabIndex={-1} and classes like "relative bg-white...")
      const dialogContainer = screen.getByRole('dialog').querySelector('[tabindex="-1"]');
      expect(dialogContainer).toBeInTheDocument();

      // Confirm that focus is NOT on the dialog container
      expect(document.activeElement).not.toBe(dialogContainer);
    });
  });

  describe('3. Toast Close Button Icon', () => {
    it('has SVG icon content inside the close button', async () => {
      const TriggerComponent = () => {
        return (
          <>
            <Toaster closeButton />
            <button onClick={() => toast.success('Toast Message')}>Show Toast</button>
          </>
        );
      };

      render(<TriggerComponent />);

      // Trigger the toast
      fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));

      // Find the toast content
      expect(await screen.findByText('Toast Message')).toBeInTheDocument();

      // Find the close button
      const closeButton = await screen.findByRole('button', {
        name: /close|tutup/i,
      });
      expect(closeButton).toBeInTheDocument();

      // Assert that the button contains an SVG element (IconX)
      const svgElement = closeButton.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });
  });

  describe('4. Sidebar Collapsed Tooltips', () => {
    it('wraps sidebar links in Tooltips when sidebar is collapsed', () => {
      const useSidebarStateMock = vi.mocked(useSidebarState);
      useSidebarStateMock.mockReturnValue({
        operasionalExpanded: false,
        inventoryExpanded: false,
        warehouseExpanded: false,
        financeExpanded: false,
        payrollExpanded: false,
        reportsExpanded: false,
        masterExpanded: false,
        autoHideEnabled: true, // autoHideEnabled = true AND sidebarHovered = false => isSidebarVisible = false => sidebarCollapsed = true
        sidebarCollapsed: true,
        setSidebarCollapsed: mockSidebarCollapsed,
        setOperasionalExpanded: vi.fn(),
        setInventoryExpanded: vi.fn(),
        setWarehouseExpanded: vi.fn(),
        setFinanceExpanded: vi.fn(),
        setPayrollExpanded: vi.fn(),
        setReportsExpanded: vi.fn(),
        setMasterExpanded: vi.fn(),
        setAutoHideEnabled: mockAutoHideEnabled,
      });

      render(
        <MainLayout>
          <div>Main Content</div>
        </MainLayout>,
      );

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toBeInTheDocument();

      // When collapsed, we focus the tooltip container directly to trigger the tooltip.
      const tooltipContainer = dashboardLink.parentElement!;
      fireEvent.focus(tooltipContainer);

      const dashboardElements = screen.getAllByText('Dashboard');
      expect(dashboardElements.length).toBeGreaterThan(1);
    });

    it('does not wrap sidebar links in Tooltips when sidebar is expanded', () => {
      const useSidebarStateMock = vi.mocked(useSidebarState);
      useSidebarStateMock.mockReturnValue({
        operasionalExpanded: true,
        inventoryExpanded: true,
        warehouseExpanded: true,
        financeExpanded: true,
        payrollExpanded: true,
        reportsExpanded: true,
        masterExpanded: true,
        autoHideEnabled: false, // autoHideEnabled = false => isSidebarVisible = true => sidebarCollapsed = false
        sidebarCollapsed: false,
        setSidebarCollapsed: mockSidebarCollapsed,
        setOperasionalExpanded: vi.fn(),
        setInventoryExpanded: vi.fn(),
        setWarehouseExpanded: vi.fn(),
        setFinanceExpanded: vi.fn(),
        setPayrollExpanded: vi.fn(),
        setReportsExpanded: vi.fn(),
        setMasterExpanded: vi.fn(),
        setAutoHideEnabled: mockAutoHideEnabled,
      });

      render(
        <MainLayout>
          <div>Main Content</div>
        </MainLayout>,
      );

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toBeInTheDocument();

      // Hover over the link wrapper
      fireEvent.mouseEnter(dashboardLink.parentElement!);

      const dashboardElements = screen.getAllByText('Dashboard');
      expect(dashboardElements.length).toBe(1);
    });
  });
});
