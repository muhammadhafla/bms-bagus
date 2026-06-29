import { SalesSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconShoppingCart } from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SalesReportTabProps {
  salesSummary: SalesSummary[];
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  getTotalSales: () => number;
}

export function SalesReportTab({ salesSummary, page, totalPages, setPage, getTotalSales }: SalesReportTabProps) {
  if (salesSummary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <IconShoppingCart className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Tidak ada data penjualan</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated mb-6">
        <p className="text-blue-100 text-sm font-medium">Total Penjualan</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalSales())}</p>
      </div>

      <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
        <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Tren Penjualan</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...salesSummary].reverse()} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tickFormatter={(val) => `Rp ${val / 1000}k`} tick={{fontSize: 12}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="total_sales" name="Total Penjualan" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Jumlah Transaksi</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {salesSummary.map((item) => (
                <tr key={item.date} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                  <td className="px-4 py-3.5 text-right text-neutral-700 dark:text-neutral-300">{item.transaction_count}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {salesSummary.map((item) => (
            <div key={item.date} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.date}</div>
                <div className="text-sm text-neutral-500">{item.transaction_count} Transaksi</div>
              </div>
              <div className="font-bold text-brand-600 dark:text-brand-400">
                {formatCurrency(item.total_sales)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 mt-4 rounded-3xl gap-4">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
