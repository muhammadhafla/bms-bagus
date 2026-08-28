# Rencana Implementasi Fitur Ledger Toko (Buku Besar)

Dokumen ini merangkum rancangan arsitektur dan spesifikasi teknis untuk mengimplementasikan fitur Ledger (Buku Besar) pada sistem Inventory & POS. Dokumen ini berfokus pada **Database (Schema & Triggers)** dan **API (Backend Integration)**. Bagian UI/UX akan dibahas pada fase selanjutnya.

## Latar Belakang & Konsep

Tujuan fitur ini adalah menyatukan seluruh mutasi keuangan (pendapatan dan pengeluaran) ke dalam satu *General Ledger* tunggal (`buku_besar`). Hal ini akan menjadi pondasi untuk laporan Laba/Rugi (Net Profit) yang komprehensif.

Sistem akan menggunakan pendekatan **Hybrid Summary**:
1. **Pemasukan Penjualan**: Direkap dan digabung menjadi 1 baris pemasukan di buku besar pada saat **Tutup Shift**.
2. **Pengeluaran (Operasional, Kasbon, Pembelian Stok, Gaji)**: Dicatat secara individual/satuan per transaksi.

---

## TAHAP 1: ARSITEKTUR DATABASE

Tahap ini mencakup pembuatan tabel, tipe data (ENUM), serta *Database Triggers* untuk otomatisasi pencatatan. File migrasi Supabase baru harus dibuat untuk mencakup seluruh perubahan ini.

### 1.1 Tipe Data Baru (ENUM)

Untuk menjaga konsistensi tipe transaksi dan referensi sumber di `buku_besar`.

```sql
CREATE TYPE ledger_tipe AS ENUM (
    'PEMASUKAN', 
    'PENGELUARAN'
);

CREATE TYPE ledger_sumber AS ENUM (
    'PENJUALAN_SHIFT', 
    'PEMBELIAN_STOK', 
    'BIAYA_OPERASIONAL', 
    'KASBON', 
    'GAJI', 
    'MODAL',
    'LAIN_LAIN'
);
```

### 1.2 Pembuatan Tabel `pengeluaran_operasional`

Tabel khusus untuk mencatat biaya harian toko di luar pembelian stok dan gaji.

```sql
CREATE TABLE public.pengeluaran_operasional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori TEXT NOT NULL, -- Contoh: 'Listrik', 'Sewa', 'Konsumsi', 'Internet', 'ATK'
    nominal NUMERIC NOT NULL CHECK (nominal > 0),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan TEXT,
    metode_pembayaran TEXT DEFAULT 'CASH',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger untuk update `updated_at`
CREATE TRIGGER handle_updated_at_pengeluaran_operasional
  BEFORE UPDATE ON public.pengeluaran_operasional
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
```

### 1.3 Pembuatan Tabel `buku_besar` (General Ledger)

Tabel sentral sebagai *Single Source of Truth* arus kas perusahaan.

```sql
CREATE TABLE public.buku_besar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe_transaksi ledger_tipe NOT NULL,
    sumber ledger_sumber NOT NULL,
    referensi_id UUID, -- Fleksibel, ID dari tabel asal
    keterangan TEXT NOT NULL,
    nominal NUMERIC NOT NULL CHECK (nominal >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks untuk mempercepat query laporan berdasarkan waktu dan tipe
CREATE INDEX idx_buku_besar_tanggal ON public.buku_besar(tanggal);
CREATE INDEX idx_buku_besar_tipe ON public.buku_besar(tipe_transaksi);
CREATE INDEX idx_buku_besar_sumber ON public.buku_besar(sumber);
```

### 1.4 Row Level Security (RLS)

Kebijakan RLS harus dipastikan aman, di mana hanya *Authenticated Users* (sebaiknya dibatasi ke peran Admin/Finance jika ada sistem role) yang dapat membaca dan menambah data.

```sql
-- RLS pengeluaran_operasional
ALTER TABLE public.pengeluaran_operasional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pengeluaran_operasional_select_policy" ON public.pengeluaran_operasional FOR SELECT TO authenticated USING (true);
CREATE POLICY "pengeluaran_operasional_insert_policy" ON public.pengeluaran_operasional FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pengeluaran_operasional_update_policy" ON public.pengeluaran_operasional FOR UPDATE TO authenticated USING (true);

-- RLS buku_besar
ALTER TABLE public.buku_besar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buku_besar_select_policy" ON public.buku_besar FOR SELECT TO authenticated USING (true);
CREATE POLICY "buku_besar_insert_policy" ON public.buku_besar FOR INSERT TO authenticated WITH CHECK (true);
```

### 1.5 Database Triggers & Otomatisasi (RPC)

Inilah *core logic* yang akan memastikan buku besar tersinkronisasi otomatis tanpa ada aksi tambahan dari *client side*.

**A. Trigger Pengeluaran Operasional**
Saat baris baru ditambahkan ke `pengeluaran_operasional`, salin otomatis ke `buku_besar`.

```sql
CREATE OR REPLACE FUNCTION trigger_insert_operasional_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.buku_besar (
        tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
    ) VALUES (
        NEW.tanggal, 'PENGELUARAN', 'BIAYA_OPERASIONAL', NEW.id, 
        'Biaya Operasional (' || NEW.kategori || '): ' || COALESCE(NEW.keterangan, ''), 
        NEW.nominal, NEW.created_by
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pengeluaran_operasional_created
    AFTER INSERT ON public.pengeluaran_operasional
    FOR EACH ROW
    EXECUTE FUNCTION trigger_insert_operasional_to_ledger();
```

**B. Integrasi Tutup Shift (Modifikasi Logika Tutup Shift yang Ada)**
Saat ini terdapat fungsi/trigger atau API yang mengubah `shift_sessions.status` menjadi `CLOSED`. Kita perlu menambahkan sebuah fungsi RPC atau trigger. Jika dilakukan via fungsi RPC:

```sql
CREATE OR REPLACE FUNCTION record_shift_to_ledger(p_shift_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_penjualan NUMERIC;
    v_shift_record RECORD;
BEGIN
    -- Ambil info shift
    SELECT * INTO v_shift_record FROM public.shift_sessions WHERE id = p_shift_id;
    
    -- Hitung total penjualan dari `penjualan` atau `kas_log` di rentang waktu shift tersebut
    SELECT COALESCE(SUM(total), 0) INTO v_total_penjualan
    FROM public.penjualan
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND status = 'LUNAS';

    -- Catat ke buku_besar jika ada penjualan
    IF v_total_penjualan > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PEMASUKAN', 'PENJUALAN_SHIFT', p_shift_id,
            'Pendapatan Penjualan (Shift Kasir: ' || v_shift_record.kasir_name || ')',
            v_total_penjualan, v_shift_record.kasir_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
*(Catatan: Fungsi di atas harus dipanggil saat event Tutup Shift dieksekusi di aplikasi).*

**C. Trigger Kasbon (Modul HR)**
Saat status kasbon diupdate menjadi `disetujui`, catat pengeluaran di buku besar.

```sql
CREATE OR REPLACE FUNCTION trigger_kasbon_approved_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    IF NEW.status = 'disetujui' AND OLD.status != 'disetujui' THEN
        -- Ambil nama karyawan
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'KASBON', NEW.id,
            'Pencairan Kasbon: ' || v_user_name || COALESCE(' - ' || NEW.keterangan, ''),
            NEW.nominal, NEW.approved_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_kasbon_approved
    AFTER UPDATE ON public.kasbon
    FOR EACH ROW
    EXECUTE FUNCTION trigger_kasbon_approved_to_ledger();
```

---

## TAHAP 2: INTEGRASI API & BACKEND (Next.js)

Tahap ini difokuskan pada penyesuaian *codebase* Next.js agar tabel-tabel baru ini bisa dipanggil dan dimanipulasi dengan *type-safety* TypeScript.

### 2.1 Pembaruan Tipe Supabase (`types/database.types.ts` & `lib/api/types.ts`)

Setelah migrasi SQL dijalankan, file `types/database.types.ts` harus di-*generate* ulang menggunakan *Supabase CLI*, atau kita perlu membuat *interface* TypeScript secara manual (jika menggunakan custom fetch API wrapper) di `lib/api/index.ts` atau file *types* yang relevan.

```typescript
export interface PengeluaranOperasional {
  id: string;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan?: string;
  metode_pembayaran: string;
  created_by?: string;
  created_at?: string;
}

export type LedgerTipe = 'PEMASUKAN' | 'PENGELUARAN';
export type LedgerSumber = 'PENJUALAN_SHIFT' | 'PEMBELIAN_STOK' | 'BIAYA_OPERASIONAL' | 'KASBON' | 'GAJI' | 'LAIN_LAIN';

export interface BukuBesar {
  id: string;
  tanggal: string;
  tipe_transaksi: LedgerTipe;
  sumber: LedgerSumber;
  referensi_id?: string;
  keterangan: string;
  nominal: number;
  created_by?: string;
  created_at?: string;
}
```

### 2.2 Penambahan Service API ( `lib/api/ledgerApi.ts` atau disatukan ke service yang ada )

Fungsi-fungsi pembantu untuk mengambil dan memanipulasi data melalui Supabase client `supabase.from()`.

```typescript
// Mengambil daftar Pengeluaran Operasional
export const getPengeluaranOperasional = async (
  startDate?: string, 
  endDate?: string, 
  kategori?: string
) => {
  let query = supabase
    .from('pengeluaran_operasional')
    .select('*, profiles(full_name)')
    .order('tanggal', { ascending: false });

  if (startDate) query = query.gte('tanggal', startDate);
  if (endDate) query = query.lte('tanggal', endDate);
  if (kategori) query = query.eq('kategori', kategori);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Menambahkan Pengeluaran Operasional Baru (Otomatis masuk ke Ledger via DB Trigger)
export const insertPengeluaranOperasional = async (
  payload: Omit<PengeluaranOperasional, 'id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('pengeluaran_operasional')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mengambil Data Buku Besar
export const getBukuBesar = async (
  startDate?: string, 
  endDate?: string, 
  tipe?: LedgerTipe, 
  sumber?: LedgerSumber
) => {
  let query = supabase
    .from('buku_besar')
    .select('*, profiles(full_name)')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('tanggal', startDate);
  if (endDate) query = query.lte('tanggal', endDate);
  if (tipe) query = query.eq('tipe_transaksi', tipe);
  if (sumber) query = query.eq('sumber', sumber);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
```

---

## TAHAP 3: DESAIN UI & UX (Next.js Frontend)

Berdasarkan kesepakatan bersama, fitur akan ditempatkan di 2 halaman terpisah di bawah menu **Finance**. Halaman ini **hanya dapat diakses oleh Admin/Owner** (Kasir tidak memiliki akses).

### 3.1 Halaman Pengeluaran Operasional (`app/(main)/finance/operasional`)
- **Fungsi**: Tempat Admin mencatat dan memantau biaya pengeluaran operasional toko.
- **Tampilan Utama**: Tabel riwayat pengeluaran (Tanggal, Kategori, Keterangan, Nominal, Admin).
- **UX Input (Modal Dialog)**:
  - Tombol **"Tambah Pengeluaran"** akan memunculkan sebuah pop-up Modal.
  - Form Input: 
    - **Kategori**: Dropdown Select standar (Listrik, Air, Internet, Konsumsi, Sewa). Terdapat opsi "Lainnya" yang jika dipilih, akan memunculkan input teks bebas.
    - **Nominal**: Input angka (Rupiah).
    - **Tanggal**: Datepicker (Default hari ini).
    - **Keterangan**: Textarea untuk detail tambahan.

### 3.2 Halaman Buku Besar / Ledger (`app/(main)/finance/ledger`)
- **Fungsi**: Laporan arus kas komprehensif sebagai dasar menghitung Laba Bersih.
- **Tampilan Utama (Gaya Rekening Koran)**:
  - Tabel dengan kolom: `Tanggal`, `Keterangan/Sumber`, `Debit (Masuk)`, `Kredit (Keluar)`, dan `Saldo Berjalan`.
  - Di atas tabel terdapat ringkasan: Total Pemasukan, Total Pengeluaran, dan Saldo Akhir periode berjalan.
- **Fitur Set Saldo Awal**:
  - Tombol **"Set Saldo Awal"** untuk menyesuaikan saldo riil saat ini.
  - Memasukkan data ke tabel `buku_besar` dengan tipe `PEMASUKAN` dan sumber `MODAL`.
- **Fitur Filter**: Date Range Picker (Hari ini, Bulan ini, Tahun ini) untuk menyaring mutasi rekening.


### 3.3 Standar & Konsistensi UI (Design System)
- **Komponen**: Seluruh halaman harus dibangun menggunakan komponen UI *reusable* yang sudah ada di dalam folder `components/ui/` (seperti `Button`, `Table`, `Modal`, `SelectInput`, `DateRangePicker`, dll). Jangan membuat komponen UI kustom baru jika komponen standar sudah tersedia.
- **Layout & Tema**: Gunakan struktur layout yang sama persis (misal: `AmbientLayout` atau layout utama dashboard) agar konsisten dengan halaman lain (seperti halaman *Arus Kas* atau *Inventory*). Dukungan *Dark Mode* (`dark:`) dan transisi animasi standar (seperti `animate-fade-in-up`) harus tetap diaplikasikan.


### 3.4 Tampilan Mobile (Responsif)
- **Tabel vs Kartu**: Pada layar berukuran desktop/tablet, Ledger akan ditampilkan dalam bentuk Tabel Rekening Koran yang padat. Namun, pada layar *Mobile* (HP), tabel harus disembunyikan dan diganti dengan model **Card List (Daftar Kartu)** agar lebih mudah dibaca.
- **Referensi Model**: Model Card List untuk mobile harus menggunakan desain yang persis sama dengan halaman **Riwayat Mutasi Gaji** (`app/(main)/payroll/gaji`).
  - *Icon Bulat*: Di sebelah kiri (Hijau panah bawah untuk Debit/Masuk, Merah panah atas untuk Kredit/Keluar).
  - *Detail Tengah*: Judul Keterangan tebal (bold) dan tanggal di bawahnya.
  - *Detail Kanan*: Nominal Rupiah (hijau/merah) beserta Saldo Berjalan berukuran lebih kecil di bagian bawahnya.


### 1.6 Penanganan Koreksi (Hard-Delete)
Jika Admin melakukan kesalahan input pada Pengeluaran Operasional dan memutuskan untuk menghapusnya, sistem harus secara otomatis menghapus mutasi terkait di Buku Besar. 

```sql
CREATE OR REPLACE FUNCTION trigger_delete_operasional_from_ledger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.buku_besar 
    WHERE referensi_id = OLD.id AND sumber = 'BIAYA_OPERASIONAL';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pengeluaran_operasional_deleted
    AFTER DELETE ON public.pengeluaran_operasional
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_operasional_from_ledger();
```

---

### 3.5 Fitur Lanjutan (Ekspor & Paginasi)
- **Ekspor Laporan (Unduh)**: Pada Halaman Buku Besar, harus terdapat sebuah tombol Dropdown "Ekspor" yang berisi 2 pilihan format unduhan:
  1. Unduh sebagai PDF (Format cetak rapi berlogo toko).
  2. Unduh sebagai CSV / Excel (Untuk rekapitulasi data raw).
- **Paginasi Data**: Menghindari *lag* karena memuat ribuan baris, halaman Ledger harus dipecah halamannya menggunakan komponen standar `<ModernPagination />`.
  - Limit tampilan ditetapkan **50 item per halaman**.


### 3.6 Standardisasi Komponen Filter
- **Komponen Filter**: Halaman Pengeluaran dan Buku Besar wajib menggunakan komponen filter bawaan yang sama persis dengan halaman lain (seperti komponen `<FilterButton />` dan panel filter yang *slide-out* atau *pop-over* seperti di Cash Flow / Inventory). Hal ini untuk memastikan pengalaman pengguna (UX) seragam saat melakukan filter Tanggal maupun Kategori di seluruh aplikasi.


### 3.7 Layout Compact Mobile & Header
- **Menyembunyikan Deskripsi Header**: Pada tampilan *Mobile* (layar kecil), deskripsi di bawah judul halaman (header desc) harus disembunyikan (`hidden md:block`) untuk menghemat ruang vertikal layar.
- **Compact Layout & Acuan Gap**: Spasi antar komponen (*gap, margin, padding*) harus mengadopsi gaya *compact layout* pada versi *Mobile*. Gunakan halaman **Inventory** (`app/(main)/inventory`) sebagai referensi ketat untuk proporsi *gap* dan *padding* agar tidak terlalu membuang *white-space* di layar HP.

