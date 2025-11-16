# CI E2E Logs - Quick Cheat Sheet

## What to Look For (In Order)

### 1. ✅ Supabase Started
```
Step: "Wait for Supabase to be ready"
✅ Supabase is healthy after X attempts
```
**If missing → Supabase didn't start**

### 2. ✅ Direct Auth Works
```
Step: "Test Supabase connection"
HTTP Status: 200
✅ Direct auth test successful
```
**If 400 → Wrong password**  
**If ECONNREFUSED → Supabase not accessible**

### 3. ✅ Env Vars Set
```
Step: "Verify environment variables before build"
SUPABASE_URL: http://127.0.0.1:54321
SUPABASE_KEY length: 193
```
**If empty → Job env vars not configured**

### 4. ✅ Build Has Env Vars
```
Step: "Build application"
Build environment:
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_KEY is set: YES
```
**If NO → Env vars not passed to build**

### 5. ✅ Preview Server Can Reach Supabase
```
Step: "Run E2E tests" - [WebServer] section
🚀 Preview Server Startup (via wrapper script)
Environment variables BEFORE export:
  SUPABASE_URL: http://127.0.0.1:54321
Testing Supabase connectivity from wrapper script:
  ✅ Can reach Supabase at http://127.0.0.1:54321
```
**If ❌ CANNOT reach → THIS IS THE PROBLEM**

### 6. ✅ Server Module Loaded Correctly
```
[WebServer] output:
[supabase.server] Configuration: {
  url: 'http://127.0.0.1:54321',
  hasAnonKey: true,
  hasServiceKey: true,
  env: {
    importMetaUrl: 'http://127.0.0.1:54321',
    processEnvUrl: 'http://127.0.0.1:54321',
    importMetaKey: 'set',
    processEnvKey: 'set'
  }
}
```
**If url is wrong or keys are false → Env vars not loaded**

### 7. ✅ Login Succeeds
```
[WebServer] [sign-in] Auth attempt for: tenant1@example.com
[WebServer] [sign-in] Auth success: true
[WebServer] [sign-in] Session exists: true
[WebServer] [middleware] Auth set successfully: tenant
```
**If "fetch failed" → Can't reach Supabase**  
**If "Authentication failed" → Auth rejected**

## The Smoking Guns

### 🔴 Env vars missing from preview:
```
Environment variables BEFORE export:
  SUPABASE_URL: [NOT SET]  ← PROBLEM
  SUPABASE_KEY length: 0   ← PROBLEM
```

### 🔴 Can't reach Supabase from preview:
```
Testing Supabase connectivity from wrapper script:
  ❌ CANNOT reach Supabase at http://127.0.0.1:54321  ← PROBLEM
```

### 🔴 Wrong URL loaded:
```
[supabase.server] Configuration: {
  url: 'http://localhost',  ← PROBLEM (should be 127.0.0.1:54321)
  hasAnonKey: false,        ← PROBLEM
```

### 🔴 Build used wrong values:
```
Checking for localhost references:
http://localhost  ← PROBLEM (should be 127.0.0.1:54321)
```

## Quick Commands to Run Locally

```bash
# 1. Start Supabase
supabase start

# 2. Test direct auth
curl -X POST http://127.0.0.1:54321/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant1@example.com","password":"password123"}'

# 3. Check user exists
docker exec -it $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres \
  -c "SELECT email FROM auth.users WHERE email='tenant1@example.com';"

# 4. Build with env vars
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="YOUR_ANON_KEY"
export PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
npm run build

# 5. Test preview
npm run preview
# In another terminal:
curl -X POST http://localhost:3000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant1@example.com","password":"password123"}'

# 6. Run E2E
npm run test:e2e
```

## If Tests Still Fail

1. **Find which step failed** (use checklist above)
2. **Look at that specific log output**
3. **Check the "smoking gun" indicators**
4. **Run equivalent manual command** (from Quick Commands)
5. **Share that specific log section** when asking for help

## Expected Success Pattern

```
✅ Supabase is healthy
✅ Direct auth test successful
✅ Env vars: SUPABASE_URL=http://127.0.0.1:54321, KEY length: 193
✅ Build completed
✅ Can reach Supabase at http://127.0.0.1:54321
✅ [supabase.server] Configuration: { url: 'http://127.0.0.1:54321', hasAnonKey: true }
✅ [sign-in] Auth success: true
✅ 7 passed, 1 skipped
```

Every ✅ must be present for tests to pass!

