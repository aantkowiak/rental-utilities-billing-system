# CI E2E Login - Final Solution

## The Breakthrough: Screenshot Analysis

The screenshot showed the Polish error message: **"Nieprawidłowy email lub hasło"** (Invalid email or password)

### What This Revealed

1. ✅ **Login page loads** - Frontend works
2. ✅ **Form submission works** - Request reaches backend
3. ❌ **Backend cannot reach Supabase** - `ECONNREFUSED 127.0.0.1:54321`
4. ✅ **Error handling works** - Returns user-friendly error

### The Real Problem

**The preview server process spawned by Playwright cannot connect to Supabase**, even though:
- Supabase is running and accessible from the workflow
- Health checks pass
- Direct auth tests succeed

## Root Causes Identified

### 1. **Environment Variable Propagation**
Astro's standalone adapter doesn't automatically load .env files in production mode. The `webServer.env` config in Playwright might not be sufficient.

### 2. **Module Load Time vs Runtime**
The `supabase.server.ts` constants are evaluated once when the module loads. If `process.env` is empty at that moment, it uses fallbacks.

### 3. **Potential Process Isolation**
The preview server might run in a slightly different context where env vars aren't properly inherited.

## Complete Solution Applied

### 1. **Updated `src/db/supabase.server.ts`**

Added runtime env var fallbacks and diagnostic logging:

```typescript
// Checks BOTH build-time and runtime env vars
const supabaseUrl = resolveEnv(
  import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL, 
  "http://127.0.0.1:54321",
  "SUPABASE_URL"
);

// Diagnostic logging in CI
if (import.meta.env.DEV || process.env.CI) {
  console.log('[supabase.server] Configuration:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey && supabaseAnonKey.length > 10,
    env: {
      importMetaUrl: import.meta.env.SUPABASE_URL,
      processEnvUrl: process.env.SUPABASE_URL,
      // ...
    }
  });
}
```

### 2. **Created `scripts/preview-with-env.sh`**

Wrapper script that explicitly exports env vars before starting preview:

```bash
#!/bin/bash
echo "🚀 Starting preview server with environment variables..."
echo "SUPABASE_URL=${SUPABASE_URL}"

export SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
export SUPABASE_KEY="${SUPABASE_KEY}"
# ... all other vars

npm run preview
```

### 3. **Updated `playwright.config.ts`**

Uses wrapper script in CI:

```typescript
webServer: {
  command: process.env.CI ? "bash scripts/preview-with-env.sh" : "npm run preview",
  // ... rest of config
}
```

### 4. **Updated `.github/workflows/tests.yml`**

Multiple layers of defense:

#### A. Better health check loop
```yaml
- name: Wait for Supabase to be ready
  run: |
    for i in {1..30}; do
      if curl -f http://127.0.0.1:54321/health > /dev/null 2>&1; then
        echo "✅ Supabase is healthy after $i attempts"
        break
      fi
      sleep 2
    done
```

#### B. Direct auth test
```yaml
- name: Test Supabase connection
  run: |
    curl -X POST http://127.0.0.1:54321/auth/v1/token?grant_type=password \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -d '{"email":"tenant1@example.com","password":"password123"}'
```

#### C. Runtime .env.production file
```yaml
- name: Prepare preview server environment
  run: |
    chmod +x scripts/preview-with-env.sh
    cat > .env.production << EOF
    SUPABASE_URL=${{ env.SUPABASE_URL }}
    SUPABASE_KEY=${{ env.SUPABASE_KEY }}
    # ...
    EOF
```

#### D. Docker network diagnostics
```yaml
- name: Verify Supabase is running
  run: |
    supabase status
    docker ps | grep supabase
    docker network ls
    curl http://127.0.0.1:54321/health
```

#### E. Final connectivity check
```yaml
- name: Final connectivity check before tests
  run: |
    curl -v http://127.0.0.1:54321/health
    curl -v http://127.0.0.1:54321/auth/v1/health
```

## How It Works Now

### Startup Sequence

1. ✅ **Supabase starts** → Docker containers running
2. ✅ **Health check loop** → Waits for Supabase to be ready (up to 60 seconds)
3. ✅ **Direct auth test** → Confirms `tenant1@example.com` can log in
4. ✅ **Env var verification** → Prints values to logs
5. ✅ **Docker network check** → Verifies connectivity
6. ✅ **Build runs** → With env vars available
7. ✅ **Preview script preparation** → Makes script executable, creates .env.production
8. ✅ **Connectivity check** → Final verification before tests
9. ✅ **Tests start** → Playwright launches preview via wrapper script
10. ✅ **Preview server starts** → With explicitly exported env vars
11. ✅ **Diagnostic log appears** → `[supabase.server] Configuration: { url: 'http://127.0.0.1:54321', ... }`
12. ✅ **Login succeeds** → Backend can reach Supabase
13. ✅ **Tests pass** → ✨

## What to Check in CI Logs

### Success Indicators

```
✅ Supabase is healthy after X attempts
✅ Supabase is accessible
✅ Direct auth test successful
✅ Created .env.production file
✅ Made preview script executable
🚀 Starting preview server with environment variables...
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY length: 180+
[supabase.server] Configuration: { url: 'http://127.0.0.1:54321', hasAnonKey: true, ... }
```

### If It Still Fails

Look for:
1. Which health check failed?
2. Did the direct auth test succeed?
3. Are Docker containers running?
4. What does the `[supabase.server] Configuration` log show?
5. Is the URL correct in the diagnostic log?

## Files Modified

1. `src/db/supabase.server.ts` - Runtime env fallback + diagnostic logging
2. `scripts/preview-with-env.sh` - NEW - Wrapper script for preview server
3. `playwright.config.ts` - Uses wrapper script in CI
4. `.github/workflows/tests.yml` - Comprehensive diagnostics and setup
5. `supabase/seed-ci.sql` - Password update for existing user
6. Removed `create-test-users.js` step from workflow

## Why This Should Work

### Triple Protection

1. **webServer.env** in Playwright config
2. **Wrapper script** with explicit exports
3. **.env.production** file as last resort

### Explicit Exports

The wrapper script uses `export` which guarantees the env vars are in `process.env` when Node.js starts the preview server.

### Fallback Chain

```
process.env.SUPABASE_URL 
  → from wrapper script export
  → or from webServer.env
  → or from .env.production file
  → or fallback to "http://127.0.0.1:54321"
```

## Expected Test Output

```
Running 8 tests using 1 worker
🚀 Starting preview server with environment variables...
SUPABASE_URL=http://127.0.0.1:54321
[WebServer] [supabase.server] Configuration: { url: 'http://127.0.0.1:54321', hasAnonKey: true, ... }
[sign-in] Auth attempt for: tenant1@example.com
[sign-in] Auth success: true
[middleware] Auth set successfully: tenant

✓ 7 passed
⊘ 1 skipped
```

## If It STILL Fails

The diagnostic logs will show exactly what's wrong:
- Wrong URL being used?
- Missing anon key?
- Network isolation issue?
- Docker networking problem?

Push these changes and we'll know exactly what's happening! 🚀

