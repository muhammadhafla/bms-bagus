import { DateRangePicker, SelectInput, Button } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';

interface FilterState {
  startDate: string;
  endDate: string;
  typeFilter: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

interface CashFlowFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  tempFilters: FilterState;
  setTempFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onApply: () => void;
  onReset: () => void;
}

export function CashFlowFilterPanel({
  isOpen,
  onClose,
  isAdmin,
  tempFilters,
  setTempFilters,
  onApply,
  onReset,
}: CashFlowFilterPanelProps) {
  const handleChange = (field: keyof FilterState, value: string) => {
    setTempFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ResponsivePanel isOpen={isOpen} onClose={onClose} title="Filter Riwayat Kas">
      <div className="space-y-6">
        {isAdmin && (
          <div>
            <DateRangePicker
              startDate={tempFilters.startDate}
              endDate={tempFilters.endDate}
              onChange={(start, end) => {
                setTempFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
              }}
              label="Periode Tanggal"
              className="w-full"
            />
          </div>
        )}

        <div>
          <SelectInput
            label="Tipe Transaksi"
            value={tempFilters.typeFilter}
            onChange={(val) => handleChange('typeFilter', val)}
            options={[
              { label: 'Semua Tipe', value: 'all' },
              { label: 'Penjualan (JUAL)', value: 'JUAL' },
              { label: 'Setor Kas (SETOR)', value: 'SETOR' },
              { label: 'Tarik Kas (TARIK)', value: 'TARIK' },
              { label: 'Retur (RETURN)', value: 'RETURN' },
              { label: 'Tutup Shift', value: 'TUTUP_SHIFT' },
            ]}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <SelectInput
              label="Urutkan Berdasarkan"
              value={tempFilters.sortBy}
              onChange={(val) => handleChange('sortBy', val)}
              options={[
                { label: 'Tanggal & Waktu', value: 'created_at' },
                { label: 'Nominal', value: 'jumlah' },
              ]}
            />
          </div>
          <div className="w-1/3">
            <SelectInput
              label="Arah Urutan"
              value={tempFilters.sortDir}
              onChange={(val) => handleChange('sortDir', val)}
              options={[
                { label: 'Turun', value: 'desc' },
                { label: 'Naik', value: 'asc' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Button variant="secondary" className="w-1/2" onClick={onReset}>
            Reset
          </Button>
          <Button variant="primary" className="w-1/2" onClick={onApply}>
            Terapkan
          </Button>
        </div>
      </div>
    </ResponsivePanel>
  );
}
