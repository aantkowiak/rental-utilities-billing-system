-- =====================================================================
-- Migration: Remove reading time window restriction
-- =====================================================================
-- Purpose: Remove the -3/+5 day window restriction from tenant readings
-- Tenants can now submit readings at any time, but UI will still show
-- informational message about the recommended window
-- =====================================================================

-- Drop existing policies for readings
drop policy if exists "tenants_insert_readings_in_window" on readings;
drop policy if exists "tenants_update_readings_in_window" on readings;

-- Recreate tenant insert policy without time window restriction
create policy "tenants_insert_readings_in_window"
  on readings for insert
  to authenticated
  with check (
    is_tenant() and
    origin = 'tenant' and
    property_id = any(current_property_ids())
  );

-- Recreate tenant update policy without time window restriction
create policy "tenants_update_readings_in_window"
  on readings for update
  to authenticated
  using (
    is_tenant() and
    origin = 'tenant' and
    property_id = any(current_property_ids()) and
    deleted_at is null
  )
  with check (
    is_tenant() and
    origin = 'tenant' and
    property_id = any(current_property_ids())
  );

comment on policy "tenants_insert_readings_in_window" on readings is 
  'Tenants can submit readings at any time for their contracted properties';
comment on policy "tenants_update_readings_in_window" on readings is 
  'Tenants can update their readings at any time';

