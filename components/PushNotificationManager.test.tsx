import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PushNotificationManager } from './PushNotificationManager';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

describe('PushNotificationManager', () => {
  const originalEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Valid 65-byte uncompressed VAPID public key encoded in base64url (87 chars)
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: function PushManager() {},
    });

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalEnv;
    global.fetch = originalFetch;
  });

  it('updates UI optimistically to Aktif and reuses active service worker registration', async () => {
    let resolveSubscribe!: (val: unknown) => void;
    const subscribePromise = new Promise((res) => {
      resolveSubscribe = res;
    });

    const mockSubscription = {
      endpoint: 'https://push.example.com/sub/123',
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub/123',
        keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    const mockRegistration = {
      active: { state: 'activated' },
      installing: null,
      waiting: null,
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockReturnValue(subscribePromise),
      },
    };

    const registerMock = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        register: registerMock,
        ready: Promise.resolve(mockRegistration),
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;

    render(<PushNotificationManager />);

    const toggle = await screen.findByRole('checkbox', {
      name: /Notifikasi Aplikasi/i,
    });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    // Optimistic UI: checked & Aktif immediately while async subscribe is still pending
    expect(toggle).toBeChecked();
    expect(screen.getByText('Aktif')).toBeInTheDocument();

    await act(async () => {
      resolveSubscribe(mockSubscription);
    });

    await waitFor(() => {
      expect(registerMock).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/push/subscribe',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(toast.success).toHaveBeenCalledWith('Notifikasi berhasil diaktifkan di HP Anda!');
      expect(toggle).toBeChecked();
      expect(toggle).not.toBeDisabled();
    });
  });

  it('reverts optimistic UI to Nonaktif with clear message when permission is denied', async () => {
    (window.Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied');

    const mockRegistration = {
      active: { state: 'activated' },
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
      },
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        register: vi.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      },
    });

    render(<PushNotificationManager />);

    const toggle = await screen.findByRole('checkbox', {
      name: /Notifikasi Aplikasi/i,
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
      expect(screen.getByText('Nonaktif')).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('izin notifikasi ditolak'),
      );
    });
  });

  it('reverts optimistic UI and re-enables toggle if service worker installation becomes redundant', async () => {
    const listeners: Record<string, Array<() => void>> = {};
    const installingWorker = {
      state: 'installing',
      addEventListener: (event: string, cb: () => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      },
      removeEventListener: (event: string, cb: () => void) => {
        listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
      },
    };

    const mockRegistration = {
      active: null,
      installing: installingWorker,
      waiting: null,
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
      },
    };

    const registerMock = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register: registerMock,
        ready: new Promise(() => {}),
      },
    });

    render(<PushNotificationManager />);

    const toggle = await screen.findByRole('checkbox', {
      name: /Notifikasi Aplikasi/i,
    });

    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();

    await waitFor(() => {
      expect(listeners.statechange?.length).toBeGreaterThan(0);
    });

    await act(async () => {
      installingWorker.state = 'redundant';
      (listeners.statechange || []).forEach((cb) => cb());
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Service Worker gagal dipasang'),
      );
      expect(toggle).not.toBeDisabled();
      expect(toggle).not.toBeChecked();
      expect(screen.getByText('Nonaktif')).toBeInTheDocument();
    });
  });

  it('reverts optimistic UI and rolls back browser subscription if server save fails', async () => {
    const mockUnsubscribe = vi.fn().mockResolvedValue(true);
    const mockSubscription = {
      endpoint: 'https://push.example.com/sub/123',
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub/123',
        keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
      }),
      unsubscribe: mockUnsubscribe,
    };

    const mockRegistration = {
      active: { state: 'activated' },
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(mockSubscription),
      },
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        register: vi.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database tidak tersedia' }),
    }) as unknown as typeof fetch;

    render(<PushNotificationManager />);

    const toggle = await screen.findByRole('checkbox', {
      name: /Notifikasi Aplikasi/i,
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        'Gagal mengaktifkan notifikasi: Database tidak tersedia',
      );
      expect(toggle).not.toBeChecked();
      expect(screen.getByText('Nonaktif')).toBeInTheDocument();
      expect(toggle).not.toBeDisabled();
    });
  });

  it('unsubscribes optimistically when toggled off', async () => {
    const mockSubscription = {
      endpoint: 'https://push.example.com/sub/123',
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    const mockRegistration = {
      active: { state: 'activated' },
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(mockSubscription),
      },
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        register: vi.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;

    render(<PushNotificationManager />);

    const toggle = await screen.findByRole('checkbox', {
      name: /Notifikasi Aplikasi/i,
    });

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Nonaktif')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/push/unsubscribe',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(toast.success).toHaveBeenCalledWith('Notifikasi berhasil dimatikan.');
      expect(toggle).not.toBeChecked();
      expect(toggle).not.toBeDisabled();
    });
  });
});
