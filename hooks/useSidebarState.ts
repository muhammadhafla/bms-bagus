import { useState, useEffect } from 'react';

const defaultSidebarState = {
  inventoryExpanded: true,
  purchasingExpanded: true,
  transactionsExpanded: true,
  printingExpanded: true,
  financeExpanded: true,
  autoHideEnabled: false,
  sidebarCollapsed: false,
};

type SidebarState = typeof defaultSidebarState;

export function useSidebarState() {
  const [state, setState] = useState<SidebarState>(() => {
    if (typeof window === 'undefined') return defaultSidebarState;
    try {
      const stored = localStorage.getItem('bms-sidebar-state');
      return stored ? { ...defaultSidebarState, ...JSON.parse(stored) } : defaultSidebarState;
    } catch {
      return defaultSidebarState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bms-sidebar-state', JSON.stringify(state));
    } catch {}
  }, [state]);

  const setField = <K extends keyof SidebarState>(
    key: K,
    value: SidebarState[K] | ((p: SidebarState[K]) => SidebarState[K]),
  ) =>
    setState((prev) => ({
      ...prev,
      [key]: typeof value === 'function' ? (value as any)(prev[key]) : value,
    }));

  return {
    ...state,
    setSidebarCollapsed: (v: boolean | ((p: boolean) => boolean)) =>
      setField('sidebarCollapsed', v),
    setInventoryExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('inventoryExpanded', v),
    setPurchasingExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('purchasingExpanded', v),
    setTransactionsExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('transactionsExpanded', v),
    setPrintingExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('printingExpanded', v),
    setFinanceExpanded: (v: boolean | ((p: boolean) => boolean)) => setField('financeExpanded', v),
    setAutoHideEnabled: (v: boolean | ((p: boolean) => boolean)) => setField('autoHideEnabled', v),
  };
}
