export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type WorkspaceRow = {
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
};

type CategoryRow = {
  id: string;
  workspace_id: string;
  name: string;
  account_code: string | null;
  is_default: boolean | null;
  created_at: string;
};

type VendorRuleRow = {
  id: string;
  workspace_id: string;
  vendor_match: string;
  category_id: string;
  created_at: string;
};

type DocumentRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  file_url: string;
  extracted_data: Record<string, unknown> | null;
  validated_data: Record<string, unknown> | null;
  category_id: string | null;
  status: "pending" | "validated" | "rejected";
  source: "upload" | "photo" | "email" | "whatsapp";
  exported_at: string | null;
  created_at: string;
};

type WorkspaceInviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  token: string;
  invited_by: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  invited_by: string | null;
  role: string;
  joined_at: string;
};

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: WorkspaceRow;
        Insert: Partial<WorkspaceRow> & { owner_id: string; name: string };
        Update: Partial<WorkspaceRow>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Partial<CategoryRow> & { workspace_id: string; name: string };
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      vendor_rules: {
        Row: VendorRuleRow;
        Insert: Partial<VendorRuleRow> & { workspace_id: string; vendor_match: string; category_id: string };
        Update: Partial<VendorRuleRow>;
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: Partial<DocumentRow> & { workspace_id: string; user_id: string; file_url: string };
        Update: Partial<DocumentRow>;
        Relationships: [];
      };
      workspace_invites: {
        Row: WorkspaceInviteRow;
        Insert: Partial<WorkspaceInviteRow> & { workspace_id: string; email: string; invited_by: string };
        Update: Partial<WorkspaceInviteRow>;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMemberRow;
        Insert: Partial<WorkspaceMemberRow> & { workspace_id: string; user_id: string };
        Update: Partial<WorkspaceMemberRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
