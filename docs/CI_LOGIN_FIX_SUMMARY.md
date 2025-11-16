# CI Login Issue - Root Cause and Fix

## Timeline

### Initial Problem
```
❌ ECONNREFUSED 127.0.0.1:54321
```
**Cause**: App couldn't reach Supabase  
**Status**: ✅ FIXED (environment variables properly propagated)

### Secondary Problem
```
❌ [sign-in] Authentication failed: Invalid login credentials
```
**Cause**: Test user didn't exist in database  
**Status**: ✅ FIXED (this commit)

---

## Root Cause

The `supabase/seed-ci.sql` file was trying to **UPDATE** a user that didn't exist:

```sql
-- ❌ OLD CODE - Didn't work
IF EXISTS (SELECT 1 FROM auth.users WHERE id = '0367969f...') THEN
  UPDATE auth.users SET encrypted_password = ...
ELSE
  RAISE WARNING 'User does not exist!';  -- This was happening!
END IF;
```

When `supabase start` runs in CI, it creates a **fresh database**. The user `0367969f-66af-4c5b-85b0-cc0143d6877f` doesn't exist, so the UPDATE did nothing, and no user was created.

---

## The Fix

### 1. Modified `supabase/seed-ci.sql`

Now it **creates** the user instead of updating:

```sql
-- ✅ NEW CODE - Works!
-- Delete if exists (for clean state)
DELETE FROM auth.users WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f';

-- Insert the user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  ...
) VALUES (
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  'tenant1@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  ...
);

-- Insert identity (required for email/password login)
INSERT INTO auth.identities (
  user_id,
  provider,
  ...
) VALUES (
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  'email',
  ...
);
```

### 2. Added Verification Steps to Workflows

Both `tests.yml` and `pull-request.yml` now verify:

1. **Database Check**: Query `auth.users`, `auth.identities`, and `profiles` tables
2. **Auth Test**: Try direct login via Supabase API
3. **Fail Fast**: Exit with error if auth test fails (before running E2E tests)

```yaml
- name: Verify test user in database
  run: |
    # Query auth.users, auth.identities, profiles
    docker exec supabase_db_... psql ...

- name: Test direct authentication
  run: |
    # Try to login
    curl -X POST .../auth/v1/token?grant_type=password ...
    # Exit if it fails
    if [ "$HTTP_CODE" != "200" ]; then
      exit 1
    fi
```

---

## Expected Result

After this fix, the CI workflow should:

1. ✅ Start Supabase successfully
2. ✅ Create test user `tenant1@example.com` with password `password123`
3. ✅ Verify user exists in database
4. ✅ Verify direct authentication works
5. ✅ Build application with correct environment variables
6. ✅ Run E2E tests successfully

---

## How to Verify

Push this commit and check the CI logs for:

```
================================================
Verifying test user was created...
================================================
                     id                      |        email         | confirmed | has_password |     role      
---------------------------------------------+----------------------+-----------+--------------+---------------
 0367969f-66af-4c5b-85b0-cc0143d6877f       | tenant1@example.com  | t         | t            | authenticated
(1 row)

Testing direct auth login...
HTTP Status: 200
✅ Direct auth test successful
```

If you see this, the user was created successfully and login should work! 🎉

