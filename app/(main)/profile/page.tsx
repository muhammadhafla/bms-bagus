'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AmbientLayout } from '@/components/ui';
import { toast } from "sonner";
import { IconUser, IconCamera, IconDeviceFloppy } from '@tabler/icons-react';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, profile, refreshSession } = useAuthStore();
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const { error } = await supabase
        .from('profiles')
        .update({
          nama,
          username,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil berhasil diperbarui');
      await refreshSession();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AmbientLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <IconUser className="w-8 h-8 text-brand-500" />
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
    </AmbientLayout>
  );
}
