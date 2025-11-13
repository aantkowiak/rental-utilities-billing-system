-- Update reading_type column to use new enum values ('regular', 'overwrite')

-- Drop existing check constraint before updating data
ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_reading_type_check;

-- Normalize existing data before type change
UPDATE readings
SET reading_type = 'overwrite'
WHERE lower(reading_type) IN ('baseline', 'overwrite');

UPDATE readings
SET reading_type = 'regular'
WHERE lower(reading_type) NOT IN ('regular', 'overwrite');

-- Create enum type if it does not exist
DO $$
BEGIN
  CREATE TYPE reading_type AS ENUM ('regular', 'overwrite');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Alter column to use the new enum
ALTER TABLE readings
  ALTER COLUMN reading_type TYPE reading_type
  USING CASE
    WHEN lower(reading_type::text) = 'overwrite' THEN 'overwrite'::reading_type
    ELSE 'regular'::reading_type
  END;

-- Ensure the column is NOT NULL and has a default
ALTER TABLE readings
  ALTER COLUMN reading_type SET NOT NULL,
  ALTER COLUMN reading_type SET DEFAULT 'regular'::reading_type;

COMMENT ON COLUMN readings.reading_type IS 'Type of reading: regular or overwrite (replacement).';

