-- =====================================================================
-- Seed Data for Rental Utilities Billing System - CI/E2E Version
-- =====================================================================
-- Purpose: Minimal seed data for CI e2e tests
-- Includes: Properties, profiles, and contracts only
-- =====================================================================

-- =====================================================================
-- Clear existing data (in reverse dependency order)
-- =====================================================================
TRUNCATE TABLE report_email_attempts CASCADE;
TRUNCATE TABLE report_emails CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE readings CASCADE;
TRUNCATE TABLE monthly_advances CASCADE;
TRUNCATE TABLE contracts CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE properties CASCADE;

-- =====================================================================
-- Properties
-- =====================================================================
INSERT INTO properties (id, label, start_month, created_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Test Property A', '2024-01-01', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'Test Property B', '2024-01-01', now(), now());

-- =====================================================================
-- Auth Users
-- =====================================================================
-- Create test user for CI/E2E tests
-- Email: tenant1@example.com
-- Password: password123
-- Using crypt function from pgcrypto extension

-- First, delete if exists to ensure clean state
DELETE FROM auth.users WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f';

-- Insert the user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  '00000000-0000-0000-0000-000000000000',
  'tenant1@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Insert identity for the user (required for email/password login)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  jsonb_build_object('sub', '0367969f-66af-4c5b-85b0-cc0143d6877f', 'email', 'tenant1@example.com'),
  'email',
  now(),
  now(),
  now()
);

RAISE NOTICE 'Created test user: tenant1@example.com (password: password123)';

-- =====================================================================
-- Profiles
-- =====================================================================
-- Profile for existing CI tenant user
INSERT INTO profiles (user_id, role, property_id, display_name, created_at, updated_at) VALUES
  ('0367969f-66af-4c5b-85b0-cc0143d6877f', 'tenant', '10000000-0000-0000-0000-000000000001', 'Test Tenant', now(), now());

-- =====================================================================
-- Contracts
-- =====================================================================
-- Assign tenant to Test Property A
-- Using tstzrange for period: '[start, end)' or '[start,)' for open-ended
INSERT INTO contracts (
  id,
  tenant_user_id,
  property_id,
  period,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  '10000000-0000-0000-0000-000000000001',
  tstzrange('2024-01-01 00:00:00+00', NULL),
  now(),
  now()
);

-- =====================================================================
-- Summary
-- =====================================================================
DO $$
DECLARE
  auth_users_count integer;
  properties_count integer;
  profiles_count integer;
  contracts_count integer;
BEGIN
  SELECT count(*) INTO auth_users_count FROM auth.users;
  SELECT count(*) INTO properties_count FROM properties;
  SELECT count(*) INTO profiles_count FROM profiles;
  SELECT count(*) INTO contracts_count FROM contracts;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'CI E2E Seed Data Summary:';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Auth users created: %', auth_users_count;
  RAISE NOTICE 'Properties created: %', properties_count;
  RAISE NOTICE 'Profiles created: %', profiles_count;
  RAISE NOTICE 'Contracts created: %', contracts_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Test User Credentials:';
  RAISE NOTICE '  Email: tenant1@example.com';
  RAISE NOTICE '  Password: password123';
  RAISE NOTICE '  User ID: 0367969f-66af-4c5b-85b0-cc0143d6877f';
  RAISE NOTICE '  Assigned to: Test Property A';
  RAISE NOTICE '=================================================';
END $$;

