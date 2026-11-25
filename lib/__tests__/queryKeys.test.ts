import { describe, it, expect, vi } from 'vitest';
import {
  queryKeys,
  invalidateInventoryMutation,
  invalidateFinanceMutation,
  invalidatePurchasingMutation,
  invalidatePosAuthMutation,
  invalidateWarehouseMutation,
} from '../queryKeys';

describe('queryKeys & cross-module invalidation helpers', () => {
  it('provides stable query key arrays', () => {
    expect(queryKeys.inventory.all).toEqual(['inventory']);
    expect(queryKeys.warehouse.stocksAll).toEqual(['warehouse-stocks']);
    expect(queryKeys.ledger.all).toEqual(['buku_besar']);
    expect(queryKeys.posAuth.active).toEqual(['pos-auth-active']);
    expect(queryKeys.posAuth.history).toEqual(['pos-auth-history']);
    expect(queryKeys.promo.activeMap).toEqual(['activePromos']);
  });

  it('invalidateInventoryMutation invalidates inventory, warehouse stocks, summary, and dashboard', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    await invalidateInventoryMutation({ invalidateQueries: spy });

    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.inventory.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouse.stocksAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouseOps.summary });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('invalidateFinanceMutation invalidates ledger, cash flow keys, active shifts, and dashboard', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    await invalidateFinanceMutation({ invalidateQueries: spy });

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.ledger.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlow.kasLog });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlow.kasSummary });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlow.shiftSummary });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlow.activeShifts });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('invalidatePurchasingMutation invalidates inventory, stocks, pembelian, ledger, and cash flow', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    await invalidatePurchasingMutation({ invalidateQueries: spy });

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.inventory.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouse.stocksAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.transactions.pembelianAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.ledger.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlow.kasLog });
  });

  it('invalidatePosAuthMutation and invalidateWarehouseMutation target domain keys', async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    await invalidatePosAuthMutation({ invalidateQueries: spy });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.posAuth.active });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.posAuth.history });

    spy.mockClear();
    await invalidateWarehouseMutation({ invalidateQueries: spy });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouse.stocksAll });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouseOps.transfers });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouseOps.outbounds });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.warehouseOps.summary });
  });
});
