import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import InventoryPageClient from './InventoryPageClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

  const limit = 20;
  const offset = (page - 1) * limit;

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
    queryFn: async () => {
      let query;

      if (lowStockOnly) {
        query = supabaseServer
          .rpc('get_low_stock_items', {}, { count: 'exact' })
          .select('*, id_kategori:id_kategori(*)');
      } else {
        query = supabaseServer
          .from('inventory')
          .select('*, id_kategori:id_kategori(*)', { count: 'exact' });
      }

      query = query.order(sortBy, { ascending: sortDir !== 'desc' }).range(offset, offset + limit - 1);

      if (search) {
        const safeQueryString = search.replace(/%/g, '').toLowerCase();
        const orCondition = `nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`;
        query = query.or(orCondition);
      }

      if (activeStatus === 'active') {
        query = query.eq('is_discontinued', false);
      } else if (activeStatus === 'discontinued') {
        query = query.eq('is_discontinued', true);
      }

      if (categoryId) {
        query = query.eq('id_kategori', categoryId);
      }

      const { data, count, error } = await query;

      const total = count || 0;
      const items = data || [];

      return {
        data: items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        error: error ? error.message : null,
      };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryPageClient />
    </HydrationBoundary>
  );
}
