import { DataTable, Badge, ModernPagination, type Column } from '@/components/ui';
import { IconCalendarEvent, IconMapPin, IconChevronRight } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Kehadiran } from '@/lib/api/payroll';
import { Dispatch, SetStateAction } from 'react';

export const getTimeFromIso = (isoString?: string | null) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'hadir': return <Badge variant="success">Hadir</Badge>;
    case 'izin': return <Badge variant="warning">Izin</Badge>;
    case 'sakit': return <Badge variant="warning">Sakit</Badge>;
    case 'alpha': return <Badge variant="danger">Alpha</Badge>;
    case 'off': return <Badge variant="default">Off</Badge>;
    default: return <Badge variant="default">{status}</Badge>;
  }
};

interface KehadiranTableProps {
  list: Kehadiran[];
  isLoadingList: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  setPage: (page: number) => void;
  activeTab: 'all' | 'pulang_awal' | 'lembur';
  selectedLemburIds: string[];
  selectedPulangAwalIds: string[];
  handleToggleSelectLembur: (id: string) => void;
  handleToggleSelectPulangAwal: (id: string) => void;
  setReviewPulangAwalModalItem: Dispatch<SetStateAction<Kehadiran | null>>;
  handleOpenEdit: (item: Kehadiran) => void;
}

export function KehadiranTable({
  list,
  isLoadingList,
  page,
  totalPages,
  totalItems,
  limit,
  setPage,
  activeTab,
  selectedLemburIds,
  selectedPulangAwalIds,
  handleToggleSelectLembur,
  handleToggleSelectPulangAwal,
  setReviewPulangAwalModalItem,
  handleOpenEdit,
}: KehadiranTableProps) {
  const columns: Column<Kehadiran>[] = [
    ...((activeTab === 'lembur' || activeTab === 'pulang_awal') ? [{
      key: 'checkbox',
      header: 'Pilih',
      render: (row: Kehadiran) => (
        <input 
          type="checkbox" 
          checked={activeTab === 'lembur' ? selectedLemburIds.includes(row.id) : selectedPulangAwalIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (activeTab === 'lembur') {
              handleToggleSelectLembur(row.id);
            } else {
              handleToggleSelectPulangAwal(row.id);
            }
          }}
          className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
        />
      )
    }] : []),
    { 
      key: 'tanggal', 
      header: 'Tanggal', 
      render: (row: Kehadiran) => (
        <span className="font-medium text-neutral-900 dark:text-white">
          {format(new Date(row.tanggal), 'dd MMM yyyy', { locale: idLocale })}
        </span>
      )
    },
    { 
      key: 'nama', 
      header: 'Nama Karyawan', 
      render: (row: Kehadiran) => (
        <span className="font-medium text-neutral-900 dark:text-white">
          {row.profiles?.nama || 'Unknown'}
        </span>
      ) 
    },
    { 
      key: 'status_hadir', 
      header: 'Kehadiran', 
      render: (row: Kehadiran) => getStatusBadge(row.status_hadir) 
    },
    {
      key: 'lokasi',
      header: 'Lokasi Toko',
      render: (row: Kehadiran) => {
        const storeMasuk = row.lokasi_masuk?.nama;
        const storePulang = row.lokasi_pulang?.nama;

        if (storeMasuk && storePulang && storeMasuk !== storePulang) {
          return (
            <div className="flex flex-col gap-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                <span className="inline-flex h-4 px-1.5 items-center justify-center rounded bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 text-[10px] font-bold">
                  Masuk
                </span>
                <span className="truncate">{storeMasuk}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                <span className="inline-flex h-4 px-1.5 items-center justify-center rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold">
                  Pulang
                </span>
                <span className="truncate">{storePulang}</span>
              </span>
            </div>
          );
        }

        const storeName = storeMasuk || storePulang;
        if (storeName) {
          return (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
              <IconMapPin size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
              <span>{storeName}</span>
            </div>
          );
        }

        return <span className="text-neutral-400 text-xs">-</span>;
      }
    },
    { 
      key: 'waktu', 
      header: 'Waktu (M - P)', 
      render: (row: Kehadiran) => (
        <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {getTimeFromIso(row.waktu_masuk)} - {getTimeFromIso(row.waktu_pulang) || '--:--'}
        </span>
      ) 
    },
    { 
      key: 'telat', 
      header: 'Telat', 
      render: (row: Kehadiran) => {
        if (row.menit_telat > 30) {
          return <span className="text-rose-600 font-semibold text-xs">{row.menit_telat}m (Denda)</span>;
        }
        if (row.menit_telat > 0) {
          return <span className="text-amber-600 font-medium text-xs">{row.menit_telat}m (Toleransi)</span>;
        }
        return <span className="text-neutral-400">-</span>;
      }
    },
    { 
      key: 'pulang_awal', 
      header: 'Pulang Awal', 
      render: (row: Kehadiran) => {
        if (row.status_pulang_awal === 'pending') {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReviewPulangAwalModalItem(row);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors shadow-xs animate-pulse cursor-pointer"
            >
              Review ({row.menit_pulang_awal || 0}m)
            </button>
          );
        }
        if (row.status_pulang_awal === 'disetujui_penuh') {
          return <Badge variant="success">Dihitung Penuh</Badge>;
        }
        if (row.status_pulang_awal === 'disetujui_durasi') {
          return <Badge variant="default">Sesuai Durasi</Badge>;
        }
        if (row.status_pulang_awal === 'ditolak') {
          return <Badge variant="danger">Ditolak</Badge>;
        }
        return <span className="text-neutral-400">-</span>;
      }
    },
    { 
      key: 'lembur', 
      header: 'Lembur', 
      render: (row: Kehadiran) => {
        if (row.status_lembur === 'disetujui') return <Badge variant="success">+{row.menit_lembur_disetujui}m</Badge>;
        if (row.status_lembur === 'pending') return <Badge variant="warning">Pending {row.menit_lembur_aktual}m</Badge>;
        if (row.status_lembur === 'ditolak') return <Badge variant="danger">Ditolak</Badge>;
        return <span className="text-neutral-400">-</span>;
      }
    }
  ];

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:flex overflow-hidden flex-col min-h-[500px] rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {isLoadingList ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <DataTable 
              columns={columns}
              data={list}
              keyField="id"
              className="border-none flex-1"
              onRowClick={handleOpenEdit}
              emptyState={
                <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <IconCalendarEvent className="mb-2 h-10 w-10 opacity-20" />
                  <p>Tidak ada data presensi yang ditemukan.</p>
                </div>
              }
            />
            
            <ModernPagination
              page={page}
              totalPages={totalPages}
              total={totalItems}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      <div className="block space-y-3 lg:hidden">
        {isLoadingList ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
            <IconCalendarEvent className="mb-2 h-10 w-10 opacity-20" />
            <p>Tidak ada data kehadiran yang ditemukan.</p>
          </div>
        ) : (
          <>
            {list.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-neutral-50/90 active:scale-[0.98] dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {activeTab === 'pulang_awal' && (
                      <input 
                        type="checkbox" 
                        checked={selectedPulangAwalIds.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelectPulangAwal(item.id);
                        }}
                        className="mt-0.5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                      />
                    )}
                    {activeTab === 'lembur' && (
                      <input 
                        type="checkbox" 
                        checked={selectedLemburIds.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelectLembur(item.id);
                        }}
                        className="mt-0.5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                      />
                    )}
                    <div>
                      <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
                        {item.profiles?.nama || 'Unknown'}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <IconCalendarEvent size={12} />
                          {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                        </span>
                        {(item.lokasi_masuk?.nama || item.lokasi_pulang?.nama) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400">
                            <IconMapPin size={12} className="shrink-0 text-teal-600" />
                            <span>{item.lokasi_masuk?.nama || item.lokasi_pulang?.nama}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="origin-top-right scale-90">
                      {getStatusBadge(item.status_hadir)}
                    </div>
                    <div className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-neutral-400 transition-all group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-900/20 dark:group-hover:text-brand-400">
                      <IconChevronRight size={18} stroke={2.5} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-1 grid grid-cols-3 gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-2 text-[13px] dark:border-neutral-800/60">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Masuk</span>
                    <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">{getTimeFromIso(item.waktu_masuk) || '--:--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Pulang</span>
                    <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">{getTimeFromIso(item.waktu_pulang) || '--:--'}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Telat</span>
                    <span className={`text-xs font-semibold ${item.menit_telat > 30 ? 'text-rose-500 dark:text-rose-400' : item.menit_telat > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>
                      {item.menit_telat > 30 ? `${item.menit_telat}m (Denda)` : item.menit_telat > 0 ? `${item.menit_telat}m (Grace)` : '0m'}
                    </span>
                  </div>
                </div>
                
                {item.status_pulang_awal && item.status_pulang_awal !== 'tidak_ada' && (
                  <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] dark:border-neutral-800/60">
                    <span className="text-neutral-500">Pulang Awal:</span>
                    <div>
                      {item.status_pulang_awal === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewPulangAwalModalItem(item);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-pointer"
                        >
                          Review ({item.menit_pulang_awal || 0}m)
                        </button>
                      )}
                      {item.status_pulang_awal === 'disetujui_penuh' && <Badge variant="success">Dihitung Penuh</Badge>}
                      {item.status_pulang_awal === 'disetujui_durasi' && <Badge variant="default">Sesuai Durasi</Badge>}
                      {item.status_pulang_awal === 'ditolak' && <Badge variant="danger">Ditolak</Badge>}
                    </div>
                  </div>
                )}

                {item.status_lembur !== 'tidak_ada' && (
                  <div className="mt-1 flex items-center gap-1.5 border-t border-neutral-100 pt-2 text-[11px] dark:border-neutral-800/60">
                    <span className="text-neutral-500">Lembur:</span>
                    <div className="origin-left scale-90">
                      {item.status_lembur === 'disetujui' && <Badge variant="success">+{item.menit_lembur_disetujui}m</Badge>}
                      {item.status_lembur === 'pending' && <Badge variant="warning">Pending {item.menit_lembur_aktual}m</Badge>}
                      {item.status_lembur === 'ditolak' && <Badge variant="danger">Ditolak</Badge>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {totalPages > 1 && (
              <ModernPagination
                page={page}
                totalPages={totalPages}
                total={totalItems}
                limit={limit}
                onPageChange={setPage}
                className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
