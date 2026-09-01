import { SopGuide } from '../types';

export const SOP_DATA: SopGuide[] = [
  {
    id: 'sop-transfers',
    title: 'SOP Transfer Stok Antar Cabang',
    category: 'gudang',
    summary:
      'Proses pemindahan persediaan barang antar cabang dengan bukti surat jalan dan konfirmasi verifikasi saat barang tiba.',
    involvedRoles: ['Staf Gudang', 'Kepala Gudang', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Pembuatan Dokumen Transfer (Draf)',
        actor: 'Staf Gudang Pengirim / Kepala Gudang',
        description:
          'Buka menu Mutasi & Transfer, pilih gudang tujuan, dan masukkan barang serta jumlah yang akan dikirim. Lokasi cabang asal otomatis terkunci sesuai cabang tugas staf.',
        routeLink: '/warehouse/transfers/new',
        routeLabel: 'Buka Form Transfer Baru',
        tips: 'Gunakan tombol F2 untuk menambah baris barang dengan cepat.',
      },
      {
        stepNumber: 2,
        title: 'Pengiriman & Cetak Surat Jalan',
        actor: 'Staf Gudang Pengirim',
        description:
          'Periksa kembali fisik barang yang telah dikemas. Klik "Kirim Barang" untuk memperbarui status menjadi Dalam Pengiriman. Cetak Surat Jalan PDF sebagai bukti resmi untuk kurir/sopir.',
        routeLink: '/warehouse/transfers',
        routeLabel: 'Daftar Mutasi Transfer',
        tips: 'Stok pada cabang pengirim otomatis dipindahkan ke status transit.',
      },
      {
        stepNumber: 3,
        title: 'Penerimaan Fisik di Cabang Tujuan',
        actor: 'Staf Gudang Penerima / Kepala Gudang',
        description:
          'Saat kurir tiba, staf penerima membuka dokumen transfer, menghitung fisik barang yang tiba, mengisi catatan jika terdapat selisih, lalu klik "Konfirmasi Penerimaan Fisik".',
        routeLink: '/warehouse/transfers',
        routeLabel: 'Konfirmasi Penerimaan',
        tips: 'Stok otomatis masuk ke saldo cabang tujuan setelah tombol konfirmasi ditekan.',
      },
    ],
  },
  {
    id: 'sop-waste',
    title: 'SOP Barang Rusak & Kadaluarsa (Waste)',
    category: 'gudang',
    summary:
      'Prosedur pencatatan dan pemusnahan barang yang tidak layak jual (rusak, pecah, kadaluarsa, tester) dengan persetujuan supervisor.',
    involvedRoles: ['Staf Gudang', 'Kepala Gudang', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Pengajuan Dokumen Barang Rusak (Draf)',
        actor: 'Staf Gudang',
        description:
          'Staf mencatat barang rusak di menu Pengeluaran Khusus. Pilih alasan (Kadaluarsa, Rusak/Pecah, Sampel/Tester, Pemakaian Toko) dan masukkan jumlah barang.',
        routeLink: '/warehouse/outbound',
        routeLabel: 'Form Pengeluaran Khusus',
        tips: 'Dokumen berstatus Draf dan saldo stok sistem BELUM dipotong pada tahap ini.',
      },
      {
        stepNumber: 2,
        title: 'Peninjauan oleh Supervisor',
        actor: 'Kepala Gudang / Admin',
        description:
          'Supervisor memeriksa fisik barang dan mencocokkan alasan dengan dokumen pengajuan pada tab "Menunggu Persetujuan".',
        routeLink: '/warehouse/outbound',
        routeLabel: 'Tinjau Pengajuan Barang Rusak',
        tips: 'Admin dan Kepala Gudang dapat langsung memproses barang rusak tanpa tahap draf.',
      },
      {
        stepNumber: 3,
        title: 'Persetujuan & Pemotongan Stok',
        actor: 'Kepala Gudang / Admin',
        description:
          'Jika disetujui, sistem otomatis memotong saldo stok gudang dan mencatat beban penyusutan pada Buku Besar. Jika ditolak, pengajuan dibatalkan beserta alasannya.',
        routeLink: '/warehouse/outbound',
        routeLabel: 'Riwayat Pengeluaran',
      },
    ],
  },
  {
    id: 'sop-opname',
    title: 'SOP Penghitungan Stok Opname',
    category: 'gudang',
    summary:
      'Penyelarasan berkala antara angka stok pada sistem dengan jumlah fisik nyata yang tersedia di rak toko/gudang.',
    involvedRoles: ['Staf Gudang', 'Kepala Gudang', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Buat Sesi Opname & Hitung Fisik',
        actor: 'Staf Gudang / Tim Opname',
        description:
          'Buka jadwal sesi opname pada lokasi gudang tertentu. Hitung jumlah fisik riil di setiap rak dan masukkan angka hasil perhitungan ke sistem.',
        routeLink: '/inventory/stock-opname',
        routeLabel: 'Buka Menu Stok Opname',
        tips: 'Mendukung mode Blind Opname (petugas tidak melihat saldo sistem agar penghitungan objektif).',
      },
      {
        stepNumber: 2,
        title: 'Input Alasan Selisih',
        actor: 'Staf Gudang',
        description:
          'Jika terdapat selisih (kurang atau lebih), staf wajib memilih kategori penyebab (Salah Hitung, Barang Rusak, Hilang) dan mengisi catatan penjelasan.',
        routeLink: '/inventory/stock-opname',
        routeLabel: 'Input Hasil Hitung',
      },
      {
        stepNumber: 3,
        title: 'Persetujuan Kepala Gudang / Admin',
        actor: 'Kepala Gudang / Admin',
        description:
          'Kepala Gudang meninjau total selisih fisik dan nominalnya. Setelah disetujui, saldo persediaan sistem diperbarui dan dicatatkan pada Laporan Selisih.',
        routeLink: '/inventory/reports/difference',
        routeLabel: 'Lihat Laporan Selisih',
      },
    ],
  },
  {
    id: 'sop-binding',
    title: 'SOP Penugasan Lokasi Cabang Karyawan',
    category: 'pengaturan',
    summary:
      'Penguncian otomatis cabang tugas staf untuk meminimalisir kekeliruan pemilihan gudang saat mutasi dan transaksi operasional.',
    involvedRoles: ['Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Pengaturan Penugasan Akun oleh Admin',
        actor: 'Administrator',
        description:
          'Buka menu Data Pengguna (/users) -> Edit Pengguna -> Pilih cabang penugasan pada dropdown "Lokasi Penugasan Gudang / Cabang" -> Simpan.',
        routeLink: '/users',
        routeLabel: 'Buka Manajemen Pengguna',
        tips: 'Hanya Admin yang berwenang mengubah lokasi cabang tugas akun pengguna.',
      },
      {
        stepNumber: 2,
        title: 'Penyesuaian Otomatis Antarmuka Staf',
        actor: 'Sistem BMS',
        description:
          'Saat staf login, sistem secara otomatis mengarahkan filter katalog stok ke cabang tugasnya dan mengunci "Gudang Asal" pada form transfer ke lokasi tersebut.',
        routeLink: '/profile',
        routeLabel: 'Lihat Profil & Lokasi Tugas',
      },
    ],
  },
  {
    id: 'sop-pos',
    title: 'SOP Transaksi Penjualan Kasir (POS)',
    category: 'kasir',
    summary:
      'Pelayanan transaksi penjualan di kasir toko menggunakan scanner barcode, program loyalitas member, dan beragam metode pembayaran.',
    involvedRoles: ['Kasir', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Scan Barcode / Cari Produk',
        actor: 'Kasir',
        description:
          'Arahkan scanner ke barcode produk, atau tekan tombol F2 untuk mencari produk berdasarkan nama atau SKU barang.',
        routeLink: '/purchasing',
        routeLabel: 'Buka Mesin Kasir (POS)',
        tips: 'Gunakan tombol F4 untuk memilih data pelanggan / member toko.',
      },
      {
        stepNumber: 2,
        title: 'Pilih Member & Terapkan Diskon',
        actor: 'Kasir',
        description:
          'Scan barcode member atau cari nomor WhatsApp pelanggan. Sistem otomatis menerapkan potongan harga sesuai tingkatan member (Bronze, Silver, Gold).',
        routeLink: '/members',
        routeLabel: 'Data Pelanggan Member',
      },
      {
        stepNumber: 3,
        title: 'Penyelesaian Pembayaran & Cetak Struk (F9)',
        actor: 'Kasir',
        description:
          'Pilih metode pembayaran (Tunai, QRIS, Transfer, Tempo). Masukkan nominal uang yang diterima, lalu tekan F9 untuk mencetak struk belanja thermal.',
        routeLink: '/transactions/history',
        routeLabel: 'Riwayat Struk Penjualan',
      },
    ],
  },
  {
    id: 'sop-return',
    title: 'SOP Retur & Penukaran Barang',
    category: 'kasir',
    summary:
      'Penanganan komplain atau penukaran produk dari pembeli yang menyertakan bukti nota struk transaksi resmi.',
    involvedRoles: ['Kasir', 'Staf Gudang', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Cari Nota Transaksi Penjualan Asal',
        actor: 'Kasir',
        description:
          'Buka menu Retur Penjualan, masukkan nomor nota transaksi atau scan barcode pada struk yang dibawa pembeli.',
        routeLink: '/transactions/return',
        routeLabel: 'Buka Form Retur',
      },
      {
        stepNumber: 2,
        title: 'Pilih Barang & Alasan Pengembalian',
        actor: 'Kasir',
        description:
          'Pilih barang yang dikembalikan, jumlah kuantitas, dan alasannya (Cacat Pabrik, Salah Beli, Kadaluarsa). Tentukan opsi: Kembalikan Dana atau Ganti Barang Sejenis.',
        routeLink: '/transactions/return',
        routeLabel: 'Proses Retur',
      },
      {
        stepNumber: 3,
        title: 'Penyesuaian Saldo Persediaan & Kas',
        actor: 'Sistem BMS',
        description:
          'Sistem otomatis menambahkan kembali persediaan barang yang layak retur ke saldo gudang dan membukukan pengeluaran kas retur.',
        routeLink: '/transactions/history',
        routeLabel: 'Riwayat Transaksi Retur',
      },
    ],
  },
  {
    id: 'sop-cashflow',
    title: 'SOP Arus Kas & Biaya Toko',
    category: 'finance',
    summary:
      'Pengendalian mutasi arus kas toko harian, pencatatan modal awal kasir, biaya operasional, dan setoran omset.',
    involvedRoles: ['Kasir', 'Finance', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Input Modal Awal Kasir (Buka Shift)',
        actor: 'Kasir / Finance',
        description:
          'Di awal jam kerja, catat nominal uang modal kembalian di laci kasir pada menu Arus Kas Toko.',
        routeLink: '/finance/cash-flow',
        routeLabel: 'Buka Menu Arus Kas',
      },
      {
        stepNumber: 2,
        title: 'Pencatatan Biaya Operasional Toko',
        actor: 'Finance / Admin',
        description:
          'Pengeluaran toko seperti listrik, air, perlengkapan, dan operasional harian dicatat pada menu Biaya Operasional dengan kategori yang tepat.',
        routeLink: '/finance/operasional',
        routeLabel: 'Input Biaya Operasional',
      },
      {
        stepNumber: 3,
        title: 'Rekonsiliasi Shift & Setoran Akhir',
        actor: 'Finance / Admin',
        description:
          'Di akhir jam operasional, hitung total uang fisik di laci kasir, cocokkan dengan rekapitulasi sistem, lalu catat mutasi setoran kas ke rekening perusahaan.',
        routeLink: '/finance/cash-flow',
        routeLabel: 'Rekonsiliasi Arus Kas',
      },
    ],
  },
  {
    id: 'sop-payroll',
    title: 'SOP Absensi GPS & Penggajian (Payroll)',
    category: 'finance',
    summary:
      'Pencatatan kehadiran berbasis radius GPS lokasi kerja, pinjaman kasbon karyawan, dan kalkulasi gaji bulanan otomatis.',
    involvedRoles: ['Seluruh Karyawan', 'Finance', 'Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Absensi Masuk dan Pulang Harian',
        actor: 'Seluruh Karyawan',
        description:
          'Karyawan membuka menu Absensi (/payroll) melalui ponsel saat berada di area outlet (verifikasi radius GPS) untuk mencatat jam kehadiran.',
        routeLink: '/payroll',
        routeLabel: 'Buka Halaman Absensi',
      },
      {
        stepNumber: 2,
        title: 'Pengajuan & Persetujuan Kasbon',
        actor: 'Karyawan & Finance/Admin',
        description:
          'Karyawan dapat melihat saldo kasbon di menu profil, dan Admin/Finance menyetujui pengajuan pinjaman kasbon pada menu Persetujuan Kasbon.',
        routeLink: '/admin/payroll/kasbon',
        routeLabel: 'Persetujuan Kasbon',
      },
      {
        stepNumber: 3,
        title: 'Perhitungan Gaji & Cetak Slip Gaji',
        actor: 'Finance / Admin',
        description:
          'Sistem mengkalkulasi otomatis: Gaji Pokok + Tunjangan + Lembur - Potongan Keterlambatan - Potongan Kasbon = Total Gaji Bersih. Staf dapat mengunduh Slip Gaji dalam format PDF.',
        routeLink: '/admin/payroll/gaji',
        routeLabel: 'Dashboard Penggajian',
      },
    ],
  },
];
