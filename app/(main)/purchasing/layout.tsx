import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pembelian',
};

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
