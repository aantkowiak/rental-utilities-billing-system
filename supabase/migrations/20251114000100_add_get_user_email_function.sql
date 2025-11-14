-- =====================================================================
-- Migration: Add Function to Get User Email
-- =====================================================================
-- Purpose: Create a function to safely retrieve user email from auth.users
--          This is needed because auth schema tables cannot be queried directly
--          through Supabase JS client
-- =====================================================================

-- Function to get user email by user_id
create or replace function get_user_email(user_uuid uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from auth.users
  where id = user_uuid;
$$;

comment on function get_user_email is 'Returns email for given user ID from auth.users table';

-- Grant execute permission to authenticated users
grant execute on function get_user_email(uuid) to authenticated;

