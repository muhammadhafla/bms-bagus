import { NextResponse } from 'next/server';
import { z } from 'zod';
import Papa from 'papaparse';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LedgerPaginatedResult } from '@/lib/api/ledger';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CHUNK_SIZE = 1000;
const MAX_CHUNKS = 50; // Safety cap: 50.000 baris

const ledgerExportQuerySchema = z.object({
  startDate: z.string().regex(DATE_REGEX, 'Format startDate tidak valid').optional(),
  endDate: z.string().regex(DATE_REGEX, 'Format endDate tidak valid').optional(),
  tipe: z.enum(['PEMASUKAN', 'PENGELUARAN']).optional(),
  sumber: z.string().trim().max(60).optional(),
  search: z.string().trim().max(200).optional(),
  gudangId: z.string().uuid('Format gudangId tidak valid').optional(),
});

function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function formatDateWIBDDMMYYYY(dateValue: string | null | undefined): string {
  if (!dateValue) return '-';
  // Date-only string YYYY-MM-DD can be formatted deterministically without TZ shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTimeWIBHHmm(dateValue: string | null | undefined): string {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatFilenameTimestampWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}${map.month}${map.day}_${map.hour}${map.minute}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = ledgerExportQuerySchema.safeParse({
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    tipe: searchParams.get('tipe') || undefined,
    sumber: searchParams.get('sumber') || undefined,
    search: searchParams.get('search') || undefined,
    gudangId: searchParams.get('gudangId') || undefined,
  });

  if (!parsedQuery.success) {
    return new NextResponse(parsedQuery.error.issues[0]?.message || 'Parameter tidak valid', {
      status: 400,
    });
  }

  const { startDate, endDate, tipe, sumber, search, gudangId } = parsedQuery.data;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized: Silakan login terlebih dahulu.', { status: 401 });
  }

  const { data: requesterProfile } = await supabaseAuth
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .maybeSingle();

  const requesterRoles: string[] = requesterProfile?.roles || [];
  const isAllowed = requesterRoles.includes('admin') || requesterRoles.includes('finance');

  if (!isAllowed) {
    return new NextResponse(
      'Forbidden: Anda tidak memiliki izin untuk mengunduh laporan buku besar.',
      { status: 403 },
    );
  }

  const firstPageRes = await supabaseAuth.rpc('get_ledger_paginated', {
    p_start_date: startDate || undefined,
    p_end_date: endDate || undefined,
    p_tipe: tipe || undefined,
    p_sumber: sumber || undefined,
    p_search: search || undefined,
    p_gudang_id: gudangId || undefined,
    p_page: 1,
    p_limit: CHUNK_SIZE,
  });

  if (firstPageRes.error || !firstPageRes.data) {
    console.error('Export ledger CSV error:', firstPageRes.error);
    return new NextResponse('Gagal mengambil data buku besar untuk ekspor.', { status: 500 });
  }

  const firstPage = firstPageRes.data as unknown as LedgerPaginatedResult;
  const totalCount = Number(firstPage.total_count || 0);
  const openingBalance = Number(firstPage.opening_balance || 0);
  const totalPemasukan = Number(firstPage.total_pemasukan || 0);
  const totalPengeluaran = Number(firstPage.total_pengeluaran || 0);
  const closingBalance = Number(firstPage.closing_balance ?? openingBalance);

  const csvHeaders = [
    'No',
    'Tanggal',
    'Waktu',
    'Lokasi/Outlet',
    'Keterangan',
    'Kategori/Sumber',
    'Tipe Transaksi',
    'Debit (Masuk Rp)',
    'Kredit (Keluar Rp)',
    'Saldo Berjalan (Rp)',
    'Petugas/Admin',
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode('\uFEFF' + Papa.unparse([csvHeaders]) + '\r\n'));

        if (startDate) {
          const openingRow = [
            '',
            formatDateWIBDDMMYYYY(startDate),
            '-',
            '-',
            'SALDO AWAL PERIODE',
            'SALDO AWAL',
            '-',
            '-',
            '-',
            openingBalance,
            '-',
          ].map(sanitizeCsvCell);
          controller.enqueue(encoder.encode(Papa.unparse([openingRow]) + '\r\n'));
        }

        let rowNumber = 0;
        const totalPages = Math.min(MAX_CHUNKS, Math.max(1, Math.ceil(totalCount / CHUNK_SIZE)));

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          let pageItems = firstPage.items || [];
          if (pageNum > 1) {
            const pageRes = await supabaseAuth.rpc('get_ledger_paginated', {
              p_start_date: startDate || undefined,
              p_end_date: endDate || undefined,
              p_tipe: tipe || undefined,
              p_sumber: sumber || undefined,
              p_search: search || undefined,
              p_gudang_id: gudangId || undefined,
              p_page: pageNum,
              p_limit: CHUNK_SIZE,
            });
            if (pageRes.error || !pageRes.data) {
              throw pageRes.error || new Error('Gagal memuat chunk buku besar');
            }
            pageItems = ((pageRes.data as unknown as LedgerPaginatedResult).items || []);
          }

          if (pageItems.length === 0) break;

          const rows = pageItems.map((item) => {
            rowNumber += 1;
            const debit = item.tipe_transaksi === 'PEMASUKAN' ? item.nominal : 0;
            const kredit = item.tipe_transaksi === 'PENGELUARAN' ? item.nominal : 0;

            return [
              rowNumber,
              formatDateWIBDDMMYYYY(item.tanggal),
              formatTimeWIBHHmm(item.created_at),
              item.gudang?.nama || '-',
              item.keterangan || '',
              (item.sumber || '').replace(/_/g, ' '),
              item.tipe_transaksi,
              debit,
              kredit,
              item.saldo_berjalan,
              item.profiles?.nama || '-',
            ].map(sanitizeCsvCell);
          });

          controller.enqueue(encoder.encode(Papa.unparse(rows) + '\r\n'));
        }

        const footerRows = [
          [],
          [
            '',
            '',
            '',
            '',
            'TOTAL MUTASI & SALDO AKHIR',
            '',
            '',
            totalPemasukan,
            totalPengeluaran,
            closingBalance,
            '',
          ].map(sanitizeCsvCell),
        ];
        controller.enqueue(encoder.encode('\r\n' + Papa.unparse(footerRows.slice(1)) + '\r\n'));
        controller.close();
      } catch (err) {
        console.error('Streaming ledger CSV error:', err);
        controller.error(err);
      }
    },
  });

  const filename = `buku_besar_${startDate || 'all'}_sd_${endDate || 'all'}_${formatFilenameTimestampWIB()}.csv`;

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
