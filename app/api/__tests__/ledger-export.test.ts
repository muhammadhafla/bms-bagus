import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createServerSupabaseClientMock, getUserMock, profileMaybeSingleMock, rpcMock } =
  vi.hoisted(() => ({
    createServerSupabaseClientMock: vi.fn(),
    getUserMock: vi.fn(),
    profileMaybeSingleMock: vi.fn(),
    rpcMock: vi.fn(),
  }));

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { GET as exportLedgerCsv } from '../export/finance/ledger/csv/route';

const VALID_USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const VALID_GUDANG_ID = '223e4567-e89b-42d3-a456-426614174000';

describe('GET /api/export/finance/ledger/csv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: VALID_USER_ID } } });
    profileMaybeSingleMock.mockResolvedValue({
      data: { roles: ['finance'] },
    });

    createServerSupabaseClientMock.mockResolvedValue({
      auth: { getUser: getUserMock },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: profileMaybeSingleMock,
          }),
        }),
      }),
      rpc: rpcMock,
    });
  });

  it('rejects malformed startDate or gudangId with 400', async () => {
    const badDate = await exportLedgerCsv(
      new Request('http://localhost/api/export/finance/ledger/csv?startDate=2026/11/01'),
    );
    expect(badDate.status).toBe(400);

    const badGudang = await exportLedgerCsv(
      new Request('http://localhost/api/export/finance/ledger/csv?gudangId=not-a-uuid'),
    );
    expect(badGudang.status).toBe(400);
  });

  it('returns 401 when unauthenticated and 403 for non-admin non-finance role', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const unauth = await exportLedgerCsv(
      new Request('http://localhost/api/export/finance/ledger/csv'),
    );
    expect(unauth.status).toBe(401);

    getUserMock.mockResolvedValue({ data: { user: { id: VALID_USER_ID } } });
    profileMaybeSingleMock.mockResolvedValue({ data: { roles: ['kasir'] } });
    const forbidden = await exportLedgerCsv(
      new Request('http://localhost/api/export/finance/ledger/csv'),
    );
    expect(forbidden.status).toBe(403);
  });

  it('streams UTF-8 BOM CSV with SALDO AWAL PERIODE, formula sanitization, and closing footer', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'tx-1',
            tanggal: '2026-11-24',
            created_at: '2026-11-24T17:30:00.000Z',
            gudang: { nama: 'Toko Pusat' },
            keterangan: '=CMD|calc!A0',
            sumber: 'PENJUALAN_SHIFT',
            tipe_transaksi: 'PEMASUKAN',
            nominal: 150000,
            saldo_berjalan: 650000,
            profiles: { nama: 'Budi' },
          },
        ],
        total_count: 1,
        opening_balance: 500000,
        total_pemasukan: 150000,
        total_pengeluaran: 0,
        closing_balance: 650000,
      },
      error: null,
    });

    const res = await exportLedgerCsv(
      new Request(
        `http://localhost/api/export/finance/ledger/csv?startDate=2026-11-01&endDate=2026-11-24&gudangId=${VALID_GUDANG_ID}`,
      ),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');

    const rawBytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(rawBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(rawBytes);
    expect(text.startsWith('\uFEFF')).toBe(true);
    expect(text).toContain('SALDO AWAL PERIODE');
    expect(text).toContain("'=CMD|calc!A0");
    // 17:30 UTC is 00:30 WIB next day
    expect(text).toContain('00:30');
    expect(text).toContain('TOTAL MUTASI & SALDO AKHIR');
    expect(text).toContain('650000');
  });
});
