import type { Viewport } from "next";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { DarkModeProvider } from "@/components/DarkModeProvider";
import { headers } from "next/headers";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import NextTopLoader from 'nextjs-toploader';
import { Analytics } from '@vercel/analytics/next';

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
  description: "Aplikasi manajemen inventory yang komprehensif, efisien, dan mudah digunakan untuk memonitor stok barang, melacak riwayat transaksi, serta menghasilkan laporan bisnis secara real-time.",
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' }
    ],
    apple: "/icon-192x192.png",
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
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        )}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = localStorage.getItem('theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = t || (prefersDark ? 'dark' : 'light');
              document.documentElement.classList.add(theme);
            } catch(e) {}
          `
        }} />
      </head>
      <body className={`${poppins.className} min-h-screen transition-colors`}>
        <NextTopLoader color="#0ea5e9" showSpinner={false} />
        <DarkModeProvider>
          {children}
          <OfflineIndicator />
        </DarkModeProvider>
        <Analytics />
      </body>
    </html>
  );
}
