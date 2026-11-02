'use client';

import React, { useState } from 'react';
import { useWaBridge } from '@/lib/hooks/useWaBridge';
import { useAuthStore } from '@/lib/auth';
import { BridgeStatusHeader } from '@/components/admin/wa-bridge/BridgeStatusHeader';
import { QrScanCard } from '@/components/admin/wa-bridge/QrScanCard';
import { QueueStatsCard } from '@/components/admin/wa-bridge/QueueStatsCard';
import { PromoFooterCard } from '@/components/admin/wa-bridge/PromoFooterCard';
import { InactivityReminderCard } from '@/components/admin/wa-bridge/InactivityReminderCard';
import { MultiBranchOutboxTable } from '@/components/admin/wa-bridge/MultiBranchOutboxTable';
import { TestMessageModal } from '@/components/admin/wa-bridge/TestMessageModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  IconBrandWhatsapp,
  IconSend,
  IconReceipt,
  IconSparkles,
  IconCalendarEvent,
  IconShieldLock,
} from '@tabler/icons-react';

export default function WaBridgeClient() {
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');

  const {
    status,
    settings,
    outboxItems,
    outboxTotal,
    gudangList,
    filter,
    setFilter,
    isLoading,
    isActionLoading,
    isBridgeOnline,
    qrSecondsRemaining,
    resetSession,
    logoutSession,
    sendTestMessage,
    retryMessage,
    updateSettings,
    resetInactivityDate,
    refreshAll,
  } = useWaBridge();

  const [activeTab, setActiveTab] = useState<'history' | 'promo' | 'inactivity'>('history');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    danger: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    danger: true,
    onConfirm: () => {},
  });

  // Guard for non-admin
  if (!isAdmin) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mb-4">
          <IconShieldLock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Akses Dibatasi
        </h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          Halaman Manajemen Sesi WhatsApp Bridge hanya dapat diakses oleh Administrator dan Owner.
        </p>
      </div>
    );
  }

  const handlePromptReset = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Reset Sesi WhatsApp',
      message:
        'Tindakan ini akan meminta VPS Bridge untuk menghapus kredensial sesi lokal dan memunculkan QR Code baru untuk dipindai ulang. Lanjutkan?',
      danger: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await resetSession();
      },
    });
  };

  const handlePromptLogout = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Logout WhatsApp',
      message:
        'Tindakan ini akan memutuskan koneksi WhatsApp toko pada remote VPS bridge. Struk digital tidak dapat dikirim sampai perangkat ditautkan ulang. Lanjutkan logout?',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await logoutSession();
      },
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">
              Integrasi WhatsApp Bridge
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Pusat pemindaian QR code, manajemen sesi, pemantauan riwayat struk multi-cabang, dan proteksi inaktivitas HP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <IconSend className="h-4 w-4" />
            Kirim Uji Coba
          </button>
        </div>
      </div>

      {/* Main Connection Status Header */}
      <BridgeStatusHeader
        status={status}
        isOnline={isBridgeOnline}
        isLoading={isLoading}
        isActionLoading={isActionLoading}
        onRefresh={refreshAll}
        onResetSession={handlePromptReset}
        onLogout={handlePromptLogout}
      />

      {/* Live QR Code Scanner (Appears when not connected) */}
      {!status?.connected && (
        <QrScanCard
          qrBase64={status?.qr_base64 || null}
          secondsRemaining={qrSecondsRemaining}
          isActionLoading={isActionLoading}
          onRefreshQr={handlePromptReset}
        />
      )}

      {/* Queue Metrics KPI */}
      <QueueStatsCard stats={status?.queue_stats} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <IconReceipt className="h-4 w-4" />
          Riwayat Pengiriman Seluruh Cabang
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {outboxTotal}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('promo')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition ${
            activeTab === 'promo'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <IconSparkles className="h-4 w-4" />
          Footer Promosi Dinamis
        </button>

        <button
          onClick={() => setActiveTab('inactivity')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition ${
            activeTab === 'inactivity'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <IconCalendarEvent className="h-4 w-4" />
          Pengingat Inaktivitas 14 Hari
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'history' && (
        <MultiBranchOutboxTable
          items={outboxItems}
          total={outboxTotal}
          filter={filter}
          gudangList={gudangList}
          onFilterChange={(newF) => setFilter((prev) => ({ ...prev, ...newF }))}
          onRetry={retryMessage}
        />
      )}

      {activeTab === 'promo' && (
        <PromoFooterCard
          currentFooter={settings?.wa_receipt_promo_footer || ''}
          isActionLoading={isActionLoading}
          onSaveFooter={async (text) => {
            await updateSettings({ wa_receipt_promo_footer: text });
          }}
        />
      )}

      {activeTab === 'inactivity' && (
        <InactivityReminderCard
          settings={settings}
          isActionLoading={isActionLoading}
          onUpdateSettings={updateSettings}
          onResetDays={resetInactivityDate}
          onSendTest={sendTestMessage}
        />
      )}

      {/* Test Message Modal */}
      <TestMessageModal
        isOpen={isTestModalOpen}
        isActionLoading={isActionLoading}
        onClose={() => setIsTestModalOpen(false)}
        onSend={sendTestMessage}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        confirmLabel="Ya, Lanjutkan"
        cancelLabel="Batal"
      />
    </div>
  );
}
