-- Run this in Supabase SQL Editor → New query

-- 1. Pending invitations
create table if not exists workspace_invites (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email       text not null,
  token       uuid not null unique default gen_random_uuid(),
  invited_by  uuid not null references auth.users(id),
  role        text not null default 'member',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);

alter table workspace_invites enable row level security;

-- Owner can read and create invites for their workspaces
create policy "Owner manages invites"
  on workspace_invites for all
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

-- 2. Accepted members
create table if not exists workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  invited_by   uuid references auth.users(id),
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  unique(workspace_id, user_id)
);

alter table workspace_members enable row level security;

-- Owner can manage members of their workspaces
create policy "Owner manages members"
  on workspace_members for all
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

-- Members can see their own memberships
create policy "Members see own memberships"
  on workspace_members for select
  using (user_id = auth.uid());

-- 3. Allow members to read workspace documents
create policy "Members read workspace documents"
  on documents for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- 4. Allow members to read workspace categories
create policy "Members read categories"
  on categories for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- 5. Allow members to insert documents (upload)
create policy "Members insert documents"
  on documents for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- 6. Allow members to update documents (review, validate, save draft)
create policy "Members update documents"
  on documents for update
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- 7. Allow members to read vendor rules (for OCR auto-categorization)
create policy "Members read vendor rules"
  on vendor_rules for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- 8. Allow members to read workspaces they belong to (needed by API routes)
create policy "Members read own workspaces"
  on workspaces for select
  using (
    id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- 9. Allow members to insert/update/delete categories
create policy "Members insert categories"
  on categories for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Members update categories"
  on categories for update
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Members delete categories"
  on categories for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- 10. Allow members to insert/update/delete vendor rules
create policy "Members insert vendor rules"
  on vendor_rules for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Members update vendor rules"
  on vendor_rules for update
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Members delete vendor rules"
  on vendor_rules for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
