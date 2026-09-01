export interface HardwareGuideItem {
  id: string;
  title: string;
  category: 'scanner' | 'printer' | 'label' | 'jaringan';
  summary: string;
  specifications: string[];
  setupSteps: string[];
  troubleshooting: {
    issue: string;
    solution: string;
  }[];
}

export const HARDWARE_GUIDES: HardwareGuideItem[] = [
  {
    id: 'scanner-barcode',
    title: 'Panduan Barcode Scanner (1D & 2D QR)',
    category: 'scanner',
    summary:
      'Panduan menghubungkan perangkat pemindai barcode kabel USB atau Bluetooth/Wireless ke komputer kasir dan gudang.',
    specifications: [
      'Mendukung tipe barcode: EAN-13, Code 128, UPC-A, Code 39, dan QR Code 2D',
      'Mode kerja: USB HID Keyboard (Plug & Play, tanpa instalasi driver khusus)',
      'Pengaturan wajib: Konfigurasi akhiran Enter (Carriage Return)',
    ],
    setupSteps: [
      '1. Hubungkan kabel USB atau colokkan dongle wireless scanner ke port komputer.',
      '2. Buka buku panduan manual barcode scanner, lalu scan barcode konfigurasi "Add Enter Suffix" atau "CR/LF Suffix".',
      '3. Lakukan pengujian di halaman Kasir (/purchasing) -> Scan barcode produk -> Kursor otomatis memasukkan produk ke keranjang belanja.',
    ],
    troubleshooting: [
      {
        issue: 'Scanner berbunyi bip, tetapi angka barcode tidak terbaca di sistem.',
        solution:
          'Pastikan kursor mouse aktif di kolom pencarian barcode (tekan F2), dan pastikan scanner diatur ke mode USB HID (bukan Virtual COM).',
      },
      {
        issue: 'Angka barcode terbaca, namun harus menekan tombol Enter secara manual.',
        solution:
          'Scanner belum dikonfigurasi dengan Auto-Enter. Scan barcode "Enable Auto Enter / CR Suffix" pada buku panduan scanner.',
      },
    ],
  },
  {
    id: 'thermal-receipt',
    title: 'Panduan Printer Struk Thermal Kasir (58mm / 80mm)',
    category: 'printer',
    summary:
      'Pengaturan printer cetak struk belanja thermal menggunakan koneksi USB, LAN, atau Bluetooth.',
    specifications: [
      'Ukuran kertas thermal standar: 58mm atau 80mm (ESC/POS)',
      'Dukungan pemotong otomatis (auto-cutter) untuk printer 80mm',
      'Mendukung pencetakan langsung dari peramban web browser',
    ],
    setupSteps: [
      '1. Pasang gulungan kertas thermal dengan posisi kertas mengarah keluar dari bawah gulungan.',
      '2. Pasang driver bawaan printer di sistem operasi Windows (contoh: POS-58 atau POS-80).',
      '3. Tetapkan printer tersebut sebagai printer utama (Default Printer) di Windows Control Panel.',
      '4. Pada menu kasir BMS, tekan F9 untuk mencetak nota, pilih Margin "None", dan atur ukuran kertas ke 58mm / 80mm.',
    ],
    troubleshooting: [
      {
        issue: 'Kertas keluar kosong tanpa cetakan teks apapun.',
        solution:
          'Gulungan kertas thermal terpasang terbalik. Balik posisi gulungan kertas agar sisi thermal menghadap ke arah jarum pemanas cetak.',
      },
      {
        issue: 'Header alamat URL browser ikut tercetak pada kertas struk kasir.',
        solution:
          'Pada jendela dialog cetak browser (Ctrl+P), hilangkan tanda centang pada opsi "Headers and Footers" (Header & Footer).',
      },
    ],
  },
  {
    id: 'label-printer',
    title: 'Panduan Printer Label Stiker Barcode (/bulk-print)',
    category: 'label',
    summary:
      'Panduan mencetak stiker barcode produk dan label harga rak toko dengan ukuran presisi.',
    specifications: [
      'Ukuran stiker populer: 50x30 mm (Label Produk), 33x15 mm (Label Mini 3 Kolom), 100x150 mm (Surat Jalan)',
      'Pengaturan template label dapat disesuaikan pada menu Master -> Template Label (/master/label-templates)',
    ],
    setupSteps: [
      '1. Pasang gulungan kertas stiker ke printer label dan pastikan sensor celah label terkalibrasi.',
      '2. Pada sistem BMS, buka menu Cetak Massal (/bulk-print) dan pilih barang yang akan dicetak.',
      '3. Tentukan ukuran template label sesuai ukuran kertas stiker yang digunakan.',
      '4. Tekan F4 untuk pratinjau tata letak, lalu tekan F9 untuk mencetak dokumen PDF.',
    ],
    troubleshooting: [
      {
        issue: 'Posisi cetakan teks melompat atau tidak berada di tengah stiker.',
        solution:
          'Lakukan kalibrasi sensor celah label (tahan tombol FEED saat menyalakan printer hingga lampu indikator berkedip) agar posisi stiker terbaca dengan pas.',
      },
    ],
  },
];
