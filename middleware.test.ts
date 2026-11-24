import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getClaimsMock, createServerClientMock } = vi.hoisted(() => ({
  getClaimsMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));

import { middleware } from './middleware';

function makeRequest(
  path: string,
  options: {
    headers?: Record<string, string>;
    cookies?: Array<{ name: string; value: string }>;
  } = {},
) {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    headers: options.headers,
  });
  for (const cookie of options.cookies ?? []) {
    req.cookies.set(cookie.name, cookie.value);
  }
  return req;
}

describe('middleware', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value';

    createServerClientMock.mockImplementation((_url, _key, { cookies }) => ({
      auth: {
        getClaims: async () => getClaimsMock(cookies),
      },
    }));
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('bypasses public paths without calling Supabase', async () => {
    for (const path of ['/offline', '/api/auth/callback', '/_next/static/a.js', '/favicon.ico', '/sw.js']) {
      const res = await middleware(makeRequest(path));
      expect(res.status).toBe(200);
    }
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  describe('/api/* protection', () => {
    it('returns 401 when no auth cookie, Bearer header, webhook secret, or bridge secret is present', async () => {
      const res = await middleware(makeRequest('/api/users'));
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('passes through when Authorization header, x-webhook-secret, x-wa-bridge-secret, or Supabase cookie is present', async () => {
      const bearerRes = await middleware(
        makeRequest('/api/users', { headers: { authorization: 'Bearer jwt-token' } }),
      );
      expect(bearerRes.status).toBe(200);

      const webhookRes = await middleware(
        makeRequest('/api/push/notify-kasbon', { headers: { 'x-webhook-secret': 'sec' } }),
      );
      expect(webhookRes.status).toBe(200);

      const bridgeRes = await middleware(
        makeRequest('/api/wa-bridge/outbox', { headers: { 'x-wa-bridge-secret': 'sec' } }),
      );
      expect(bridgeRes.status).toBe(200);

      const cookieRes = await middleware(
        makeRequest('/api/print', { cookies: [{ name: 'sb-proj-auth-token', value: 'tok' }] }),
      );
      expect(cookieRes.status).toBe(200);
    });
  });

  describe('unauthenticated page requests (no auth cookie)', () => {
    it('allows /login through', async () => {
      const res = await middleware(makeRequest('/login'));
      expect(res.status).toBe(200);
      expect(createServerClientMock).not.toHaveBeenCalled();
    });

    it('redirects protected routes to /login with safe redirectTo', async () => {
      const res = await middleware(makeRequest('/dashboard'));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get('location')!);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('redirectTo')).toBe('/dashboard');
    });
  });

  it('returns 503 when Supabase environment variables are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await middleware(
      makeRequest('/dashboard', { cookies: [{ name: 'sb-proj-auth-token', value: 'abc' }] }),
    );
    expect(res.status).toBe(503);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  describe('authenticated session & prefetch cookie safety', () => {
    it('rotates session cookies via setAll on normal navigation when claims are valid', async () => {
      getClaimsMock.mockImplementation((cookies) => {
        expect(cookies.getAll()).toEqual([{ name: 'sb-proj-auth-token', value: 'old-tok' }]);
        cookies.setAll([{ name: 'sb-proj-auth-token', value: 'new-tok', options: { path: '/' } }]);
        return Promise.resolve({ data: { claims: { sub: 'user-123' } }, error: null });
      });

      const res = await middleware(
        makeRequest('/inventory', { cookies: [{ name: 'sb-proj-auth-token', value: 'old-tok' }] }),
      );
      expect(res.status).toBe(200);
      expect(res.cookies.get('sb-proj-auth-token')?.value).toBe('new-tok');
    });

    it('keeps setAll as a no-op during prefetch while still verifying claims', async () => {
      getClaimsMock.mockImplementation((cookies) => {
        cookies.setAll([{ name: 'sb-proj-auth-token', value: 'rotated-should-ignore', options: { path: '/' } }]);
        return Promise.resolve({ data: { claims: { sub: 'user-123' } }, error: null });
      });

      const res = await middleware(
        makeRequest('/inventory', {
          headers: { 'next-router-prefetch': '1' },
          cookies: [{ name: 'sb-proj-auth-token', value: 'old-tok' }],
        }),
      );
      expect(res.status).toBe(200);
      expect(res.cookies.get('sb-proj-auth-token')).toBeUndefined();
    });

    it('rejects fake auth cookies on prefetch and redirects fail-closed to /login', async () => {
      getClaimsMock.mockResolvedValue({
        data: { claims: null },
        error: new Error('invalid token'),
      });

      const res = await middleware(
        makeRequest('/inventory', {
          headers: { purpose: 'prefetch' },
          cookies: [{ name: 'sb-proj-auth-token', value: 'forged-cookie' }],
        }),
      );
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get('location')!);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('redirectTo')).toBe('/inventory');
    });

    it('redirects authenticated user away from /login to /dashboard preserving refreshed cookies', async () => {
      getClaimsMock.mockImplementation((cookies) => {
        cookies.setAll([{ name: 'sb-proj-auth-token', value: 'refreshed-tok', options: { path: '/' } }]);
        return Promise.resolve({ data: { claims: { sub: 'user-123' } }, error: null });
      });

      const res = await middleware(
        makeRequest('/login', { cookies: [{ name: 'sb-proj-auth-token', value: 'old-tok' }] }),
      );
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard');
      expect(res.cookies.get('sb-proj-auth-token')?.value).toBe('refreshed-tok');
    });

    it('allows /login when cookie exists but user is unauthenticated', async () => {
      getClaimsMock.mockResolvedValue({ data: { claims: null }, error: null });

      const res = await middleware(
        makeRequest('/login', { cookies: [{ name: 'sb-proj-auth-token', value: 'expired' }] }),
      );
      expect(res.status).toBe(200);
    });
  });

  describe('exception handling (fail-closed)', () => {
    it('redirects protected routes to /login when getClaims throws', async () => {
      getClaimsMock.mockRejectedValue(new Error('network failure'));
      const res = await middleware(
        makeRequest('/finance/ledger', {
          cookies: [{ name: 'sb-proj-auth-token', value: 'tok' }],
        }),
      );
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
    });

    it('allows /login through when getClaims throws', async () => {
      getClaimsMock.mockRejectedValue(new Error('network failure'));
      const res = await middleware(
        makeRequest('/login', { cookies: [{ name: 'sb-proj-auth-token', value: 'tok' }] }),
      );
      expect(res.status).toBe(200);
    });
  });
});
