'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { gajiApi, SlipGaji } from '@/lib/api/payroll';
import { downloadSlipGajiPdf } from '@/lib/payroll-pdf-utils';
import { ModernPagination, Card, Button, Badge } from '@/components/ui';
import { IconFileText, IconDownload, IconArrowLeft } from '@tabler/icons-react';

function SlipGajiContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const limit = 12;

  const updatePage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: slipData, isLoading } = useQuery({
    queryKey: ['payroll', 'my_slips', { page }],
    queryFn: () => gajiApi.getMine({ page, limit }),
  });

  const list = slipData?.data || [];
  const totalItems = slipData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const handleDownload = async (slip: SlipGaji) => {
    try {
      await downloadSlipGajiPdf(slip);
    } catch (error) {
      console.error(error);
    }
  };

  // format periode YYYY-MM ke Bulan Tahun (cth: Agustus 2026)
  const formatMonth = (period: string) => {
    if (!period) return '';
    const [year, month] = period.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-3 md:p-4 w-full mx-auto pt-6 md:pt-8 pb-20">
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/payroll/gaji')} className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          <IconArrowLeft size={20} />
        </Button>
        <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white">Riwayat Slip Gaji</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-neutral-500">Memuat data...</div>
        ) : list.length === 0 ? (
           <div className="col-span-full p-12 text-center text-sm text-neutral-500 flex flex-col items-center gap-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <IconFileText className="h-10 w-10 text-neutral-300" />
              <p>Belum ada riwayat slip gaji.</p>
           </div>
        ) : (
          list.map((slip) => (
            <Card key={slip.id} className="p-4 md:p-5 flex flex-col gap-3 md:gap-4 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-1">
                      {formatMonth(slip.periode_bulan)}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Kehadiran: {slip.total_hari_hadir} Hari
                    </p>
                 </div>
                 <Badge variant={slip.status_pembayaran === 'dibayar' ? 'success' : 'warning'}>
                    {slip.status_pembayaran.toUpperCase()}
                 </Badge>
              </div>
              
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800">
                 <p className="text-xs text-neutral-500 mb-1">Gaji Bersih</p>
                 <p className="font-black text-brand-600 dark:text-brand-400 text-lg">
                    Rp {Number(slip.gaji_bersih).toLocaleString('id-ID')}
                 </p>
              </div>
              
              <Button 
                variant="secondary" 
                className="w-full mt-2 font-semibold" 
                leftIcon={<IconDownload size={16} />}
                onClick={() => handleDownload(slip)}
              >
                Download PDF
              </Button>
            </Card>
          ))
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            onPageChange={updatePage}
          />
        </div>
      )}
    </div>
  );
}

export default function SlipGajiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat Halaman...</div>}>
      <SlipGajiContent />
    </Suspense>
  );
}
