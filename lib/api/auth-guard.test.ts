import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getUserMock, singleMock, createClientMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  singleMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import {
  createAdminClient,
  verifyAuth,
  verifyAdmin,
  verifyRoles,
  verifyWebhookOrAuth,
  verifyWaBridgeSecret,
} from './auth-guard';

describe('auth-guard', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret-key-12345';
    process.env.CRON_SECRET = 'cron-secret-value';
    process.env.WEBHOOK_SECRET = 'webhook-secret-value';
    process.env.WA_BRIDGE_SECRET = 'wa-bridge-secret-value';

    createClientMock.mockReturnValue({
      auth: { getUser: getUserMock },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: singleMock,
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('createAdminClient', () => {
    it('throws when required env vars are missing', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(() => createAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    });

    it('creates a service-role Supabase client when configured', () => {
      createAdminClient();
      expect(createClientMock).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'service-role-secret-key-12345',
        expect.objectContaining({
          auth: { autoRefreshToken: false, persistSession: false },
        }),
      );
    });
  });

  describe('verifyAuth', () => {
    it('returns 401 when Authorization Bearer token is missing', async () => {
      const req = new Request('http://localhost/api/test');
      const res = await verifyAuth(req);
      expect(res.user).toBeNull();
      expect(res.error?.status).toBe(401);
    });

    it('returns 401 when Supabase rejects the token', async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: new Error('Invalid JWT') });
      const req = new Request('http://localhost/api/test', {
        headers: { Authorization: 'Bearer bad-token' },
      });
      const res = await verifyAuth(req);
      expect(res.user).toBeNull();
      expect(res.error?.status).toBe(401);
    });

    it('returns user when JWT is valid', async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: 'u-1', email: 'a@example.com' } },
        error: null,
      });
      const req = new Request('http://localhost/api/test', {
        headers: { Authorization: 'Bearer valid-jwt' },
      });
      const res = await verifyAuth(req);
      expect(res.error).toBeNull();
      expect(res.user).toEqual({ id: 'u-1', email: 'a@example.com' });
    });
  });

  describe('verifyAdmin', () => {
    it('propagates 401 when unauthenticated', async () => {
      const req = new Request('http://localhost/api/admin');
      const res = await verifyAdmin(req);
      expect(res.error?.status).toBe(401);
    });

    it('returns 403 for authenticated non-admin role', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-2' } }, error: null });
      singleMock.mockResolvedValue({
        data: { id: 'u-2', roles: ['kasir'], default_gudang_id: null },
        error: null,
      });

      const req = new Request('http://localhost/api/admin', {
        headers: { Authorization: 'Bearer valid-jwt' },
      });
      const res = await verifyAdmin(req);
      expect(res.error?.status).toBe(403);
    });

    it('returns user and normalized profile when admin role is present', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-admin' } }, error: null });
      singleMock.mockResolvedValue({
        data: { id: 'u-admin', roles: ['admin'], default_gudang_id: 'g-1' },
        error: null,
      });

      const req = new Request('http://localhost/api/admin', {
        headers: { Authorization: 'Bearer valid-jwt' },
      });
      const res = await verifyAdmin(req);
      expect(res.error).toBeNull();
      expect(res.profile).toEqual({ id: 'u-admin', roles: ['admin'], default_gudang_id: 'g-1' });
    });
  });

  describe('verifyRoles', () => {
    it('allows admin even when not explicitly listed in allowedRoles', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-admin' } }, error: null });
      singleMock.mockResolvedValue({
        data: { id: 'u-admin', roles: ['admin'], default_gudang_id: null },
        error: null,
      });

      const req = new Request('http://localhost/api/finance', {
        headers: { Authorization: 'Bearer valid-jwt' },
      });
      const res = await verifyRoles(req, ['finance']);
      expect(res.error).toBeNull();
      expect(res.profile?.roles).toEqual(['admin']);
    });

    it('allows matching role and rejects unauthorized role with 403', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-fin' } }, error: null });
      singleMock.mockResolvedValue({
        data: { id: 'u-fin', roles: ['finance'], default_gudang_id: null },
        error: null,
      });

      const ok = await verifyRoles(
        new Request('http://localhost/api/finance', { headers: { Authorization: 'Bearer tok' } }),
        ['finance', 'kepala_cabang'],
      );
      expect(ok.error).toBeNull();

      const denied = await verifyRoles(
        new Request('http://localhost/api/warehouse', { headers: { Authorization: 'Bearer tok' } }),
        ['kepala_gudang'],
      );
      expect(denied.error?.status).toBe(403);
    });
  });

  describe('verifyWebhookOrAuth', () => {
    it('returns 500 when no server webhook/cron/service secrets are configured', async () => {
      delete process.env.CRON_SECRET;
      delete process.env.WEBHOOK_SECRET;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const res = await verifyWebhookOrAuth(new Request('http://localhost/api/push/notify-kasbon'));
      expect(res.authorized).toBe(false);
      expect(res.error?.status).toBe(500);
    });

    it('accepts matching CRON_SECRET or WEBHOOK_SECRET via x-webhook-secret', async () => {
      const cronOk = await verifyWebhookOrAuth(
        new Request('http://localhost/api/push/notify-kasbon', {
          headers: { 'x-webhook-secret': 'cron-secret-value' },
        }),
      );
      expect(cronOk.authorized).toBe(true);

      const hookOk = await verifyWebhookOrAuth(
        new Request('http://localhost/api/push/notify-kasbon', {
          headers: { 'x-webhook-secret': 'webhook-secret-value' },
        }),
      );
      expect(hookOk.authorized).toBe(true);
    });

    it('accepts valid Bearer SUPABASE_SERVICE_ROLE_KEY and rejects wrong length or mismatched secrets', async () => {
      const bearerOk = await verifyWebhookOrAuth(
        new Request('http://localhost/api/push/notify-kasbon', {
          headers: { authorization: 'Bearer service-role-secret-key-12345' },
        }),
      );
      expect(bearerOk.authorized).toBe(true);

      const wrongLen = await verifyWebhookOrAuth(
        new Request('http://localhost/api/push/notify-kasbon', {
          headers: { 'x-webhook-secret': 'short' },
        }),
      );
      expect(wrongLen.authorized).toBe(false);
      expect(wrongLen.error?.status).toBe(401);

      const wrongSameLen = await verifyWebhookOrAuth(
        new Request('http://localhost/api/push/notify-kasbon', {
          headers: { 'x-webhook-secret': 'cron-secret-valuX' },
        }),
      );
      expect(wrongSameLen.authorized).toBe(false);
      expect(wrongSameLen.error?.status).toBe(401);
    });
  });

  describe('verifyWaBridgeSecret', () => {
    it('returns 500 when WA_BRIDGE_SECRET and WEBHOOK_SECRET are unset', () => {
      delete process.env.WA_BRIDGE_SECRET;
      delete process.env.WEBHOOK_SECRET;

      const res = verifyWaBridgeSecret(new Request('http://localhost/api/wa-bridge/outbox'));
      expect(res.authorized).toBe(false);
      expect(res.error?.status).toBe(500);
    });

    it('authorizes matching x-wa-bridge-secret and rejects mismatch', () => {
      const ok = verifyWaBridgeSecret(
        new Request('http://localhost/api/wa-bridge/outbox', {
          headers: { 'x-wa-bridge-secret': 'wa-bridge-secret-value' },
        }),
      );
      expect(ok.authorized).toBe(true);

      const bad = verifyWaBridgeSecret(
        new Request('http://localhost/api/wa-bridge/outbox', {
          headers: { 'x-wa-bridge-secret': 'wrong-secret' },
        }),
      );
      expect(bad.authorized).toBe(false);
      expect(bad.error?.status).toBe(401);
    });
  });
});
