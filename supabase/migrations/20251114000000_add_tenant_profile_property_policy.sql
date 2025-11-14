-- =====================================================================
-- Migration: Add Policy for Tenants to View Their Profile Property
-- =====================================================================
-- Purpose: Allow tenants to view the property assigned in their profile
--          even if they don't have an active contract yet.
--
-- Background:
--   - Tenants have property_id in their profiles table
--   - Current RLS only allows viewing properties with active contracts
--   - This prevents tenants from seeing their assigned property in profile view
--
-- Solution:
--   - Add policy allowing tenants to view property referenced in their profile
--   - This complements existing contracted properties policy
-- =====================================================================

-- tenants can select the property assigned in their profile
create policy "tenants_select_profile_property"
  on properties for select
  to authenticated
  using (
    is_tenant() and
    exists(
      select 1
      from profiles p
      where p.user_id = auth.uid()
        and p.property_id = properties.id
    )
  );

comment on policy "tenants_select_profile_property" on properties is 
  'Tenants can view the property assigned in their profile';

