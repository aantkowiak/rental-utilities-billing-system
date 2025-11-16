# CI E2E Login Issue - Final Fix

## The Real Problem

The login was failing in CI, but it wasn't a user/password/profile issue. The error was:

```
Error: connect ECONNREFUSED 127.0.0.1:54321
```

**Root Cause**: The preview server (running the built application during E2E tests) couldn't connect to Supabase because:

1. **Missing Environment Variables in Preview Server**: The CI job-level env vars weren't being passed to the `npm run preview` process
2. **Wrong Environment Variable Name**: The server code expects `SUPABASE_KEY` but CI was only setting `SUPABASE_ANON_KEY`

## What Was Fixed

### 1. Updated `playwright.config.ts`

Added explicit environment variable passing to the webServer:

```typescript
webServer: {
  command: "npm run preview",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
  env: {
    // Pass through Supabase env vars to the preview server
    // Note: Server code expects SUPABASE_KEY, but CI sets SUPABASE_ANON_KEY
    SUPABASE_URL: process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    SUPABASE_KEY: process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || "",
  },
}
```

This ensures the preview server has access to Supabase connection details.

### 2. Updated `.github/workflows/tests.yml`

Added `SUPABASE_KEY` to the environment variables (kept `SUPABASE_ANON_KEY` for compatibility):

```yaml
env:
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_KEY: eyJhbGci... # Added this - what the server code expects
  SUPABASE_ANON_KEY: eyJhbGci... # Keep for backward compatibility
  SUPABASE_SERVICE_ROLE_KEY: eyJhbGci...
  PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
  PUBLIC_SUPABASE_ANON_KEY: eyJhbGci...
```

### 3. Updated `supabase/seed-ci.sql`

Ensured the existing user's password is updated correctly:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f') THEN
    UPDATE auth.users 
    SET 
      encrypted_password = crypt('password123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f';
  END IF;
END $$;
```

### 4. Removed Unnecessary Script

Removed the `create-test-users.js` step from CI workflow since:
- The user already exists in Supabase
- Creating users with random IDs would conflict with the hardcoded profile ID
- The seed script handles password updates

## Why It Works Now

1. ✅ Supabase starts and runs migrations/seeds
2. ✅ Seed script updates existing user's password to `password123`
3. ✅ Seed script creates profile and contract for the user
4. ✅ Application builds with correct env vars
5. ✅ Preview server starts with `SUPABASE_KEY` and `SUPABASE_URL` available
6. ✅ Tests run and can successfully authenticate
7. ✅ Login succeeds and profile is found

## Files Modified

1. `playwright.config.ts` - Added env var passing to webServer
2. `.github/workflows/tests.yml` - Added `SUPABASE_KEY` and removed `create-test-users.js` step
3. `supabase/seed-ci.sql` - Updated to handle existing user password

## Testing

The tests should now pass in CI. If they still fail, check:

1. Supabase is running: `supabase status` in CI logs
2. Environment variables are set: Look for the env vars in CI logs
3. Preview server starts successfully: Check for connection errors in test output
4. User password was updated: Look for the seed script success message

## Key Learnings

- **Environment variables must be explicitly passed to child processes** - Job-level env vars don't automatically propagate to webServer in Playwright
- **Variable naming consistency matters** - `SUPABASE_KEY` vs `SUPABASE_ANON_KEY` caused silent failures
- **The `.env.test` file isn't accessible in CI** - It's gitignored, so CI needs explicit env var definitions
- **Don't create users with random IDs** - When using hardcoded profile IDs, the auth user must match

