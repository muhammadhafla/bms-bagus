import { useCallback, useSyncExternalStore } from 'react';

const defaultSidebarState = {
  operasionalExpanded: true,
  inventoryExpanded: true,
  warehouseExpanded: true,
  financeExpanded: true,
  payrollExpanded: true,
  reportsExpanded: true,
  masterExpanded: true,
  autoHideEnabled: false,
  sidebarCollapsed: false,
};

type SidebarState = typeof defaultSidebarState;

const STORAGE_KEY = 'bms-sidebar-state';
const sidebarListeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedSnapshot: SidebarState = defaultSidebarState;

function subscribeSidebarState(listener: () => void) {
  sidebarListeners.add(listener);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    sidebarListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSidebarSnapshot(): SidebarState {
  if (typeof window === 'undefined') return defaultSidebarState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    cachedSnapshot = raw ? { ...defaultSidebarState, ...JSON.parse(raw) } : defaultSidebarState;
    return cachedSnapshot;
  } catch {
    return defaultSidebarState;
  }
}

function getServerSidebarSnapshot(): SidebarState {
  return defaultSidebarState;
}

export function useSidebarState() {
  const state = useSyncExternalStore(
    subscribeSidebarState,
    getSidebarSnapshot,
    getServerSidebarSnapshot,
  );

  const setField = useCallback(
    <K extends keyof SidebarState>(
      key: K,
      value: SidebarState[K] | ((p: SidebarState[K]) => SidebarState[K]),
    ) => {
      const current = getSidebarSnapshot();
      const nextValue = typeof value === 'function' ? (value as (p: SidebarState[K]) => SidebarState[K])(current[key]) : value;
      const nextState: SidebarState = { ...current, [key]: nextValue };
      const serialized = JSON.stringify(nextState);
      cachedRaw = serialized;
      cachedSnapshot = nextState;
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch {}
      sidebarListeners.forEach((listener) => listener());
    },
    [],
  );

  return {
    ...state,
    setSidebarCollapsed: (v: boolean | ((p: boolean) => boolean)) =>
      setField('sidebarCollapsed', v),
    setOperasionalExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('operasionalExpanded', v),
    setInventoryExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('inventoryExpanded', v),
    setWarehouseExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('warehouseExpanded', v),
    setFinanceExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('financeExpanded', v),
    setPayrollExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('payrollExpanded', v),
    setReportsExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('reportsExpanded', v),
    setMasterExpanded: (v: boolean | ((p: boolean) => boolean)) =>
      setField('masterExpanded', v),
    setAutoHideEnabled: (v: boolean | ((p: boolean) => boolean)) =>
      setField('autoHideEnabled', v),
  };
}
