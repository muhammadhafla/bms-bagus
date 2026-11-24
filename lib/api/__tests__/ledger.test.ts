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
});
