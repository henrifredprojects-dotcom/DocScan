export type DocumentStatus = "pending" | "validated" | "rejected";
export type DocumentSource = "upload" | "photo" | "email" | "whatsapp";

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  currency: string | null;
  color: string | null;
  sheets_id: string | null;
  sheets_tab: string | null;
  sheets_template: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  workspace_id: string;
  user_id: string;
  file_url: string;
  extracted_data: Record<string, unknown> | null;
  validated_data: Record<string, unknown> | null;
  category_id: string | null;
  status: DocumentStatus;
  source: DocumentSource;
  exported_at: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  account_code: string | null;
  is_default: boolean;
  created_at: string;
}

export interface VendorRule {
  id: string;
  workspace_id: string;
  vendor_match: string;
  category_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  invited_by: string | null;
  role: "member" | "admin";
  joined_at: string;
  user_email?: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  token: string;
  invited_by: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface NormalizedExtraction {
  date: string;
  vendor: string;
  total_amount: number;
  currency: string;
  vat_amount: number | null;
  net_amount: number | null;
  payment_method: string | null;
  document_type: string;
  reference_number: string | null;
  due_date: string | null;        // Payment due date — invoices
  period: string | null;          // Billing period — utilities, rent, subscriptions
  suggested_category: string | null;
  confidence: number;
  required_fields_complete: boolean;
}
