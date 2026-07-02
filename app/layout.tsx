import type { Viewport } from "next";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { DarkModeProvider } from "@/components/DarkModeProvider";
import { QueryProvider } from "@/components/QueryProvider";

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "BMS - Bagus Management System",
  description: "Admin aplikasi manajemen inventory",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className="light">
      <head>
        <script dangerouslySetInnerHTML={{
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
              <ToastProvider>{children}</ToastProvider>
            </DarkModeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
