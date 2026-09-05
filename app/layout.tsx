import type { Viewport } from 'next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DarkModeProvider } from '@/components/DarkModeProvider';
import { headers } from 'next/headers';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { PwaRegister } from '@/components/PwaRegister';
import NextTopLoader from 'nextjs-toploader';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};

export const metadata: Metadata = {
  title: {
    template: '%s | BMS Bagus',
    default: 'BMS - Bagus Management System',
  },
  description:
    'Aplikasi manajemen inventory yang komprehensif, efisien, dan mudah digunakan untuk memonitor stok barang, melacak riwayat transaksi, serta menghasilkan laporan bisnis secara real-time.',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/icon-192x192.png',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Removed headers() call to allow static rendering when possible.
  const nonce = undefined;

  return (
    <html lang="id" suppressHydrationWarning className="light">
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={process.env.NEXT_PUBLIC_SUPABASE_URL}
            crossOrigin="anonymous"
          />
        )}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
            try {
              const t = localStorage.getItem('theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = t || (prefersDark ? 'dark' : 'light');
              document.documentElement.classList.add(theme);
            } catch(e) {}
          `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen transition-colors`}>
        <NextTopLoader color="#db4a2c" showSpinner={false} />
        <DarkModeProvider>
          <PwaRegister />
          {children}
          <OfflineIndicator />
        </DarkModeProvider>
        <Analytics />
      </body>
    </html>
  );
}
