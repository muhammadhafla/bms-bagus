import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

const { verifyAdminMock, verifyRolesMock, createAdminClientMock } = vi.hoisted(() => ({
  verifyAdminMock: vi.fn(),
  verifyRolesMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/api/auth-guard', () => ({
  verifyAdmin: verifyAdminMock,
  verifyRoles: verifyRolesMock,
  createAdminClient: createAdminClientMock,
}));

import { POST as broadcastPost } from '../loyalty/broadcast/route';
import { GET as otaGet } from '../pos/ota/route';

describe('API /api/loyalty/broadcast & /api/pos/ota', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_UPDATE_TOKEN = 'ghp-test-token';
    verifyAdminMock.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', roles: ['admin'], default_gudang_id: null },
      error: null,
    });
    verifyRolesMock.mockResolvedValue({
      user: { id: 'kasir-1' },
      profile: { id: 'kasir-1', roles: ['kasir'], default_gudang_id: 'g-1' },
      error: null,
    });
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('POST /api/loyalty/broadcast', () => {
    it('propagates non-admin 403', async () => {
      verifyAdminMock.mockResolvedValue({
        user: null,
        profile: null,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      });

      const res = await broadcastPost(
        new Request('http://localhost/api/loyalty/broadcast', {
          method: 'POST',
          body: JSON.stringify({ title: 'Promo', message: 'Diskon 50%' }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it('blocks unsafe promoUrl open-redirect or javascript: protocol schemes', async () => {
      const resProtocolRelative = await broadcastPost(
        new Request('http://localhost/api/loyalty/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Promo',
            message: 'Hai',
            promoUrl: '//evil.example.com/phish',
          }),
        }),
      );
      expect(resProtocolRelative.status).toBe(400);

      const resJavascript = await broadcastPost(
        new Request('http://localhost/api/loyalty/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Promo',
            message: 'Hai',
            promoUrl: 'javascript:alert(1)',
          }),
        }),
      );
      expect(resJavascript.status).toBe(400);
    });

    it('rejects non-UUID non-"all" tierId with 400', async () => {
      const res = await broadcastPost(
        new Request('http://localhost/api/loyalty/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Promo',
            message: 'Hai',
            tierId: 'vip-invalid',
          }),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/pos/ota', () => {
    it('propagates 401/403 from verifyRoles', async () => {
      verifyRolesMock.mockResolvedValue({
        user: null,
        profile: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const res = await otaGet(new Request('http://localhost/api/pos/ota'));
      expect(res.status).toBe(401);
    });

    it('rejects path-traversal query parameters like ".." with 400', async () => {
      const res = await otaGet(
        new Request('http://localhost/api/pos/ota?asset=..%2Fsecret.exe'),
      );
      expect(res.status).toBe(400);

      const resTag = await otaGet(
        new Request('http://localhost/api/pos/ota?tag=../v1.0.0'),
      );
      expect(resTag.status).toBe(400);
    });
  });
});
