# THE ACTUAL ROOT CAUSE - CI Login Failure

## TL;DR

**`seed-ci.sql` (which creates auth users) was NEVER running in CI!**

---

## What Was Happening

### CI Workflow:
```yaml
- name: Start Supabase local instance
  run: supabase start
```

### What `supabase start` Does:
1. ✅ Starts Docker containers
2. ✅ Runs migrations
3. ✅ Runs `supabase/seed.sql` (default file)
4. ❌ Does NOT run `supabase/seed-ci.sql`

### What's in `seed.sql`:
```sql
-- Note: Test users should be created via Auth API after database seed
-- Run: node scripts/create-test-users.js

-- Profiles will be created by the create-test-users.js script
-- after users are created via the Auth API
```

**Result:**
- ✅ Properties, readings, advances created
- ❌ NO auth users created (0 rows in auth.users!)
- ❌ NO auth identities created (0 rows in auth.identities!)
- ❌ NO profiles created (0 rows in profiles!)

---

## The Evidence

From CI logs:
```
================================================
Verifying test user was created...
================================================
1. Checking auth.users table:
(0 rows)  ← ❌ USER DOESN'T EXIST!

2. Checking auth.identities table:
(0 rows)  ← ❌ IDENTITY DOESN'T EXIST!

3. Checking profiles table:
(0 rows)  ← ❌ PROFILE DOESN'T EXIST!

Testing direct auth login...
HTTP Status: 400
{"error":"Invalid login credentials"}  ← ❌ OF COURSE IT FAILS!
```

---

## The Fix

### Added to both `tests.yml` and `pull-request.yml`:

```yaml
- name: Start Supabase local instance
  run: supabase start

- name: Seed CI test data
  run: |
    echo "Running CI-specific seed data..."
    docker exec -i supabase_db_rental-utilities-billing-system psql -U postgres -d postgres < supabase/seed-ci.sql
    echo "✅ CI seed data loaded"
```

This explicitly runs `seed-ci.sql` which:
- ✅ Creates `auth.users` entry for tenant1@example.com
- ✅ Creates `auth.identities` entry (required for email/password login)
- ✅ Creates `profiles` entry (required by your app)
- ✅ Creates contracts and properties

---

## Why This Was Confusing

1. **Locally**: You manually created the user in your Supabase dashboard → Login works
2. **In CI**: Fresh database, no users → Login fails
3. **Misleading**: We have `seed-ci.sql` with all the right code → But it never runs!

The file existed and was perfect, but the workflow never executed it!

---

## Expected Result After Fix

```
Running CI-specific seed data...
✅ CI seed data loaded

1. Checking auth.users table:
                     id                      |        email         | email_confirmed
---------------------------------------------+----------------------+-----------------
 0367969f-66af-4c5b-85b0-cc0143d6877f       | tenant1@example.com  | t
(1 row)  ← ✅ USER EXISTS!

2. Checking auth.identities table:
 provider | identity_data                                             
----------+-----------------------------------------------------------
 email    | {"sub": "0367969f-...", "email": "tenant1@example.com"}
(1 row)  ← ✅ IDENTITY EXISTS!

3. Checking profiles table:
 display_name
--------------
 Test Tenant
(1 row)  ← ✅ PROFILE EXISTS!

4. Testing password encryption:
 password_matches
------------------
 t  ← ✅ PASSWORD CORRECT!

Testing direct auth login...
HTTP Status: 200
✅ Direct auth test successful

[WebServer] [sign-in] Authentication successful!
✅ E2E tests pass!
```

---

## Lessons Learned

1. **Default seed file**: `supabase start` only runs `supabase/seed.sql` by default
2. **Custom seed files**: Must be explicitly executed
3. **Verify assumptions**: Always check if the data you expect actually exists!
4. **Diagnostics are key**: The database queries showed (0 rows), which led us to the root cause

---

## Files Changed

1. ✅ `.github/workflows/tests.yml` - Added explicit seed-ci.sql execution
2. ✅ `.github/workflows/pull-request.yml` - Added explicit seed-ci.sql execution
3. ✅ `supabase/seed-ci.sql` - Already had correct INSERT statements for auth.users and auth.identities

**This should finally fix the CI login issue!** 🎉

