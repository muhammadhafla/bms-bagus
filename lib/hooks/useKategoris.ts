import { useQuery } from '@tanstack/react-query';
import { kategoriApi } from '@/lib/api';

export function useKategoris() {
  return useQuery({
    queryKey: ['kategoris'],
    queryFn: async () => {
      const result = await kategoriApi.getAll();
      return result.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
