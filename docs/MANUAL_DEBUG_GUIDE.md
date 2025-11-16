# Manual Debugging Guide for CI E2E Login Issues

## Quick CI Logs Checklist

When the CI run fails, check these specific log sections in order:

### 1. Supabase Startup (Step: "Wait for Supabase to be ready")
```
Look for:
✅ Supabase is healthy after X attempts
```
**If missing**: Supabase didn't start properly

### 2. Direct Auth Test (Step: "Test Supabase connection")
```
Look for:
HTTP Status: 200
✅ Direct auth test successful
```
**If 400**: Password is wrong or user doesn't exist  
**If connection error**: Supabase not accessible from workflow

### 3. Environment Variables (Step: "Verify environment variables before build")
```
Look for:
SUPABASE_URL: http://127.0.0.1:54321
SUPABASE_KEY length: 180+
PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
```
**If empty/wrong**: CI environment variables not set

### 4. Build Process (Step: "Build application")
```
Look for:
Build environment:
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_KEY is set: YES
✅ Build completed
```
**If NO**: Env vars not passed to build step

### 5. Built Files Inspection (Step: "Inspect built files")
```
Look for:
✅ Found hardcoded Supabase URL in built files
OR
⚠️  No hardcoded Supabase URL found (might use runtime env vars)
```
**If localhost found**: Wrong URL was baked into build

### 6. Preview Server Startup (Step: "Run E2E tests" - [WebServer] output)
```
Look for:
================================================
🚀 Preview Server Startup (via wrapper script)
================================================
Environment variables BEFORE export:
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_KEY length: 180+
Testing Supabase connectivity from wrapper script:
  ✅ Can reach Supabase at http://127.0.0.1:54321
[supabase.server] Configuration: { url: 'http://127.0.0.1:54321', hasAnonKey: true, ... }
```
**If CANNOT reach**: Preview server can't connect to Supabase  
**If wrong URL**: Environment variables not propagated correctly

### 7. Login Attempt (Step: "Run E2E tests" - [WebServer] output)
```
Look for:
[sign-in] Auth attempt for: tenant1@example.com
[sign-in] Auth success: true
[sign-in] Session exists: true
[middleware] Auth set successfully: tenant
```
**If "fetch failed"**: Backend can't reach Supabase  
**If "Authentication failed"**: Credentials wrong or Supabase issue

## Manual Commands to Run Locally

### Step 1: Verify Supabase is Running Locally

```bash
# Start Supabase
supabase start

# Check status
supabase status

# Test health endpoint
curl http://127.0.0.1:54321/health

# Should return: {"date":"...","message":"ok"}
```

### Step 2: Test Direct Authentication

```bash
# Set your Supabase anon key (get from supabase status)
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test login
curl -X POST http://127.0.0.1:54321/auth/v1/token?grant_type=password \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant1@example.com","password":"password123"}'

# Should return access_token and user info
```

### Step 3: Verify User Exists with Correct Password

```bash
# Connect to database
docker exec -it $(docker ps -q -f name=supabase-db) psql -U postgres -d postgres

# Check user
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'tenant1@example.com';

# Check profile
SELECT user_id, role, property_id, display_name 
FROM profiles 
WHERE user_id = '0367969f-66af-4c5b-85b0-cc0143d6877f';

# Verify they match!

# Update password if needed (from psql):
UPDATE auth.users 
SET encrypted_password = crypt('password123', gen_salt('bf'))
WHERE email = 'tenant1@example.com';
```

### Step 4: Test Build with Environment Variables

```bash
# Set environment variables
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="eyJhbGci..."  # Your anon key
export PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."

# Build
npm run build

# Check what got baked into the build
grep -r "127.0.0.1:54321" dist/server/ || echo "Not hardcoded (good for runtime vars)"
grep -r "http://localhost" dist/server/ | head -5
```

### Step 5: Test Preview Server Manually

```bash
# Make sure env vars are set (from Step 4)
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_KEY length: ${#SUPABASE_KEY}"

# Start preview server in one terminal
npm run preview

# In another terminal, test the login endpoint
curl -X POST http://localhost:3000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant1@example.com","password":"password123"}'

# Should return user data and role
```

### Step 6: Test with Wrapper Script

```bash
# Set env vars
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="eyJhbGci..."
export PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."

# Make executable
chmod +x scripts/preview-with-env.sh

# Run wrapper script
./scripts/preview-with-env.sh

# Should show diagnostic output and start server
```

### Step 7: Run E2E Tests Locally

```bash
# Set ALL env vars
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="eyJhbGci..."
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
export PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."

# Run tests
npm run test:e2e

# Or run specific test
npx playwright test e2e/tenant-reading-flow.spec.ts --headed
```

## Debugging Specific Issues

### Issue: "ECONNREFUSED 127.0.0.1:54321"

**Cause**: Preview server can't reach Supabase

**Check**:
1. Is Supabase running? `docker ps | grep supabase`
2. Can you curl Supabase? `curl http://127.0.0.1:54321/health`
3. Are env vars set in preview server? Check wrapper script output
4. Is firewall blocking? Check Docker network: `docker network ls`

**Manual test**:
```bash
# From preview server environment, test connectivity
curl http://127.0.0.1:54321/health
curl http://localhost:54321/health
```

### Issue: "Invalid email or password" (Polish: "Nieprawidłowy email lub hasło")

**Cause**: Backend reached, but auth failed

**Check**:
1. Does user exist? See "Step 3" above
2. Is password correct? Test direct auth in "Step 2"
3. Is the anon key correct? Check wrapper script output
4. Are user and profile linked? Verify IDs match

### Issue: Environment variables show as empty in CI

**Check in workflow logs**:
```
Step: "Verify environment variables before build"
```

**If all empty**: Job-level `env:` not set in `.github/workflows/tests.yml`

**If some empty**: Check which specific env var is missing

### Issue: Built files contain "http://localhost"

**Cause**: Build ran without env vars, used fallback

**Fix**: Ensure env vars are passed to build step

**Manual test**:
```bash
# Build without env vars (should fail or use fallback)
unset SUPABASE_URL
npm run build
grep -r "http://localhost" dist/server/

# Build with env vars (should use correct URL)
export SUPABASE_URL="http://127.0.0.1:54321"
npm run build
grep -r "127.0.0.1:54321" dist/server/
```

## Docker Network Issues

If the preview server runs in a different network context:

```bash
# Check what network Supabase is on
docker inspect $(docker ps -q -f name=supabase-kong) | grep NetworkMode

# Check if host can reach it
curl http://127.0.0.1:54321/health

# Try alternative addresses
curl http://localhost:54321/health
curl http://host.docker.internal:54321/health  # If preview in Docker
```

## Interpreting Diagnostic Logs

### Good Output Example:
```
✅ Supabase is healthy after 3 attempts
✅ Direct auth test successful
SUPABASE_URL: http://127.0.0.1:54321
SUPABASE_KEY length: 193
🚀 Preview Server Startup (via wrapper script)
  ✅ Can reach Supabase at http://127.0.0.1:54321
[supabase.server] Configuration: { url: 'http://127.0.0.1:54321', hasAnonKey: true }
[sign-in] Auth success: true
✓ 7 passed
```

### Bad Output Example 1 (Supabase not accessible from preview):
```
✅ Supabase is healthy after 3 attempts
✅ Direct auth test successful
SUPABASE_URL: http://127.0.0.1:54321
🚀 Preview Server Startup (via wrapper script)
  ❌ CANNOT reach Supabase at http://127.0.0.1:54321  ← PROBLEM HERE
[WebServer] Error: connect ECONNREFUSED 127.0.0.1:54321
```

### Bad Output Example 2 (Wrong URL):
```
✅ Supabase is healthy
SUPABASE_URL: http://127.0.0.1:54321
🚀 Preview Server Startup (via wrapper script)
  SUPABASE_URL: http://localhost  ← PROBLEM: Wrong URL
[supabase.server] Configuration: { url: 'http://localhost' }  ← PROBLEM
[WebServer] Error: connect ECONNREFUSED 127.0.0.1:54321
```

### Bad Output Example 3 (Missing env vars):
```
✅ Supabase is healthy
SUPABASE_URL: http://127.0.0.1:54321
🚀 Preview Server Startup (via wrapper script)
  SUPABASE_URL: [NOT SET]  ← PROBLEM
  SUPABASE_KEY length: 0  ← PROBLEM
[supabase.server] Configuration: { url: 'http://localhost', hasAnonKey: false }
```

## Quick Fixes

### Fix 1: Reset Password
```sql
UPDATE auth.users 
SET encrypted_password = crypt('password123', gen_salt('bf'))
WHERE email = 'tenant1@example.com';
```

### Fix 2: Verify Profile Exists
```sql
INSERT INTO profiles (user_id, role, property_id, display_name)
VALUES ('0367969f-66af-4c5b-85b0-cc0143d6877f', 'tenant', '10000000-0000-0000-0000-000000000001', 'Test Tenant')
ON CONFLICT (user_id) DO UPDATE SET role = 'tenant';
```

### Fix 3: Recreate .env.production
```bash
cat > .env.production << 'EOF'
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your-actual-anon-key-here
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
EOF
```

## Getting Help

When asking for help, include these log sections:
1. Supabase startup and health check
2. Direct auth test result
3. Environment variables output
4. Wrapper script output (especially "Can reach Supabase" line)
5. `[supabase.server] Configuration` log
6. Any `[sign-in]` or authentication error messages

