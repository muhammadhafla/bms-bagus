import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getSessionMock, refreshSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
    },
  },
}));

import { fetchApi } from '@/lib/fetchApi';

describe('fetchApi', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('injects Authorization Bearer token from active Supabase session', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'active-token-123', expires_at: futureExp } },
      error: null,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const res = await fetchApi('/api/templates');
    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer active-token-123');
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it('does not overwrite an explicit Authorization header and degrades gracefully on getSession error', async () => {
    getSessionMock.mockRejectedValue(new Error('storage failure'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    globalThis.fetch = fetchMock;

    await fetchApi('/api/print', {
      headers: { Authorization: 'Bearer custom-header' },
    });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer custom-header');
    warnSpy.mockRestore();
  });
});
