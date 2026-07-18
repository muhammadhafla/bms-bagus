import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analisis & Laporan',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
