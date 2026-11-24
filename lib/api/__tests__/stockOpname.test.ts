import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rpcMock, fromMock, getUserMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock('../client', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
    auth: { getUser: getUserMock },
  },
}));

import { stockOpnameApi } from '../stockOpname';

describe('stockOpnameApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  });

  it('calls approve_and_process_opname RPC via safeQuery', async () => {
    rpcMock.mockResolvedValue({
      data: { success: true, processed_items: 5, opname_id: 'op-1' },
      error: null,
    });

    const res = await stockOpnameApi.approve('op-1');
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ success: true, processed_items: 5, opname_id: 'op-1' });
    expect(rpcMock).toHaveBeenCalledWith('approve_and_process_opname', { p_opname_id: 'op-1' });
  });

  it('returns error when reject is called without an authenticated user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const res = await stockOpnameApi.reject('op-1', 'Data tidak sesuai');
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe('User not authenticated');
  });

  it('returns inventory lookup failure cleanly in addItem without throwing unhandled exception', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'stock_opname') {
        return {
          select: () => ({
            eq: () => ({ single: vi.fn().mockResolvedValue({ data: { gudang_id: null }, error: null }) }),
          }),
        };
      }
      if (table === 'inventory') {
        return {
          select: () => ({
            eq: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        };
      }
      return {};
    });

    const res = await stockOpnameApi.addItem('op-1', 'missing-inv');
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe('Inventory not found');
  });
});
