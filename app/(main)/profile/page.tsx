'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AmbientLayout } from '@/components/ui';
import { toast } from 'sonner';
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
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditForm = (isMobile: boolean = false) => (
    <div
      className={`mx-auto max-w-2xl px-4 py-8 ${isMobile ? 'block lg:hidden' : 'hidden lg:block'}`}
    >
      <div className="mb-8 flex items-center gap-4">
        {isMobile && (
          <button
            onClick={() => setShowMobileEditForm(false)}
            className="-ml-2 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <IconChevronRight className="h-5 w-5 rotate-180 text-neutral-600 dark:text-neutral-400" />
          </button>
        )}
        {!isMobile && <IconUser className="text-brand-500 h-8 w-8" />}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Edit Profil</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sesuaikan informasi akun Anda
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div
              className="group relative h-24 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-full border-4 border-neutral-100 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="96px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-neutral-400">
                  {nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <IconCamera className="h-8 w-8 text-white" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
                Foto Profil
              </h3>
              <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                Klik foto di samping untuk mengubah. Rekomendasi ukuran 256x256px.
              </p>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                }
                placeholder="Contoh: agus_kasir"
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Gunakan huruf kecil, angka, garis bawah (_), atau titik (.). Digunakan untuk login.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nama Lengkap (Display Name)
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Lengkap Anda"
                required
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </div>

            <hr className="my-4 border-neutral-200 dark:border-neutral-800" />

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Password Baru <span className="font-normal text-neutral-400">(Opsional)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ganti password"
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                minLength={6}
              />
            </div>

            {password && (
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Masukkan ulang password baru"
                  className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  required={!!password}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <IconDeviceFloppy className="h-5 w-5" />
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
          <div className="flex h-full flex-col space-y-4">
            {/* Header: User Profile Card */}
            <div
              className="bg-brand-600 flex cursor-pointer items-center gap-4 rounded-2xl p-4 text-white shadow-sm transition-transform active:scale-95"
              onClick={() => setShowMobileEditForm(true)}
            >
              <div className="bg-brand-500 relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-white/20">
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
              <IconSettings className="h-6 w-6 text-white/80" />
            </div>

            {/* General Settings */}
            <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <button
                onClick={toggleTheme}
                className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                  {theme === 'dark' ? (
                    <IconSun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <IconMoon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Tema Aplikasi
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                  </p>
                </div>
              </button>
            </div>

            {/* Secondary Menus */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Manajemen & Sistem
                </p>
              </div>

              {isAdminUser && (
                <>
                  <Link
                    href="/users"
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
                    href="/members"
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
                    className="flex items-center gap-4 border-b border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/30">
                      <IconHistory className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      Riwayat Cetak
                    </div>
                    <IconChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>
                </>
              )}
            </div>

            {/* Logout Button */}
            <div className="pt-2">
              <button
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white p-4 font-bold text-red-600 transition-transform active:scale-95 dark:border-red-900/30 dark:bg-neutral-900 dark:text-red-500"
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
