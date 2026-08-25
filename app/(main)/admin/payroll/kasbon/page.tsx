import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import AdminKasbonClient from './AdminKasbonClient';
import { kasbonApi } from '@/lib/api/payroll';

export const metadata = {
  title: 'Persetujuan Kasbon',
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminKasbonPage(props: Props) {
  const queryClient = new QueryClient();

  const searchParams = await props.searchParams;
  
  const statusFilter = typeof searchParams?.status === 'string' ? searchParams.status : 'pending';
  const page = Number(searchParams?.page) || 1;
  const limit = 20;
  const search = typeof searchParams?.search === 'string' ? searchParams.search : '';
  const startDate = typeof searchParams?.startDate === 'string' ? searchParams.startDate : undefined;
  const endDate = typeof searchParams?.endDate === 'string' ? searchParams.endDate : undefined;
  const sortBy = typeof searchParams?.sortBy === 'string' ? searchParams.sortBy : 'created_at';
  const sortDir = typeof searchParams?.sortDir === 'string' ? searchParams.sortDir : 'desc';

  await queryClient.prefetchQuery({
    queryKey: ['admin_payroll_kasbon', { status: statusFilter, page, search, startDate, endDate, sortBy, sortDir }],
    queryFn: () => kasbonApi.getAll({ 
      status: statusFilter, 
      page, 
      limit, 
      search, 
      startDate, 
      endDate, 
      sortBy, 
      sortDir: sortDir as 'asc' | 'desc' 
    }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminKasbonClient />
    </HydrationBoundary>
  );
}
