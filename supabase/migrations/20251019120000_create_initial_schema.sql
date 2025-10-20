-- =====================================================================
-- Migration: Create Initial Schema for Rental Utilities Billing System
-- =====================================================================
-- Purpose: Set up core database structure including properties, profiles,
--          contracts, monthly conditions, readings, reports, and email tracking
-- 
-- Tables Created:
--   - properties: Rental properties with billing start dates
--   - profiles: User profiles linked to auth.users
--   - contracts: Tenant rental periods per property
--   - monthly_conditions: Monthly pricing and forecast data per property
--   - readings: Utility meter readings (cold/hot water, heating)
--   - reports: Monthly billing reports per contract
--   - report_emails: Email recipients for reports
--   - report_email_attempts: Email delivery tracking
--
-- Special Considerations:
--   - Uses citext extension for case-insensitive emails
--   - Uses btree_gist extension for temporal overlap prevention
--   - All monetary values stored un-rounded (high precision)
--   - Soft deletes on readings via deleted_at column
--   - RLS enabled on all tables (policies in separate migration)
-- =====================================================================

-- =====================================================================
-- Enable Required Extensions
-- =====================================================================

-- enable uuid generation for primary keys
create extension if not exists "uuid-ossp";

-- enable btree_gist for exclude constraints on temporal ranges
create extension if not exists "btree_gist";

-- enable case-insensitive text type for emails
create extension if not exists "citext";

-- =====================================================================
-- Table: properties
-- =====================================================================
-- Stores rental properties managed by the system.
-- Each property tracks utilities from a specific start_month.
-- =====================================================================

create table properties (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  -- first day of the month when billing starts for this property
  start_month date not null,
  -- ensure start_month is always the first day of a month
  constraint start_month_is_first_of_month check (start_month = date_trunc('month', start_month)::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security (policies defined in separate migration)
alter table properties enable row level security;

comment on table properties is 'Rental properties with utility billing tracking';
comment on column properties.label is 'Human-readable property identifier';
comment on column properties.start_month is 'First month of billing, must be first day of month';

-- =====================================================================
-- Table: profiles
-- =====================================================================
-- User profiles extending Supabase auth.users.
-- Links users to roles (tenant/admin) and optionally to a property.
-- =====================================================================

create table profiles (
  -- primary key is the user_id from auth.users
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- role determines access level: 'tenant' or 'admin'
  role text not null check (role in ('tenant', 'admin')),
  -- optional link to a property (mainly for tenants)
  property_id uuid references properties(id),
  -- optional display name for the user
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table profiles enable row level security;

comment on table profiles is 'User profiles with role and property associations';
comment on column profiles.role is 'User role: tenant or admin';
comment on column profiles.property_id is 'Associated property (primarily for tenants)';

-- =====================================================================
-- Table: contracts
-- =====================================================================
-- Represents rental contracts linking tenants to properties for a period.
-- Uses tstzrange to represent contract duration and prevent overlaps.
-- =====================================================================

create table contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  tenant_user_id uuid not null references auth.users(id),
  -- contract validity period (start and end timestamps)
  period tstzrange not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- prevent overlapping contracts for the same property
  -- uses gist index to efficiently check for temporal overlaps
  constraint no_overlapping_contracts exclude using gist (
    property_id with =,
    period with &&
  )
);

-- enable row level security
alter table contracts enable row level security;

-- index for efficient contract lookups by property
create index idx_contracts_property_id on contracts(property_id);

-- index for efficient tenant contract lookups
create index idx_contracts_tenant_user_id on contracts(tenant_user_id);

comment on table contracts is 'Rental contracts with non-overlapping periods per property';
comment on column contracts.period is 'Contract validity period as timestamp range';
comment on constraint no_overlapping_contracts on contracts is 'Ensures no temporal overlap of contracts per property';

-- =====================================================================
-- Table: monthly_conditions
-- =====================================================================
-- Monthly pricing and forecast data for each property.
-- Stores utility prices, forecasts, and advance payment amounts.
-- =====================================================================

create table monthly_conditions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  -- billing month (must be first day of month)
  month date not null check (month = date_trunc('month', month)::date),
  -- manager fee for the month
  manager_fee numeric(12,4) not null,
  -- unit prices for utilities (stored with high precision)
  price_cold numeric(12,4) not null,
  price_hot_heating numeric(12,4) not null,
  price_heating numeric(12,4) not null,
  -- forecasted consumption for the month
  forecast_cold numeric(12,3) not null,
  forecast_hot numeric(12,3) not null,
  forecast_heating numeric(12,3) not null,
  -- monthly advance payment amount
  advance_payment numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ensure only one record per property per month
  constraint uq_monthly_conditions_property_month unique (property_id, month)
);

-- enable row level security
alter table monthly_conditions enable row level security;

-- index for efficient monthly condition lookups
create index idx_monthly_conditions_property_month on monthly_conditions(property_id, month);

comment on table monthly_conditions is 'Monthly pricing and forecast data per property';
comment on column monthly_conditions.month is 'Billing month, must be first day of month';
comment on column monthly_conditions.manager_fee is 'Property manager fee for the month';
comment on column monthly_conditions.advance_payment is 'Monthly advance payment amount';

-- =====================================================================
-- Table: readings
-- =====================================================================
-- Utility meter readings for properties.
-- Supports both tenant-submitted and admin-replacement readings.
-- Uses soft deletes via deleted_at column.
-- =====================================================================

create table readings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  -- timestamp when reading was taken
  reading_at timestamptz not null,
  -- effective month for admin replacements (null for regular tenant readings)
  effective_month date,
  -- origin of reading: 'tenant' or 'admin_replacement'
  origin text not null check (origin in ('tenant', 'admin_replacement')),
  -- reading type: 'regular' or 'baseline'
  reading_type text not null check (reading_type in ('regular', 'baseline')),
  -- meter readings for cold water (cubic meters)
  cold_m3 numeric(10,3) not null,
  -- meter readings for hot water (cubic meters)
  hot_m3 numeric(10,3) not null,
  -- meter readings for heating (gigajoules)
  heating_gj numeric(10,3) not null,
  -- flags indicating if admin replaced tenant reading
  cold_replaced boolean not null default false,
  hot_replaced boolean not null default false,
  heating_replaced boolean not null default false,
  -- optional comment about the reading
  comment_text text,
  -- whether comment is visible to tenant
  comment_visible_to_tenant boolean not null default true,
  -- soft delete timestamp (null means not deleted)
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ensure effective_month is only set for admin replacements
  constraint effective_month_only_for_replacements check (
    (origin = 'admin_replacement' and effective_month is not null and effective_month = date_trunc('month', effective_month)::date) or
    (origin = 'tenant' and effective_month is null)
  )
);

-- enable row level security
alter table readings enable row level security;

-- index for efficient reading lookups by property and date
create index idx_readings_property_reading_at on readings(property_id, reading_at desc);

-- partial unique index: one admin replacement per property per month
create unique index idx_readings_property_effective_month 
  on readings(property_id, effective_month)
  where origin = 'admin_replacement' and deleted_at is null;

comment on table readings is 'Utility meter readings with tenant and admin replacement support';
comment on column readings.origin is 'Source of reading: tenant or admin_replacement';
comment on column readings.reading_type is 'Type: regular or baseline';
comment on column readings.effective_month is 'Effective month for admin replacements only';
comment on column readings.deleted_at is 'Soft delete timestamp (null = active)';
comment on column readings.cold_replaced is 'True if admin replaced tenant cold water reading';

-- =====================================================================
-- Table: reports
-- =====================================================================
-- Monthly billing reports for contracts.
-- Links to readings and monthly conditions used for calculation.
-- Stores all cost calculations un-rounded for flexibility.
-- =====================================================================

create table reports (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  -- billing month (must be first day of month)
  month date not null check (month = date_trunc('month', month)::date),
  -- report status: 'draft', 'realized', or 'unlocked'
  status text not null check (status in ('draft', 'realized', 'unlocked')),
  -- anchor reading at start of period
  anchor_reading_id uuid not null references readings(id),
  -- anchor reading at end of period (next month)
  anchor_reading_next_id uuid not null references readings(id),
  -- monthly conditions used for calculation
  monthly_conditions_id uuid not null references monthly_conditions(id),
  -- calculated costs (stored un-rounded with high precision)
  fixed_cost_raw numeric(14,6) not null,
  meter_cost_cold_raw numeric(14,6) not null,
  meter_cost_hot_raw numeric(14,6) not null,
  meter_cost_heating_raw numeric(14,6) not null,
  actual_rent_raw numeric(14,6) not null,
  balance_raw numeric(14,6) not null,
  -- timestamp when report was realized
  realized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ensure only one report per contract per month
  constraint uq_reports_contract_month unique (contract_id, month),
  -- ensure realized_at is set only for realized reports
  constraint realized_at_matches_status check (
    (status = 'realized' and realized_at is not null) or
    (status != 'realized' and realized_at is null)
  )
);

-- enable row level security
alter table reports enable row level security;

-- index for efficient report lookups
create index idx_reports_contract_month on reports(contract_id, month);

comment on table reports is 'Monthly billing reports with un-rounded calculations';
comment on column reports.status is 'Report status: draft, realized, or unlocked';
comment on column reports.anchor_reading_id is 'Starting meter reading for the period';
comment on column reports.anchor_reading_next_id is 'Ending meter reading for the period';
comment on column reports.fixed_cost_raw is 'Fixed costs (manager fee, etc.) - un-rounded';
comment on column reports.balance_raw is 'Final balance (advance - actual) - un-rounded';

-- =====================================================================
-- Table: report_emails
-- =====================================================================
-- Email recipients for report delivery.
-- Tracks which emails should receive which reports.
-- =====================================================================

create table report_emails (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  -- recipient email (case-insensitive)
  recipient_email citext not null,
  -- timestamp of last successful send
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  -- ensure each email is listed only once per report
  constraint uq_report_emails_report_recipient unique (report_id, recipient_email)
);

-- enable row level security
alter table report_emails enable row level security;

-- index for efficient email lookups by report
create index idx_report_emails_report_id on report_emails(report_id);

comment on table report_emails is 'Email recipients for report delivery';
comment on column report_emails.recipient_email is 'Recipient email (case-insensitive via citext)';
comment on column report_emails.last_sent_at is 'Timestamp of last successful email delivery';

-- =====================================================================
-- Table: report_email_attempts
-- =====================================================================
-- Tracks email delivery attempts for monitoring and troubleshooting.
-- Records success, retry, and failure states.
-- =====================================================================

create table report_email_attempts (
  id uuid primary key default gen_random_uuid(),
  report_email_id uuid not null references report_emails(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  -- attempt status: 'success', 'retry', or 'failed'
  status text not null check (status in ('success', 'retry', 'failed')),
  -- error message for failed/retry attempts
  error_message text
);

-- enable row level security
alter table report_email_attempts enable row level security;

-- index for efficient attempt lookups by report_email
create index idx_report_email_attempts_report_email_id on report_email_attempts(report_email_id);

-- index for chronological attempt queries
create index idx_report_email_attempts_attempted_at on report_email_attempts(attempted_at desc);

comment on table report_email_attempts is 'Email delivery attempt tracking';
comment on column report_email_attempts.status is 'Attempt result: success, retry, or failed';
comment on column report_email_attempts.error_message is 'Error details for failed/retry attempts';

-- =====================================================================
-- Triggers for updated_at Timestamps
-- =====================================================================
-- Automatically update updated_at column on row modifications
-- =====================================================================

-- create trigger function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- apply trigger to all tables with updated_at column
create trigger update_properties_updated_at before update on properties
  for each row execute function update_updated_at_column();

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_contracts_updated_at before update on contracts
  for each row execute function update_updated_at_column();

create trigger update_monthly_conditions_updated_at before update on monthly_conditions
  for each row execute function update_updated_at_column();

create trigger update_readings_updated_at before update on readings
  for each row execute function update_updated_at_column();

create trigger update_reports_updated_at before update on reports
  for each row execute function update_updated_at_column();

