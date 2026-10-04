import { Suspense } from 'react';
import PosAuthClient from './PosAuthClient';
import { PageLoadingSpinner } from '@/components/ui';

export const metadata = {
  title: 'Otorisasi PIN POS | BMS',
  description: 'Kelola permohonan otorisasi PIN akses pengaturan POS kasir',
};

export default function PosAuthPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <PosAuthClient />
    </Suspense>
  );
}
