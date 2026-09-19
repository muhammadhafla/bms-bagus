import { useState, useMemo } from 'react';
import { SelectInput, DateRangePicker, Button, FilterButton } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { IconX, IconPlus, IconDownload } from '@tabler/icons-react';

export interface FilterState {
  search?: string;
  startDate?: string;
  endDate?: string;
  statusHadir?: string;
  lokasiId?: string;
  page?: number;
}

interface KehadiranFiltersProps {
  search: string;
  startDate: string;
  endDate: string;
  statusHadir: string;
  lokasiId: string;
  karyawanList?: any[];
  storeList?: any[];
  updateFilters: (filters: FilterState) => void;
  activeFilters: any[];
  isExporting: boolean;
  onExportCsv: () => void;
  onOpenCreate: () => void;
}

export function KehadiranFilters({
  search,
  startDate,
  endDate,
  statusHadir,
  lokasiId,
  karyawanList,
  storeList,
  updateFilters,
  activeFilters,
  isExporting,
  onExportCsv,
  onOpenCreate,
}: KehadiranFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState(search);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [tempStatusHadir, setTempStatusHadir] = useState(statusHadir);
  const [tempLokasiId, setTempLokasiId] = useState(lokasiId);

  const handleOpenFilter = () => {
    setTempSearch(search);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempStatusHadir(statusHadir);
    setTempLokasiId(lokasiId);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    updateFilters({
      search: tempSearch,
      startDate: tempStartDate,
      endDate: tempEndDate,
      statusHadir: tempStatusHadir,
      lokasiId: tempLokasiId,
      page: 1
    });
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    updateFilters({ search: '', startDate: '', endDate: '', statusHadir: 'all', lokasiId: 'all', page: 1 });
    setIsFilterOpen(false);
  };

  const karyawanOptions = useMemo(() => {
    const opts = [{ label: 'Semua Karyawan', value: '' }];
    if (karyawanList) {
      karyawanList.forEach(k => {
        if (k.profiles?.nama) {
          opts.push({ label: k.profiles.nama, value: k.profiles.nama });
        }
      });
    }
    return opts;
  }, [karyawanList]);

  const storeFilterOptions = useMemo(() => {
    const opts = [{ label: 'Semua Lokasi Toko', value: 'all' }];
    if (storeList) {
      storeList.forEach(s => {
        opts.push({ label: s.nama, value: s.id });
      });
    }
    return opts;
  }, [storeList]);

  return (
    <>
      <div className="shrink-0 flex items-center gap-2">
        <Button 
          variant="secondary"
          onClick={onExportCsv}
          loading={isExporting}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:w-auto sm:!px-3.5 sm:!py-2 text-xs font-semibold"
        >
          <IconDownload size={17} className="shrink-0" />
          <span className="hidden sm:inline">Ekspor CSV</span>
        </Button>

        <Button 
          variant="primary" 
          onClick={onOpenCreate}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:w-auto sm:!px-4 sm:!py-2"
        >
          <IconPlus size={18} className="shrink-0" />
          <span className="hidden font-medium sm:inline">Tambah Entri</span>
        </Button>
        
        <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} className="!mt-0 !mr-0" />
      </div>

      <ResponsivePanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Kehadiran"
      >
        <div className="space-y-6">
          <div>
            <SelectInput
              label="Karyawan"
              value={tempSearch}
              onChange={(val) => setTempSearch(val)}
              options={karyawanOptions}
            />
          </div>

          <div>
            <SelectInput
              label="Lokasi Toko"
              value={tempLokasiId}
              onChange={(val) => setTempLokasiId(val)}
              options={storeFilterOptions}
            />
          </div>

          <div>
            <DateRangePicker
              startDate={tempStartDate}
              endDate={tempEndDate}
              onChange={(start, end) => {
                setTempStartDate(start);
                setTempEndDate(end);
              }}
              label="Periode Tanggal"
              className="w-full"
            />
          </div>

          <div>
            <SelectInput
              label="Status Kehadiran"
              value={tempStatusHadir}
              onChange={(val) => setTempStatusHadir(val)}
              options={[
                { label: 'Semua Status', value: 'all' },
                { label: 'Hadir', value: 'hadir' },
                { label: 'Izin', value: 'izin' },
                { label: 'Sakit', value: 'sakit' },
                { label: 'Alpha', value: 'alpha' },
                { label: 'Off', value: 'off' },
              ]}
            />
          </div>

          <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button variant="secondary" className="w-1/2" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" className="w-1/2" onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        </div>
      </ResponsivePanel>
    </>
  );
}

export function FilterBadges({ activeFilters, totalItems }: { activeFilters: any[], totalItems: number }) {
  return (
    <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap">
      {activeFilters.length === 0 && (
        <span className="text-xs text-neutral-400 italic">
          Menampilkan data kehadiran ({totalItems} total entri)
        </span>
      )}
      {activeFilters.map((badge) => (
        <div
          key={badge.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/50 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {badge.label}
          {badge.onRemove && (
            <button
              onClick={badge.onRemove}
              className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
