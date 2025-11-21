# CI E2E Login Troubleshooting Guide

## Current Setup

- **Test User ID**: `0367969f-66af-4c5b-85b0-cc0143d6877f`
- **Email**: `tenant1@example.com`
- **Password**: `password123`
- **User created**: Pre-existing in Supabase (not created by seed)
- **Profile/Contract**: Created by `seed-ci.sql`

## Troubleshooting Steps

### 1. Verify User Exists in CI

Add a verification step to your CI workflow after `supabase start`:

```bash
- name: Verify test user exists
  run: |
    USER_COUNT=$(curl -s http://127.0.0.1:54321/rest/v1/rpc/verify_user \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"user_id": "0367969f-66af-4c5b-85b0-cc0143d6877f"}')
    echo "User exists: $USER_COUNT"
```

Or check via SQL:

```bash
- name: Check user in database
  run: |
    docker exec $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres -c \
      "SELECT id, email, email_confirmed_at FROM auth.users WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f';"
```

### 2. Verify Seed Script Runs Successfully

Check CI logs for the seed output. You should see:

```
NOTICE:  Updated password for existing user 0367969f-66af-4c5b-85b0-cc0143d6877f
NOTICE:  =================================================
NOTICE:  CI E2E Seed Data Summary:
NOTICE:  =================================================
NOTICE:  Auth users created: 1
NOTICE:  Properties created: 2
NOTICE:  Profiles created: 1
NOTICE:  Contracts created: 1
```

If you see the WARNING instead:
```
WARNING:  User 0367969f-66af-4c5b-85b0-cc0143d6877f does not exist!
```

Then the user hasn't been created yet. You need to create it manually.

### 3. Verify Password is Correct

The password must be hashed with bcrypt. The seed script uses `crypt('password123', gen_salt('bf'))`.

To manually test the password in CI:

```bash
- name: Test login credentials
  run: |
    curl -X POST http://127.0.0.1:54321/auth/v1/token?grant_type=password \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -d '{"email":"tenant1@example.com","password":"password123"}' \
      | jq
```

Expected: 200 OK with access_token
If 400: Password is wrong or user doesn't exist

### 4. Check Profile Exists and Matches

```bash
- name: Verify profile exists
  run: |
    docker exec $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres -c \
      "SELECT user_id, role, property_id, display_name FROM profiles WHERE user_id = '0367969f-66af-4c5b-85b0-cc0143d6877f';"
```

Expected output:
```
                user_id                 | role   | property_id                          | display_name
----------------------------------------|--------|--------------------------------------|-------------
0367969f-66af-4c5b-85b0-cc0143d6877f   | tenant | 10000000-0000-0000-0000-000000000001 | Test Tenant
```

### 5. Check Application Logs in CI

The middleware and sign-in endpoint have console.log statements. Check CI logs for:

```
[sign-in] Auth attempt for: tenant1@example.com
[sign-in] Auth success: true
[sign-in] Session exists: true
[middleware] Protected route: /app/readings/add
[middleware] User: 0367969f-66af-4c5b-85b0-cc0143d6877f tenant1@example.com
[middleware] Profile: { role: 'tenant', property_id: '...' }
```

If you see errors, they'll tell you exactly what's failing.

### 6. Verify Environment Variables in CI

The tests use these environment variables:

```yaml
env:
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_ANON_KEY: eyJhbGci...
  PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
  PUBLIC_SUPABASE_ANON_KEY: eyJhbGci...
```

These should be set at the **job level**, not step level, so the build step has access.

### 7. Common Issues

#### Issue: User doesn't exist
**Solution**: Create the user manually in Supabase dashboard or via SQL:

```sql
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
  aud
) VALUES (
  '0367969f-66af-4c5b-85b0-cc0143d6877f',
  '00000000-0000-0000-0000-000000000000',
  'tenant1@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Test Tenant"}',
  false,
  'authenticated',
  'authenticated'
);
```

#### Issue: Password doesn't match
**Solution**: Run the seed script manually or update password:

```sql
UPDATE auth.users 
SET encrypted_password = crypt('password123', gen_salt('bf'))
WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f';
```

#### Issue: Profile not found
**Solution**: The seed script should create it, but verify it ran successfully.

#### Issue: `create-test-users.js` creates duplicate users
**Solution**: Remove the `create-test-users.js` step from CI workflow since the user already exists.

### 8. Local vs CI Differences

**Local**: 
- User might be persistent across runs (stored in Docker volume)
- Seed data might be cached

**CI**:
- Fresh Supabase instance every run
- User must exist or be created each time
- Seed script runs on every `supabase start`

## Recommended CI Workflow Order

```yaml
- name: Start Supabase local instance
  run: supabase start

- name: Wait for Supabase to be ready
  run: sleep 5

- name: Verify Supabase is running
  run: supabase status

- name: Verify test user and seed data  # ADD THIS
  run: |
    echo "Checking test user..."
    docker exec $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres -c \
      "SELECT id, email FROM auth.users WHERE email = 'tenant1@example.com';"
    echo "Checking profile..."
    docker exec $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres -c \
      "SELECT user_id, role FROM profiles WHERE user_id = '0367969f-66af-4c5b-85b0-cc0143d6877f';"

# REMOVE THIS STEP - not needed if user already exists
# - name: Create test users
#   run: node scripts/create-test-users.js

- name: Build application
  run: npm run build

- name: Run E2E tests
  run: npm run test:e2e
```

## Files Modified

- `supabase/seed-ci.sql` - Now updates existing user's password instead of creating new user
- `.github/workflows/tests.yml` - Should remove `create-test-users.js` step

## Quick Test Command

Test the full flow locally:

```bash
# Reset Supabase
supabase db reset

# Verify user exists
psql postgresql://postgres:postgres@localhost:54321/postgres \
  -c "SELECT id, email FROM auth.users WHERE email = 'tenant1@example.com';"

# Run build and tests
npm run build
npm run test:e2e
```

