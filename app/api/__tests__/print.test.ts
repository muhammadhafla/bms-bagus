import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const { verifyRolesMock, verifyAdminMock, createAdminClientMock } = vi.hoisted(() => ({
  verifyRolesMock: vi.fn(),
  verifyAdminMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/api/auth-guard', () => ({
  verifyRoles: verifyRolesMock,
  verifyAdmin: verifyAdminMock,
  createAdminClient: createAdminClientMock,
}));

import { POST as createPrintJob } from '../_handlers/print/create';
import { PATCH as updatePrintJob } from '../_handlers/print/job-by-id';
import { GET as getTemplates, POST as createTemplate } from '../_handlers/templates/index';
import { PUT as updateTemplate, DELETE as deleteTemplate } from '../_handlers/templates/by-id';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('API /api/print & /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAdminMock.mockResolvedValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', roles: ['admin'], default_gudang_id: null },
      error: null,
    });
    verifyRolesMock.mockResolvedValue({
      user: { id: 'kasir-1' },
      profile: { id: 'kasir-1', roles: ['kasir'], default_gudang_id: VALID_UUID },
      error: null,
    });
  });

  describe('POST /api/print', () => {
    it('rejects non-admin users who have no default_gudang_id with 403', async () => {
      verifyRolesMock.mockResolvedValue({
        user: { id: 'kasir-1' },
        profile: { id: 'kasir-1', roles: ['kasir'], default_gudang_id: null },
        error: null,
      });

      const res = await createPrintJob(
        new Request('http://localhost/api/print', {
          method: 'POST',
          body: JSON.stringify({
            template_id: VALID_UUID,
            payload_json: { barcode: '123' },
          }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects non-UUID template_id with 400', async () => {
      const res = await createPrintJob(
        new Request('http://localhost/api/print', {
          method: 'POST',
          body: JSON.stringify({
            template_id: 'invalid-uuid',
            payload_json: { a: 1 },
          }),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/print/jobs/[id]', () => {
    it('returns 400 for non-UUID job id or invalid status', async () => {
      const badIdRes = await updatePrintJob(
        new Request('http://localhost/api/print/jobs/not-uuid', {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Done' }),
        }),
        { params: Promise.resolve({ id: 'not-uuid' }) },
      );
      expect(badIdRes.status).toBe(400);

      const badBodyRes = await updatePrintJob(
        new Request(`http://localhost/api/print/jobs/${VALID_UUID}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'UnknownStatus' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(badBodyRes.status).toBe(400);
    });

    it('returns 404 when print job does not exist and 403 on cross-branch update', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
      createAdminClientMock.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
      });

      const notFoundRes = await updatePrintJob(
        new Request(`http://localhost/api/print/jobs/${VALID_UUID}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Done' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(notFoundRes.status).toBe(404);

      maybeSingleMock.mockResolvedValue({
        data: { id: VALID_UUID, gudang_id: '999e4567-e89b-42d3-a456-426614174999', status: 'Pending' },
        error: null,
      });
      const forbiddenRes = await updatePrintJob(
        new Request(`http://localhost/api/print/jobs/${VALID_UUID}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Done' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(forbiddenRes.status).toBe(403);
    });
  });

  describe('/api/templates & /api/templates/[id]', () => {
    it('returns templates for authorized roles and rejects non-admin POST', async () => {
      createAdminClientMock.mockReturnValue({
        from: () => ({
          select: () => ({
            order: vi.fn().mockResolvedValue({ data: [{ id: VALID_UUID, name: 'Label 1' }], error: null }),
          }),
        }),
      });

      const getRes = await getTemplates(new Request('http://localhost/api/templates'));
      expect(getRes.status).toBe(200);

      verifyAdminMock.mockResolvedValue({
        user: null,
        profile: null,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      });
      const postRes = await createTemplate(
        new Request('http://localhost/api/templates', {
          method: 'POST',
          body: JSON.stringify({ name: 'T', language: 'TSPL', content_json: '{}' }),
        }),
      );
      expect(postRes.status).toBe(403);
    });

    it('rejects DELETE when template is referenced by print jobs', async () => {
      createAdminClientMock.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        }),
      });

      const res = await deleteTemplate(new Request(`http://localhost/api/templates/${VALID_UUID}`), {
        params: Promise.resolve({ id: VALID_UUID }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/used by existing print jobs/);
    });

    it('rejects PUT with invalid UUID or malformed body', async () => {
      const badId = await updateTemplate(
        new Request('http://localhost/api/templates/not-uuid', {
          method: 'PUT',
          body: JSON.stringify({ name: 'T', language: 'TSPL', content_json: '{}' }),
        }),
        { params: Promise.resolve({ id: 'not-uuid' }) },
      );
      expect(badId.status).toBe(400);

      const badBody = await updateTemplate(
        new Request(`http://localhost/api/templates/${VALID_UUID}`, {
          method: 'PUT',
          body: JSON.stringify({ name: '', language: 'TSPL' }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(badBody.status).toBe(400);
    });
  });
});
