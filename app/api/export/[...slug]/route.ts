import { NextResponse } from 'next/server';
import { GET as exportLedgerCsv } from '@/app/api/_handlers/export/finance-ledger-csv';
import { GET as exportKehadiranCsv } from '@/app/api/_handlers/export/kehadiran-csv';
import { GET as exportReturnPdf } from '@/app/api/_handlers/export/inventory-return-pdf';
import { GET as exportMutasiPdf } from '@/app/api/_handlers/export/payroll-mutasi-pdf';
import { GET as exportSlipGajiPdf } from '@/app/api/_handlers/export/payroll-slip-gaji-pdf';
import { GET as exportSuratJalanPdf } from '@/app/api/_handlers/export/warehouse-surat-jalan-pdf';

export const dynamic = 'force-dynamic';

type StaticExportHandler = (request: Request) => Promise<Response>;
type IdExportHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const STATIC_EXPORT_ROUTES: Record<string, StaticExportHandler> = {
  'finance/ledger/csv': exportLedgerCsv,
  'kehadiran/csv': exportKehadiranCsv,
};

const ID_EXPORT_ROUTES: Record<string, IdExportHandler> = {
  'inventory/return': exportReturnPdf,
  'payroll/mutasi': exportMutasiPdf,
  'payroll/slip-gaji': exportSlipGajiPdf,
  'warehouse/surat-jalan': exportSuratJalanPdf,
};

/**
 * Dispatcher tunggal untuk seluruh endpoint /api/export/* (CSV & PDF)
 * agar terbundel dalam satu Vercel Function dengan tracing font pdfkit.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string[] }> },
): Promise<Response> {
  const { slug } = await context.params;
  const path = slug.join('/');

  const staticHandler = STATIC_EXPORT_ROUTES[path];
  if (staticHandler) {
    return staticHandler(request);
  }

  if (slug.length === 3) {
    const prefix = `${slug[0]}/${slug[1]}`;
    const idHandler = ID_EXPORT_ROUTES[prefix];
    if (idHandler) {
      return idHandler(request, { params: Promise.resolve({ id: slug[2] }) });
    }
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
