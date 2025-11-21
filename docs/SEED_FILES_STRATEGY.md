# Seed Files Strategy

## Overview

We maintain **two separate seed files** for different environments:

1. **`seed.sql`** - Rich data for **local development**
2. **`seed-ci.sql`** - Minimal data for **CI/E2E tests**

---

## File Purposes

### `seed.sql` (Local Development)

**Runs automatically when**: `supabase start` or `supabase db reset`

**Contains**:
- ✅ 3 properties (Apartment A, B, House C)
- ✅ 13 months of monthly advances for all properties
- ✅ 13 months of historical readings with realistic consumption patterns
- ✅ Admin replacement readings (corrections)
- ✅ Seasonal heating variations (winter vs summer)
- ❌ No auth users (expects `node scripts/create-test-users.js` after seeding)

**Purpose**: Provide a rich, realistic dataset for manual testing and development.

---

### `seed-ci.sql` (CI/E2E Tests)

**Runs when**: Explicitly executed in GitHub Actions workflows

**Contains**:
- ✅ **TRUNCATE statements** (clears everything first!)
- ✅ 2 properties (Test Property A, B)
- ✅ 1 auth user (`tenant1@example.com` / `password123`)
- ✅ 1 auth identity (email provider)
- ✅ 1 profile (linked to tenant user)
- ✅ 1 contract (assigns tenant to Property A)
- ❌ No monthly advances (tests create as needed)
- ❌ No readings (tests create as needed)

**Purpose**: Fast, minimal, predictable starting state for automated tests.

---

## How It Works in CI

### Workflow Sequence:

```yaml
1. supabase start
   ↓ Runs seed.sql
   ↓ Creates: 3 properties, 300+ readings, 39+ monthly advances
   ↓
2. Run seed-ci.sql explicitly
   ↓ TRUNCATE all tables
   ↓ Creates: 2 properties, 1 user, 1 profile, 1 contract
   ↓
3. Run E2E tests
   ✅ Clean, minimal, fast starting state!
```

### Key Insight:

`seed-ci.sql` starts with **TRUNCATE** statements, so it doesn't matter what `seed.sql` created - everything gets wiped and replaced with minimal test data.

---

## Files

### `seed.sql` (lines 11-18)
```sql
-- Does NOT truncate (for incremental local dev)
INSERT INTO properties ... -- 3 properties with rich names
-- 300+ lines of readings generation
-- 39+ monthly advances
-- Seasonal variations, admin corrections, etc.
```

### `seed-ci.sql` (lines 11-18)
```sql
TRUNCATE TABLE report_email_attempts CASCADE;
TRUNCATE TABLE report_emails CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE readings CASCADE;
TRUNCATE TABLE monthly_advances CASCADE;
TRUNCATE TABLE contracts CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE properties CASCADE;

INSERT INTO properties ... -- 2 properties with simple names
INSERT INTO auth.users ... -- 1 test user
INSERT INTO auth.identities ... -- 1 identity
INSERT INTO profiles ... -- 1 profile
INSERT INTO contracts ... -- 1 contract
-- No readings, no monthly advances
```

---

## Workflows

### `.github/workflows/tests.yml` and `.github/workflows/pull-request.yml`

```yaml
- name: Start Supabase local instance
  run: supabase start  # Runs seed.sql

- name: Seed CI test data
  run: |
    docker exec -i supabase_db_rental-utilities-billing-system \
      psql -U postgres -d postgres < supabase/seed-ci.sql
    # ↑ Truncates everything and reseeds with minimal data
```

---

## Benefits

### For Local Development:
- ✅ Rich, realistic data to explore the app
- ✅ Multiple properties, historical trends
- ✅ Seasonal patterns, admin corrections
- ✅ Great for manual testing and UI/UX work

### For CI/E2E Tests:
- ✅ **Fast**: No need to generate 300+ readings
- ✅ **Predictable**: Always starts with same minimal data
- ✅ **Clean**: TRUNCATE ensures no leftover state
- ✅ **Focused**: Tests create only the data they need
- ✅ **Auth included**: User already exists, ready to login

---

## Summary

| Aspect | `seed.sql` (Local) | `seed-ci.sql` (CI) |
|--------|-------------------|-------------------|
| **Runs when** | `supabase start` | Explicit in CI workflow |
| **Properties** | 3 (detailed names) | 2 (simple names) |
| **Auth users** | 0 (manual creation) | 1 (auto-created) |
| **Readings** | 300+ historical | 0 (tests create) |
| **Monthly advances** | 39+ historical | 0 (tests create) |
| **Truncates first?** | No | Yes ✅ |
| **Purpose** | Rich dev data | Minimal test data |

**Result**: Best of both worlds! 🎉

