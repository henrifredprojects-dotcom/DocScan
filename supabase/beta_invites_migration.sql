-- Beta invites allowlist
-- Only emails present in this table are allowed to access the app.
-- Admins (defined by ADMIN_EMAILS env var on the server) bypass this check.

create table if not exists beta_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  note text
);

-- Case-insensitive uniqueness
create unique index if not exists beta_invites_email_lower_idx on beta_invites (lower(email));

alter table beta_invites enable row level security;

-- Authenticated users can read only their own invite row (used by the layout check)
drop policy if exists beta_invites_self_read on beta_invites;
create policy beta_invites_self_read on beta_invites
  for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Authenticated users can mark their own invite as accepted (one-way)
drop policy if exists beta_invites_self_accept on beta_invites;
create policy beta_invites_self_accept on beta_invites
  for update
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Insert/delete go through the admin route which uses the service role,
-- so no RLS policy is needed for those.

-- Bootstrap: Henri's email so he never locks himself out
insert into beta_invites (email, note)
values ('henri.peignon@gmail.com', 'owner — auto-seeded')
on conflict do nothing;
