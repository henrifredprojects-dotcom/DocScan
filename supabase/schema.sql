create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  name text not null,
  logo_url text,
  currency text default 'PHP',
  color text default '#1A56DB',
  sheets_id text,
  sheets_tab text,
  sheets_template text,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) not null,
  name text not null,
  account_code text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists vendor_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) not null,
  vendor_match text not null,
  category_id uuid references categories(id) not null,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) not null,
  user_id uuid references auth.users(id) not null,
  file_url text not null,
  extracted_data jsonb,
  validated_data jsonb,
  category_id uuid references categories(id),
  status text check (status in ('pending', 'validated', 'rejected')) not null default 'pending',
  source text check (source in ('upload', 'photo', 'email', 'whatsapp')) not null default 'upload',
  exported_at timestamptz,
  created_at timestamptz default now()
);

alter table workspaces enable row level security;
alter table categories enable row level security;
alter table vendor_rules enable row level security;
alter table documents enable row level security;

drop policy if exists workspace_owner_access on workspaces;
create policy workspace_owner_access on workspaces
for all using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists categories_workspace_isolation on categories;
create policy categories_workspace_isolation on categories
for all using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
)
with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

drop policy if exists vendor_rules_workspace_isolation on vendor_rules;
create policy vendor_rules_workspace_isolation on vendor_rules
for all using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
)
with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

drop policy if exists documents_workspace_isolation on documents;
create policy documents_workspace_isolation on documents
for all using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
)
with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

create index if not exists idx_workspaces_owner on workspaces(owner_id);
create index if not exists idx_documents_workspace_created on documents(workspace_id, created_at desc);
create index if not exists idx_documents_workspace_status on documents(workspace_id, status);
create index if not exists idx_documents_workspace_exported on documents(workspace_id, exported_at desc) where exported_at is not null;
create index if not exists idx_documents_workspace_status_created on documents(workspace_id, status, created_at desc);
create index if not exists idx_categories_workspace on categories(workspace_id);
create index if not exists idx_vendor_rules_workspace on vendor_rules(workspace_id);
