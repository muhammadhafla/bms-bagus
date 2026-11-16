import { useState, useMemo } from 'react';
import { SelectInput, DateRangePicker, Button, FilterButton } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { IconX, IconPlus, IconDownload } from '@tabler/icons-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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

  const setPresetToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setTempStartDate(today);
    setTempEndDate(today);
  };

  const setPresetThisWeek = () => {
    const now = new Date();
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    setTempStartDate(start);
    setTempEndDate(end);
  };

  const setPresetThisMonth = () => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    setTempStartDate(start);
    setTempEndDate(end);
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
          aria-label="Ekspor CSV"
        >
          <IconDownload size={17} className="shrink-0" />
          <span className="hidden sm:inline">Ekspor CSV</span>
        </Button>

        <Button 
          variant="primary" 
          onClick={onOpenCreate}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:w-auto sm:!px-4 sm:!py-2"
          aria-label="Tambah Entri"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Pintasan Periode</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={setPresetToday}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={setPresetThisWeek}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={setPresetThisMonth}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                Bulan Ini
              </button>
            </div>
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

export function FilterBadges({
  activeFilters,
  totalItems,
  onResetAll,
}: {
  activeFilters: any[];
  totalItems: number;
  onResetAll?: () => void;
}) {
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
              type="button"
              onClick={badge.onRemove}
              className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200 active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none rounded-sm"
              aria-label={`Hapus filter ${badge.label}`}
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      ))}
      {activeFilters.length > 1 && onResetAll && (
        <button
          type="button"
          onClick={onResetAll}
          className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-1 cursor-pointer shrink-0"
        >
          Reset Semua
        </button>
      )}
    </div>
  );
}
