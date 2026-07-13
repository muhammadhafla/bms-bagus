import { useQuery } from '@tanstack/react-query';
import { supplierApi } from '@/lib/api';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const result = await supplierApi.getAll();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
