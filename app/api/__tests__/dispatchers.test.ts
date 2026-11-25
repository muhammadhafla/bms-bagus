import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const {
  ledgerCsvMock,
  kehadiranCsvMock,
  returnPdfMock,
  mutasiPdfMock,
  slipGajiPdfMock,
  suratJalanPdfMock,
  printCreateMock,
  printJobsPendingMock,
  printJobPatchMock,
  templatesGetMock,
  templatePutMock,
  usersPostMock,
  userPatchMock,
  userPasswordPatchMock,
  waOutboxGetMock,
  pushSubscribeMock,
  loyaltyBroadcastMock,
  posOtaMock,
} = vi.hoisted(() => ({
  ledgerCsvMock: vi.fn(),
  kehadiranCsvMock: vi.fn(),
  returnPdfMock: vi.fn(),
  mutasiPdfMock: vi.fn(),
  slipGajiPdfMock: vi.fn(),
  suratJalanPdfMock: vi.fn(),
  printCreateMock: vi.fn(),
  printJobsPendingMock: vi.fn(),
  printJobPatchMock: vi.fn(),
  templatesGetMock: vi.fn(),
  templatePutMock: vi.fn(),
  usersPostMock: vi.fn(),
  userPatchMock: vi.fn(),
  userPasswordPatchMock: vi.fn(),
  waOutboxGetMock: vi.fn(),
  pushSubscribeMock: vi.fn(),
  loyaltyBroadcastMock: vi.fn(),
  posOtaMock: vi.fn(),
}));

vi.mock('@/app/api/_handlers/export/finance-ledger-csv', () => ({ GET: ledgerCsvMock }));
vi.mock('@/app/api/_handlers/export/kehadiran-csv', () => ({ GET: kehadiranCsvMock }));
vi.mock('@/app/api/_handlers/export/inventory-return-pdf', () => ({ GET: returnPdfMock }));
vi.mock('@/app/api/_handlers/export/payroll-mutasi-pdf', () => ({ GET: mutasiPdfMock }));
vi.mock('@/app/api/_handlers/export/payroll-slip-gaji-pdf', () => ({ GET: slipGajiPdfMock }));
vi.mock('@/app/api/_handlers/export/warehouse-surat-jalan-pdf', () => ({ GET: suratJalanPdfMock }));

vi.mock('@/app/api/_handlers/loyalty/broadcast', () => ({ POST: loyaltyBroadcastMock }));
vi.mock('@/app/api/_handlers/pos/ota', () => ({ GET: posOtaMock }));
vi.mock('@/app/api/_handlers/print/create', () => ({ POST: printCreateMock }));
vi.mock('@/app/api/_handlers/print/history', () => ({ GET: vi.fn() }));
vi.mock('@/app/api/_handlers/print/jobs-pending', () => ({ GET: printJobsPendingMock }));
vi.mock('@/app/api/_handlers/print/job-by-id', () => ({ PATCH: printJobPatchMock }));
vi.mock('@/app/api/_handlers/push/notify-kasbon', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/push/notify-pos-auth', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/push/notify-pulang-awal', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/push/notify-reminder', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/push/notify-wa-status', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/push/subscribe', () => ({ POST: pushSubscribeMock }));
vi.mock('@/app/api/_handlers/push/test', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/push/unsubscribe', () => ({ POST: vi.fn() }));
vi.mock('@/app/api/_handlers/templates/index', () => ({ GET: templatesGetMock, POST: vi.fn() }));
vi.mock('@/app/api/_handlers/templates/by-id', () => ({ PUT: templatePutMock, DELETE: vi.fn() }));
vi.mock('@/app/api/_handlers/users/index', () => ({ POST: usersPostMock }));
vi.mock('@/app/api/_handlers/users/by-id', () => ({ PATCH: userPatchMock, DELETE: vi.fn() }));
vi.mock('@/app/api/_handlers/users/password', () => ({ PATCH: userPasswordPatchMock }));
vi.mock('@/app/api/_handlers/wa-bridge/outbox', () => ({ GET: waOutboxGetMock, PATCH: vi.fn() }));
vi.mock('@/app/api/_handlers/wa-bridge/status', () => ({ POST: vi.fn() }));

import { GET as exportDispatchGet } from '../export/[...slug]/route';
import {
  GET as apiDispatchGet,
  POST as apiDispatchPost,
  PUT as apiDispatchPut,
  PATCH as apiDispatchPatch,
  DELETE as apiDispatchDelete,
} from '../[[...slug]]/route';

describe('API catch-all dispatchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const ok = () => Promise.resolve(NextResponse.json({ ok: true }));
    ledgerCsvMock.mockImplementation(ok);
    kehadiranCsvMock.mockImplementation(ok);
    returnPdfMock.mockImplementation(ok);
    mutasiPdfMock.mockImplementation(ok);
    slipGajiPdfMock.mockImplementation(ok);
    suratJalanPdfMock.mockImplementation(ok);
    printCreateMock.mockImplementation(ok);
    printJobsPendingMock.mockImplementation(ok);
    printJobPatchMock.mockImplementation(ok);
    templatesGetMock.mockImplementation(ok);
    templatePutMock.mockImplementation(ok);
    usersPostMock.mockImplementation(ok);
    userPatchMock.mockImplementation(ok);
    userPasswordPatchMock.mockImplementation(ok);
    waOutboxGetMock.mockImplementation(ok);
    pushSubscribeMock.mockImplementation(ok);
    loyaltyBroadcastMock.mockImplementation(ok);
    posOtaMock.mockImplementation(ok);
  });

  describe('/api/export/[...slug]', () => {
    it('routes static CSV and parameterized PDF paths correctly', async () => {
      await exportDispatchGet(new Request('http://localhost/api/export/finance/ledger/csv'), {
        params: Promise.resolve({ slug: ['finance', 'ledger', 'csv'] }),
      });
      expect(ledgerCsvMock).toHaveBeenCalledTimes(1);

      await exportDispatchGet(new Request('http://localhost/api/export/kehadiran/csv'), {
        params: Promise.resolve({ slug: ['kehadiran', 'csv'] }),
      });
      expect(kehadiranCsvMock).toHaveBeenCalledTimes(1);

      await exportDispatchGet(new Request('http://localhost/api/export/payroll/slip-gaji/abc-123'), {
        params: Promise.resolve({ slug: ['payroll', 'slip-gaji', 'abc-123'] }),
      });
      expect(slipGajiPdfMock).toHaveBeenCalledTimes(1);
      const passedParams = await slipGajiPdfMock.mock.calls[0][1].params;
      expect(passedParams).toEqual({ id: 'abc-123' });
    });

    it('returns 404 for unknown export routes', async () => {
      const res = await exportDispatchGet(new Request('http://localhost/api/export/unknown/route'), {
        params: Promise.resolve({ slug: ['unknown', 'route'] }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('/api/[[...slug]]', () => {
    it('routes static routes and prioritizes /print/jobs/pending over /print/jobs/[id]', async () => {
      await apiDispatchGet(new Request('http://localhost/api/print/jobs/pending'), {
        params: Promise.resolve({ slug: ['print', 'jobs', 'pending'] }),
      });
      expect(printJobsPendingMock).toHaveBeenCalledTimes(1);
      expect(printJobPatchMock).not.toHaveBeenCalled();

      await apiDispatchPost(new Request('http://localhost/api/push/subscribe', { method: 'POST' }), {
        params: Promise.resolve({ slug: ['push', 'subscribe'] }),
      });
      expect(pushSubscribeMock).toHaveBeenCalledTimes(1);

      await apiDispatchPost(new Request('http://localhost/api/loyalty/broadcast', { method: 'POST' }), {
        params: Promise.resolve({ slug: ['loyalty', 'broadcast'] }),
      });
      expect(loyaltyBroadcastMock).toHaveBeenCalledTimes(1);

      await apiDispatchGet(new Request('http://localhost/api/pos/ota'), {
        params: Promise.resolve({ slug: ['pos', 'ota'] }),
      });
      expect(posOtaMock).toHaveBeenCalledTimes(1);
    });

    it('routes parameterized [id] routes and resolves params.id', async () => {
      await apiDispatchPatch(new Request('http://localhost/api/print/jobs/job-99', { method: 'PATCH' }), {
        params: Promise.resolve({ slug: ['print', 'jobs', 'job-99'] }),
      });
      expect(printJobPatchMock).toHaveBeenCalledTimes(1);
      expect(await printJobPatchMock.mock.calls[0][1].params).toEqual({ id: 'job-99' });

      await apiDispatchPut(new Request('http://localhost/api/templates/tpl-1', { method: 'PUT' }), {
        params: Promise.resolve({ slug: ['templates', 'tpl-1'] }),
      });
      expect(templatePutMock).toHaveBeenCalledTimes(1);
      expect(await templatePutMock.mock.calls[0][1].params).toEqual({ id: 'tpl-1' });

      await apiDispatchPatch(new Request('http://localhost/api/users/usr-1/password', { method: 'PATCH' }), {
        params: Promise.resolve({ slug: ['users', 'usr-1', 'password'] }),
      });
      expect(userPasswordPatchMock).toHaveBeenCalledTimes(1);
      expect(await userPasswordPatchMock.mock.calls[0][1].params).toEqual({ id: 'usr-1' });
    });

    it('returns 404 for empty or unknown slugs and 405 with Allow header for unsupported methods', async () => {
      const emptyRes = await apiDispatchGet(new Request('http://localhost/api'), {
        params: Promise.resolve({}),
      });
      expect(emptyRes.status).toBe(404);

      const unknownRes = await apiDispatchGet(new Request('http://localhost/api/does/not/exist'), {
        params: Promise.resolve({ slug: ['does', 'not', 'exist'] }),
      });
      expect(unknownRes.status).toBe(404);

      const staticMethodRes = await apiDispatchDelete(
        new Request('http://localhost/api/users', { method: 'DELETE' }),
        { params: Promise.resolve({ slug: ['users'] }) },
      );
      expect(staticMethodRes.status).toBe(405);
      expect(staticMethodRes.headers.get('Allow')).toBe('POST');

      const dynamicMethodRes = await apiDispatchGet(
        new Request('http://localhost/api/users/usr-1'),
        { params: Promise.resolve({ slug: ['users', 'usr-1'] }) },
      );
      expect(dynamicMethodRes.status).toBe(405);
      expect(dynamicMethodRes.headers.get('Allow')).toBe('PATCH, DELETE');
    });
  });
});
