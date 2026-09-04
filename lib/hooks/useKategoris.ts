import { useQuery } from '@tanstack/react-query';
import { kategoriApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useKategoris() {
  return useQuery({
    queryKey: queryKeys.kategori.all,
    queryFn: async () => {
      const result = await kategoriApi.getAll();
      return result.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

