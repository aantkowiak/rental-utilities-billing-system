# Next CI Run - What to Check

## Critical Debug Output to Look For

### Step: "Debug environment before E2E tests"

This new step will tell us **exactly** where the problem is:

```
================================================
DEBUG: Environment Variables in Test Step
================================================
SUPABASE_URL: ???
SUPABASE_KEY length: ???
CI: ???
```

### Possible Outcomes:

#### ✅ **GOOD** - Env vars are set:
```
SUPABASE_URL: http://127.0.0.1:54321
SUPABASE_KEY length: 193
CI: true
```
→ **Means**: Job-level env vars ARE being inherited  
→ **Next**: Check why wrapper script isn't logging

#### ❌ **BAD** - Env vars are empty:
```
SUPABASE_URL: [NOT SET]
SUPABASE_KEY length: 0
CI: [NOT SET]
```
→ **Means**: Job-level env vars are NOT being inherited  
→ **Problem**: GitHub Actions configuration issue or branch not updated

## What Each Outcome Means

### If env vars ARE set in debug step:

The problem is in how Playwright/npm is handling them. We need to:
1. Check if wrapper script is being executed
2. Verify playwright config is reading process.env correctly
3. Possibly pass env vars directly through npm command

### If env vars are STILL empty in debug step:

The problem is at the GitHub Actions level:
1. Job-level env vars aren't working in this repository
2. Need to use repository secrets or different approach
3. May need to set them globally or use a different method

## Commands to Run If Still Failing

### Test locally with explicit env vars:

```bash
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Set env vars and run tests
export CI=true
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="$(supabase status | grep 'anon key' | awk '{print $3}')"
export SUPABASE_ANON_KEY="$SUPABASE_KEY"
export PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$(supabase status | grep 'service_role key' | awk '{print $3}')"

# Verify they're set
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_KEY length: ${#SUPABASE_KEY}"

# Run build
npm run build

# Check what's in dist
grep -r "127.0.0.1:54321" dist/server/ || echo "Not found"

# Run tests
npm run test:e2e
```

### Test wrapper script directly:

```bash
# Set env vars (from above)
# Then run wrapper
bash scripts/preview-with-env.sh
```

Expected output:
```
================================================
🚀 Preview Server Startup (via wrapper script)
================================================
...
SUPABASE_URL: http://127.0.0.1:54321
✅ Can reach Supabase at http://127.0.0.1:54321
```

## Alternative Approach If Nothing Works

If job-level env vars continue to fail, we can:

### Option 1: Use repository secrets + step-level env
```yaml
- name: Run E2E tests
  env:
    SUPABASE_URL: http://127.0.0.1:54321
    SUPABASE_KEY: ${{ secrets.LOCAL_SUPABASE_ANON_KEY }}
  run: npm run test:e2e
```

### Option 2: Create .env file in workflow
```yaml
- name: Create .env file
  run: |
    cat > .env << EOF
    SUPABASE_URL=http://127.0.0.1:54321
    SUPABASE_KEY=eyJhbGci...
    EOF
```

### Option 3: Pass directly to npm
```yaml
- name: Run E2E tests
  run: |
    SUPABASE_URL=http://127.0.0.1:54321 \
    SUPABASE_KEY=eyJhbGci... \
    npm run test:e2e
```

## The Debug Output Will Tell Us Everything

Push the changes and check the "Debug environment before E2E tests" step. 

**If variables are set there** → Problem is in Node.js/Playwright layer  
**If variables are empty there** → Problem is in GitHub Actions configuration

Either way, we'll know exactly what to fix next! 🎯

