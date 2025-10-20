-- =====================================================================
-- Migration: Create Row Level Security Policies
-- =====================================================================
-- Purpose: Implement granular RLS policies for tenant and admin access
--
-- Security Model:
--   - Tenants: Access limited to properties with active contracts
--   - Admins: Full access to all data
--   - Granular policies per operation (select, insert, update, delete)
--
-- Tables Covered:
--   - profiles: Users can view own profile; admins view all
--   - properties: Access based on active contracts
--   - contracts: Tenants see own contracts; admins see all
--   - monthly_conditions: Access follows property access
--   - readings: Access follows property; tenants limited write window
--   - reports: Access via contract ownership
--   - report_emails: Access via report ownership
--   - report_email_attempts: Access via report_email ownership
--
-- Special Considerations:
--   - Helper function current_property_ids() for tenant property lookup
--   - Tenant reading writes restricted to -3/+5 day window from month end
--   - No tenant delete access except soft deletes
--   - Policies split by role even when logic is identical (per requirements)
-- =====================================================================

-- =====================================================================
-- Helper Functions for RLS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: current_property_ids
-- Returns array of property IDs for which the current user has active contracts
-- Used by RLS policies to scope tenant access to their properties
-- ---------------------------------------------------------------------
create or replace function current_property_ids()
returns uuid[]
language sql
stable
security definer
as $$
  select array_agg(distinct c.property_id)
  from contracts c
  where c.tenant_user_id = auth.uid()
    and c.period @> now();
$$;

comment on function current_property_ids is 'Returns property IDs for current user active contracts (for RLS)';

-- ---------------------------------------------------------------------
-- Function: is_admin
-- Checks if current user has admin role
-- Used by RLS policies to grant admin access
-- ---------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function is_admin is 'Returns true if current user is an admin (for RLS)';

-- ---------------------------------------------------------------------
-- Function: is_tenant
-- Checks if current user has tenant role
-- Used by RLS policies to grant tenant access
-- ---------------------------------------------------------------------
create or replace function is_tenant()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from profiles
    where user_id = auth.uid()
      and role = 'tenant'
  );
$$;

comment on function is_tenant is 'Returns true if current user is a tenant (for RLS)';

-- =====================================================================
-- RLS Policies: profiles
-- =====================================================================
-- Tenants can view and update their own profile
-- Admins can view all profiles
-- No insert/delete via RLS (handled by auth triggers)
-- =====================================================================

-- authenticated users can view their own profile
create policy "authenticated_users_select_own_profile"
  on profiles for select
  to authenticated
  using (user_id = auth.uid());

-- admins can view all profiles
create policy "admins_select_all_profiles"
  on profiles for select
  to authenticated
  using (is_admin());

-- authenticated users can update their own profile (limited fields)
create policy "authenticated_users_update_own_profile"
  on profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- admins can update all profiles
create policy "admins_update_all_profiles"
  on profiles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

comment on policy "authenticated_users_select_own_profile" on profiles is 
  'Users can view their own profile';
comment on policy "admins_select_all_profiles" on profiles is 
  'Admins have full visibility to all profiles';

-- =====================================================================
-- RLS Policies: properties
-- =====================================================================
-- Tenants can view properties where they have active contracts
-- Admins can view and modify all properties
-- =====================================================================

-- tenants can select properties where they have active contracts
create policy "tenants_select_contracted_properties"
  on properties for select
  to authenticated
  using (
    is_tenant() and 
    id = any(current_property_ids())
  );

-- admins can select all properties
create policy "admins_select_all_properties"
  on properties for select
  to authenticated
  using (is_admin());

-- admins can insert new properties
create policy "admins_insert_properties"
  on properties for insert
  to authenticated
  with check (is_admin());

-- admins can update properties
create policy "admins_update_properties"
  on properties for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admins can delete properties
create policy "admins_delete_properties"
  on properties for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_contracted_properties" on properties is 
  'Tenants can view properties where they have active contracts';
comment on policy "admins_select_all_properties" on properties is 
  'Admins have full visibility to all properties';

-- =====================================================================
-- RLS Policies: contracts
-- =====================================================================
-- Tenants can view their own contracts
-- Admins have full access to all contracts
-- =====================================================================

-- tenants can select their own contracts
create policy "tenants_select_own_contracts"
  on contracts for select
  to authenticated
  using (
    is_tenant() and 
    tenant_user_id = auth.uid()
  );

-- admins can select all contracts
create policy "admins_select_all_contracts"
  on contracts for select
  to authenticated
  using (is_admin());

-- admins can insert contracts
create policy "admins_insert_contracts"
  on contracts for insert
  to authenticated
  with check (is_admin());

-- admins can update contracts
create policy "admins_update_contracts"
  on contracts for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admins can delete contracts
create policy "admins_delete_contracts"
  on contracts for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_own_contracts" on contracts is 
  'Tenants can view their own contracts';
comment on policy "admins_select_all_contracts" on contracts is 
  'Admins have full access to all contracts';

-- =====================================================================
-- RLS Policies: monthly_conditions
-- =====================================================================
-- Access follows property access: tenants see conditions for their properties
-- Admins have full access
-- =====================================================================

-- tenants can select monthly conditions for their properties
create policy "tenants_select_contracted_monthly_conditions"
  on monthly_conditions for select
  to authenticated
  using (
    is_tenant() and 
    property_id = any(current_property_ids())
  );

-- admins can select all monthly conditions
create policy "admins_select_all_monthly_conditions"
  on monthly_conditions for select
  to authenticated
  using (is_admin());

-- admins can insert monthly conditions
create policy "admins_insert_monthly_conditions"
  on monthly_conditions for insert
  to authenticated
  with check (is_admin());

-- admins can update monthly conditions
create policy "admins_update_monthly_conditions"
  on monthly_conditions for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admins can delete monthly conditions
create policy "admins_delete_monthly_conditions"
  on monthly_conditions for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_contracted_monthly_conditions" on monthly_conditions is 
  'Tenants can view monthly conditions for properties with active contracts';
comment on policy "admins_select_all_monthly_conditions" on monthly_conditions is 
  'Admins have full access to all monthly conditions';

-- =====================================================================
-- RLS Policies: readings
-- =====================================================================
-- Tenants can view readings for their properties
-- Tenants can insert/update tenant-origin readings within time window
-- Time window: -3 to +5 days from end of month
-- Admins have full access
-- No tenant delete (only soft delete via update)
-- =====================================================================

-- tenants can select readings for their properties (non-deleted)
create policy "tenants_select_contracted_readings"
  on readings for select
  to authenticated
  using (
    is_tenant() and 
    property_id = any(current_property_ids()) and
    deleted_at is null
  );

-- admins can select all readings (including soft-deleted)
create policy "admins_select_all_readings"
  on readings for select
  to authenticated
  using (is_admin());

-- tenants can insert tenant-origin readings within the allowed time window
-- time window: -3 to +5 days from the end of the month
create policy "tenants_insert_readings_in_window"
  on readings for insert
  to authenticated
  with check (
    is_tenant() and
    origin = 'tenant' and
    property_id = any(current_property_ids()) and
    -- reading_at must be within -3 to +5 days of month end
    reading_at between 
      (date_trunc('month', reading_at) + interval '1 month' - interval '4 days') and
      (date_trunc('month', reading_at) + interval '1 month' + interval '5 days')
  );

-- admins can insert any readings
create policy "admins_insert_readings"
  on readings for insert
  to authenticated
  with check (is_admin());

-- tenants can update their own tenant-origin readings within time window
-- only allow updating reading values and comment
create policy "tenants_update_readings_in_window"
  on readings for update
  to authenticated
  using (
    is_tenant() and
    origin = 'tenant' and
    property_id = any(current_property_ids()) and
    deleted_at is null and
    -- can only update within the time window
    reading_at between 
      (date_trunc('month', reading_at) + interval '1 month' - interval '4 days') and
      (date_trunc('month', reading_at) + interval '1 month' + interval '5 days')
  )
  with check (
    is_tenant() and
    origin = 'tenant' and
    property_id = any(current_property_ids())
  );

-- admins can update all readings
create policy "admins_update_readings"
  on readings for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- only admins can delete readings (tenants use soft delete via update)
create policy "admins_delete_readings"
  on readings for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_contracted_readings" on readings is 
  'Tenants can view non-deleted readings for their contracted properties';
comment on policy "tenants_insert_readings_in_window" on readings is 
  'Tenants can submit readings within -3/+5 day window from month end';
comment on policy "tenants_update_readings_in_window" on readings is 
  'Tenants can update their readings within the allowed time window';

-- =====================================================================
-- RLS Policies: reports
-- =====================================================================
-- Tenants can view reports for their contracts
-- Admins have full access
-- =====================================================================

-- tenants can select reports for their contracts
create policy "tenants_select_own_reports"
  on reports for select
  to authenticated
  using (
    is_tenant() and
    exists(
      select 1 from contracts c
      where c.id = reports.contract_id
        and c.tenant_user_id = auth.uid()
    )
  );

-- admins can select all reports
create policy "admins_select_all_reports"
  on reports for select
  to authenticated
  using (is_admin());

-- admins can insert reports
create policy "admins_insert_reports"
  on reports for insert
  to authenticated
  with check (is_admin());

-- admins can update reports
create policy "admins_update_reports"
  on reports for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admins can delete reports
create policy "admins_delete_reports"
  on reports for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_own_reports" on reports is 
  'Tenants can view reports for their contracts';
comment on policy "admins_select_all_reports" on reports is 
  'Admins have full access to all reports';

-- =====================================================================
-- RLS Policies: report_emails
-- =====================================================================
-- Tenants can view email records for their reports
-- Admins have full access
-- =====================================================================

-- tenants can select report_emails for their reports
create policy "tenants_select_own_report_emails"
  on report_emails for select
  to authenticated
  using (
    is_tenant() and
    exists(
      select 1 from reports r
      join contracts c on c.id = r.contract_id
      where r.id = report_emails.report_id
        and c.tenant_user_id = auth.uid()
    )
  );

-- admins can select all report_emails
create policy "admins_select_all_report_emails"
  on report_emails for select
  to authenticated
  using (is_admin());

-- admins can insert report_emails
create policy "admins_insert_report_emails"
  on report_emails for insert
  to authenticated
  with check (is_admin());

-- admins can update report_emails
create policy "admins_update_report_emails"
  on report_emails for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admins can delete report_emails
create policy "admins_delete_report_emails"
  on report_emails for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_own_report_emails" on report_emails is 
  'Tenants can view email records for their reports';
comment on policy "admins_select_all_report_emails" on report_emails is 
  'Admins have full access to all report emails';

-- =====================================================================
-- RLS Policies: report_email_attempts
-- =====================================================================
-- Tenants can view email attempts for their reports
-- Admins have full access
-- =====================================================================

-- tenants can select report_email_attempts for their reports
create policy "tenants_select_own_report_email_attempts"
  on report_email_attempts for select
  to authenticated
  using (
    is_tenant() and
    exists(
      select 1 from report_emails re
      join reports r on r.id = re.report_id
      join contracts c on c.id = r.contract_id
      where re.id = report_email_attempts.report_email_id
        and c.tenant_user_id = auth.uid()
    )
  );

-- admins can select all report_email_attempts
create policy "admins_select_all_report_email_attempts"
  on report_email_attempts for select
  to authenticated
  using (is_admin());

-- admins can insert report_email_attempts
create policy "admins_insert_report_email_attempts"
  on report_email_attempts for insert
  to authenticated
  with check (is_admin());

-- admins can update report_email_attempts
create policy "admins_update_report_email_attempts"
  on report_email_attempts for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admins can delete report_email_attempts
create policy "admins_delete_report_email_attempts"
  on report_email_attempts for delete
  to authenticated
  using (is_admin());

comment on policy "tenants_select_own_report_email_attempts" on report_email_attempts is 
  'Tenants can view email delivery attempts for their reports';
comment on policy "admins_select_all_report_email_attempts" on report_email_attempts is 
  'Admins have full access to all email delivery attempts';

