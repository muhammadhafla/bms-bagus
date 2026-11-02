export interface WaQueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  delivered?: number;
  cancelled?: number;
}

export interface WaBridgeStatus {
  id: string;
  id_gudang: string | null;
  connected: boolean;
  phone: string | null;
  name: string | null;
  qr_base64: string | null;
  qr_expires_at: string | null;
  is_session_corrupted: boolean;
  queue_stats: WaQueueStats;
  updated_at: string;
}

export interface WaOutboxItem {
  id: string;
  reference_id: string | null;
  phone: string;
  message: string | null;
  type: 'text' | 'receipt' | 'system_command';
  source: 'pos_cashier' | 'bms_web' | 'crm_broadcast';
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  error_message: string | null;
  id_gudang: string | null;
  gudang?: {
    id: string;
    kode_gudang: string;
    nama: string;
  } | null;
  created_at: string;
  read_at?: string | null;
}

export interface WaSettings {
  id: string;
  wa_receipt_promo_footer: string;
  enable_inactivity_reminder: boolean;
  inactivity_reminder_interval_days: number;
  inactivity_reminder_phone: string | null;
  last_phone_active_date: string;
  updated_at: string;
}

export interface WaOutboxFilter {
  gudangId?: string | 'all';
  status?: string | 'all';
  search?: string;
  page?: number;
  limit?: number;
}
