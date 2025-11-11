-- =====================================================================
-- Migration: Add function to list profiles with emails
-- =====================================================================
-- Purpose: Provide admin-only function to list all profiles with their
--          email addresses from auth.users
-- =====================================================================

-- Function to list profiles with emails (admin only)
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
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if caller is admin
  if not exists (
    select 1 from profiles
    where profiles.user_id = auth.uid()
    and profiles.role = 'admin'
  ) then
    raise exception 'Permission denied: admin role required';
  end if;

  -- Return profiles with emails
  return query
  select
    p.user_id,
    p.role,
    p.property_id,
    p.display_name,
    p.created_at,
    p.updated_at,
    au.email::text as email
  from profiles p
  inner join auth.users au on au.id = p.user_id
  order by p.created_at desc;
end;
$$;

comment on function list_profiles_with_emails() is 
  'Admin-only function to list all profiles with their email addresses';

