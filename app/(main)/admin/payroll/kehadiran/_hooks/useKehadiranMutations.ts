import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kehadiranApi, Kehadiran } from '@/lib/api/payroll';
import { toast } from 'sonner';

interface MutationOptions {
  onSuccessCreate?: () => void;
  onSuccessUpdate?: () => void;
  onSuccessReviewPulangAwal?: () => void;
  onSuccessBulkReviewPulangAwal?: (count: number) => void;
  onSuccessReviewLembur?: () => void;
  onSuccessBulkApprove?: (count: number) => void;
}

export function useKehadiranMutations(options?: MutationOptions) {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    // Targeted invalidation hanya untuk data kehadiran & antrean, bukan master toko/karyawan
    queryClient.invalidateQueries({ queryKey: ['admin_payroll_kehadiran_paginated'] });
    queryClient.invalidateQueries({ queryKey: ['admin_today_kehadiran_summary'] });
    queryClient.invalidateQueries({ queryKey: ['admin_pending_lembur_count'] });
    queryClient.invalidateQueries({ queryKey: ['admin_pending_pulang_awal_count'] });
    queryClient.invalidateQueries({ queryKey: ['admin_pending_lembur_list'] });
    queryClient.invalidateQueries({ queryKey: ['admin_pending_pulang_awal_list'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Omit<Kehadiran, 'id' | 'created_at' | 'profiles'>) => {
      return kehadiranApi.createKehadiran(payload);
    },
    onSuccess: (res) => {
      if (res.error) {
        if (
          res.error.message?.includes('duplicate key') ||
          res.error.message?.includes('kehadiran_user_id_tanggal_key') ||
          res.error.message?.includes('409')
        ) {
          toast.error('Karyawan ini sudah memiliki entri pada tanggal tersebut. Silakan edit entri yang sudah ada.');
        } else {
          toast.error('Gagal membuat entri: ' + res.error.message);
        }
        return;
      }
      toast.success('Entri kehadiran berhasil dibuat!');
      invalidateQueries();
      options?.onSuccessCreate?.();
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Kehadiran> & { id: string }) => {
      const { id, ...rest } = payload;
      return kehadiranApi.updateKehadiran(id, rest);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal menyimpan: ' + res.error.message);
        return;
      }
      toast.success('Data Kehadiran berhasil diupdate!');
      invalidateQueries();
      options?.onSuccessUpdate?.();
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  const reviewPulangAwalMutation = useMutation({
    mutationFn: (args: { id: string; keputusan: 'hitung_penuh' | 'sesuai_durasi' | 'ditolak'; catatan?: string }) =>
      kehadiranApi.reviewPulangAwal(args.id, args.keputusan, args.catatan),
    onSuccess: (res, vars) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      let msg = 'Keputusan kepulangan awal berhasil disimpan.';
      if (vars.keputusan === 'hitung_penuh') {
        msg = 'Absensi disetujui dihitung penuh (jam clockout diset ke jam shift).';
      } else if (vars.keputusan === 'sesuai_durasi') {
        msg = 'Absensi disetujui dihitung sesuai durasi riil.';
      } else if (vars.keputusan === 'ditolak') {
        msg = 'Pengajuan kepulangan awal ditolak (dihitung durasi riil & ditandai).';
      }
      toast.success(msg);
      invalidateQueries();
      options?.onSuccessReviewPulangAwal?.();
    },
    onError: () => toast.error('Gagal melakukan review kepulangan awal'),
  });

  const reviewLemburMutation = useMutation({
    mutationFn: (args: { id: string; keputusan: 'disetujui' | 'ditolak'; menitDisetujui?: number }) =>
      kehadiranApi.reviewLembur(args.id, args.keputusan, args.menitDisetujui),
    onSuccess: (res, vars) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      const msg =
        vars.keputusan === 'disetujui'
          ? `Lembur disetujui (${vars.menitDisetujui || 0} menit)!`
          : 'Pengajuan lembur telah ditolak.';
      toast.success(msg);
      invalidateQueries();
      options?.onSuccessReviewLembur?.();
    },
    onError: () => toast.error('Gagal memproses review lembur'),
  });

  const bulkReviewPulangAwalMutation = useMutation({
    mutationFn: (args: { ids: string[]; keputusan: 'hitung_penuh' | 'sesuai_durasi' }) =>
      kehadiranApi.bulkReviewPulangAwal(args.ids, args.keputusan),
    onSuccess: (res, vars) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Berhasil mereview ${res.data || vars.ids.length} entri pulang awal!`);
      invalidateQueries();
      options?.onSuccessBulkReviewPulangAwal?.(res.data || vars.ids.length);
    },
    onError: () => toast.error('Gagal mereview massal pulang awal'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => kehadiranApi.bulkApproveLembur(ids),
    onSuccess: (res, vars) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Berhasil menyetujui ${res.data || vars.length} entri lembur!`);
      invalidateQueries();
      options?.onSuccessBulkApprove?.(res.data || vars.length);
    },
    onError: () => toast.error('Gagal melakukan approval lembur'),
  });

  return {
    createMutation,
    updateMutation,
    reviewPulangAwalMutation,
    bulkReviewPulangAwalMutation,
    reviewLemburMutation,
    bulkApproveMutation,
  };
}
