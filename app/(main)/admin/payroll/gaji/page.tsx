import { Suspense } from 'react';
import AdminGajiClient from './AdminGajiClient';

export const metadata = {
  title: 'Slip Gaji & Tutup Buku',
};

export default function AdminGajiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat halaman...</div>}>
      <AdminGajiClient />
    </Suspense>
  );
}
