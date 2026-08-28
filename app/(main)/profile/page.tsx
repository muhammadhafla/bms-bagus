'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AmbientLayout } from '@/components/ui';
import { toast } from 'sonner';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import {
  IconUser,
  IconCamera,
  IconDeviceFloppy,
  IconSettings,
  IconSun,
  IconMoon,
  IconLogout,
  IconChevronRight,
  IconUsers,
  IconUsersGroup,
  IconTags,
  IconHistory,
  IconReport,
  IconTruck,
  IconPackage,
  IconClock,
  IconMapPin,
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useIsAdmin } from '@/lib/auth';
import { useDarkMode } from '@/components/DarkModeProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, profile, refreshSession, signOut } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const { theme, toggleTheme } = useDarkMode();
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mobile specific states
  const [showMobileEditForm, setShowMobileEditForm] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleSignOut = () => {
    setLogoutConfirmOpen(false);
    signOut();
  };

  useEffect(() => {
    if (profile) {
      setNama(profile.nama || '');
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}-${Math.random()}.${fileExt}`;

    setIsUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      toast.success('Avatar berhasil diunggah');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengunggah avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      if (username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .single();

        if (existingUser) {
          throw new Error('Username sudah digunakan oleh pengguna lain');
        }
      }

      if (password) {
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi password tidak cocok');
        }
        if (password.length < 6) {
          throw new Error('Password minimal 6 karakter');
        }
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        });
        if (passwordError) throw passwordError;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nama,
          username,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      setPassword('');
      setConfirmPassword('');
      toast.success('Profil berhasil diperbarui');
      await refreshSession();
      setShowMobileEditForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditForm = (isMobile: boolean = false) => (
    <div
      className={`mx-auto max-w-2xl px-4 py-4 sm:py-6 ${isMobile ? 'block lg:hidden' : 'hidden lg:block'}`}
    >
      <div className="mb-5 flex items-center gap-3">
        {isMobile && (
          <button
            onClick={() => setShowMobileEditForm(false)}
            className="-ml-2 rounded-lg bg-neutral-100 p-1.5 dark:bg-neutral-800"
          >
            <IconChevronRight className="h-5 w-5 rotate-180 text-neutral-600 dark:text-neutral-400" />
          </button>
        )}
        {!isMobile && <IconUser className="text-brand-500 h-7 w-7" />}
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Profil</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Sesuaikan informasi akun Anda
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => fileInputRef.current?.click()}>
              <div className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-neutral-100 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-neutral-400">
                    {nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>
              
              {/* Camera Icon Overlay */}
              <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-700 shadow-sm dark:border-neutral-900 dark:bg-neutral-600">
                <IconCamera className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <div className="text-center sm:text-left">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Foto Profil
              </h3>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <hr className="border-neutral-100 dark:border-neutral-800" />

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                }
                placeholder="Contoh: agus_kasir"
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] leading-tight text-neutral-500">
                Gunakan huruf kecil, angka, garis bawah (_), atau titik (.). Digunakan untuk login.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nama Lengkap (Display Name)
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Lengkap Anda"
                required
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </div>

            <hr className="my-3 border-neutral-100 dark:border-neutral-800" />

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Password Baru <span className="font-normal text-neutral-400">(Opsional)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ganti password"
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                minLength={6}
              />
            </div>

            {password && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Masukkan ulang password baru"
                  className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  required={!!password}
                />
              </div>
            )}
            <hr className="my-3 border-neutral-100 dark:border-neutral-800" />

            <div className="py-1">
              <PushNotificationManager />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <IconDeviceFloppy className="h-4 w-4" />
              )}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <AmbientLayout>
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        title="Keluar dari Sistem"
        message="Apakah Anda yakin ingin keluar dari sistem?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        onConfirm={handleSignOut}
        onCancel={() => setLogoutConfirmOpen(false)}
        danger
      />

      {/* Desktop View: Always show the edit form */}
      {renderEditForm(false)}

      {/* Mobile View */}
      <div className="block h-full pb-6 lg:hidden">
        {showMobileEditForm ? (
          renderEditForm(true)
        ) : (
          <div className="flex h-full flex-col space-y-3">
            {/* Header: User Profile Card */}
            <div
              className="bg-gradient-to-r from-brand-600 to-brand-500 flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-white shadow-md transition-transform active:scale-95"
              onClick={() => setShowMobileEditForm(true)}
            >
              <div className="bg-brand-500 relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-white/20">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold">
                    {profile?.nama?.charAt(0)?.toUpperCase() ||
                      user?.email?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold">{profile?.nama || 'User'}</h2>
                <p className="text-brand-100 mb-1 truncate text-xs">{user?.email}</p>
                <span className="inline-block rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {profile?.role || 'Staff'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                      window.navigator.vibrate(50);
                    }
                    toggleTheme();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all duration-300 ease-out active:scale-75"
                >
                  {theme === 'dark' ? (
                    <IconSun className="h-5 w-5 text-white" />
                  ) : (
                    <IconMoon className="h-5 w-5 text-white" />
                  )}
                </button>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                      window.navigator.vibrate(50);
                    }
                    setShowMobileEditForm(true);
                  }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all duration-300 ease-out active:scale-75 active:rotate-90"
                >
                  <IconSettings className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            {/* Secondary Menus */}
            {isAdminUser && (
              <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Manajemen & Sistem
                  </p>
                </div>
                  <Link
                    href="/admin/payroll/kehadiran"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-900/30">
                      <IconClock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Kelola Kehadiran
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/admin/payroll/lokasi-kerja"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                      <IconMapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Lokasi Outlet
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/users"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                      <IconUsers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Kelola Pengguna
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/admin/payroll/karyawan"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-900/30">
                      <IconUsersGroup className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Kelola Karyawan
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/members"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30">
                      <IconUsersGroup className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Master Member
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/inventory/kategori"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30">
                      <IconTags className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Kategori Barang
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/purchasing/supplier"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
                      <IconTruck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Data Supplier
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/members/tiers"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30">
                      <IconSettings className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Konfigurasi Tier
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/master/label-templates"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                      <IconTags className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Template Label
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>

                  <Link
                    href="/print-history"
                    className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/30">
                      <IconHistory className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Riwayat Cetak
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>
              </div>
            )}

            {/* Keuangan & Laporan */}
            {isAdminUser && (
              <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Keuangan & Laporan
                  </p>
                </div>
                  <Link
                    href="/finance/ledger"
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                      <IconReport className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Buku Besar (Ledger)
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>
              </div>
            )}

            {/* Logout Button */}
            <div className="pt-2">
              <button
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 font-bold text-red-600 transition-transform active:scale-95 dark:border-red-900/30 dark:bg-neutral-900 dark:text-red-500"
              >
                <IconLogout className="h-5 w-5" />
                Keluar Aplikasi
              </button>
            </div>
          </div>
        )}
      </div>
    </AmbientLayout>
  );
}
