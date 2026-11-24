import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const { verifyAdminMock, createAdminClientMock } = vi.hoisted(() => ({
  verifyAdminMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/api/auth-guard', () => ({
  verifyAdmin: verifyAdminMock,
  createAdminClient: createAdminClientMock,
}));

import { POST as createUserPost } from '../users/route';
import { PATCH as updateUserPatch, DELETE as deleteUser } from '../users/[id]/route';
import { PATCH as resetPasswordPatch } from '../users/[id]/password/route';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('API /api/users*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAdminMock.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', roles: ['admin'], default_gudang_id: null },
      error: null,
    });
  });

  describe('POST /api/users', () => {
    it('propagates 403 when caller is not admin', async () => {
      verifyAdminMock.mockResolvedValue({
        user: null,
        profile: null,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      });

      const res = await createUserPost(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects invalid email or short password with 400', async () => {
      const res = await createUserPost(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({
            email: 'not-an-email',
            password: '123',
            nama: 'Budi',
          }),
        }),
      );
      expect(res.status).toBe(400);
    });

    it('requires default_gudang_id for operational branch roles', async () => {
      const res = await createUserPost(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({
            email: 'kasir@example.com',
            password: 'password123',
            nama: 'Kasir Satu',
            roles: ['kasir'],
          }),
        }),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cabang default/);
    });
  });

  describe('PATCH & DELETE /api/users/[id]', () => {
    it('returns 400 when user ID param is not a UUID', async () => {
      const res = await updateUserPatch(
        new Request('http://localhost/api/users/bad-id', {
          method: 'PATCH',
          body: JSON.stringify({ nama: 'Budi' }),
        }),
        { params: Promise.resolve({ id: 'bad-id' }) },
      );
      expect(res.status).toBe(400);

      const delRes = await deleteUser(new Request('http://localhost/api/users/bad-id'), {
        params: Promise.resolve({ id: 'bad-id' }),
      });
      expect(delRes.status).toBe(400);
    });

    it('prevents deleting self or missing admin auth', async () => {
      verifyAdminMock.mockResolvedValue({
        user: { id: VALID_UUID },
        profile: { id: VALID_UUID, roles: ['admin'], default_gudang_id: null },
        error: null,
      });

      const delRes = await deleteUser(new Request(`http://localhost/api/users/${VALID_UUID}`), {
        params: Promise.resolve({ id: VALID_UUID }),
      });
      expect(delRes.status).toBe(400);
    });

    it('returns 400 on invalid update payload or updates valid profile', async () => {
      const badRes = await updateUserPatch(
        new Request(`http://localhost/api/users/${VALID_UUID}`, {
          method: 'PATCH',
          body: JSON.stringify({ nama: '' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(badRes.status).toBe(400);

      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      createAdminClientMock.mockReturnValue({
        from: () => ({
          update: () => ({ eq: updateEqMock }),
        }),
      });

      const okRes = await updateUserPatch(
        new Request(`http://localhost/api/users/${VALID_UUID}`, {
          method: 'PATCH',
          body: JSON.stringify({ nama: 'Budi Updated', roles: ['finance'] }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(okRes.status).toBe(200);
    });
  });

  describe('PATCH /api/users/[id]/password', () => {
    it('rejects non-UUID id and short password with 400', async () => {
      const badIdRes = await resetPasswordPatch(
        new Request('http://localhost/api/users/not-uuid/password', {
          method: 'PATCH',
          body: JSON.stringify({ password: 'newpassword123' }),
        }),
        { params: Promise.resolve({ id: 'not-uuid' }) },
      );
      expect(badIdRes.status).toBe(400);

      const shortPwRes = await resetPasswordPatch(
        new Request(`http://localhost/api/users/${VALID_UUID}/password`, {
          method: 'PATCH',
          body: JSON.stringify({ password: '123' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(shortPwRes.status).toBe(400);
    });

    it('updates password via auth.admin.updateUserById when valid', async () => {
      const updateUserByIdMock = vi.fn().mockResolvedValue({ error: null });
      createAdminClientMock.mockReturnValue({
        auth: { admin: { updateUserById: updateUserByIdMock } },
      });

      const res = await resetPasswordPatch(
        new Request(`http://localhost/api/users/${VALID_UUID}/password`, {
          method: 'PATCH',
          body: JSON.stringify({ password: 'strongpassword99' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(res.status).toBe(200);
      expect(updateUserByIdMock).toHaveBeenCalledWith(VALID_UUID, {
        password: 'strongpassword99',
      });
    });
  });
});
