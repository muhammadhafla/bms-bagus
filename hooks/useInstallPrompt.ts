'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const emptySubscribe = () => () => {};

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function checkIsDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem('pwa-install-dismissed');
  } catch {
    return false;
  }
}

function checkIsIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedOverride, setInstalledOverride] = useState(false);
  const [dismissedOverride, setDismissedOverride] = useState(false);

  const initialStandalone = useSyncExternalStore(emptySubscribe, checkIsStandalone, () => false);
  const initialDismissed = useSyncExternalStore(emptySubscribe, checkIsDismissed, () => false);
  const isIosPrompt = useSyncExternalStore(emptySubscribe, checkIsIos, () => false);

  const isInstalled = initialStandalone || installedOverride;
  const isDismissed = initialDismissed || dismissedOverride;

  useEffect(() => {
    if (isInstalled || isDismissed) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => setInstalledOverride(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isInstalled, isDismissed]);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalledOverride(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
    } catch {}
    setDismissedOverride(true);
  };

  return {
    canInstall: (!!deferredPrompt || isIosPrompt) && !isInstalled && !isDismissed,
    isIosPrompt,
    install,
    dismiss,
    isInstalled,
  };
}
