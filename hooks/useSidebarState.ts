import { useState, useEffect } from 'react';

function usePersistentBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

export function useSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentBoolean('bms-sidebar-collapsed', false);
  const [inventoryExpanded, setInventoryExpanded] = usePersistentBoolean('bms-inventory-expanded', true);
  const [purchasingExpanded, setPurchasingExpanded] = usePersistentBoolean('bms-purchasing-expanded', true);
  const [transactionsExpanded, setTransactionsExpanded] = usePersistentBoolean('bms-transactions-expanded', true);
  const [printingExpanded, setPrintingExpanded] = usePersistentBoolean('bms-printing-expanded', true);
  const [financeExpanded, setFinanceExpanded] = usePersistentBoolean('bms-finance-expanded', true);
  const [autoHideEnabled, setAutoHideEnabled] = usePersistentBoolean('bms-autohide-enabled', false);

  return {
    sidebarCollapsed, setSidebarCollapsed,
    inventoryExpanded, setInventoryExpanded,
    purchasingExpanded, setPurchasingExpanded,
    transactionsExpanded, setTransactionsExpanded,
    printingExpanded, setPrintingExpanded,
    financeExpanded, setFinanceExpanded,
    autoHideEnabled, setAutoHideEnabled,
  };
}
