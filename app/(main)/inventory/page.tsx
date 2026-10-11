import { Suspense } from 'react';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import InventoryPageClient from './InventoryPageClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PageLoadingSpinner } from '@/components/ui';
import { inventoryApi } from '@/lib/api/inventory';

// Metadata and server configuration
export const metadata = {
  title: 'Katalog Produk',
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function InventoryPage(props: Props) {
  const queryClient = new QueryClient();

  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );

  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = typeof searchParams?.search === 'string' ? searchParams.search : '';
  const categoryName = typeof searchParams?.kategori === 'string' ? searchParams.kategori : '';
  const lowStockOnly = searchParams?.lowStockOnly === 'true';
  const activeStatus = (typeof searchParams?.activeStatus === 'string' ? searchParams.activeStatus : 'all') as 'all' | 'active' | 'discontinued';
  const sortBy = typeof searchParams?.sortBy === 'string' ? searchParams.sortBy : 'nama_barang';
  const sortDir = (typeof searchParams?.sortDir === 'string' ? searchParams.sortDir : 'asc') as 'asc' | 'desc';

  const limitParam = Number(searchParams?.limit);
  const limit = limitParam && limitParam > 0 ? limitParam : 50;

  let categoryId = undefined;
  if (categoryName) {
    const catResult = await supabaseServer
      .from('kategori')
      .select('id')
      .eq('nama', categoryName)
      .maybeSingle();
    if (catResult.data) {
      categoryId = catResult.data.id;
    }
  }

  const queryKey = [
    'inventory',
    {
      page,
      limit,
      search,
      categoryId,
      lowStockOnly,
      activeStatus,
      sortBy,
      sortDir,
    },
  ];

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () =>
      inventoryApi.getPaginated(
        {
          page,
          limit,
          search,
          categoryId,
          categoryName,
          lowStockOnly,
          activeStatus,
          sortBy,
          sortDir,
        },
        supabaseServer,
      ),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<PageLoadingSpinner />}>
        <InventoryPageClient />
      </Suspense>
    </HydrationBoundary>
  );
}
