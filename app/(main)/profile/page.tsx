'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AmbientLayout } from '@/components/ui';
import { toast } from "sonner";
import { 
  IconUser, IconCamera, IconDeviceFloppy, IconSettings, IconSun, IconMoon, 
  IconLogout, IconChevronRight, IconUsers, IconUsersGroup, IconTags, IconHistory, IconReport 
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
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

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
          password: password
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
    <div className={`max-w-2xl mx-auto py-8 px-4 ${isMobile ? 'block lg:hidden' : 'hidden lg:block'}`}>
      <div className="flex items-center gap-4 mb-8">
        {isMobile && (
          <button onClick={() => setShowMobileEditForm(false)} className="p-2 -ml-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <IconChevronRight className="w-5 h-5 rotate-180 text-neutral-600 dark:text-neutral-400" />
          </button>
        )}
        {!isMobile && <IconUser className="w-8 h-8 text-brand-500" />}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Edit Profil</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Sesuaikan informasi akun Anda</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-center sm:flex-row gap-6">
              <div 
                className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-neutral-100 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-800 cursor-pointer group flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-3xl font-bold">
                    {nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <IconCamera className="w-8 h-8 text-white" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">Foto Profil</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-500 dark:text-neutral-400 cursor-not-allowed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  placeholder="Contoh: agus_kasir"
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-all text-neutral-900 dark:text-white"
                />
                <p className="text-xs text-neutral-500 mt-1">Gunakan huruf kecil, angka, garis bawah (_), atau titik (.). Digunakan untuk login.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nama Lengkap (Display Name)
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  required
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-all text-neutral-900 dark:text-white"
                />
              </div>

              <hr className="border-neutral-200 dark:border-neutral-800 my-4" />

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Password Baru <span className="text-neutral-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin ganti password"
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-all text-neutral-900 dark:text-white"
                  minLength={6}
                />
              </div>

              {password && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Masukkan ulang password baru"
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-all text-neutral-900 dark:text-white"
                    required={!!password}
                  />
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <IconDeviceFloppy className="w-5 h-5" />
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
      <div className="block lg:hidden h-full pb-6">
        {showMobileEditForm ? (
          renderEditForm(true)
        ) : (
          <div className="flex flex-col h-full space-y-4">
            {/* Header: User Profile Card */}
            <div 
              className="bg-brand-600 p-4 rounded-2xl flex items-center gap-4 shadow-sm text-white active:scale-95 transition-transform cursor-pointer"
              onClick={() => setShowMobileEditForm(true)}
            >
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 bg-brand-500 flex-shrink-0">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="Avatar" fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xl">
                    {profile?.nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">{profile?.nama || 'User'}</h2>
                <p className="text-xs text-brand-100 truncate mb-1">{user?.email}</p>
                <span className="inline-block px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold uppercase tracking-wide">
                  {profile?.role || 'Staff'}
                </span>
              </div>
              <IconSettings className="w-6 h-6 text-white/80" />
            </div>

            {/* General Settings */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
              <button 
                onClick={toggleTheme}
                className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  {theme === 'dark' ? <IconSun className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <IconMoon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">Tema Aplikasi</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</p>
                </div>
              </button>
            </div>

            {/* Secondary Menus */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Manajemen & Sistem</p>
              </div>
              
              {isAdminUser && (
                <>
                  <Link href="/users" className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                      <IconUsers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Kelola Pengguna</div>
                    <IconChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>

                  <Link href="/members" className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                      <IconUsersGroup className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Master Member</div>
                    <IconChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>

                  <Link href="/inventory/promo" className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                      <IconTags className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Manajemen Promo</div>
                    <IconChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>

                  <Link href="/members/tiers" className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                      <IconSettings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Konfigurasi Tier</div>
                    <IconChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>

                  <Link href="/master/label-templates" className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                      <IconTags className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Template Label</div>
                    <IconChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>

                  <Link href="/print-history" className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900/30 flex items-center justify-center">
                      <IconHistory className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Riwayat Cetak</div>
                    <IconChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                </>
              )}

              <Link href="/finance/cash-flow" className={`flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors`}>
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <IconReport className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white">Arus Kas (Cash Flow)</div>
                <IconChevronRight className="w-4 h-4 text-neutral-400" />
              </Link>
            </div>

            {/* Logout Button */}
            <div className="pt-2">
              <button 
                onClick={() => setLogoutConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-500 font-bold active:scale-95 transition-transform"
              >
                <IconLogout className="w-5 h-5" />
                Keluar Aplikasi
              </button>
            </div>
          </div>
        )}
      </div>
    </AmbientLayout>
  );
}
