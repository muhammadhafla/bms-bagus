import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../client', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

import { ledgerApi } from '../ledger';

describe('ledgerApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOpeningBalance', () => {
    it('returns 0 immediately when startDate is omitted', async () => {
      await expect(ledgerApi.getOpeningBalance()).resolves.toBe(0);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('throws error instead of silently returning 0 when RPC fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      rpcMock.mockResolvedValue({
        data: null,
        error: new Error('permission denied for ledger'),
      });

      await expect(ledgerApi.getOpeningBalance('2026-01-01', 'gudang-1')).rejects.toThrow(
        'permission denied for ledger',
      );
      expect(rpcMock).toHaveBeenCalledWith('get_ledger_opening_balance', {
        p_start_date: '2026-01-01',
        p_gudang_id: 'gudang-1',
      });
      consoleErrorSpy.mockRestore();
    });

    it('returns numeric opening balance when RPC succeeds and omits undefined gudangId cleanly', async () => {
      rpcMock.mockResolvedValue({ data: '1250000', error: null });

      const result = await ledgerApi.getOpeningBalance('2026-01-01');
      expect(result).toBe(1250000);
      expect(rpcMock).toHaveBeenCalledWith('get_ledger_opening_balance', {
        p_start_date: '2026-01-01',
        p_gudang_id: undefined,
      });
    });
  });

  describe('getBukuBesar', () => {
    it('passes undefined for empty filter args and throws on Supabase error', async () => {
      rpcMock.mockResolvedValue({ data: [{ id: '1' }], error: null });
      const data = await ledgerApi.getBukuBesar('2026-01-01', '2026-01-31');
      expect(data).toEqual([{ id: '1' }]);
      expect(rpcMock).toHaveBeenCalledWith('get_ledger_with_balance', {
        p_start_date: '2026-01-01',
        p_end_date: '2026-01-31',
        p_tipe: undefined,
        p_sumber: undefined,
        p_search: undefined,
        p_gudang_id: undefined,
      });

      rpcMock.mockResolvedValue({ data: null, error: new Error('RPC timeout') });
      await expect(ledgerApi.getBukuBesar('2026-01-01')).rejects.toThrow('RPC timeout');
    });
  });

  describe('getBukuBesarPaginated', () => {
    it('forwards pagination filters to get_ledger_paginated and normalizes numeric fields', async () => {
      rpcMock.mockResolvedValue({
        data: {
          items: [{ id: 'row-1', nominal: 50000, saldo_berjalan: 150000 }],
          total_count: 24,
          total_pemasukan: 200000,
          total_pengeluaran: 50000,
          opening_balance: 100000,
          net_balance: 150000,
          closing_balance: 250000,
          page: 2,
          limit: 25,
        },
        error: null,
      });

      const result = await ledgerApi.getBukuBesarPaginated({
        startDate: '2026-11-01',
        endDate: '2026-11-24',
        tipe: 'PEMASUKAN',
        page: 2,
        limit: 25,
      });

      expect(rpcMock).toHaveBeenCalledWith('get_ledger_paginated', {
        p_start_date: '2026-11-01',
        p_end_date: '2026-11-24',
        p_tipe: 'PEMASUKAN',
        p_sumber: undefined,
        p_search: undefined,
        p_gudang_id: undefined,
        p_page: 2,
        p_limit: 25,
      });
      expect(result.total_count).toBe(24);
      expect(result.opening_balance).toBe(100000);
      expect(result.closing_balance).toBe(250000);
      expect(result.items).toHaveLength(1);
    });

    it('throws when get_ledger_paginated RPC returns an error', async () => {
      rpcMock.mockResolvedValue({ data: null, error: new Error('Query failed') });
      await expect(ledgerApi.getBukuBesarPaginated({ page: 1 })).rejects.toThrow('Query failed');
    });
  });
});
