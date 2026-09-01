export interface RoleCapability {
  id: string;
  module: string;
  feature: string;
  admin: boolean | string;
  kepala_gudang: boolean | string;
  staff_gudang: boolean | string;
  kasir: boolean | string;
  finance: boolean | string;
  description: string;
}

export interface RoleInfo {
  id: 'admin' | 'kepala_gudang' | 'staff_gudang' | 'kasir' | 'finance';
  title: string;
  badgeVariant: 'danger' | 'warning' | 'info' | 'success' | 'default';
  color: string;
  summary: string;
  responsibilities: string[];
  restricted: string[];
  keyModules: string[];
}

export interface SopStep {
  stepNumber: number;
  title: string;
  description: string;
  actor: string;
  routeLink?: string;
  routeLabel?: string;
  tips?: string;
}

export interface SopGuide {
  id: string;
  title: string;
  category: 'gudang' | 'kasir' | 'finance' | 'pengaturan';
  summary: string;
  steps: SopStep[];
  involvedRoles: string[];
  badgeColor?: string;
}

export interface ShortcutKey {
  key: string;
  description: string;
  action: string;
  context: string;
}

export interface ShortcutCategory {
  category: string;
  description: string;
  items: ShortcutKey[];
}

export interface FaqItem {
  id: string;
  category: 'role' | 'gudang' | 'kasir' | 'finance' | 'teknis';
  question: string;
  answer: string;
}

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: 'gudang' | 'kasir' | 'finance' | 'umum' | 'pengaturan' | string;
  content_md: string;
  storage_path?: string | null;
  icon_name?: string;
  order_index?: number;
  is_published?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type HelpTopicId =
  | 'roles-overview'
  | 'capability-matrix'
  | 'sop-transfers'
  | 'sop-waste'
  | 'sop-opname'
  | 'sop-binding'
  | 'sop-pos'
  | 'sop-return'
  | 'sop-cashflow'
  | 'sop-payroll'
  | 'shortcuts'
  | 'hardware'
  | 'faq'
  | string; // Dynamic markdown article slug
