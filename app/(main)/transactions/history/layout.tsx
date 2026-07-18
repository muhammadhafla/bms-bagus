import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Riwayat Transaksi',
};

export default function TransactionsHistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
