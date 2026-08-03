import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import InventoryPageClient from './InventoryPageClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Metadata and server configuration
export const metadata = {
  title: 'Stok Barang',
};

export default async function InventoryPage() {
  const queryClient = new QueryClient();
  
  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  // Default query parameter yang persis sama dengan InventoryPageClient
  const queryKey = ['inventory', { page: 1, search: '', categoryName: '', lowStockOnly: false, activeStatus: 'all', sortBy: 'nama_barang', sortDir: 'asc' }];
  
  // Prefetch data inventory halaman pertama menggunakan SSR (tanpa HTTP fetch)
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      // Meniru behavior inventoryApi.getPaginated() untuk default state
      const [countResult, dataResult] = await Promise.all([
        supabaseServer.from('inventory').select('*', { count: 'exact', head: true }),
        supabaseServer.from('inventory').select('*, id_kategori:id_kategori(*)').order('nama_barang', { ascending: true }).range(0, 19)
      ]);

      return {
        data: dataResult.data || [],
        total: countResult.count || 0,
        page: 1,
        limit: 20,
        hasMore: (dataResult.data?.length || 0) < (countResult.count || 0),
        error: null
      };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryPageClient />
    </HydrationBoundary>
  );
}