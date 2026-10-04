export type PosAuthStatus = 'pending' | 'used' | 'expired' | 'rejected';

export type PosActionType =
  | 'access_settings'
  | 'void_transaction'
  | 'manual_discount'
  | 'price_override'
  | 'return_approval'
  | string;

export interface PosAuthorization {
  id: string;
  cashier_id: string;
  cashier_name: string;
  gudang_id: string | null;
  gudang_name: string | null;
  device_name: string | null;
  action_type: PosActionType;
  action_metadata: Record<string, any> | null;
  pin_code: string;
  status: PosAuthStatus;
  attempt_count: number;
  max_attempts: number;
  claimed_by_id: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
  rejected_by_id: string | null;
  rejected_by_name: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PosAuthFilter {
  status?: PosAuthStatus | 'all';
  action_type?: string | 'all';
  search?: string;
  page?: number;
  limit?: number;
}
