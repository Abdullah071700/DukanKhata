export type Role = 'owner' | 'admin' | 'staff';

export interface Shop {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Supplier {
  id: string;
  legacy_id?: string | null;
  shop_id: string;
  name: string;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  legacy_id?: string | null;
  shop_id: string;
  supplier_id: string;
  bill_date: string; // YYYY-MM-DD
  amount: number;
  salesman_name: string;
  status: 'pending' | 'paid';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  shop_id: string;
  bill_id: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
}

export interface Salesman {
  id: string;
  shop_id: string;
  name: string;
  last_used_at: string;
}

export interface BackupSummary {
  supplier_count: number;
  bill_count: number;
  payment_count: number;
  total_billed: number;
  total_paid: number;
  total_pending: number;
}

export interface ShopBackup {
  id: string;
  shop_id: string;
  created_by: string;
  file_name: string;
  summary: BackupSummary;
  checksum: string;
  version: string;
  created_at: string;
}

export interface BackupPayload {
  app: string;
  version: string;
  exported_at: string;
  shop_id: string;
  shop_name: string;
  summary: BackupSummary;
  suppliers: Supplier[];
  bills: Bill[];
  payments: Payment[];
  salesmen: Salesman[];
}

export interface BillWithDetails extends Bill {
  supplier?: Supplier;
  payments: Payment[];
  paid_total: number;
  remaining_balance: number;
}
