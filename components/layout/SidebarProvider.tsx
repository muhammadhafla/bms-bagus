'use client';

import React, { createContext, useContext, useState } from 'react';
import { useSidebarState as useSidebarZustand } from '@/hooks/useSidebarState';

interface SidebarContextType {
  sidebarHovered: boolean;
  setSidebarHovered: (hovered: boolean) => void;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  logoutConfirmOpen: boolean;
  setLogoutConfirmOpen: (open: boolean) => void;
  isLoggingOut: boolean;
  setIsLoggingOut: (loggingOut: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Expose zustand state for convenience
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  operasionalExpanded: boolean;
  setOperasionalExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  inventoryExpanded: boolean;
  setInventoryExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  financeExpanded: boolean;
  setFinanceExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  payrollExpanded: boolean;
  setPayrollExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  reportsExpanded: boolean;
  setReportsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  masterExpanded: boolean;
  setMasterExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  autoHideEnabled: boolean;
  setAutoHideEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;

  isSidebarVisible: boolean;
  sidebarWidth: string;
  contentMargin: string;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    operasionalExpanded,
    setOperasionalExpanded,
    inventoryExpanded,
    setInventoryExpanded,
    financeExpanded,
    setFinanceExpanded,
    payrollExpanded,
    setPayrollExpanded,
    reportsExpanded,
    setReportsExpanded,
    masterExpanded,
    setMasterExpanded,
    autoHideEnabled,
    setAutoHideEnabled,
  } = useSidebarZustand();

  const isSidebarVisible = autoHideEnabled ? sidebarHovered : true;
  const sidebarWidth = autoHideEnabled ? (sidebarHovered ? 'lg:w-56' : 'lg:w-16') : 'lg:w-56';
  const contentMargin = autoHideEnabled ? (sidebarHovered ? 'lg:ml-56' : 'lg:ml-16') : 'lg:ml-56';

  return (
    <SidebarContext.Provider
      value={{
        sidebarHovered,
        setSidebarHovered,
        userMenuOpen,
        setUserMenuOpen,
        logoutConfirmOpen,
        setLogoutConfirmOpen,
        isLoggingOut,
        setIsLoggingOut,
        mobileMenuOpen,
        setMobileMenuOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        operasionalExpanded,
        setOperasionalExpanded,
        inventoryExpanded,
        setInventoryExpanded,
        financeExpanded,
        setFinanceExpanded,
        payrollExpanded,
        setPayrollExpanded,
        reportsExpanded,
        setReportsExpanded,
        masterExpanded,
        setMasterExpanded,
        autoHideEnabled,
        setAutoHideEnabled,
        isSidebarVisible,
        sidebarWidth,
        contentMargin,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}
