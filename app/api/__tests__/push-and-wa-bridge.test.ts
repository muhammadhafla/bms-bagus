import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const {
  verifyAuthMock,
  verifyWebhookOrAuthMock,
  verifyWaBridgeSecretMock,
  createAdminClientMock,
  sendPushNotificationMock,
} = vi.hoisted(() => ({
  verifyAuthMock: vi.fn(),
  verifyWebhookOrAuthMock: vi.fn(),
  verifyWaBridgeSecretMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  sendPushNotificationMock: vi.fn(),
}));

vi.mock('@/lib/api/auth-guard', () => ({
  verifyAuth: verifyAuthMock,
  verifyWebhookOrAuth: verifyWebhookOrAuthMock,
  verifyWaBridgeSecret: verifyWaBridgeSecretMock,
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/push', () => ({
  sendPushNotification: sendPushNotificationMock,
}));

import { POST as subscribePost } from '../push/subscribe/route';
import { POST as unsubscribePost } from '../push/unsubscribe/route';
import { POST as notifyKasbonPost } from '../push/notify-kasbon/route';
import { GET as outboxGet, PATCH as outboxPatch } from '../wa-bridge/outbox/route';
import { POST as statusPost } from '../wa-bridge/status/route';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('API /api/push/* & /api/wa-bridge/*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAuthMock.mockResolvedValue({ user: { id: VALID_UUID }, error: null });
    verifyWebhookOrAuthMock.mockResolvedValue({ authorized: true, error: null });
    verifyWaBridgeSecretMock.mockReturnValue({ authorized: true, error: null });
    sendPushNotificationMock.mockResolvedValue(undefined);
  });

  describe('Push subscribe & unsubscribe', () => {
    it('rejects non-URL endpoints with 400 and saves valid subscription with 200', async () => {
      const badRes = await subscribePost(
        new Request('http://localhost/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: 'not-a-url',
            keys: { auth: 'a', p256dh: 'b' },
          }),
        }),
      );
      expect(badRes.status).toBe(400);

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      createAdminClientMock.mockReturnValue({
        from: () => ({ upsert: upsertMock }),
      });

      const okRes = await subscribePost(
        new Request('http://localhost/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: 'https://fcm.googleapis.com/fcm/send/token-1',
            keys: { auth: 'auth-secret', p256dh: 'p256dh-key' },
          }),
        }),
      );
      expect(okRes.status).toBe(200);
      expect(upsertMock).toHaveBeenCalledOnce();
    });

    it('rejects invalid unsubscribe endpoint and deletes valid one', async () => {
      const badRes = await unsubscribePost(
        new Request('http://localhost/api/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: 'bad-endpoint' }),
        }),
      );
      expect(badRes.status).toBe(400);

      const eqEndpointMock = vi.fn().mockResolvedValue({ error: null });
      createAdminClientMock.mockReturnValue({
        from: () => ({
          delete: () => ({
            eq: () => ({ eq: eqEndpointMock }),
          }),
        }),
      });

      const okRes = await unsubscribePost(
        new Request('http://localhost/api/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/token-1' }),
        }),
      );
      expect(okRes.status).toBe(200);
    });
  });

  describe('POST /api/push/notify-kasbon', () => {
    it('enforces webhook auth and validates UUID fields', async () => {
      verifyWebhookOrAuthMock.mockResolvedValue({
        authorized: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const unauthRes = await notifyKasbonPost(
        new Request('http://localhost/api/push/notify-kasbon', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
      expect(unauthRes.status).toBe(401);

      verifyWebhookOrAuthMock.mockResolvedValue({ authorized: true, error: null });
      const badPayload = await notifyKasbonPost(
        new Request('http://localhost/api/push/notify-kasbon', {
          method: 'POST',
          body: JSON.stringify({ kasbon_id: 'not-uuid', user_id: VALID_UUID, nominal: 50000 }),
        }),
      );
      expect(badPayload.status).toBe(400);
    });
  });

  describe('/api/wa-bridge/outbox & /api/wa-bridge/status', () => {
    it('rejects unauthenticated WA bridge calls with 401', async () => {
      verifyWaBridgeSecretMock.mockReturnValue({
        authorized: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const getRes = await outboxGet(new Request('http://localhost/api/wa-bridge/outbox'));
      expect(getRes.status).toBe(401);

      const postRes = await statusPost(
        new Request('http://localhost/api/wa-bridge/status', {
          method: 'POST',
          body: JSON.stringify({ connected: true }),
        }),
      );
      expect(postRes.status).toBe(401);
    });

    it('validates outbox query limit/uuid and PATCH z.iso.datetime()', async () => {
      const badQuery = await outboxGet(
        new Request('http://localhost/api/wa-bridge/outbox?limit=999'),
      );
      expect(badQuery.status).toBe(400);

      const badPatch = await outboxPatch(
        new Request('http://localhost/api/wa-bridge/outbox', {
          method: 'PATCH',
          body: JSON.stringify({
            id: VALID_UUID,
            status: 'read',
            read_at: 'not-an-iso-date',
          }),
        }),
      );
      expect(badPatch.status).toBe(400);
    });

    it('validates wa-bridge status qr_expires_at with z.iso.datetime()', async () => {
      const badStatus = await statusPost(
        new Request('http://localhost/api/wa-bridge/status', {
          method: 'POST',
          body: JSON.stringify({
            connected: false,
            qr_expires_at: 'invalid-timestamp',
          }),
        }),
      );
      expect(badStatus.status).toBe(400);
    });
  });
});
