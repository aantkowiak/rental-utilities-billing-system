-- =====================================================================
-- Migration: Refactor from anchors to base_for_month/final_for_month
-- =====================================================================
-- Purpose: Replace anchor-based report system with explicit month assignments
--          on readings. Each reading can be marked as base for month X and/or
--          final for month Y. Reports now link to lease and contain multiple
--          items (one per meter), each with its own base/final reading pair.
--
-- Changes:
--   1. Add base_for_month, final_for_month to readings (nullable DATE)
--   2. Add unique constraints per meter+month (separately for base and final)
--   3. Create report_items table (report_id, meter_id, baseline_reading_id, final_reading_id, usage, amount)
--   4. Add month (DATE NOT NULL) and sent (BOOLEAN DEFAULT false) to reports
--   5. Add lease_id to reports (derived from contract, but we'll use contract_id as lease_id for now)
--   6. Drop old anchor columns from reports (anchor_reading_id, anchor_reading_next_id)
--   7. Drop monthly_advances_id from reports (will be looked up per month)
--   8. Drop cost columns from reports (will be aggregated from report_items)
-- =====================================================================

-- =====================================================================
-- Step 1: Add new columns to readings
-- =====================================================================

ALTER TABLE readings
  ADD COLUMN base_for_month date NULL,
  ADD COLUMN final_for_month date NULL;

-- Ensure base_for_month and final_for_month are always first day of month
ALTER TABLE readings
  ADD CONSTRAINT readings_base_month_day CHECK (
    base_for_month IS NULL OR 
    base_for_month = date_trunc('month', base_for_month)::date
  ),
  ADD CONSTRAINT readings_final_month_day CHECK (
    final_for_month IS NULL OR 
    final_for_month = date_trunc('month', final_for_month)::date
  );

-- Create unique indexes: max 1 base and 1 final per (meter, month)
-- Note: We don't have a separate meters table, readings are per property
-- For uniqueness we use (property_id, base_for_month) and (property_id, final_for_month)
CREATE UNIQUE INDEX readings_property_base_month_uniq
  ON readings(property_id, base_for_month)
  WHERE base_for_month IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX readings_property_final_month_uniq
  ON readings(property_id, final_for_month)
  WHERE final_for_month IS NOT NULL AND deleted_at IS NULL;

-- Indexes for efficient lookups
CREATE INDEX idx_readings_base_for_month ON readings(base_for_month) WHERE base_for_month IS NOT NULL;
CREATE INDEX idx_readings_final_for_month ON readings(final_for_month) WHERE final_for_month IS NOT NULL;

COMMENT ON COLUMN readings.base_for_month IS 'Month for which this reading serves as baseline (start of period)';
COMMENT ON COLUMN readings.final_for_month IS 'Month for which this reading serves as final (end of period)';

-- =====================================================================
-- Step 2: Modify reports table
-- =====================================================================

-- Add new columns (we'll make month NOT NULL after backfilling if needed)
ALTER TABLE reports
  ADD COLUMN sent boolean NOT NULL DEFAULT false;

-- For now, we keep contract_id as the lease identifier
-- In the future, if we have a separate leases table, we can add lease_id

-- Drop old anchor and cost columns (these will be moved to report_items)
-- First, drop foreign key constraints
ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_anchor_reading_id_fkey,
  DROP CONSTRAINT IF EXISTS reports_anchor_reading_next_id_fkey,
  DROP CONSTRAINT IF EXISTS reports_monthly_advances_id_fkey;

-- Drop the columns
ALTER TABLE reports
  DROP COLUMN IF EXISTS anchor_reading_id,
  DROP COLUMN IF EXISTS anchor_reading_next_id,
  DROP COLUMN IF EXISTS monthly_advances_id,
  DROP COLUMN IF EXISTS fixed_cost_raw,
  DROP COLUMN IF EXISTS meter_cost_cold_raw,
  DROP COLUMN IF EXISTS meter_cost_hot_raw,
  DROP COLUMN IF EXISTS meter_cost_heating_raw,
  DROP COLUMN IF EXISTS actual_rent_raw,
  DROP COLUMN IF EXISTS balance_raw;

-- Note: month column already exists in reports table, so we don't need to add it
-- Update unique constraint to use (contract_id, month) - already exists as uq_reports_contract_month

COMMENT ON COLUMN reports.sent IS 'Whether the report has been sent via email';

-- =====================================================================
-- Step 3: Create report_items table
-- =====================================================================

CREATE TABLE IF NOT EXISTS report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  -- We don't have a meters table, so we reference property_id to identify the "meter"
  -- In this system, one property = one set of meters (cold, hot, heating)
  -- So property_id serves as meter_id
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  baseline_reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE RESTRICT,
  final_reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE RESTRICT,
  -- Usage per utility type
  usage_cold_m3 numeric(10,3) NOT NULL,
  usage_hot_m3 numeric(10,3) NOT NULL,
  usage_heating_gj numeric(10,3) NOT NULL,
  -- Costs per utility type (un-rounded)
  cost_cold_raw numeric(14,6) NOT NULL,
  cost_hot_raw numeric(14,6) NOT NULL,
  cost_heating_raw numeric(14,6) NOT NULL,
  -- Fixed cost (manager fee) allocated to this item
  fixed_cost_raw numeric(14,6) NOT NULL,
  -- Total amount for this item
  amount_raw numeric(14,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One item per property per report (since property = meter in this system)
  CONSTRAINT uq_report_items_report_property UNIQUE (report_id, property_id)
);

-- Enable RLS
ALTER TABLE report_items ENABLE ROW LEVEL SECURITY;

-- Index for efficient lookups
CREATE INDEX idx_report_items_report_id ON report_items(report_id);
CREATE INDEX idx_report_items_property_id ON report_items(property_id);

COMMENT ON TABLE report_items IS 'Individual meter readings and costs within a report';
COMMENT ON COLUMN report_items.property_id IS 'Property (serves as meter identifier in this system)';
COMMENT ON COLUMN report_items.baseline_reading_id IS 'Reading at start of period (base_for_month = report.month)';
COMMENT ON COLUMN report_items.final_reading_id IS 'Reading at end of period (final_for_month = report.month)';
COMMENT ON COLUMN report_items.usage_cold_m3 IS 'Cold water usage (m³) = final - baseline';
COMMENT ON COLUMN report_items.usage_hot_m3 IS 'Hot water usage (m³) = final - baseline';
COMMENT ON COLUMN report_items.usage_heating_gj IS 'Heating usage (GJ) = final - baseline';

-- Trigger for updated_at
CREATE TRIGGER update_report_items_updated_at BEFORE UPDATE ON report_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Step 4: RLS Policies for report_items
-- =====================================================================
-- Copy pattern from reports: admins see all, tenants see their own

-- Admin: full access
CREATE POLICY report_items_admin_all ON report_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Tenant: read items for reports they can access
CREATE POLICY report_items_tenant_read ON report_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports
      JOIN contracts ON reports.contract_id = contracts.id
      WHERE reports.id = report_items.report_id
        AND contracts.tenant_user_id = auth.uid()
    )
  );

-- =====================================================================
-- Migration Notes
-- =====================================================================
-- After this migration:
-- 1. Old reports will be invalid (no anchor columns, no cost data)
-- 2. You'll need to:
--    a) Populate base_for_month/final_for_month on existing readings
--    b) Regenerate all reports using the new logic
--    c) Or simply truncate reports and start fresh (acceptable pre-production)
-- 3. Update application code to use new schema
-- 4. Remove anchor-related code (recalculate-anchors endpoint, jobs, UI)
-- =====================================================================

