-- =====================================================================
-- Seed Data for Rental Utilities Billing System
-- =====================================================================
-- Purpose: Populate database with test data for development
-- Includes: Properties, profiles, contracts, monthly advances, and
--          historical readings for the last 12 months
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
-- Note: Test users should be created via Auth API after database seed
-- Run: node scripts/create-test-users.js
-- =====================================================================

-- =====================================================================
-- Properties
-- =====================================================================
INSERT INTO properties (id, label, start_month, created_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Apartment A - Downtown', '2024-01-01', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'Apartment B - Suburbs', '2024-01-01', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'House C - Riverside', '2024-01-01', now(), now());

-- =====================================================================
-- Profiles
-- =====================================================================
-- Note: Profiles will be created by the create-test-users.js script
-- after users are created via the Auth API

-- =====================================================================
-- Contracts
-- =====================================================================
-- Contracts will be created by the create-test-users.js script
-- after users are created

-- =====================================================================
-- Monthly Advances
-- =====================================================================
-- Generate monthly advances for the last 13 months for both properties
DO $$
DECLARE
  month_offset integer;
  current_month date;
  property_id_val uuid;
BEGIN
  FOR property_id_val IN 
    SELECT id FROM properties 
  LOOP
    FOR month_offset IN 0..12 LOOP
      current_month := date_trunc('month', now() - (month_offset || ' months')::interval)::date;
      
      INSERT INTO monthly_advances (
        property_id,
        month,
        manager_fee,
        price_cold,
        price_hot_heating,
        price_heating,
        forecast_cold,
        forecast_hot,
        forecast_heating,
        advance_payment,
        created_at,
        updated_at
      ) VALUES (
        property_id_val,
        current_month,
        150.00 + (random() * 50)::numeric(12,4),                    -- manager_fee: 150-200
        5.50 + (random() * 2)::numeric(12,4),                       -- price_cold: 5.50-7.50 per m3
        25.00 + (random() * 10)::numeric(12,4),                     -- price_hot_heating: 25-35 per m3
        180.00 + (random() * 40)::numeric(12,4),                    -- price_heating: 180-220 per GJ
        8.00 + (random() * 4)::numeric(12,3),                       -- forecast_cold: 8-12 m3
        4.00 + (random() * 3)::numeric(12,3),                       -- forecast_hot: 4-7 m3
        2.50 + (random() * 2)::numeric(12,3),                       -- forecast_heating: 2.5-4.5 GJ
        800.00 + (random() * 400)::numeric(12,2),                   -- advance_payment: 800-1200
        now(),
        now()
      );
    END LOOP;
  END LOOP;
END $$;

-- =====================================================================
-- Readings - Historical Data for Last 13 Months
-- =====================================================================
-- Generate baseline readings (start of tracking) for each property
DO $$
DECLARE
  property_rec record;
  baseline_date timestamptz;
BEGIN
  FOR property_rec IN SELECT id, label FROM properties LOOP
    baseline_date := (now() - interval '13 months')::timestamptz;
    
    INSERT INTO readings (
      property_id,
      reading_at,
      effective_month,
      origin,
      reading_type,
      cold_m3,
      hot_m3,
      heating_gj,
      cold_replaced,
      hot_replaced,
      heating_replaced,
      comment_text,
      comment_visible_to_tenant,
      deleted_at,
      created_at,
      updated_at
    ) VALUES (
      property_rec.id,
      baseline_date,
      NULL,
      'tenant',
      'regular',
      1000.000 + (random() * 100)::numeric(10,3),    -- Starting cold water meter: 1000-1100 m3
      500.000 + (random() * 50)::numeric(10,3),      -- Starting hot water meter: 500-550 m3
      300.000 + (random() * 30)::numeric(10,3),      -- Starting heating meter: 300-330 GJ
      false,
      false,
      false,
      'Baseline reading - Start of tracking',
      true,
      NULL,
      now(),
      now()
    );
  END LOOP;
END $$;

-- Generate regular monthly readings for each property
DO $$
DECLARE
  property_rec record;
  month_offset integer;
  reading_date timestamptz;
  prev_reading record;
  new_cold numeric(10,3);
  new_hot numeric(10,3);
  new_heating numeric(10,3);
  consumption_cold numeric(10,3);
  consumption_hot numeric(10,3);
  consumption_heating numeric(10,3);
BEGIN
  FOR property_rec IN SELECT id, label FROM properties LOOP
    FOR month_offset IN 0..12 LOOP
      -- Reading date: around the 25th-28th of each month
      reading_date := (date_trunc('month', now() - (month_offset || ' months')::interval) + interval '25 days' + (random() * interval '3 days'))::timestamptz;
      
      -- Get the most recent reading for this property
      SELECT 
        cold_m3, 
        hot_m3, 
        heating_gj
      INTO prev_reading
      FROM readings
      WHERE 
        property_id = property_rec.id 
        AND reading_at < reading_date
        AND deleted_at IS NULL
      ORDER BY reading_at DESC
      LIMIT 1;
      
      IF prev_reading IS NOT NULL THEN
        -- Calculate realistic monthly consumption with some randomness
        -- Cold water: 8-15 m3 per month
        consumption_cold := 8.000 + (random() * 7)::numeric(10,3);
        -- Hot water: 4-8 m3 per month  
        consumption_hot := 4.000 + (random() * 4)::numeric(10,3);
        -- Heating: 2-5 GJ per month (more in winter months)
        -- Simulate seasonal variation
        IF EXTRACT(month FROM reading_date) IN (11, 12, 1, 2, 3) THEN
          -- Winter: higher heating consumption
          consumption_heating := 4.000 + (random() * 3)::numeric(10,3);
        ELSE
          -- Summer: lower heating consumption
          consumption_heating := 1.000 + (random() * 2)::numeric(10,3);
        END IF;
        
        new_cold := prev_reading.cold_m3 + consumption_cold;
        new_hot := prev_reading.hot_m3 + consumption_hot;
        new_heating := prev_reading.heating_gj + consumption_heating;
        
        INSERT INTO readings (
          property_id,
          reading_at,
          effective_month,
          origin,
          reading_type,
          cold_m3,
          hot_m3,
          heating_gj,
          cold_replaced,
          hot_replaced,
          heating_replaced,
          comment_text,
          comment_visible_to_tenant,
          deleted_at,
          created_at,
          updated_at
        ) VALUES (
          property_rec.id,
          reading_date,
          NULL,
          'tenant',
          'regular',
          new_cold,
          new_hot,
          new_heating,
          false,
          false,
          false,
          CASE 
            WHEN random() < 0.2 THEN 'Monthly reading - all meters checked'
            WHEN random() < 0.1 THEN 'Meter reading submitted via mobile app'
            ELSE NULL
          END,
          true,
          NULL,
          now(),
          now()
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================================
-- Add some admin replacement readings (simulate corrections)
-- =====================================================================
DO $$
DECLARE
  property_rec record;
  replacement_month date;
  latest_reading record;
BEGIN
  FOR property_rec IN SELECT id FROM properties LIMIT 1 LOOP
    -- Add an admin replacement for 3 months ago
    replacement_month := date_trunc('month', now() - interval '3 months')::date;
    
    -- Get a recent reading as base
    SELECT cold_m3, hot_m3, heating_gj
    INTO latest_reading
    FROM readings
    WHERE property_id = property_rec.id
    ORDER BY reading_at DESC
    LIMIT 1;
    
    IF latest_reading IS NOT NULL THEN
      INSERT INTO readings (
        property_id,
        reading_at,
        effective_month,
        origin,
        reading_type,
        cold_m3,
        hot_m3,
        heating_gj,
        cold_replaced,
        hot_replaced,
        heating_replaced,
        comment_text,
        comment_visible_to_tenant,
        deleted_at,
        created_at,
        updated_at
      ) VALUES (
        property_rec.id,
        now() - interval '3 months',
        replacement_month,
        'admin_replacement',
        'overwrite',
        latest_reading.cold_m3 - 50.000,  -- Corrected reading
        latest_reading.hot_m3 - 25.000,   -- Corrected reading
        latest_reading.heating_gj - 10.000, -- Corrected reading
        true,
        true,
        false,
        'Admin correction: Tenant reported incorrect values. Verified with actual meter.',
        false,  -- Not visible to tenant
        NULL,
        now(),
        now()
      );
    END IF;
  END LOOP;
END $$;

-- =====================================================================
-- Assign base_for_month and final_for_month to readings
-- =====================================================================
DO $$
DECLARE
  property_rec record;
  month_offset integer;
  current_month date;
  base_reading_id uuid;
  final_reading_id uuid;
BEGIN
  FOR property_rec IN SELECT id FROM properties LOOP
    FOR month_offset IN 0..12 LOOP
      current_month := date_trunc('month', now() - (month_offset || ' months')::interval)::date;
      
      -- Find the first reading at or after the start of this month
      SELECT id INTO base_reading_id
      FROM readings
      WHERE property_id = property_rec.id
        AND reading_at >= current_month::timestamptz
        AND reading_at < (current_month + interval '1 month')::timestamptz
        AND deleted_at IS NULL
      ORDER BY reading_at ASC
      LIMIT 1;
      
      -- Find the first reading at or after the start of next month  
      SELECT id INTO final_reading_id
      FROM readings
      WHERE property_id = property_rec.id
        AND reading_at >= (current_month + interval '1 month')::timestamptz
        AND reading_at < (current_month + interval '2 months')::timestamptz
        AND deleted_at IS NULL
      ORDER BY reading_at ASC
      LIMIT 1;
      
      -- Assign base_for_month
      IF base_reading_id IS NOT NULL THEN
        UPDATE readings
        SET base_for_month = current_month
        WHERE id = base_reading_id;
      END IF;
      
      -- Assign final_for_month
      IF final_reading_id IS NOT NULL THEN
        UPDATE readings
        SET final_for_month = current_month
        WHERE id = final_reading_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================================
-- Summary
-- =====================================================================
DO $$
DECLARE
  properties_count integer;
  profiles_count integer;
  contracts_count integer;
  monthly_advances_count integer;
  readings_count integer;
BEGIN
  SELECT count(*) INTO properties_count FROM properties;
  SELECT count(*) INTO profiles_count FROM profiles;
  SELECT count(*) INTO contracts_count FROM contracts;
  SELECT count(*) INTO monthly_advances_count FROM monthly_advances;
  SELECT count(*) INTO readings_count FROM readings WHERE deleted_at IS NULL;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Seed Data Summary:';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Properties created: %', properties_count;
  RAISE NOTICE 'Profiles created: %', profiles_count;
  RAISE NOTICE 'Contracts created: %', contracts_count;
  RAISE NOTICE 'Monthly advances created: %', monthly_advances_count;
  RAISE NOTICE 'Readings created: %', readings_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Test Users:';
  RAISE NOTICE '  Admin: admin@example.com / password123';
  RAISE NOTICE '  Tenant 1: tenant1@example.com / password123';
  RAISE NOTICE '  Tenant 2: tenant2@example.com / password123';
  RAISE NOTICE '=================================================';
END $$;

