export interface LoyaltySettings {
  id: string;
  monthly_budget_cap: number;
  max_active_vouchers_per_member: number;
  is_redemption_locked: boolean;
  point_to_idr_ratio: number;
  double_points_active?: boolean;
  double_points_days?: number[];
  double_points_multiplier?: number;
  updated_at?: string;
}

export interface MemberTierBenefitResult {
  success: boolean;
  message?: string;
  member_id?: string;
  member_name?: string;
  current_points?: number;
  tier_name?: string;
  discount_percentage?: number;
  min_purchase_amount?: number;
  is_discount_applied?: boolean;
  discount_amount?: number;
  shortfall_to_discount?: number;
  is_double_day?: boolean;
  base_multiplier?: number;
  effective_multiplier?: number;
  points_earned?: number;
}

export interface PointReward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  reward_type: 'voucher_discount' | 'product';
  discount_nominal: number;
  min_purchase_amount: number;
  max_claims_per_member: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  valid_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface MemberVoucher {
  id: string;
  id_member: string;
  id_reward?: string | null;
  voucher_code: string;
  title: string;
  discount_nominal: number;
  min_purchase_amount: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  used_at?: string | null;
  members?: {
    name: string;
    whatsapp_number: string;
  } | null;
  point_rewards?: {
    title: string;
    image_url?: string | null;
  } | null;
}

export interface LoyaltyBudgetMetrics {
  monthlyBudgetCap: number;
  committedBudget: number;
  realizedBudget: number;
  remainingBudget: number;
  usagePercentage: number;
  isLocked: boolean;
  activeVouchersCount: number;
  usedVouchersCount: number;
  totalMembersCount: number;
  activeFcmDevicesCount: number;
  totalPointsInCirculation: number;
  totalPointsRedeemed: number;
}
