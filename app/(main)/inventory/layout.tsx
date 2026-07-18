import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stok Barang',
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
