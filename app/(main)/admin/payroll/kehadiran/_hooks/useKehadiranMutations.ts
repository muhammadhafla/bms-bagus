import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kehadiranApi, Kehadiran } from '@/lib/api/payroll';
import { toast } from 'sonner';

interface MutationOptions {
  onSuccessCreate?: () => void;
  onSuccessUpdate?: () => void;
  onSuccessReviewPulangAwal?: () => void;
  onSuccessBulkReviewPulangAwal?: (count: number) => void;
  onSuccessBulkApprove?: (count: number) => void;
}

export function useKehadiranMutations(options?: MutationOptions) {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && (key.includes('payroll') || key.includes('kehadiran'));
      },
    });
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
    mutationFn: (args: { id: string; keputusan: 'hitung_penuh' | 'sesuai_durasi'; catatan?: string }) =>
      kehadiranApi.reviewPulangAwal(args.id, args.keputusan, args.catatan),
    onSuccess: (res, vars) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      const msg =
        vars.keputusan === 'hitung_penuh'
          ? 'Absensi disetujui dihitung penuh (jam clockout diset ke jam shift).'
          : 'Absensi disetujui dihitung sesuai durasi riil.';
      toast.success(msg);
      invalidateQueries();
      options?.onSuccessReviewPulangAwal?.();
    },
    onError: () => toast.error('Gagal melakukan review kepulangan awal'),
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
    bulkApproveMutation,
  };
}
