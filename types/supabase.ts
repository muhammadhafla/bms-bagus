export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      inventory: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          discontinued_at: string | null;
          discontinued_by: string | null;
          diskon: number | null;
          harga_beli_terakhir: number | null;
          harga_jual: number;
          id: string;
          id_kategori: string | null;
          is_discontinued: boolean | null;
          kode_barcode: string;
          minimum_stock: number | null;
          nama_barang: string;
          slug: string | null;
          stok: number | null;
          unit: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          discontinued_at?: string | null;
          discontinued_by?: string | null;
          diskon?: number | null;
          harga_beli_terakhir?: number | null;
          harga_jual: number;
          id?: string;
          id_kategori?: string | null;
          is_discontinued?: boolean | null;
          kode_barcode: string;
          minimum_stock?: number | null;
          nama_barang: string;
          slug?: string | null;
          stok?: number | null;
          unit?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          discontinued_at?: string | null;
          discontinued_by?: string | null;
          diskon?: number | null;
          harga_beli_terakhir?: number | null;
          harga_jual?: number;
          id?: string;
          id_kategori?: string | null;
          is_discontinued?: boolean | null;
          kode_barcode?: string;
          minimum_stock?: number | null;
          nama_barang?: string;
          slug?: string | null;
          stok?: number | null;
          unit?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_discontinued_by_fkey';
            columns: ['discontinued_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_id_kategori_fkey';
            columns: ['id_kategori'];
            isOneToOne: false;
            referencedRelation: 'kategori';
            referencedColumns: ['id'];
          },
        ];
      };
      inventory_barcodes: {
        Row: {
          barcode: string;
          created_at: string | null;
          id: string;
          inventory_id: string | null;
          is_primary: boolean | null;
        };
        Insert: {
          barcode: string;
          created_at?: string | null;
          id?: string;
          inventory_id?: string | null;
          is_primary?: boolean | null;
        };
        Update: {
          barcode?: string;
          created_at?: string | null;
          id?: string;
          inventory_id?: string | null;
          is_primary?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_barcodes_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
        ];
      };
      kas_log: {
        Row: {
          catatan: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          jumlah: number;
          payment_method: string | null;
          referensi_id: string | null;
          tipe: string;
        };
        Insert: {
          catatan?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          jumlah: number;
          payment_method?: string | null;
          referensi_id?: string | null;
          tipe: string;
        };
        Update: {
          catatan?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          jumlah?: number;
          payment_method?: string | null;
          referensi_id?: string | null;
          tipe?: string;
        };
        Relationships: [];
      };
      kategori: {
        Row: {
          created_at: string | null;
          id: string;
          nama: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          nama: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          nama?: string;
        };
        Relationships: [];
      };
      label_templates: {
        Row: {
          active: boolean | null;
          content_json: Json;
          created_at: string | null;
          id: string;
          language: string;
          name: string;
        };
        Insert: {
          active?: boolean | null;
          content_json: Json;
          created_at?: string | null;
          id?: string;
          language: string;
          name: string;
        };
        Update: {
          active?: boolean | null;
          content_json?: Json;
          created_at?: string | null;
          id?: string;
          language?: string;
          name?: string;
        };
        Relationships: [];
      };
      pembelian: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          idempotency_key: string | null;
          nomor_nota: string | null;
          note: string | null;
          supplier_id: string | null;
          supplier_nama: string | null;
          tanggal: string;
          total_sistem: number | null;
          total_supplier: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          idempotency_key?: string | null;
          nomor_nota?: string | null;
          note?: string | null;
          supplier_id?: string | null;
          supplier_nama?: string | null;
          tanggal: string;
          total_sistem?: number | null;
          total_supplier?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          idempotency_key?: string | null;
          nomor_nota?: string | null;
          note?: string | null;
          supplier_id?: string | null;
          supplier_nama?: string | null;
          tanggal?: string;
          total_sistem?: number | null;
          total_supplier?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pembelian_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pembelian_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'supplier';
            referencedColumns: ['id'];
          },
        ];
      };
      pembelian_items: {
        Row: {
          diskon: number | null;
          harga_beli: number;
          harga_final: number;
          id: string;
          inventory_id: string;
          nama_barang: string;
          pembelian_id: string;
          qty: number;
        };
        Insert: {
          diskon?: number | null;
          harga_beli: number;
          harga_final: number;
          id?: string;
          inventory_id: string;
          nama_barang: string;
          pembelian_id: string;
          qty: number;
        };
        Update: {
          diskon?: number | null;
          harga_beli?: number;
          harga_final?: number;
          id?: string;
          inventory_id?: string;
          nama_barang?: string;
          pembelian_id?: string;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pembelian_items_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pembelian_items_pembelian_id_fkey';
            columns: ['pembelian_id'];
            isOneToOne: false;
            referencedRelation: 'pembelian';
            referencedColumns: ['id'];
          },
        ];
      };
      pembelian_return: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          idempotency_key: string | null;
          note: string | null;
          pembelian_id: string | null;
          supplier_id: string;
          supplier_nama: string;
          tanggal: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          idempotency_key?: string | null;
          note?: string | null;
          pembelian_id?: string | null;
          supplier_id: string;
          supplier_nama: string;
          tanggal: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          idempotency_key?: string | null;
          note?: string | null;
          pembelian_id?: string | null;
          supplier_id?: string;
          supplier_nama?: string;
          tanggal?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pembelian_return_pembelian_id_fkey';
            columns: ['pembelian_id'];
            isOneToOne: false;
            referencedRelation: 'pembelian';
            referencedColumns: ['id'];
          },
        ];
      };
      pembelian_return_items: {
        Row: {
          diskon: number;
          harga_beli: number;
          harga_final: number;
          id: string;
          inventory_id: string;
          nama_barang: string;
          pembelian_item_id: string | null;
          pembelian_return_id: string;
          qty: number;
          voided_at: string | null;
        };
        Insert: {
          diskon?: number;
          harga_beli: number;
          harga_final: number;
          id?: string;
          inventory_id: string;
          nama_barang: string;
          pembelian_item_id?: string | null;
          pembelian_return_id: string;
          qty: number;
          voided_at?: string | null;
        };
        Update: {
          diskon?: number;
          harga_beli?: number;
          harga_final?: number;
          id?: string;
          inventory_id?: string;
          nama_barang?: string;
          pembelian_item_id?: string | null;
          pembelian_return_id?: string;
          qty?: number;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pembelian_return_items_pembelian_item_id_fkey';
            columns: ['pembelian_item_id'];
            isOneToOne: false;
            referencedRelation: 'pembelian_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pembelian_return_items_pembelian_return_id_fkey';
            columns: ['pembelian_return_id'];
            isOneToOne: false;
            referencedRelation: 'pembelian_return';
            referencedColumns: ['id'];
          },
        ];
      };
      penjualan: {
        Row: {
          cash_amount: number | null;
          created_at: string | null;
          created_by: string | null;
          diskon_nominal: number | null;
          diskon_persen: number | null;
          harga_jual: number | null;
          id: string;
          idempotency_key: string | null;
          inventory_id: string | null;
          kembalian: number | null;
          paid_at: string | null;
          payment_method: string | null;
          qris_amount: number | null;
          qty: number | null;
          refunded_at: string | null;
          status: string;
          subtotal_sebelum_diskon: number | null;
          tanggal: string;
          total: number;
          voided_at: string | null;
        };
        Insert: {
          cash_amount?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          diskon_nominal?: number | null;
          diskon_persen?: number | null;
          harga_jual?: number | null;
          id?: string;
          idempotency_key?: string | null;
          inventory_id?: string | null;
          kembalian?: number | null;
          paid_at?: string | null;
          payment_method?: string | null;
          qris_amount?: number | null;
          qty?: number | null;
          refunded_at?: string | null;
          status?: string;
          subtotal_sebelum_diskon?: number | null;
          tanggal: string;
          total?: number;
          voided_at?: string | null;
        };
        Update: {
          cash_amount?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          diskon_nominal?: number | null;
          diskon_persen?: number | null;
          harga_jual?: number | null;
          id?: string;
          idempotency_key?: string | null;
          inventory_id?: string | null;
          kembalian?: number | null;
          paid_at?: string | null;
          payment_method?: string | null;
          qris_amount?: number | null;
          qty?: number | null;
          refunded_at?: string | null;
          status?: string;
          subtotal_sebelum_diskon?: number | null;
          tanggal?: string;
          total?: number;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'penjualan_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penjualan_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
        ];
      };
      penjualan_items: {
        Row: {
          cost_at_sale: number;
          created_at: string;
          diskon: number;
          harga_final: number;
          harga_jual: number;
          id: string;
          inventory_id: string;
          nama_barang: string;
          penjualan_id: string;
          qty: number;
        };
        Insert: {
          cost_at_sale: number;
          created_at?: string;
          diskon?: number;
          harga_final: number;
          harga_jual: number;
          id?: string;
          inventory_id: string;
          nama_barang: string;
          penjualan_id: string;
          qty: number;
        };
        Update: {
          cost_at_sale?: number;
          created_at?: string;
          diskon?: number;
          harga_final?: number;
          harga_jual?: number;
          id?: string;
          inventory_id?: string;
          nama_barang?: string;
          penjualan_id?: string;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'penjualan_items_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penjualan_items_penjualan_id_fkey';
            columns: ['penjualan_id'];
            isOneToOne: false;
            referencedRelation: 'penjualan';
            referencedColumns: ['id'];
          },
        ];
      };
      penjualan_return: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          idempotency_key: string | null;
          note: string | null;
          penjualan_id: string;
          tanggal: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          idempotency_key?: string | null;
          note?: string | null;
          penjualan_id: string;
          tanggal: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          idempotency_key?: string | null;
          note?: string | null;
          penjualan_id?: string;
          tanggal?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'penjualan_return_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penjualan_return_penjualan_id_fkey';
            columns: ['penjualan_id'];
            isOneToOne: false;
            referencedRelation: 'penjualan';
            referencedColumns: ['id'];
          },
        ];
      };
      penjualan_return_items: {
        Row: {
          cost_at_sale: number;
          created_at: string;
          diskon: number;
          harga_final: number;
          harga_jual: number;
          id: string;
          inventory_id: string;
          nama_barang: string;
          penjualan_item_id: string | null;
          penjualan_return_id: string;
          qty: number;
        };
        Insert: {
          cost_at_sale: number;
          created_at?: string;
          diskon?: number;
          harga_final: number;
          harga_jual: number;
          id?: string;
          inventory_id: string;
          nama_barang: string;
          penjualan_item_id?: string | null;
          penjualan_return_id: string;
          qty: number;
        };
        Update: {
          cost_at_sale?: number;
          created_at?: string;
          diskon?: number;
          harga_final?: number;
          harga_jual?: number;
          id?: string;
          inventory_id?: string;
          nama_barang?: string;
          penjualan_item_id?: string | null;
          penjualan_return_id?: string;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'penjualan_return_items_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penjualan_return_items_penjualan_item_id_fkey';
            columns: ['penjualan_item_id'];
            isOneToOne: false;
            referencedRelation: 'penjualan_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penjualan_return_items_penjualan_return_id_fkey';
            columns: ['penjualan_return_id'];
            isOneToOne: false;
            referencedRelation: 'penjualan_return';
            referencedColumns: ['id'];
          },
        ];
      };
      print_jobs: {
        Row: {
          created_at: string | null;
          id: string;
          payload_json: Json;
          printed_at: string | null;
          status: string;
          template_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          payload_json: Json;
          printed_at?: string | null;
          status?: string;
          template_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          payload_json?: Json;
          printed_at?: string | null;
          status?: string;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'print_jobs_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'label_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          last_sign_in_at: string | null;
          nama: string | null;
          role: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          id: string;
          last_sign_in_at?: string | null;
          nama?: string | null;
          role?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          last_sign_in_at?: string | null;
          nama?: string | null;
          role?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      receipt_templates: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          template: Json;
          type: Database['public']['Enums']['receipt_type'];
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          template: Json;
          type: Database['public']['Enums']['receipt_type'];
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          template?: Json;
          type?: Database['public']['Enums']['receipt_type'];
        };
        Relationships: [];
      };
      stock_adjustments: {
        Row: {
          adjustment_qty: number;
          adjustment_type: string;
          created_at: string | null;
          created_by: string;
          id: string;
          inventory_id: string;
          note: string | null;
          reason: string;
          stock_opname_item_id: string | null;
        };
        Insert: {
          adjustment_qty: number;
          adjustment_type: string;
          created_at?: string | null;
          created_by: string;
          id?: string;
          inventory_id: string;
          note?: string | null;
          reason: string;
          stock_opname_item_id?: string | null;
        };
        Update: {
          adjustment_qty?: number;
          adjustment_type?: string;
          created_at?: string | null;
          created_by?: string;
          id?: string;
          inventory_id?: string;
          note?: string | null;
          reason?: string;
          stock_opname_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_adjustments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_adjustments_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_adjustments_stock_opname_item_id_fkey';
            columns: ['stock_opname_item_id'];
            isOneToOne: false;
            referencedRelation: 'stock_opname_items';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_movements: {
        Row: {
          created_at: string | null;
          id: string;
          inventory_id: string;
          qty: number | null;
          referensi: string | null;
          tipe: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          inventory_id: string;
          qty?: number | null;
          referensi?: string | null;
          tipe: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          inventory_id?: string;
          qty?: number | null;
          referensi?: string | null;
          tipe?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_movements_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_opname: {
        Row: {
          approved_by: string | null;
          created_at: string | null;
          created_by: string;
          id: string;
          note: string | null;
          opname_date: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          approved_by?: string | null;
          created_at?: string | null;
          created_by: string;
          id?: string;
          note?: string | null;
          opname_date: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          approved_by?: string | null;
          created_at?: string | null;
          created_by?: string;
          id?: string;
          note?: string | null;
          opname_date?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_opname_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_opname_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_opname_items: {
        Row: {
          adjusted: boolean | null;
          created_at: string | null;
          difference: number;
          id: string;
          inventory_id: string;
          note: string | null;
          physical_stock: number;
          reason: string | null;
          stock_opname_id: string;
          system_stock: number;
          updated_at: string | null;
        };
        Insert: {
          adjusted?: boolean | null;
          created_at?: string | null;
          difference: number;
          id?: string;
          inventory_id: string;
          note?: string | null;
          physical_stock: number;
          reason?: string | null;
          stock_opname_id: string;
          system_stock: number;
          updated_at?: string | null;
        };
        Update: {
          adjusted?: boolean | null;
          created_at?: string | null;
          difference?: number;
          id?: string;
          inventory_id?: string;
          note?: string | null;
          physical_stock?: number;
          reason?: string | null;
          stock_opname_id?: string;
          system_stock?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_opname_items_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_opname_items_stock_opname_id_fkey';
            columns: ['stock_opname_id'];
            isOneToOne: false;
            referencedRelation: 'stock_opname';
            referencedColumns: ['id'];
          },
        ];
      };
      supplier: {
        Row: {
          alamat: string | null;
          created_at: string | null;
          id: string;
          kontak: string | null;
          nama: string;
        };
        Insert: {
          alamat?: string | null;
          created_at?: string | null;
          id?: string;
          kontak?: string | null;
          nama: string;
        };
        Update: {
          alamat?: string | null;
          created_at?: string | null;
          id?: string;
          kontak?: string | null;
          nama?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_kas_log: {
        Args: {
          p_catatan: string;
          p_created_by: string;
          p_jumlah: number;
          p_tipe: string;
        };
        Returns: string;
      };
      add_penjualan_items: {
        Args: { p_items: Json; p_penjualan_id: string };
        Returns: undefined;
      };
      create_penjualan: { Args: { p_user: string }; Returns: string };
      create_penjualan_return: {
        Args: {
          p_created_by: string;
          p_items: Json;
          p_note: string;
          p_penjualan_id: string;
          p_tanggal: string;
        };
        Returns: string;
      };
      finalize_penjualan: { Args: { p_penjualan_id: string }; Returns: string };
      get_available_return_items: {
        Args: { p_supplier_id: string };
        Returns: {
          diskon: number;
          harga_beli: number;
          inventory_id: string;
          nama_barang: string;
          nomor_nota: string;
          pembelian_id: string;
          pembelian_item_id: string;
          qty_original: number;
          qty_remaining: number;
          qty_returned: number;
          tanggal_pembelian: string;
        }[];
      };
      get_dashboard_stats: {
        Args: never;
        Returns: {
          low_stock_items: number;
          total_inventory_value: number;
          total_items: number;
        }[];
      };
      get_inventory_paginated: {
        Args: {
          p_category_id?: string;
          p_limit?: number;
          p_low_stock_only?: boolean;
          p_offset?: number;
          p_search?: string;
        };
        Returns: {
          created_at: string | null;
          created_by: string | null;
          discontinued_at: string | null;
          discontinued_by: string | null;
          diskon: number | null;
          harga_beli_terakhir: number | null;
          harga_jual: number;
          id: string;
          id_kategori: string | null;
          is_discontinued: boolean | null;
          kode_barcode: string;
          minimum_stock: number | null;
          nama_barang: string;
          slug: string | null;
          stok: number | null;
          unit: string | null;
          updated_at: string | null;
          updated_by: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'inventory';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_low_stock_items: {
        Args: { p_search?: string };
        Returns: {
          created_at: string | null;
          created_by: string | null;
          discontinued_at: string | null;
          discontinued_by: string | null;
          diskon: number | null;
          harga_beli_terakhir: number | null;
          harga_jual: number;
          id: string;
          id_kategori: string | null;
          is_discontinued: boolean | null;
          kode_barcode: string;
          minimum_stock: number | null;
          nama_barang: string;
          slug: string | null;
          stok: number | null;
          unit: string | null;
          updated_at: string | null;
          updated_by: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'inventory';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      is_admin: { Args: never; Returns: boolean };
      pay_penjualan: {
        Args: {
          p_cash_amount: number;
          p_catatan: string;
          p_created_by: string;
          p_diskon_nominal: number;
          p_diskon_persen: number;
          p_kembalian: number;
          p_payment_method: string;
          p_penjualan_id: string;
          p_qris_amount: number;
        };
        Returns: string;
      };
      pay_transaction:
        | {
            Args: {
              p_cash_amount?: number;
              p_catatan?: string;
              p_created_by?: string;
              p_diskon_nominal?: number;
              p_diskon_persen?: number;
              p_idempotency_key: string;
              p_items: Json;
              p_payment_method: string;
              p_qris_amount?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_cash_amount?: number;
              p_catatan?: string;
              p_created_at?: string;
              p_created_by?: string;
              p_diskon_nominal?: number;
              p_diskon_persen?: number;
              p_idempotency_key: string;
              p_items: Json;
              p_payment_method: string;
              p_qris_amount?: number;
            };
            Returns: string;
          };
      pembelian_return_create: {
        Args: {
          p_created_by: string;
          p_idempotency_key: string;
          p_items: Json;
          p_note: string;
          p_pembelian_id: string;
          p_tanggal: string;
        };
        Returns: Json;
      };
      penjualan_return_create: {
        Args: {
          p_created_by: string;
          p_idempotency_key: string;
          p_items: Json;
          p_note: string;
          p_penjualan_id: string;
          p_tanggal: string;
        };
        Returns: Json;
      };
      proses_return_batch:
        | {
            Args: {
              p_created_by?: string;
              p_idempotency_key?: string;
              p_items: Json;
              p_note?: string;
              p_supplier_id: string;
              p_supplier_nama: string;
              p_tanggal?: string;
            };
            Returns: {
              return_id: string;
            }[];
          }
        | {
            Args: {
              p_created_by?: string;
              p_idempotency_key?: string;
              p_items: Json[];
              p_note?: string;
              p_supplier_id: string;
              p_supplier_nama: string;
              p_tanggal?: string;
            };
            Returns: {
              return_id: string;
            }[];
          };
      resolve_username: { Args: { p_username: string }; Returns: string };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      tambah_pembelian:
        | {
            Args: {
              p_barcode: string;
              p_harga: number;
              p_nama_barang: string;
              p_qty: number;
              p_supplier_id: string;
              p_tanggal: string;
              p_user: string;
            };
            Returns: undefined;
          }
        | {
            Args: {
              p_harga: number;
              p_nama_barang: string;
              p_qty: number;
              p_supplier_id: string;
              p_tanggal: string;
              p_user: string;
            };
            Returns: string;
          };
      tambah_pembelian_batch: {
        Args: {
          p_idempotency_key?: string;
          p_items: Json;
          p_supplier_id: string;
          p_tanggal: string;
          p_user: string;
        };
        Returns: string;
      };
      tambah_penjualan: {
        Args: {
          p_harga: number;
          p_inventory_id: string;
          p_qty: number;
          p_tanggal: string;
          p_user: string;
        };
        Returns: undefined;
      };
      void_pembelian_return_item: {
        Args: {
          p_created_by?: string;
          p_note?: string;
          p_pembelian_return_item_id: string;
        };
        Returns: {
          void_return_item_id: string;
        }[];
      };
    };
    Enums: {
      receipt_type: 'SALE' | 'RETURN';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      receipt_type: ['SALE', 'RETURN'],
    },
  },
} as const;
