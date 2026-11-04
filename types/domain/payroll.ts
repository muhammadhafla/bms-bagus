import type { Database } from '../supabase';

export type KaryawanRow = Database['public']['Tables']['karyawan']['Row'];
export type KehadiranRow = Database['public']['Tables']['kehadiran']['Row'];
export type SlipGajiRow = Database['public']['Tables']['slip_gaji']['Row'];
export type PayrollMutasiRow = Database['public']['Tables']['payroll_mutasi']['Row'];
export type LokasiKerjaRow = Database['public']['Tables']['lokasi_kerja']['Row'];

export type KasbonStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'paid_off';
export type KehadiranStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa';

export interface KasbonRequest {
  id: string;
  karyawan_id: string;
  tanggal: string;
  nominal: number;
  alasan: string;
  status: KasbonStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  catatan_admin?: string | null;
}

export interface KehadiranSummary {
  karyawan_id: string;
  totalHadir: number;
  totalTerlambat: number;
  totalMenitKeterlambatan: number;
  totalDendaKeterlambatan: number;
  totalPulangAwal: number;
}
