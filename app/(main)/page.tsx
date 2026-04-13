'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Link from 'next/link';
import Image from 'next/image';
import {
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
} from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';

const menuItems = [
  { href: '/inventory', title: 'Inventory', desc: 'Kelola barang', icon: IconPackage, color: 'from-brand-500 to-brand-600', shortcut: 'I' },
  { href: '/pembelian', title: 'Pembelian', desc: 'Input pembelian', icon: IconShoppingCart, color: 'from-brand-400 to-brand-500', shortcut: 'P' },
  { href: '/return', title: 'Return', desc: 'Retur barang', icon: IconArrowBack, color: 'from-brand-300 to-brand-400', shortcut: 'R' },
  { href: '/reports', title: 'Laporan', desc: 'Laporan & monitoring', icon: IconReport, color: 'from-brand-600 to-brand-700', shortcut: 'L' },
  { href: '/receipt', title: 'Struk', desc: 'Template & logo', icon: IconReceipt, color: 'from-brand-400 to-brand-500', shortcut: 'S' },
];

function HomeContent() {
  const { user, initialized, signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <Header title="Home" />
      
      <div className="p-6 md:p-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 relative mb-6">
              <Image
                src="/images/logo.png"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-3">
              Inventory Management
            </h1>
            <p className="text-lg text-neutral-500 dark:text-neutral-400">Aplikasi admin untuk mengelola inventaris toko</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {menuItems.map((item) => (
              <Tooltip key={item.href} content={`Press ${item.shortcut} to navigate`}>
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className="group relative block w-full bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-100 dark:border-neutral-700 hover:border-neutral-200 dark:hover:border-neutral-600"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">{item.title}</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.desc}</p>
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-neutral-400 dark:text-neutral-500 text-2xl">→</span>
                  </div>
                  <div className="absolute bottom-6 right-6">
                    <span className="text-xs text-neutral-300 dark:text-neutral-600 font-mono">{item.shortcut}</span>
                  </div>
                </Link>
              </Tooltip>
            ))}
          </div>

          <Footer 
            userEmail={user.email || 'Admin'} 
            onLogout={handleSignOut}
            version="1.0"
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
