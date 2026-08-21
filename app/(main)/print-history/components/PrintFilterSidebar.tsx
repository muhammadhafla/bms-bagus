import { SlideOver, DateRangePicker, Button } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  status: string;
  startDate: string;
  endDate: string;
  onFilterChange: (filters: { status?: string; startDate?: string; endDate?: string }) => void;
}

export function PrintFilterSidebar({
  isOpen,
  onClose,
  status,
  startDate,
  endDate,
  onFilterChange,
}: Props) {
  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Filter Riwayat">
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Status:
          </label>
          <select
            value={status}
            onChange={(e) => {
              onFilterChange({ status: e.target.value });
            }}
            className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Printing">Printing</option>
            <option value="Done">Done</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Periode Tanggal:
          </label>
          <div className="flex items-center gap-2">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                onFilterChange({ startDate: start, endDate: end });
              }}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Button
            variant="secondary"
            className="w-1/2"
            onClick={() => {
              onFilterChange({ startDate: '', endDate: '', status: '' });
            }}
          >
            Reset Filter
          </Button>
          <Button variant="primary" className="w-1/2" onClick={onClose}>
            Terapkan
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
