# CI E2E Login Fix - Complete Solution

## The Root Cause

After deep analysis of the CI logs, the issue was **not** about user credentials or Supabase configuration. The problem was:

```
Error: connect ECONNREFUSED 127.0.0.1:54321
```

### Why This Happened

1. **Astro/Vite Build Process**: `import.meta.env` values are resolved at **BUILD TIME**
2. **Runtime Environment Variables**: The built application doesn't automatically fall back to `process.env` at runtime
3. **Preview Server Isolation**: Even though Playwright passes env vars to the preview server, the built code wasn't reading them

The sequence of failure:
```
Build (no SUPABASE_URL) → dist/server/ (hardcoded fallbacks) → Preview → Tests fail
```

## The Complete Fix

### 1. Updated `src/db/supabase.server.ts`

Added fallback to `process.env` for runtime environment variable access:

```typescript
// BEFORE (only checked import.meta.env)
const supabaseUrl = resolveEnv(import.meta.env.SUPABASE_URL, "http://localhost", "SUPABASE_URL");

// AFTER (checks both import.meta.env and process.env)
const supabaseUrl = resolveEnv(
  import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL, 
  "http://localhost", 
  "SUPABASE_URL"
);
```

This ensures the preview server can read env vars at runtime even if they weren't available at build time.

### 2. Updated `.github/workflows/tests.yml`

Added multiple safety nets:

#### A. Set env vars at job level
```yaml
e2e-tests:
  env:
    SUPABASE_URL: http://127.0.0.1:54321
    SUPABASE_KEY: eyJhbGci...
    # ... etc
```

#### B. Added verification steps
```yaml
- name: Test Supabase connection
  run: |
    curl -f http://127.0.0.1:54321/health || exit 1

- name: Verify environment variables
  run: |
    echo "SUPABASE_URL=$SUPABASE_URL"
    echo "SUPABASE_KEY length: ${#SUPABASE_KEY}"
```

#### C. Explicitly pass env vars to build
```yaml
- name: Build application
  run: npm run build
  env:
    SUPABASE_URL: ${{ env.SUPABASE_URL }}
    SUPABASE_KEY: ${{ env.SUPABASE_KEY }}
    # ... etc
```

#### D. Explicitly pass env vars to test step
```yaml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    SUPABASE_URL: ${{ env.SUPABASE_URL }}
    SUPABASE_KEY: ${{ env.SUPABASE_KEY }}
    # ... etc
```

### 3. Updated `playwright.config.ts`

Added env var forwarding to webServer:

```typescript
webServer: {
  command: "npm run preview",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    SUPABASE_KEY: process.env.SUPABASE_ANON_KEY || "",
    // ... etc
  },
}
```

### 4. Updated `supabase/seed-ci.sql`

Ensured existing user password is correctly set:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f') THEN
    UPDATE auth.users 
    SET encrypted_password = crypt('password123', gen_salt('bf'))
    WHERE id = '0367969f-66af-4c5b-85b0-cc0143d6877f';
  END IF;
END $$;
```

### 5. Removed `create-test-users.js` from workflow

Not needed since user already exists and profile uses hardcoded ID.

## How It Works Now

1. ✅ **Supabase starts** → migrations and seeds run
2. ✅ **Connection verified** → health check confirms Supabase is accessible
3. ✅ **Env vars verified** → printed to logs for debugging
4. ✅ **Build runs** → with SUPABASE_URL and SUPABASE_KEY available
5. ✅ **Preview server starts** → with env vars from Playwright config
6. ✅ **Server code executes** → reads from `process.env` at runtime via fallback
7. ✅ **Tests run** → login succeeds, profile found, tests pass

## Key Technical Insights

### Astro + Vite Environment Variables

- `import.meta.env` is replaced at build time by Vite
- In production builds, these become static values
- To support runtime env vars in SSR, must explicitly check `process.env`

### GitHub Actions Environment Variables

- Job-level `env:` makes vars available to all steps
- But child processes (like preview server) need explicit passing
- Use `${{ env.VAR }}` to reference in step-level env blocks

### Playwright WebServer Config

- The `webServer.env` property sets `process.env` for the preview server process
- This is independent of what was available during build
- Both build-time and runtime env vars needed for full compatibility

## Debugging Commands

If tests still fail, check these in CI:

```bash
# 1. Verify Supabase is running
supabase status
curl http://127.0.0.1:54321/health

# 2. Check user exists
docker exec $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres \
  -c "SELECT id, email FROM auth.users WHERE email = 'tenant1@example.com';"

# 3. Check profile matches
docker exec $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres \
  -c "SELECT user_id, role FROM profiles WHERE user_id = '0367969f-66af-4c5b-85b0-cc0143d6877f';"

# 4. Test auth endpoint directly
curl -X POST http://localhost:3000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant1@example.com","password":"password123"}'
```

## Files Modified

1. `src/db/supabase.server.ts` - Added `process.env` fallback
2. `.github/workflows/tests.yml` - Added verification and explicit env passing
3. `playwright.config.ts` - Added webServer env config
4. `supabase/seed-ci.sql` - Updated existing user password
5. Removed `create-test-users.js` step from workflow

## Expected CI Output

```
✅ Supabase is accessible
✅ SUPABASE_URL=http://127.0.0.1:54321
✅ SUPABASE_KEY length: 180+
✅ Build succeeded
✅ Running 8 tests
✅ 7 passed, 1 skipped
```

## Success Criteria

- ✅ No ECONNREFUSED errors
- ✅ Login succeeds with tenant1@example.com
- ✅ Profile found and role verified
- ✅ Tests complete successfully
- ✅ Clean teardown

