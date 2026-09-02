export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      buku_besar: {
        Row: {
          created_at: string | null
          created_by: string | null
          gudang_id: string | null
          id: string
          keterangan: string
          nominal: number
          referensi_id: string | null
          sumber: Database["public"]["Enums"]["ledger_sumber"]
          tanggal: string
          tipe_transaksi: Database["public"]["Enums"]["ledger_tipe"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          keterangan: string
          nominal: number
          referensi_id?: string | null
          sumber: Database["public"]["Enums"]["ledger_sumber"]
          tanggal?: string
          tipe_transaksi: Database["public"]["Enums"]["ledger_tipe"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          keterangan?: string
          nominal?: number
          referensi_id?: string | null
          sumber?: Database["public"]["Enums"]["ledger_sumber"]
          tanggal?: string
          tipe_transaksi?: Database["public"]["Enums"]["ledger_tipe"]
        }
        Relationships: [
          {
            foreignKeyName: "buku_besar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buku_besar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "buku_besar_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          campaign_name: string
          created_at: string | null
          id: string
          sent_count: number | null
        }
        Insert: {
          campaign_name: string
          created_at?: string | null
          id?: string
          sent_count?: number | null
        }
        Update: {
          campaign_name?: string
          created_at?: string | null
          id?: string
          sent_count?: number | null
        }
        Relationships: []
      }
      crm_templates: {
        Row: {
          content: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gudang: {
        Row: {
          alamat: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          kode_gudang: string
          kontak_pj: string | null
          lokasi_kerja_id: string | null
          nama: string
          penanggung_jawab: string | null
          tipe: Database["public"]["Enums"]["tipe_gudang"]
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kode_gudang: string
          kontak_pj?: string | null
          lokasi_kerja_id?: string | null
          nama: string
          penanggung_jawab?: string | null
          tipe?: Database["public"]["Enums"]["tipe_gudang"]
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kode_gudang?: string
          kontak_pj?: string | null
          lokasi_kerja_id?: string | null
          nama?: string
          penanggung_jawab?: string | null
          tipe?: Database["public"]["Enums"]["tipe_gudang"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gudang_lokasi_kerja_id_fkey"
            columns: ["lokasi_kerja_id"]
            isOneToOne: false
            referencedRelation: "lokasi_kerja"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string | null
          created_by: string | null
          discontinued_at: string | null
          discontinued_by: string | null
          diskon: number | null
          harga_beli_terakhir: number | null
          harga_jual: number
          id: string
          id_kategori: string | null
          is_discontinued: boolean | null
          kode_barcode: string
          minimum_stock: number | null
          nama_barang: string
          slug: string | null
          snoozed_until: string | null
          stok: number | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discontinued_at?: string | null
          discontinued_by?: string | null
          diskon?: number | null
          harga_beli_terakhir?: number | null
          harga_jual: number
          id?: string
          id_kategori?: string | null
          is_discontinued?: boolean | null
          kode_barcode: string
          minimum_stock?: number | null
          nama_barang: string
          slug?: string | null
          snoozed_until?: string | null
          stok?: number | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discontinued_at?: string | null
          discontinued_by?: string | null
          diskon?: number | null
          harga_beli_terakhir?: number | null
          harga_jual?: number
          id?: string
          id_kategori?: string | null
          is_discontinued?: boolean | null
          kode_barcode?: string
          minimum_stock?: number | null
          nama_barang?: string
          slug?: string | null
          snoozed_until?: string | null
          stok?: number | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_discontinued_by_fkey"
            columns: ["discontinued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_discontinued_by_fkey"
            columns: ["discontinued_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_id_kategori_fkey"
            columns: ["id_kategori"]
            isOneToOne: false
            referencedRelation: "kategori"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_barcodes: {
        Row: {
          barcode: string
          created_at: string | null
          id: string
          inventory_id: string | null
          is_primary: boolean | null
        }
        Insert: {
          barcode: string
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          is_primary?: boolean | null
        }
        Update: {
          barcode?: string
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_barcodes_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stocks: {
        Row: {
          created_at: string
          gudang_id: string
          id: string
          inventory_id: string
          max_stok: number | null
          min_stok: number | null
          rak_lokasi: string | null
          stok: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gudang_id: string
          id?: string
          inventory_id: string
          max_stok?: number | null
          min_stok?: number | null
          rak_lokasi?: string | null
          stok?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gudang_id?: string
          id?: string
          inventory_id?: string
          max_stok?: number | null
          min_stok?: number | null
          rak_lokasi?: string | null
          stok?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stocks_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocks_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      karyawan: {
        Row: {
          created_at: string
          denda_telat_per_jam: number
          gaji_harian: number
          id: string
          jam_masuk: string
          jam_pulang: string
          lembur_per_jam: number
          nama_bank: string | null
          no_rekening: string | null
          status_karyawan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          denda_telat_per_jam?: number
          gaji_harian?: number
          id?: string
          jam_masuk?: string
          jam_pulang?: string
          lembur_per_jam?: number
          nama_bank?: string | null
          no_rekening?: string | null
          status_karyawan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          denda_telat_per_jam?: number
          gaji_harian?: number
          id?: string
          jam_masuk?: string
          jam_pulang?: string
          lembur_per_jam?: number
          nama_bank?: string | null
          no_rekening?: string | null
          status_karyawan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "karyawan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karyawan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      kas_log: {
        Row: {
          catatan: string | null
          created_at: string | null
          created_by: string | null
          gudang_id: string | null
          id: string
          jumlah: number
          payment_method: string | null
          referensi_id: string | null
          tipe: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          jumlah: number
          payment_method?: string | null
          referensi_id?: string | null
          tipe: string
        }
        Update: {
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          jumlah?: number
          payment_method?: string | null
          referensi_id?: string | null
          tipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "kas_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kas_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kas_log_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kas_log_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kas_log_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      kategori: {
        Row: {
          created_at: string | null
          id: string
          nama: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nama: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nama?: string
        }
        Relationships: []
      }
      kehadiran: {
        Row: {
          accuracy_masuk: number | null
          accuracy_pulang: number | null
          created_at: string
          id: string
          lat_masuk: number | null
          lat_pulang: number | null
          lng_masuk: number | null
          lng_pulang: number | null
          lokasi_masuk_id: string | null
          lokasi_pulang_id: string | null
          menit_kerja: number | null
          menit_lembur_aktual: number | null
          menit_lembur_disetujui: number | null
          menit_telat: number | null
          status_hadir: string
          status_lembur: string
          tanggal: string
          user_id: string
          waktu_masuk: string | null
          waktu_pulang: string | null
        }
        Insert: {
          accuracy_masuk?: number | null
          accuracy_pulang?: number | null
          created_at?: string
          id?: string
          lat_masuk?: number | null
          lat_pulang?: number | null
          lng_masuk?: number | null
          lng_pulang?: number | null
          lokasi_masuk_id?: string | null
          lokasi_pulang_id?: string | null
          menit_kerja?: number | null
          menit_lembur_aktual?: number | null
          menit_lembur_disetujui?: number | null
          menit_telat?: number | null
          status_hadir?: string
          status_lembur?: string
          tanggal?: string
          user_id: string
          waktu_masuk?: string | null
          waktu_pulang?: string | null
        }
        Update: {
          accuracy_masuk?: number | null
          accuracy_pulang?: number | null
          created_at?: string
          id?: string
          lat_masuk?: number | null
          lat_pulang?: number | null
          lng_masuk?: number | null
          lng_pulang?: number | null
          lokasi_masuk_id?: string | null
          lokasi_pulang_id?: string | null
          menit_kerja?: number | null
          menit_lembur_aktual?: number | null
          menit_lembur_disetujui?: number | null
          menit_telat?: number | null
          status_hadir?: string
          status_lembur?: string
          tanggal?: string
          user_id?: string
          waktu_masuk?: string | null
          waktu_pulang?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kehadiran_lokasi_masuk_id_fkey"
            columns: ["lokasi_masuk_id"]
            isOneToOne: false
            referencedRelation: "lokasi_kerja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kehadiran_lokasi_pulang_id_fkey"
            columns: ["lokasi_pulang_id"]
            isOneToOne: false
            referencedRelation: "lokasi_kerja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kehadiran_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kehadiran_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      label_templates: {
        Row: {
          active: boolean | null
          content_json: Json
          created_at: string | null
          id: string
          language: string
          name: string
        }
        Insert: {
          active?: boolean | null
          content_json: Json
          created_at?: string | null
          id?: string
          language: string
          name: string
        }
        Update: {
          active?: boolean | null
          content_json?: Json
          created_at?: string | null
          id?: string
          language?: string
          name?: string
        }
        Relationships: []
      }
      lokasi_kerja: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          nama: string
          radius_meter: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          nama: string
          radius_meter?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          nama?: string
          radius_meter?: number
          updated_at?: string
        }
        Relationships: []
      }
      member_tiers: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          id: string
          min_points_required: number | null
          name: string
          point_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          min_points_required?: number | null
          name: string
          point_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          min_points_required?: number | null
          name?: string
          point_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string | null
          id: string
          name: string
          points: number | null
          prefer_digital_receipt: boolean | null
          tier_id: string | null
          tier_points: number | null
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          points?: number | null
          prefer_digital_receipt?: boolean | null
          tier_id?: string | null
          tier_points?: number | null
          updated_at?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          points?: number | null
          prefer_digital_receipt?: boolean | null
          tier_id?: string | null
          tier_points?: number | null
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "member_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_mutasi: {
        Row: {
          created_at: string
          id: string
          jenis: Database["public"]["Enums"]["payroll_mutasi_jenis"]
          kategori: Database["public"]["Enums"]["payroll_mutasi_kategori"]
          keterangan: string | null
          nominal: number
          referensi_id: string | null
          status: Database["public"]["Enums"]["payroll_mutasi_status"]
          tanggal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jenis: Database["public"]["Enums"]["payroll_mutasi_jenis"]
          kategori: Database["public"]["Enums"]["payroll_mutasi_kategori"]
          keterangan?: string | null
          nominal: number
          referensi_id?: string | null
          status?: Database["public"]["Enums"]["payroll_mutasi_status"]
          tanggal?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jenis?: Database["public"]["Enums"]["payroll_mutasi_jenis"]
          kategori?: Database["public"]["Enums"]["payroll_mutasi_kategori"]
          keterangan?: string | null
          nominal?: number
          referensi_id?: string | null
          status?: Database["public"]["Enums"]["payroll_mutasi_status"]
          tanggal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_mutasi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_mutasi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pembelian: {
        Row: {
          created_at: string | null
          created_by: string | null
          gudang_id: string | null
          id: string
          idempotency_key: string | null
          nomor_nota: string | null
          note: string | null
          supplier_id: string | null
          supplier_nama: string | null
          tanggal: string
          total_sistem: number | null
          total_supplier: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          idempotency_key?: string | null
          nomor_nota?: string | null
          note?: string | null
          supplier_id?: string | null
          supplier_nama?: string | null
          tanggal: string
          total_sistem?: number | null
          total_supplier?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          idempotency_key?: string | null
          nomor_nota?: string | null
          note?: string | null
          supplier_id?: string | null
          supplier_nama?: string | null
          tanggal?: string
          total_sistem?: number | null
          total_supplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pembelian_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      pembelian_items: {
        Row: {
          diskon: number | null
          harga_beli: number
          harga_final: number
          id: string
          inventory_id: string
          nama_barang: string
          pembelian_id: string
          qty: number
        }
        Insert: {
          diskon?: number | null
          harga_beli: number
          harga_final: number
          id?: string
          inventory_id: string
          nama_barang: string
          pembelian_id: string
          qty: number
        }
        Update: {
          diskon?: number | null
          harga_beli?: number
          harga_final?: number
          id?: string
          inventory_id?: string
          nama_barang?: string
          pembelian_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_items_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      pembelian_return: {
        Row: {
          created_at: string
          created_by: string
          id: string
          idempotency_key: string | null
          note: string | null
          pembelian_id: string | null
          supplier_id: string
          supplier_nama: string
          tanggal: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          idempotency_key?: string | null
          note?: string | null
          pembelian_id?: string | null
          supplier_id: string
          supplier_nama: string
          tanggal: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string | null
          note?: string | null
          pembelian_id?: string | null
          supplier_id?: string
          supplier_nama?: string
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_return_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      pembelian_return_items: {
        Row: {
          diskon: number
          harga_beli: number
          harga_final: number
          id: string
          inventory_id: string
          nama_barang: string
          pembelian_item_id: string | null
          pembelian_return_id: string
          qty: number
          voided_at: string | null
        }
        Insert: {
          diskon?: number
          harga_beli: number
          harga_final: number
          id?: string
          inventory_id: string
          nama_barang: string
          pembelian_item_id?: string | null
          pembelian_return_id: string
          qty: number
          voided_at?: string | null
        }
        Update: {
          diskon?: number
          harga_beli?: number
          harga_final?: number
          id?: string
          inventory_id?: string
          nama_barang?: string
          pembelian_item_id?: string | null
          pembelian_return_id?: string
          qty?: number
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_return_items_pembelian_item_id_fkey"
            columns: ["pembelian_item_id"]
            isOneToOne: false
            referencedRelation: "pembelian_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_return_items_pembelian_return_id_fkey"
            columns: ["pembelian_return_id"]
            isOneToOne: false
            referencedRelation: "pembelian_return"
            referencedColumns: ["id"]
          },
        ]
      }
      pengeluaran_gudang: {
        Row: {
          catatan: string | null
          created_at: string
          created_by: string | null
          gudang_id: string
          id: string
          nomor_dokumen: string
          tanggal: string
          tipe: Database["public"]["Enums"]["tipe_pengeluaran_gudang"]
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          gudang_id: string
          id?: string
          nomor_dokumen: string
          tanggal?: string
          tipe: Database["public"]["Enums"]["tipe_pengeluaran_gudang"]
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          gudang_id?: string
          id?: string
          nomor_dokumen?: string
          tanggal?: string
          tipe?: Database["public"]["Enums"]["tipe_pengeluaran_gudang"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pengeluaran_gudang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pengeluaran_gudang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pengeluaran_gudang_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      pengeluaran_gudang_items: {
        Row: {
          alasan: string | null
          created_at: string
          harga_pokok: number
          id: string
          inventory_id: string
          pengeluaran_id: string
          qty: number
        }
        Insert: {
          alasan?: string | null
          created_at?: string
          harga_pokok?: number
          id?: string
          inventory_id: string
          pengeluaran_id: string
          qty: number
        }
        Update: {
          alasan?: string | null
          created_at?: string
          harga_pokok?: number
          id?: string
          inventory_id?: string
          pengeluaran_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "pengeluaran_gudang_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pengeluaran_gudang_items_pengeluaran_id_fkey"
            columns: ["pengeluaran_id"]
            isOneToOne: false
            referencedRelation: "pengeluaran_gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      pengeluaran_operasional: {
        Row: {
          created_at: string | null
          created_by: string | null
          gudang_id: string | null
          id: string
          kategori: string
          keterangan: string | null
          metode_pembayaran: string | null
          nominal: number
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          kategori: string
          keterangan?: string | null
          metode_pembayaran?: string | null
          nominal: number
          tanggal?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gudang_id?: string | null
          id?: string
          kategori?: string
          keterangan?: string | null
          metode_pembayaran?: string | null
          nominal?: number
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengeluaran_operasional_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pengeluaran_operasional_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pengeluaran_operasional_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan: {
        Row: {
          cash_amount: number | null
          created_at: string | null
          created_by: string | null
          discount_member_amount: number | null
          diskon_nominal: number | null
          diskon_persen: number | null
          gudang_id: string | null
          id: string
          idempotency_key: string | null
          kembalian: number | null
          member_id: string | null
          paid_at: string | null
          payment_method: string | null
          points_earned: number | null
          points_redeemed: number | null
          qris_amount: number | null
          receipt_sent_via_wa: boolean | null
          refunded_at: string | null
          shift_id: string | null
          status: string
          subtotal_sebelum_diskon: number | null
          tanggal: string
          total: number
          voided_at: string | null
        }
        Insert: {
          cash_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          discount_member_amount?: number | null
          diskon_nominal?: number | null
          diskon_persen?: number | null
          gudang_id?: string | null
          id?: string
          idempotency_key?: string | null
          kembalian?: number | null
          member_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          points_earned?: number | null
          points_redeemed?: number | null
          qris_amount?: number | null
          receipt_sent_via_wa?: boolean | null
          refunded_at?: string | null
          shift_id?: string | null
          status?: string
          subtotal_sebelum_diskon?: number | null
          tanggal: string
          total?: number
          voided_at?: string | null
        }
        Update: {
          cash_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          discount_member_amount?: number | null
          diskon_nominal?: number | null
          diskon_persen?: number | null
          gudang_id?: string | null
          id?: string
          idempotency_key?: string | null
          kembalian?: number | null
          member_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          points_earned?: number | null
          points_redeemed?: number | null
          qris_amount?: number | null
          receipt_sent_via_wa?: boolean | null
          refunded_at?: string | null
          shift_id?: string | null
          status?: string
          subtotal_sebelum_diskon?: number | null
          tanggal?: string
          total?: number
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "penjualan_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "vw_customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan_items: {
        Row: {
          cost_at_sale: number
          created_at: string
          diskon: number
          harga_final: number
          harga_jual: number
          id: string
          inventory_id: string
          nama_barang: string
          penjualan_id: string
          qty: number
        }
        Insert: {
          cost_at_sale: number
          created_at?: string
          diskon?: number
          harga_final: number
          harga_jual: number
          id?: string
          inventory_id: string
          nama_barang: string
          penjualan_id: string
          qty: number
        }
        Update: {
          cost_at_sale?: number
          created_at?: string
          diskon?: number
          harga_final?: number
          harga_jual?: number
          id?: string
          inventory_id?: string
          nama_barang?: string
          penjualan_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_items_penjualan_id_fkey"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualan"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan_return: {
        Row: {
          created_at: string
          created_by: string
          gudang_id: string | null
          id: string
          idempotency_key: string | null
          note: string | null
          penjualan_id: string
          tanggal: string
        }
        Insert: {
          created_at?: string
          created_by: string
          gudang_id?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          penjualan_id: string
          tanggal: string
        }
        Update: {
          created_at?: string
          created_by?: string
          gudang_id?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          penjualan_id?: string
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_return_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_return_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "penjualan_return_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_return_penjualan_id_fkey"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualan"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan_return_items: {
        Row: {
          cost_at_sale: number
          created_at: string
          diskon: number
          harga_final: number
          harga_jual: number
          id: string
          inventory_id: string
          nama_barang: string
          penjualan_item_id: string | null
          penjualan_return_id: string
          qty: number
        }
        Insert: {
          cost_at_sale: number
          created_at?: string
          diskon?: number
          harga_final: number
          harga_jual: number
          id?: string
          inventory_id: string
          nama_barang: string
          penjualan_item_id?: string | null
          penjualan_return_id: string
          qty: number
        }
        Update: {
          cost_at_sale?: number
          created_at?: string
          diskon?: number
          harga_final?: number
          harga_jual?: number
          id?: string
          inventory_id?: string
          nama_barang?: string
          penjualan_item_id?: string | null
          penjualan_return_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_return_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_return_items_penjualan_item_id_fkey"
            columns: ["penjualan_item_id"]
            isOneToOne: false
            referencedRelation: "penjualan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_return_items_penjualan_return_id_fkey"
            columns: ["penjualan_return_id"]
            isOneToOne: false
            referencedRelation: "penjualan_return"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          created_at: string | null
          id: string
          payload_json: Json
          printed_at: string | null
          status: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload_json: Json
          printed_at?: string | null
          status?: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload_json?: Json
          printed_at?: string | null
          status?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "label_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_gudang_id: string | null
          email: string | null
          id: string
          last_sign_in_at: string | null
          nama: string | null
          roles: string[] | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_gudang_id?: string | null
          email?: string | null
          id: string
          last_sign_in_at?: string | null
          nama?: string | null
          roles?: string[] | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_gudang_id?: string | null
          email?: string | null
          id?: string
          last_sign_in_at?: string | null
          nama?: string | null
          roles?: string[] | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_gudang_id_fkey"
            columns: ["default_gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      promosi: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          nama: string
          status: string
          tanggal_mulai: string
          tanggal_selesai: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nama: string
          status?: string
          tanggal_mulai: string
          tanggal_selesai: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nama?: string
          status?: string
          tanggal_mulai?: string
          tanggal_selesai?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promosi_items: {
        Row: {
          created_at: string | null
          diskon_nominal: number
          id: string
          inventory_id: string
          promosi_id: string
        }
        Insert: {
          created_at?: string | null
          diskon_nominal?: number
          id?: string
          inventory_id: string
          promosi_id: string
        }
        Update: {
          created_at?: string | null
          diskon_nominal?: number
          id?: string
          inventory_id?: string
          promosi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promosi_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promosi_items_promosi_id_fkey"
            columns: ["promosi_id"]
            isOneToOne: false
            referencedRelation: "promosi"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receipt_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          template: Json
          type: Database["public"]["Enums"]["receipt_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template: Json
          type: Database["public"]["Enums"]["receipt_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template?: Json
          type?: Database["public"]["Enums"]["receipt_type"]
        }
        Relationships: []
      }
      shift_sessions: {
        Row: {
          closing_cash: number | null
          created_at: string | null
          end_time: string | null
          gudang_id: string | null
          gudang_name: string | null
          id: string
          kasir_id: string
          kasir_name: string
          opening_cash: number
          start_time: string
          status: string
        }
        Insert: {
          closing_cash?: number | null
          created_at?: string | null
          end_time?: string | null
          gudang_id?: string | null
          gudang_name?: string | null
          id: string
          kasir_id: string
          kasir_name: string
          opening_cash?: number
          start_time: string
          status?: string
        }
        Update: {
          closing_cash?: number | null
          created_at?: string | null
          end_time?: string | null
          gudang_id?: string | null
          gudang_name?: string | null
          id?: string
          kasir_id?: string
          kasir_name?: string
          opening_cash?: number
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_sessions_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
        ]
      }
      slip_gaji: {
        Row: {
          created_at: string
          dibayar_pada: string | null
          gaji_bersih: number
          id: string
          periode_bulan: string
          saldo_awal: number | null
          sisa_saldo_akhir: number | null
          status_pembayaran: string
          total_denda_telat: number
          total_gaji_harian: number
          total_gaji_lembur: number
          total_hari_hadir: number
          total_jam_lembur: number
          total_jam_telat: number
          total_penarikan: number | null
          total_pendapatan_bersih: number | null
          total_potongan_kasbon: number
          user_id: string
        }
        Insert: {
          created_at?: string
          dibayar_pada?: string | null
          gaji_bersih?: number
          id?: string
          periode_bulan: string
          saldo_awal?: number | null
          sisa_saldo_akhir?: number | null
          status_pembayaran?: string
          total_denda_telat?: number
          total_gaji_harian?: number
          total_gaji_lembur?: number
          total_hari_hadir?: number
          total_jam_lembur?: number
          total_jam_telat?: number
          total_penarikan?: number | null
          total_pendapatan_bersih?: number | null
          total_potongan_kasbon?: number
          user_id: string
        }
        Update: {
          created_at?: string
          dibayar_pada?: string | null
          gaji_bersih?: number
          id?: string
          periode_bulan?: string
          saldo_awal?: number | null
          sisa_saldo_akhir?: number | null
          status_pembayaran?: string
          total_denda_telat?: number
          total_gaji_harian?: number
          total_gaji_lembur?: number
          total_hari_hadir?: number
          total_jam_lembur?: number
          total_jam_telat?: number
          total_penarikan?: number | null
          total_pendapatan_bersih?: number | null
          total_potongan_kasbon?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slip_gaji_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_gaji_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_qty: number
          adjustment_type: string
          created_at: string | null
          created_by: string
          id: string
          inventory_id: string
          note: string | null
          reason: string
          stock_opname_item_id: string | null
        }
        Insert: {
          adjustment_qty: number
          adjustment_type: string
          created_at?: string | null
          created_by: string
          id?: string
          inventory_id: string
          note?: string | null
          reason: string
          stock_opname_item_id?: string | null
        }
        Update: {
          adjustment_qty?: number
          adjustment_type?: string
          created_at?: string | null
          created_by?: string
          id?: string
          inventory_id?: string
          note?: string | null
          reason?: string
          stock_opname_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_adjustments_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_stock_opname_item_id_fkey"
            columns: ["stock_opname_item_id"]
            isOneToOne: false
            referencedRelation: "stock_opname_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          gudang_id: string | null
          gudang_tujuan_id: string | null
          id: string
          inventory_id: string
          qty: number | null
          referensi: string | null
          tipe: string
        }
        Insert: {
          created_at?: string | null
          gudang_id?: string | null
          gudang_tujuan_id?: string | null
          id?: string
          inventory_id: string
          qty?: number | null
          referensi?: string | null
          tipe: string
        }
        Update: {
          created_at?: string | null
          gudang_id?: string | null
          gudang_tujuan_id?: string | null
          id?: string
          inventory_id?: string
          qty?: number | null
          referensi?: string | null
          tipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_gudang_id_fkey"
            columns: ["gudang_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_gudang_tujuan_id_fkey"
            columns: ["gudang_tujuan_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opname: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string
          id: string
          note: string | null
          opname_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          note?: string | null
          opname_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          note?: string | null
          opname_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_opname_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stock_opname_items: {
        Row: {
          adjusted: boolean | null
          created_at: string | null
          difference: number
          id: string
          inventory_id: string
          note: string | null
          physical_stock: number
          reason: string | null
          stock_opname_id: string
          system_stock: number
          updated_at: string | null
        }
        Insert: {
          adjusted?: boolean | null
          created_at?: string | null
          difference: number
          id?: string
          inventory_id: string
          note?: string | null
          physical_stock: number
          reason?: string | null
          stock_opname_id: string
          system_stock: number
          updated_at?: string | null
        }
        Update: {
          adjusted?: boolean | null
          created_at?: string | null
          difference?: number
          id?: string
          inventory_id?: string
          note?: string | null
          physical_stock?: number
          reason?: string | null
          stock_opname_id?: string
          system_stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_items_stock_opname_id_fkey"
            columns: ["stock_opname_id"]
            isOneToOne: false
            referencedRelation: "stock_opname"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier: {
        Row: {
          alamat: string | null
          created_at: string | null
          id: string
          kontak: string | null
          nama: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          id?: string
          kontak?: string | null
          nama: string
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          id?: string
          kontak?: string | null
          nama?: string
        }
        Relationships: []
      }
      transfer_stok: {
        Row: {
          approved_by: string | null
          catatan: string | null
          created_at: string
          created_by: string | null
          gudang_asal_id: string
          gudang_tujuan_id: string
          id: string
          kurir_pengirim: string | null
          nomor_transfer: string
          received_by: string | null
          status: Database["public"]["Enums"]["status_transfer"]
          tanggal_kirim: string | null
          tanggal_terima: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          gudang_asal_id: string
          gudang_tujuan_id: string
          id?: string
          kurir_pengirim?: string | null
          nomor_transfer: string
          received_by?: string | null
          status?: Database["public"]["Enums"]["status_transfer"]
          tanggal_kirim?: string | null
          tanggal_terima?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          gudang_asal_id?: string
          gudang_tujuan_id?: string
          id?: string
          kurir_pengirim?: string | null
          nomor_transfer?: string
          received_by?: string | null
          status?: Database["public"]["Enums"]["status_transfer"]
          tanggal_kirim?: string | null
          tanggal_terima?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_stok_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_stok_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transfer_stok_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_stok_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transfer_stok_gudang_asal_id_fkey"
            columns: ["gudang_asal_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_stok_gudang_tujuan_id_fkey"
            columns: ["gudang_tujuan_id"]
            isOneToOne: false
            referencedRelation: "gudang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_stok_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_stok_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "vw_payroll_saldo"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transfer_stok_items: {
        Row: {
          catatan: string | null
          created_at: string
          id: string
          inventory_id: string
          qty_kirim: number
          qty_terima: number | null
          transfer_id: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          qty_kirim: number
          qty_terima?: number | null
          transfer_id: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          qty_kirim?: number
          qty_terima?: number | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_stok_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_stok_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfer_stok"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_outbox: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string | null
          phone: string
          source: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          phone: string
          source: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          phone?: string
          source?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_recent_transactions: {
        Row: {
          created_at: string | null
          id: string | null
          tanggal: string | null
          total: number | null
          type: string | null
        }
        Relationships: []
      }
      vw_customer_stats: {
        Row: {
          created_at: string | null
          id: string | null
          last_visit: string | null
          name: string | null
          points: number | null
          tier_id: string | null
          total_spent: number | null
          total_transactions: number | null
          whatsapp_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "member_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_payroll_saldo: {
        Row: {
          total_saldo: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      absen_masuk_with_gps:
        | {
            Args: {
              p_accuracy?: number
              p_lat: number
              p_lng: number
              p_status_hadir?: string
            }
            Returns: {
              accuracy_masuk: number | null
              accuracy_pulang: number | null
              created_at: string
              id: string
              lat_masuk: number | null
              lat_pulang: number | null
              lng_masuk: number | null
              lng_pulang: number | null
              lokasi_masuk_id: string | null
              lokasi_pulang_id: string | null
              menit_kerja: number | null
              menit_lembur_aktual: number | null
              menit_lembur_disetujui: number | null
              menit_telat: number | null
              status_hadir: string
              status_lembur: string
              tanggal: string
              user_id: string
              waktu_masuk: string | null
              waktu_pulang: string | null
            }
            SetofOptions: {
              from: "*"
              to: "kehadiran"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_lat: number
              p_lng: number
              p_status_hadir: string
              p_user_id: string
            }
            Returns: {
              accuracy_masuk: number | null
              accuracy_pulang: number | null
              created_at: string
              id: string
              lat_masuk: number | null
              lat_pulang: number | null
              lng_masuk: number | null
              lng_pulang: number | null
              lokasi_masuk_id: string | null
              lokasi_pulang_id: string | null
              menit_kerja: number | null
              menit_lembur_aktual: number | null
              menit_lembur_disetujui: number | null
              menit_telat: number | null
              status_hadir: string
              status_lembur: string
              tanggal: string
              user_id: string
              waktu_masuk: string | null
              waktu_pulang: string | null
            }
            SetofOptions: {
              from: "*"
              to: "kehadiran"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      absen_pulang_with_gps:
        | {
            Args: {
              p_accuracy?: number
              p_kehadiran_id: string
              p_lat: number
              p_lng: number
            }
            Returns: {
              accuracy_masuk: number | null
              accuracy_pulang: number | null
              created_at: string
              id: string
              lat_masuk: number | null
              lat_pulang: number | null
              lng_masuk: number | null
              lng_pulang: number | null
              lokasi_masuk_id: string | null
              lokasi_pulang_id: string | null
              menit_kerja: number | null
              menit_lembur_aktual: number | null
              menit_lembur_disetujui: number | null
              menit_telat: number | null
              status_hadir: string
              status_lembur: string
              tanggal: string
              user_id: string
              waktu_masuk: string | null
              waktu_pulang: string | null
            }
            SetofOptions: {
              from: "*"
              to: "kehadiran"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_kehadiran_id: string
              p_lat: number
              p_lng: number
              p_menit_kerja: number
              p_menit_lembur: number
              p_menit_telat: number
            }
            Returns: {
              accuracy_masuk: number | null
              accuracy_pulang: number | null
              created_at: string
              id: string
              lat_masuk: number | null
              lat_pulang: number | null
              lng_masuk: number | null
              lng_pulang: number | null
              lokasi_masuk_id: string | null
              lokasi_pulang_id: string | null
              menit_kerja: number | null
              menit_lembur_aktual: number | null
              menit_lembur_disetujui: number | null
              menit_telat: number | null
              status_hadir: string
              status_lembur: string
              tanggal: string
              user_id: string
              waktu_masuk: string | null
              waktu_pulang: string | null
            }
            SetofOptions: {
              from: "*"
              to: "kehadiran"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      add_kas_log: {
        Args: {
          p_catatan: string
          p_created_by: string
          p_jumlah: number
          p_tipe: string
        }
        Returns: string
      }
      add_penjualan_items: {
        Args: { p_items: Json; p_penjualan_id: string }
        Returns: undefined
      }
      bulk_approve_lembur: { Args: { p_ids: string[] }; Returns: number }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      check_and_notify_absensi: { Args: never; Returns: undefined }
      create_penjualan: { Args: { p_user: string }; Returns: string }
      create_penjualan_return: {
        Args: {
          p_created_by: string
          p_gudang_id?: string
          p_idempotency_key?: string
          p_items: Json
          p_note: string
          p_penjualan_id: string
          p_tanggal: string
        }
        Returns: string
      }
      export_profit_report: {
        Args: {
          p_category_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          margin_percentage: number
          report_date: string
          total_modal: number
          total_penjualan: number
          total_profit: number
        }[]
      }
      export_sales_report: {
        Args: {
          p_category_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          report_date: string
          total_cash: number
          total_items: number
          total_qris: number
          total_sales: number
          transaction_count: number
        }[]
      }
      finalize_penjualan: { Args: { p_penjualan_id: string }; Returns: string }
      generate_monthly_slips: {
        Args: { p_periode: string }
        Returns: undefined
      }
      generate_nomor_pengeluaran_gudang: { Args: never; Returns: string }
      generate_nomor_transfer: { Args: never; Returns: string }
      get_7day_trend_v2: {
        Args: { p_start_date?: string }
        Returns: {
          pembelian: number
          penjualan: number
          profit: number
          trend_date: string
        }[]
      }
      get_analytics_atv: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_transaction_value: number
          items_per_ticket: number
        }[]
      }
      get_analytics_busiest_hours: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          hour_of_day: number
          total_revenue: number
          transaction_count: number
        }[]
      }
      get_analytics_categories: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          category_name: string
          total_items: number
          total_revenue: number
        }[]
      }
      get_analytics_payment_methods: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          total_cash: number
          total_qris: number
          transaction_count: number
        }[]
      }
      get_analytics_profitability: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          inventory_id: string
          nama_barang: string
          profit_margin: number
          total_profit: number
          total_sold: number
        }[]
      }
      get_analytics_returns: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_analytics_sales_trend: {
        Args: {
          p_end_date?: string
          p_group_by?: string
          p_start_date?: string
        }
        Returns: {
          label_waktu: string
          total_revenue: number
          transaction_count: number
        }[]
      }
      get_analytics_stock_velocity: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          current_stock: number
          inventory_id: string
          nama_barang: string
          sales_velocity: number
          total_sold: number
        }[]
      }
      get_available_return_items: {
        Args: { p_supplier_id: string }
        Returns: {
          diskon: number
          harga_beli: number
          inventory_id: string
          nama_barang: string
          nomor_nota: string
          pembelian_id: string
          pembelian_item_id: string
          qty_original: number
          qty_remaining: number
          qty_returned: number
          tanggal_pembelian: string
        }[]
      }
      get_dashboard_stats: {
        Args: never
        Returns: {
          low_stock_items: number
          total_inventory_value: number
          total_items: number
        }[]
      }
      get_dashboard_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_inventory_paginated: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_low_stock_only?: boolean
          p_offset?: number
          p_search?: string
        }
        Returns: {
          created_at: string | null
          created_by: string | null
          discontinued_at: string | null
          discontinued_by: string | null
          diskon: number | null
          harga_beli_terakhir: number | null
          harga_jual: number
          id: string
          id_kategori: string | null
          is_discontinued: boolean | null
          kode_barcode: string
          minimum_stock: number | null
          nama_barang: string
          slug: string | null
          snoozed_until: string | null
          stok: number | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_inventory_summary:
        | {
            Args: never
            Returns: {
              total_items: number
              total_stok: number
              total_value: number
            }[]
          }
        | {
            Args: { p_gudang_id?: string }
            Returns: {
              total_items: number
              total_stok: number
              total_value: number
            }[]
          }
      get_ledger_opening_balance:
        | { Args: { p_start_date: string }; Returns: number }
        | {
            Args: { p_gudang_id?: string; p_start_date: string }
            Returns: number
          }
      get_low_stock_items: {
        Args: { p_search?: string }
        Returns: {
          created_at: string | null
          created_by: string | null
          discontinued_at: string | null
          discontinued_by: string | null
          diskon: number | null
          harga_beli_terakhir: number | null
          harga_jual: number
          id: string
          id_kategori: string | null
          is_discontinued: boolean | null
          kode_barcode: string
          minimum_stock: number | null
          nama_barang: string
          slug: string | null
          snoozed_until: string | null
          stok: number | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profit_report: {
        Args: {
          p_category_id?: string
          p_end_date?: string
          p_limit?: number
          p_page?: number
          p_start_date?: string
        }
        Returns: {
          grand_total_modal: number
          grand_total_penjualan: number
          grand_total_profit: number
          margin_percentage: number
          report_date: string
          total_count: number
          total_modal: number
          total_penjualan: number
          total_profit: number
        }[]
      }
      get_sales_report: {
        Args: {
          p_category_id?: string
          p_end_date?: string
          p_limit?: number
          p_page?: number
          p_start_date?: string
        }
        Returns: {
          grand_total_cash: number
          grand_total_qris: number
          grand_total_sales: number
          report_date: string
          total_cash: number
          total_count: number
          total_items: number
          total_qris: number
          total_sales: number
          transaction_count: number
        }[]
      }
      get_today_kehadiran_summary: { Args: never; Returns: Json }
      get_today_profit: { Args: { p_date?: string }; Returns: Json }
      get_top_selling_items: {
        Args: {
          p_category_id?: string
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
        }
        Returns: {
          inventory_id: string
          nama_barang: string
          total_profit: number
          total_qty: number
          total_sales: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      pay_penjualan: {
        Args: {
          p_cash_amount: number
          p_catatan: string
          p_created_by: string
          p_diskon_nominal: number
          p_diskon_persen: number
          p_kembalian: number
          p_payment_method: string
          p_penjualan_id: string
          p_qris_amount: number
        }
        Returns: string
      }
      pay_transaction: {
        Args: {
          p_cash_amount: number
          p_catatan: string
          p_created_at?: string
          p_created_by: string
          p_discount_member_amount?: number
          p_diskon_nominal: number
          p_diskon_persen: number
          p_gudang_id?: string
          p_idempotency_key: string
          p_items: Json
          p_member_id?: string
          p_payment_method: string
          p_points_earned?: number
          p_points_redeemed?: number
          p_qris_amount: number
          p_receipt_sent_via_wa?: boolean
          p_shift_id?: string
        }
        Returns: string
      }
      pembelian_return_create: {
        Args: {
          p_created_by: string
          p_idempotency_key: string
          p_items: Json
          p_note: string
          p_pembelian_id: string
          p_tanggal: string
        }
        Returns: Json
      }
      penjualan_return_create: {
        Args: {
          p_created_by: string
          p_idempotency_key: string
          p_items: Json
          p_note: string
          p_penjualan_id: string
          p_tanggal: string
        }
        Returns: Json
      }
      preview_gaji: {
        Args: { p_periode: string }
        Returns: {
          created_at: string
          dibayar_pada: string
          gaji_bersih: number
          id: string
          nama: string
          periode_bulan: string
          status_pembayaran: string
          total_denda_telat: number
          total_gaji_harian: number
          total_gaji_lembur: number
          total_hari_hadir: number
          total_jam_lembur: number
          total_jam_telat: number
          total_potongan_kasbon: number
          user_id: string
        }[]
      }
      process_opname_adjustments: {
        Args: { p_opname_id: string; p_user_id: string }
        Returns: Json
      }
      proses_gaji: { Args: { p_periode: string }; Returns: undefined }
      proses_return_batch:
        | {
            Args: {
              p_created_by?: string
              p_idempotency_key?: string
              p_items: Json
              p_note?: string
              p_supplier_id: string
              p_supplier_nama: string
              p_tanggal?: string
            }
            Returns: {
              return_id: string
            }[]
          }
        | {
            Args: {
              p_created_by?: string
              p_idempotency_key?: string
              p_items: Json[]
              p_note?: string
              p_supplier_id: string
              p_supplier_nama: string
              p_tanggal?: string
            }
            Returns: {
              return_id: string
            }[]
          }
      record_shift_to_ledger: {
        Args: { p_shift_id: string }
        Returns: undefined
      }
      reset_member_points: { Args: never; Returns: undefined }
      reset_member_tier_points: { Args: never; Returns: undefined }
      resolve_username: { Args: { p_username: string }; Returns: string }
      search_inventory: {
        Args: { limit_val?: number; search_query: string }
        Returns: {
          created_at: string
          diskon: number
          harga_beli_terakhir: number
          harga_jual: number
          id: string
          id_kategori: string
          is_discontinued: boolean
          kategori: Json
          kode_barcode: string
          minimum_stock: number
          nama_barang: string
          similarity_score: number
          stok: number
          updated_at: string
        }[]
      }
      snooze_low_stock_item: {
        Args: { p_days: number; p_id: string; p_user: string }
        Returns: {
          created_at: string | null
          created_by: string | null
          discontinued_at: string | null
          discontinued_by: string | null
          diskon: number | null
          harga_beli_terakhir: number | null
          harga_jual: number
          id: string
          id_kategori: string | null
          is_discontinued: boolean | null
          kode_barcode: string
          minimum_stock: number | null
          nama_barang: string
          slug: string | null
          snoozed_until: string | null
          stok: number | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      tambah_pembelian:
        | {
            Args: {
              p_barcode: string
              p_harga: number
              p_nama_barang: string
              p_qty: number
              p_supplier_id: string
              p_tanggal: string
              p_user: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_harga: number
              p_nama_barang: string
              p_qty: number
              p_supplier_id: string
              p_tanggal: string
              p_user: string
            }
            Returns: string
          }
      tambah_pembelian_batch: {
        Args: {
          p_idempotency_key?: string
          p_items: Json
          p_nomor_nota?: string
          p_supplier_id: string
          p_tanggal: string
          p_user: string
        }
        Returns: string
      }
      tambah_penjualan: {
        Args: {
          p_harga: number
          p_inventory_id: string
          p_qty: number
          p_tanggal: string
          p_user: string
        }
        Returns: undefined
      }
      toggle_discontinued: {
        Args: { p_id: string; p_user: string }
        Returns: {
          created_at: string | null
          created_by: string | null
          discontinued_at: string | null
          discontinued_by: string | null
          diskon: number | null
          harga_beli_terakhir: number | null
          harga_jual: number
          id: string
          id_kategori: string | null
          is_discontinued: boolean | null
          kode_barcode: string
          minimum_stock: number | null
          nama_barang: string
          slug: string | null
          snoozed_until: string | null
          stok: number | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_pembelian_batch: {
        Args: {
          p_items: Json
          p_nomor_nota?: string
          p_pembelian_id: string
          p_supplier_id: string
          p_tanggal: string
          p_user: string
        }
        Returns: Json
      }
      void_pembelian_return_item: {
        Args: {
          p_created_by?: string
          p_note?: string
          p_pembelian_return_item_id: string
        }
        Returns: {
          void_return_item_id: string
        }[]
      }
    }
    Enums: {
      ledger_sumber:
        | "PENJUALAN_SHIFT"
        | "PEMBELIAN_STOK"
        | "BIAYA_OPERASIONAL"
        | "KASBON"
        | "GAJI"
        | "MODAL"
        | "LAIN_LAIN"
        | "RETUR_PENJUALAN"
        | "BEBAN_SUSUT_GUDANG"
      ledger_tipe: "PEMASUKAN" | "PENGELUARAN"
      payroll_mutasi_jenis: "kredit" | "debit"
      payroll_mutasi_kategori: "gaji" | "kasbon" | "pencairan" | "lainnya"
      payroll_mutasi_status: "pending" | "disetujui" | "ditolak"
      receipt_type: "SALE" | "RETURN"
      status_transfer:
        | "DRAFT"
        | "REQUESTED"
        | "APPROVED"
        | "IN_TRANSIT"
        | "RECEIVED"
        | "REJECTED"
        | "CANCELED"
      tipe_gudang: "PUSAT" | "CABANG" | "RETUR" | "TRANSIT"
      tipe_pengeluaran_gudang:
        | "RUSAK"
        | "KADALUARSA"
        | "PEMAKAIAN_SENDIRI"
        | "SAMPEL_PROMOSI"
        | "SELISIH_HILANG"
        | "LAINNYA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ledger_sumber: [
        "PENJUALAN_SHIFT",
        "PEMBELIAN_STOK",
        "BIAYA_OPERASIONAL",
        "KASBON",
        "GAJI",
        "MODAL",
        "LAIN_LAIN",
        "RETUR_PENJUALAN",
        "BEBAN_SUSUT_GUDANG",
      ],
      ledger_tipe: ["PEMASUKAN", "PENGELUARAN"],
      payroll_mutasi_jenis: ["kredit", "debit"],
      payroll_mutasi_kategori: ["gaji", "kasbon", "pencairan", "lainnya"],
      payroll_mutasi_status: ["pending", "disetujui", "ditolak"],
      receipt_type: ["SALE", "RETURN"],
      status_transfer: [
        "DRAFT",
        "REQUESTED",
        "APPROVED",
        "IN_TRANSIT",
        "RECEIVED",
        "REJECTED",
        "CANCELED",
      ],
      tipe_gudang: ["PUSAT", "CABANG", "RETUR", "TRANSIT"],
      tipe_pengeluaran_gudang: [
        "RUSAK",
        "KADALUARSA",
        "PEMAKAIAN_SENDIRI",
        "SAMPEL_PROMOSI",
        "SELISIH_HILANG",
        "LAINNYA",
      ],
    },
  },
} as const
