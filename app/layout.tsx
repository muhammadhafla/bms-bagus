import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { DarkModeProvider } from "@/components/DarkModeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BMS - Bagus Management System",
  description: "Admin aplikasi manajemen inventory",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className="light">
      <body className={`${inter.className} min-h-screen transition-colors`}>
        <AuthProvider>
          <DarkModeProvider>
            <ToastProvider>{children}</ToastProvider>
          </DarkModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
