import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoles, createAdminClient } from '@/lib/api/auth-guard';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const VALID_STATUSES = ['Pending', 'Printing', 'Done', 'Failed'] as const;

export async function GET(request: Request) {
  try {
    const { profile, error: authError } = await verifyRoles(request, [
      'admin',
      'kepala_cabang',
      'kepala_gudang',
      'staff_gudang',
      'kasir',
      'finance',
    ]);
    if (authError || !profile) return authError!;

    const { searchParams } = new URL(request.url);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const rawPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const requestedGudangId = searchParams.get('gudang_id');

    if (startDate && !DATE_REGEX.test(startDate)) {
      return NextResponse.json({ error: 'Format startDate tidak valid (YYYY-MM-DD)' }, { status: 400 });
    }
    if (endDate && !DATE_REGEX.test(endDate)) {
      return NextResponse.json({ error: 'Format endDate tidak valid (YYYY-MM-DD)' }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: 'Filter status tidak valid' }, { status: 400 });
    }
    if (requestedGudangId && !z.uuid().safeParse(requestedGudangId).success) {
      return NextResponse.json({ error: 'Format gudang_id tidak valid' }, { status: 400 });
    }

    const isAdmin = profile.roles.includes('admin');
    let effectiveGudangId: string | null = requestedGudangId;

    if (!isAdmin) {
      if (!profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Akun Anda belum memiliki cabang default.' },
          { status: 403 },
        );
      }
      if (requestedGudangId && requestedGudangId !== profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Tidak diizinkan mengakses riwayat cabang lain.' },
          { status: 403 },
        );
      }
      effectiveGudangId = profile.default_gudang_id;
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createAdminClient();
    let query = supabase.from('print_jobs').select(
      `
      *,
      label_templates (name),
      gudang (id, nama, kode_gudang)
    `,
      { count: 'exact' },
    );

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (effectiveGudangId) {
      query = query.eq('gudang_id', effectiveGudangId);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Fetch print history error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil riwayat cetak' },
        { status: 400, headers: NO_CACHE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        history: data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      { headers: NO_CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
