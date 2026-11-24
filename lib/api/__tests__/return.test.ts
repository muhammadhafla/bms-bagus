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

vi.mock('@/lib/utils', () => ({
  generateIdempotencyKey: () => '11111111-1111-4111-8111-111111111111',
  sanitizeSearchQuery: (q: string) => q,
}));

import { returnApi } from '../return';

describe('returnApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('finds suppliers by barcode and resolves inventory by kode_barcode column', async () => {
    rpcMock.mockResolvedValue({
      data: [{ supplier_id: 'sup-1', supplier_nama: 'Supplier A' }],
      error: null,
    });

    const invEqMock = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'inv-1' }, error: null }),
    });
    const purchaseEqMock = vi.fn().mockResolvedValue({
      data: [
        {
          harga_beli: 10000,
          diskon: 500,
          pembelian: { supplier_id: 'sup-1', tanggal: '2026-01-10', nomor_nota: 'INV-01' },
        },
      ],
      error: null,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'inventory') {
        return { select: () => ({ eq: invEqMock }) };
      }
      if (table === 'pembelian_items') {
        return {
          select: () => ({
            eq: purchaseEqMock,
          }),
        };
      }
      return {};
    });

    const res = await returnApi.findSuppliersByBarcode('BRG-001');
    expect(invEqMock).toHaveBeenCalledWith('kode_barcode', 'BRG-001');
    expect(purchaseEqMock).toHaveBeenCalledWith('inventory_id', 'inv-1');
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]).toMatchObject({
      supplier_id: 'sup-1',
      harga_beli: 10000,
      diskon: 500,
      nomor_nota: 'INV-01',
    });
  });

  it('submits pembelian return passing empty string fallback for optional p_note', async () => {
    rpcMock.mockResolvedValue({ data: { return_id: 'ret-1' }, error: null });

    const res = await returnApi.submitPembelianReturn({
      original_transaction_id: 'pemb-1',
      tanggal: '2026-01-15',
      items: [{ pembelian_item_id: 'pi-1', qty: 2 }],
    });

    expect(res.error).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith(
      'pembelian_return_create',
      expect.objectContaining({
        p_pembelian_id: 'pemb-1',
        p_note: '',
        p_created_by: 'user-1',
      }),
    );
  });
});
