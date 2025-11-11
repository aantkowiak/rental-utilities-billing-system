-- =====================================================================
-- Migration: Add function to list profiles with emails
-- =====================================================================
-- Purpose: Provide admin-only function to list all profiles with their
--          email addresses from auth.users
-- =====================================================================

-- Function to list all users with their profiles (admin only)
-- Note: Authorization is checked at the API endpoint level
create or replace function list_profiles_with_emails()
returns table (
  user_id uuid,
  role text,
  property_id uuid,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz,
  email text
)
language sql
security definer
set search_path = public
as $$
  -- Return all users from auth.users with their profiles (if they exist)
  select
    au.id as user_id,
    coalesce(p.role, 'tenant') as role,
    p.property_id,
    p.display_name,
    coalesce(p.created_at, au.created_at) as created_at,
    coalesce(p.updated_at, au.updated_at) as updated_at,
    coalesce(au.email, '')::text as email
  from auth.users au
  left join profiles p on p.user_id = au.id
  order by au.created_at desc;
$$;

comment on function list_profiles_with_emails() is 
  'Admin-only function to list all profiles with their email addresses';

