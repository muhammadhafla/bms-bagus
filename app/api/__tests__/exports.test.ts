import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createServerSupabaseClientMock, createAdminClientMock, getUserMock, profileMaybeSingleMock } =
  vi.hoisted(() => ({
    createServerSupabaseClientMock: vi.fn(),
    createAdminClientMock: vi.fn(),
    getUserMock: vi.fn(),
    profileMaybeSingleMock: vi.fn(),
  }));

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock('@/lib/api/auth-guard', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToStream: vi.fn(),
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  Image: () => null,
  StyleSheet: { create: <T,>(styles: T): T => styles },
}));

import { GET as exportKehadiranCsv } from '../export/kehadiran/csv/route';
import { GET as exportMutasiPdf } from '../export/payroll/mutasi/[id]/route';
import { GET as exportSlipGajiPdf } from '../export/payroll/slip-gaji/[id]/route';
import { GET as exportReturnPdf } from '../export/inventory/return/[id]/route';
import { GET as exportSuratJalanPdf } from '../export/warehouse/surat-jalan/[id]/route';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('API /api/export/* validation & auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: VALID_UUID } } });
    profileMaybeSingleMock.mockResolvedValue({
      data: { roles: ['kasir'], default_gudang_id: null },
    });

    const supabaseStub = {
      auth: { getUser: getUserMock },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: profileMaybeSingleMock,
          }),
        }),
      }),
    };
    createServerSupabaseClientMock.mockResolvedValue(supabaseStub);
    createAdminClientMock.mockReturnValue(supabaseStub);
  });

  describe('GET /api/export/kehadiran/csv', () => {
    it('rejects malformed startDate query param with 400 and unauthenticated users with 401', async () => {
      const badDateRes = await exportKehadiranCsv(
        new Request('http://localhost/api/export/kehadiran/csv?startDate=01-01-2026'),
      );
      expect(badDateRes.status).toBe(400);

      getUserMock.mockResolvedValue({ data: { user: null } });
      const unauthRes = await exportKehadiranCsv(
        new Request('http://localhost/api/export/kehadiran/csv?startDate=2026-01-01'),
      );
      expect(unauthRes.status).toBe(401);
    });
  });

  describe('GET /api/export/payroll/mutasi/[id]', () => {
    it('rejects non-UUID user id with 400 and unauthenticated users with 401', async () => {
      const badIdRes = await exportMutasiPdf(
        new Request('http://localhost/api/export/payroll/mutasi/not-uuid'),
        { params: Promise.resolve({ id: 'not-uuid' }) },
      );
      expect(badIdRes.status).toBe(400);

      getUserMock.mockResolvedValue({ data: { user: null } });
      const unauthRes = await exportMutasiPdf(
        new Request(`http://localhost/api/export/payroll/mutasi/${VALID_UUID}`),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(unauthRes.status).toBe(401);
    });
  });

  describe('GET /api/export/payroll/slip-gaji/[id]', () => {
    it('rejects invalid periode format or non-UUID id with 400', async () => {
      const badIdRes = await exportSlipGajiPdf(
        new Request('http://localhost/api/export/payroll/slip-gaji/bad'),
        { params: Promise.resolve({ id: 'bad' }) },
      );
      expect(badIdRes.status).toBe(400);

      const badPeriodeRes = await exportSlipGajiPdf(
        new Request(`http://localhost/api/export/payroll/slip-gaji/${VALID_UUID}?periode=2026-13`),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(badPeriodeRes.status).toBe(400);
    });
  });

  describe('GET /api/export/inventory/return/[id]', () => {
    it('rejects non-UUID id with 400 and unauthorized roles with 403', async () => {
      const badIdRes = await exportReturnPdf(
        new Request('http://localhost/api/export/inventory/return/not-uuid'),
        { params: Promise.resolve({ id: 'not-uuid' }) },
      );
      expect(badIdRes.status).toBe(400);

      profileMaybeSingleMock.mockResolvedValue({
        data: { roles: ['member'], default_gudang_id: null },
      });
      const forbiddenRes = await exportReturnPdf(
        new Request(`http://localhost/api/export/inventory/return/${VALID_UUID}`),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(forbiddenRes.status).toBe(403);
    });
  });

  describe('GET /api/export/warehouse/surat-jalan/[id]', () => {
    it('rejects non-UUID id with 400 and non-warehouse roles like kasir with 403', async () => {
      const badIdRes = await exportSuratJalanPdf(
        new Request('http://localhost/api/export/warehouse/surat-jalan/bad-id'),
        { params: Promise.resolve({ id: 'bad-id' }) },
      );
      expect(badIdRes.status).toBe(400);

      const forbiddenRes = await exportSuratJalanPdf(
        new Request(`http://localhost/api/export/warehouse/surat-jalan/${VALID_UUID}`),
        { params: Promise.resolve({ id: VALID_UUID }) },
      );
      expect(forbiddenRes.status).toBe(403);
    });
  });
});
