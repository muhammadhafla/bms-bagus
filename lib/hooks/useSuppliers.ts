import { useQuery } from '@tanstack/react-query';
import { supplierApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const result = await supplierApi.getAll();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

