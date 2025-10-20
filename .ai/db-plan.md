# Database Schema – Rental Utilities Billing System

## 1. Tables

### 1.1 properties
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| label | text | NOT NULL |
| start_month | date | NOT NULL, first day of month |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

---

### 1.2 profiles
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| role | text | NOT NULL, CHECK (`role IN ('tenant','admin')`) |
| property_id | uuid | FK → `properties(id)` |
| display_name | text |  |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

---

### 1.3 contracts
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| property_id | uuid | NOT NULL, FK → `properties(id)` |
| tenant_user_id | uuid | NOT NULL, FK → `auth.users(id)` |
| period | tstzrange | NOT NULL |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Additional constraints:
* EXCLUDE USING GIST (`property_id` WITH =, `period` WITH &&) to prevent overlapping active contracts per property.

---

### 1.4 monthly_conditions
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| property_id | uuid | NOT NULL, FK → `properties(id)` |
| month | date | NOT NULL, CHECK (`month = date_trunc('month', month)`) |
| manager_fee | numeric(12,4) | NOT NULL |
| price_cold | numeric(12,4) | NOT NULL |
| price_hot_heating | numeric(12,4) | NOT NULL |
| price_heating | numeric(12,4) | NOT NULL |
| forecast_cold | numeric(12,3) | NOT NULL |
| forecast_hot | numeric(12,3) | NOT NULL |
| forecast_heating | numeric(12,3) | NOT NULL |
| advance_payment | numeric(12,2) | NOT NULL |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Unique: (`property_id`, `month`).

---

### 1.5 readings
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| property_id | uuid | NOT NULL, FK → `properties(id)` |
| reading_at | timestamptz | NOT NULL |
| effective_month | date | NULLABLE, used only when `origin = 'admin_replacement'` |
| origin | text | NOT NULL, CHECK (`origin IN ('tenant','admin_replacement')`) |
| reading_type | text | NOT NULL, CHECK (`reading_type IN ('regular','baseline')`) |
| cold_m3 | numeric(10,3) | NOT NULL |
| hot_m3 | numeric(10,3) | NOT NULL |
| heating_gj | numeric(10,3) | NOT NULL |
| cold_replaced | boolean | default FALSE |
| hot_replaced | boolean | default FALSE |
| heating_replaced | boolean | default FALSE |
| comment_text | text |  |
| comment_visible_to_tenant | boolean | default TRUE |
| deleted_at | timestamptz |  |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Partial uniqueness:
* UNIQUE (`property_id`, `effective_month`) WHERE `origin = 'admin_replacement'`.

---

### 1.6 reports
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| contract_id | uuid | NOT NULL, FK → `contracts(id)` |
| month | date | NOT NULL, CHECK (`month = date_trunc('month', month)`) |
| status | text | NOT NULL, CHECK (`status IN ('draft','realized','unlocked')`) |
| anchor_reading_id | uuid | NOT NULL, FK → `readings(id)` |
| anchor_reading_next_id | uuid | NOT NULL, FK → `readings(id)` |
| monthly_conditions_id | uuid | NOT NULL, FK → `monthly_conditions(id)` |
| fixed_cost_raw | numeric(14,6) | NOT NULL |
| meter_cost_cold_raw | numeric(14,6) | NOT NULL |
| meter_cost_hot_raw | numeric(14,6) | NOT NULL |
| meter_cost_heating_raw | numeric(14,6) | NOT NULL |
| actual_rent_raw | numeric(14,6) | NOT NULL |
| balance_raw | numeric(14,6) | NOT NULL |
| realized_at | timestamptz |  |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Unique: (`contract_id`, `month`).

---

### 1.7 report_emails
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| report_id | uuid | NOT NULL, FK → `reports(id)` ON DELETE CASCADE |
| recipient_email | citext | NOT NULL |
| last_sent_at | timestamptz |  |
| created_at | timestamptz | default `now()` |

Unique: (`report_id`, `recipient_email`).

---

### 1.8 report_email_attempts
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| report_email_id | uuid | NOT NULL, FK → `report_emails(id)` ON DELETE CASCADE |
| attempted_at | timestamptz | default `now()` |
| status | text | NOT NULL, CHECK (`status IN ('success','retry','failed')`) |
| error_message | text |  |

Index: (`report_email_id`).

---

## 2. Relationships
1. **properties 1-* contracts** – `contracts.property_id` FK.
2. **contracts 1-* reports** – `reports.contract_id` FK.
3. **properties 1-* readings** – `readings.property_id` FK.
4. **properties 1-* monthly_conditions** – `monthly_conditions.property_id` FK.
5. **reports 1-* report_emails** – `report_emails.report_id` FK.
6. **report_emails 1-* report_email_attempts** – `report_email_attempts.report_email_id` FK.
7. **auth.users 1-1 profiles** – `profiles.user_id` PK/FK.

## 3. Indexes
| Table | Index |
|-------|-------|
| readings | (`property_id`, `reading_at` DESC) |
| readings | Partial UNIQUE (`property_id`, `effective_month`) WHERE `origin = 'admin_replacement'` |
| monthly_conditions | UNIQUE (`property_id`, `month`) |
| contracts | GIST EXCLUDE (`property_id` WITH =, `period` WITH &&) |
| reports | UNIQUE (`contract_id`, `month`) |
| report_emails | UNIQUE (`report_id`, `recipient_email`) |
| report_email_attempts | (`report_email_id`) |

## 4. PostgreSQL Row-Level Security Policies

RLS is enabled on all data tables except lookup tables. Example policies below assume a JWT claim `role` (either `tenant` or `admin`) and `auth.uid()`.

### 4.1 Helper Functions
```sql
CREATE FUNCTION current_property_ids() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
SELECT array_agg(DISTINCT c.property_id)
FROM contracts c
WHERE c.tenant_user_id = auth.uid()
  AND c.period @> now();
$$;
```

### 4.2 Table Policies
1. **properties**
   * tenants: `SELECT USING (id = ANY (current_property_ids()))`
   * admins: `SELECT USING (true)`
2. **readings**, **monthly_conditions**, **reports**
   * tenants: `USING (property_id = ANY (current_property_ids()))`
   * admins: `USING (true)`
3. **contracts**
   * tenants: `SELECT USING (tenant_user_id = auth.uid())`
   * admins: `USING (true)`
4. **report_emails** & **report_email_attempts**
   * tenants: join via `reports.contract_id` → allow when contract’s tenant matches `auth.uid()`.
   * admins: allowed.

Write policies further restrict tenants to:
* INSERT/UPDATE `readings` only within the −3/+5 day window and when `origin = 'tenant'`.
* No tenant DELETE access; admins unrestricted.

## 5. Additional Notes
• All monetary amounts are stored **un-rounded raw** so rounding rules can evolve without data migration.
• `citext` is used for email to enable case-insensitive uniqueness.
• Soft deletes on `readings` via `deleted_at`; queries use `WHERE deleted_at IS NULL`.
• Scheduler and calculation logic live in application/Supabase functions, not in schema.
