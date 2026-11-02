import { Suspense } from 'react';
import WaBridgeClient from './WaBridgeClient';
import { PageLoadingSpinner } from '@/components/ui';

export const metadata = {
  title: 'WhatsApp Bridge | BMS',
  description: 'Manajemen Sesi dan Riwayat WhatsApp Bridge Terpusat',
};

export default function WaBridgePage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <WaBridgeClient />
    </Suspense>
  );
}
