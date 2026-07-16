import type { Viewport } from "next";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/AuthProvider";
import { DarkModeProvider } from "@/components/DarkModeProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { headers } from "next/headers";

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};

export const metadata: Metadata = {
  title: "BMS - Bagus Management System",
  description: "Admin aplikasi manajemen inventory",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;

  return (
    <html lang="id" suppressHydrationWarning className="light">
      <head>
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
        <QueryProvider>
          <AuthProvider>
            <DarkModeProvider>
              {children}
              <Toaster richColors position="bottom-right" />
            </DarkModeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
