-- Ensure only one reading per property can be assigned as base or final for a given month

CREATE UNIQUE INDEX IF NOT EXISTS uq_readings_property_base_month
  ON readings (property_id, base_for_month)
  WHERE base_for_month IS NOT NULL
    AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_readings_property_final_month
  ON readings (property_id, final_for_month)
  WHERE final_for_month IS NOT NULL
    AND deleted_at IS NULL;

