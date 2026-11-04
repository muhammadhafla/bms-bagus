/**
 * POS Contract Specification (Single Source of Truth)
 * ----------------------------------------------------
 * Dokumen kontrak tipe data bersama antara BMS Web App (inventory)
 * dan Native POS Client (C# .NET WPF/Avalonia & Flutter Dart).
 *
 * Paritas 1:1 dengan:
 * - BMSPOS.Core/Models/TransactionPayload.cs
 * - BMSPOS.Core/Models/ReturnPayload.cs
 * - BMSPOS.Core/Models/ShiftPayload.cs
 * - android-pos/lib/models/transaction_payload.dart
 */

export type PosPaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT';

export interface PosTransactionItemPayload {
  inventory_id: string;
  qty: number;
  harga_jual: number;
  harga_beli?: number;
  subtotal: number;
  diskon_item?: number;
  catatan?: string;
}

export interface PosTransactionPayload {
  idempotency_key: string;
  nomor_struk?: string | null;
  gudang_id?: string | null;
  shift_id?: string | null;
  items: PosTransactionItemPayload[];
  payment_method: PosPaymentMethod;
  cash_amount: number;
  qris_amount: number;
  diskon_nominal: number;
  diskon_persen: number;
  subtotal_sebelum_diskon: number;
  total: number;
  kembalian: number;
  member_id?: string | null;
  points_earned: number;
  points_redeemed: number;
  discount_member_amount: number;
  receipt_sent_via_wa?: boolean;
  created_by: string;
  created_at?: string;
}

export interface PosReturnItemPayload {
  penjualan_item_id: string;
  inventory_id: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  kondisi: 'baik' | 'rusak';
  alasan?: string;
}

export interface PosReturnPayload {
  idempotency_key: string;
  p_penjualan_id: string;
  p_gudang_id?: string | null;
  p_shift_id?: string | null;
  p_tanggal: string;
  p_note: string;
  p_created_by: string;
  p_items: PosReturnItemPayload[];
  total_refund: number;
}

export type PosAuthActionType =
  | 'void_transaction'
  | 'manual_discount'
  | 'price_override'
  | 'access_settings'
  | 'return_approval';

export type PosAuthStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface PosAuthorizationRequest {
  id: string;
  action_type: PosAuthActionType;
  status: PosAuthStatus;
  cashier_id: string;
  cashier_name?: string;
  gudang_id?: string | null;
  device_name?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  approved_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ShiftSessionContract {
  id: string;
  kasir_id?: string | null;
  kasir_name?: string | null;
  gudang_id?: string | null;
  gudang_name?: string | null;
  start_time: string;
  end_time?: string | null;
  opening_cash: number;
  closing_cash?: number | null;
  status: 'OPEN' | 'CLOSED';
}
