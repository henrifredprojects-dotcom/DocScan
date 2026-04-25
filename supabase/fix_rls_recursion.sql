-- Fix RLS infinite recursion on workspaces table
-- Cause: workspaces policy queried workspace_members, which queried workspaces → cycle
-- Fix: SECURITY DEFINER function bypasses RLS internally, breaking the cycle

-- Step 1: function that returns all workspace IDs accessible to the current user
-- SECURITY DEFINER means it runs without RLS, avoiding the recursive trigger
create or replace function public.get_user_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from workspaces where owner_id = auth.uid()
  union
  select workspace_id from workspace_members where user_id = auth.uid()
$$;

-- Step 2: drop the conflicting workspace policies
drop policy if exists workspace_owner_access on workspaces;
drop policy if exists "Members read own workspaces" on workspaces;

-- Step 3: recreate clean workspace policies using the SECURITY DEFINER function
-- SELECT: owner or member can read
create policy "workspaces_select"
  on workspaces for select
  using (id in (select get_user_workspace_ids()));

-- INSERT: only the owner can create (they set themselves as owner)
create policy "workspaces_insert"
  on workspaces for insert
  with check (owner_id = auth.uid());

-- UPDATE: only owner
create policy "workspaces_update"
  on workspaces for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- DELETE: only owner
create policy "workspaces_delete"
  on workspaces for delete
  using (owner_id = auth.uid());
