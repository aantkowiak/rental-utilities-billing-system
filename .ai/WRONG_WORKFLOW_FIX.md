# The Actual Problem: Wrong Workflow File!

## What We Discovered

All along, we were editing `.github/workflows/tests.yml`, but **Pull Requests use `.github/workflows/pull-request.yml`**!

### Evidence
Looking at the CI run screenshot, it showed:
- ✅ Checkout code
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Build application
- ✅ Install Playwright browsers
- ❌ Run E2E tests

**Missing**:
- ❌ Setup Supabase CLI
- ❌ Start Supabase
- ❌ Wait for Supabase
- ❌ All our Supabase-related steps!

### The Problem in `pull-request.yml`

The e2e-test job was:
```yaml
- name: Run E2E tests
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}  # Empty or wrong!
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}  # Empty or wrong!
```

1. ❌ No Supabase setup - trying to connect to non-existent local instance
2. ❌ Using secrets that don't exist or point to remote Supabase
3. ❌ No local database seeding
4. ❌ No test user creation

## The Fix Applied

Updated `pull-request.yml` to:

### 1. Add Job-Level Environment Variables
```yaml
e2e-test:
  env:
    CI: true
    SUPABASE_URL: http://127.0.0.1:54321
    SUPABASE_KEY: eyJhbGci...  # Local dev demo key
    # ... all other env vars
```

### 2. Add Supabase Setup Steps
```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1

- name: Start Supabase local instance
  run: supabase start

- name: Wait for Supabase to be ready
  run: |
    for i in {1..30}; do
      if curl -f http://127.0.0.1:54321/health; then
        echo "✅ Supabase is healthy"
        break
      fi
      sleep 2
    done
```

### 3. Add Preview Server Preparation
```yaml
- name: Prepare preview server environment
  run: |
    chmod +x scripts/preview-with-env.sh
    cat > .env.production << EOF
    SUPABASE_URL=${SUPABASE_URL}
    SUPABASE_KEY=${SUPABASE_KEY}
    # ... etc
    EOF
```

### 4. Cleanup
```yaml
- name: Stop Supabase
  if: always()
  run: supabase stop
```

## Why This Will Work Now

```
Pull Request → pull-request.yml → e2e-test job
    ↓
1. ✅ Env vars set at job level (http://127.0.0.1:54321)
2. ✅ Supabase CLI installed
3. ✅ Local Supabase started
4. ✅ Database migrations applied
5. ✅ Seed data loaded (user created)
6. ✅ Build with correct env vars
7. ✅ Preview server prepared with .env.production
8. ✅ Tests run with accessible Supabase
9. ✅ Login succeeds! 🎉
```

## Files Modified

1. ✅ `.github/workflows/tests.yml` - For push events (already fixed)
2. ✅ `.github/workflows/pull-request.yml` - For PRs (NOW fixed)
3. ✅ `src/db/supabase.server.ts` - Runtime env fallback
4. ✅ `scripts/preview-with-env.sh` - Preview wrapper with diagnostics
5. ✅ `playwright.config.ts` - Env var forwarding
6. ✅ `supabase/seed-ci.sql` - User password update

## Expected Next PR Run

The workflow should now show:
```
✅ Setup Supabase CLI
✅ Start Supabase local instance
✅ Wait for Supabase to be ready
✅ Supabase is healthy after X attempts
✅ Verify Supabase is running
✅ Build application
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_KEY is set: YES
✅ Build completed
✅ Prepare preview server environment
✅ Run E2E tests
  [WebServer] 🚀 Preview Server Startup
  [WebServer] ✅ Can reach Supabase
  [supabase.server] Configuration: { url: 'http://127.0.0.1:54321', hasAnonKey: true }
  [sign-in] Auth success: true
  ✓ 7 passed, 1 skipped
✅ Stop Supabase
```

## Lessons Learned

1. **Check which workflow is running** - Look at the workflow name in CI
2. **Multiple workflow files** - PRs and pushes may use different files
3. **Environment section matters** - `environment: integration` in PRs might have different settings
4. **Local vs Remote Supabase** - E2E tests need local instance, not remote
5. **Workflow inheritance** - Different workflows need same setup if running same tests

## Testing Locally

To simulate the PR workflow:
```bash
# Follow the same steps as the workflow
supabase start
npm ci --legacy-peer-deps
npx playwright install --with-deps chromium
npm run build
npm run test:e2e
supabase stop
```

## Success Criteria

- ✅ Supabase starts in CI
- ✅ Tests can connect to http://127.0.0.1:54321
- ✅ Login succeeds with tenant1@example.com
- ✅ All E2E tests pass
- ✅ PR gets green checkmark

Push this change and watch the PR workflow run! 🚀

