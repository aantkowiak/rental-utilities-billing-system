# Authentication Flow - Before vs After

## ❌ BEFORE (Broken)

```
┌─────────────────┐
│  User Browser   │
│  (with cookies) │
└────────┬────────┘
         │
         │ Request to /admin/properties
         ▼
┌─────────────────────────────────────────┐
│           MIDDLEWARE                    │
│                                         │
│  ❌ supabase = supabaseAdmin            │
│     (global singleton, service role)    │
│                                         │
│  ❌ getUser() returns admin user        │
│     (ignores user's actual session!)    │
│                                         │
│  ❌ All users appear as same admin      │
└────────┬────────────────────────────────┘
         │
         │ context.locals.supabase = supabaseAdmin
         │ context.locals.auth = { admin user }
         ▼
┌─────────────────────────────────────────┐
│          API ROUTE                      │
│                                         │
│  uses locals.supabase                   │
│  thinks all requests are from admin     │
│                                         │
│  ❌ SECURITY BREACH                     │
└─────────────────────────────────────────┘

PROBLEM: All authenticated requests bypass security!
```

## ✅ AFTER (Fixed)

```
┌─────────────────┐
│  User Browser   │
│  (with cookies) │  ← Contains: sb-access-token, sb-refresh-token
└────────┬────────┘
         │
         │ Request to /admin/properties + cookies
         ▼
┌─────────────────────────────────────────┐
│           MIDDLEWARE                    │
│                                         │
│  ✅ supabase = createSupabaseServer     │
│     Client(context.cookies)             │
│                                         │
│  ✅ Extracts JWT from cookies           │
│  ✅ getUser() validates JWT             │
│  ✅ Returns actual user from token      │
│                                         │
│  ✅ Fetches user profile with role      │
└────────┬────────────────────────────────┘
         │
         │ context.locals.supabase = authenticated client
         │ context.locals.auth = { actual user, role, propertyId }
         ▼
┌─────────────────────────────────────────┐
│          API ROUTE                      │
│                                         │
│  requireAuth() validates locals.auth    │
│  uses authenticated locals.supabase     │
│                                         │
│  ✅ Proper RLS enforcement              │
│  ✅ Tenant isolation works              │
└─────────────────────────────────────────┘

SUCCESS: Each request properly authenticated!
```

## Key Technical Changes

### Cookie-Based Session Flow

```
1. Sign In
   POST /api/v1/auth/sign-in
   ↓
   Supabase SSR: signInWithPassword()
   ↓
   Automatically sets cookies:
   - sb-<project>-auth-token (JWT)
   - sb-<project>-refresh-token

2. Protected Request
   GET /admin/properties
   ↓
   Browser sends cookies automatically
   ↓
   Middleware: createSupabaseServerClient(cookies)
   ↓
   Supabase SSR extracts JWT from cookies
   ↓
   Validates JWT signature & expiration
   ↓
   Returns authenticated client

3. Sign Out
   POST /api/v1/auth/sign-out
   ↓
   Supabase SSR: signOut()
   ↓
   Automatically clears cookies
```

### Per-Request Client Creation

```
BEFORE:
┌─────────────────────────────────┐
│  Global Singleton Clients       │
│                                 │
│  supabaseAdmin ←────────────────┼─── All Requests
│  (service role key)             │
│                                 │
│  ❌ Shared across all requests  │
│  ❌ No user context             │
└─────────────────────────────────┘

AFTER:
┌─────────────────────────────────┐
│  Per-Request Clients            │
│                                 │
│  Request 1 → Client 1 (User A)  │
│  Request 2 → Client 2 (User B)  │
│  Request 3 → Client 3 (User C)  │
│                                 │
│  ✅ Isolated per request        │
│  ✅ Each has user context       │
└─────────────────────────────────┘
```

## RLS Policy Integration

### BEFORE (Bypassed)
```
API Route
  ↓
locals.supabase (admin client)
  ↓
Database Query
  ↓
❌ RLS BYPASSED (service role)
  ↓
Returns ALL data (security breach!)
```

### AFTER (Enforced)
```
API Route
  ↓
locals.supabase (authenticated user client)
  ↓
Database Query
  ↓
✅ RLS APPLIED (user's JWT)
  ↓
Returns only user's data (tenant isolation)
```

## Security Impact

### Attack Scenarios Prevented

1. **Session Hijacking**
   - BEFORE: Could use any valid token to act as admin
   - AFTER: Each request validated with proper JWT

2. **Cross-Tenant Data Access**
   - BEFORE: All requests used admin client (bypass RLS)
   - AFTER: RLS policies properly enforced per user

3. **Session Leakage**
   - BEFORE: Global client shared across requests
   - AFTER: Isolated client per request

4. **Token Replay**
   - BEFORE: No proper JWT validation
   - AFTER: Supabase SSR validates signature & expiration

## Testing the Fix

### Manual Test Cases

```bash
# 1. Test tenant isolation
curl -H "Cookie: sb-xxx-auth-token=TENANT_A_TOKEN" \
  http://localhost:4321/api/v1/readings
# Should return only Tenant A's readings

curl -H "Cookie: sb-xxx-auth-token=TENANT_B_TOKEN" \
  http://localhost:4321/api/v1/readings
# Should return only Tenant B's readings

# 2. Test admin access
curl -H "Cookie: sb-xxx-auth-token=ADMIN_TOKEN" \
  http://localhost:4321/api/v1/profiles
# Should return all profiles (admin endpoint)

curl -H "Cookie: sb-xxx-auth-token=TENANT_TOKEN" \
  http://localhost:4321/api/v1/profiles
# Should return 403 Forbidden

# 3. Test session expiration
curl -H "Cookie: sb-xxx-auth-token=EXPIRED_TOKEN" \
  http://localhost:4321/app/readings/add
# Should redirect to /auth/login

# 4. Test no token
curl http://localhost:4321/admin/properties
# Should redirect to /auth/login
```

### Integration Test Ideas

```typescript
describe("Authentication", () => {
  it("should isolate tenant data", async () => {
    // Sign in as tenant A
    const tokenA = await signIn("tenantA@example.com", "password");
    
    // Fetch readings
    const readingsA = await fetchReadings(tokenA);
    
    // Sign in as tenant B
    const tokenB = await signIn("tenantB@example.com", "password");
    
    // Fetch readings
    const readingsB = await fetchReadings(tokenB);
    
    // Verify no overlap
    expect(readingsA).not.toContainAny(readingsB);
  });
  
  it("should enforce admin-only endpoints", async () => {
    const tenantToken = await signIn("tenant@example.com", "password");
    
    // Try to access admin endpoint
    const response = await fetch("/api/v1/profiles", {
      headers: { Cookie: `auth-token=${tenantToken}` }
    });
    
    expect(response.status).toBe(403);
  });
});
```

