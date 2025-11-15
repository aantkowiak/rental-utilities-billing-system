# Authentication & Authorization Architecture Specification
## Rental Utilities Billing System

**Document Version:** 1.0  
**Date:** November 15, 2025  
**Status:** Draft for Implementation

---

## Executive Summary

This document provides a comprehensive technical architecture for implementing user registration, authentication (login), and password recovery functionality for the Rental Utilities Billing System. The specification aligns with PRD requirements (FR-001, FR-002) while extending functionality to support practical user management needs.

The architecture leverages Supabase Auth as the authentication provider, integrating with the existing Astro 5 + React 19 frontend and maintaining compatibility with the current application structure. The solution implements both passwordless (magic link) and password-based authentication methods, role-based access control (tenant/admin), and comprehensive session management.

### Key Design Principles

1. **PRD Compliance:** Primary authentication via Supabase Magic Link (passwordless) as specified in FR-001
2. **Flexibility:** Secondary support for email/password authentication for administrative convenience
3. **Security:** Proper JWT validation, RLS enforcement, and minimal PII storage
4. **Compatibility:** Zero breaking changes to existing application behavior
5. **User Experience:** Clear error messages, loading states, and accessibility features

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Page Structure & Routing

#### 1.1.1 Authentication Pages (Public Routes)

**Location:** `src/pages/auth/`

All authentication pages are publicly accessible and use the standard Layout component with minimal navigation.

##### **A. Login Page** (`/auth/login`)
- **File:** `src/pages/auth/login.astro`
- **Status:** EXISTS (requires enhancement)
- **Purpose:** Primary entry point for user authentication
- **Components:**
  - Header with application branding
  - LoginForm component (React, client-side interactive)
  - Links to registration and password recovery
  - Skip-to-content link for accessibility

**Required Changes:**
- Add navigation links to `/auth/register` and `/auth/forgot-password`
- Update copy to reflect dual authentication support (magic link primary, password secondary)
- Add environment-aware behavior (dev mode stub indication)

##### **B. Registration Page** (`/auth/register`)
- **File:** `src/pages/auth/register.astro` (NEW)
- **Purpose:** User self-registration (admin-created only in MVP scope)
- **Components:**
  - RegistrationForm component (React)
  - Terms and conditions acknowledgment
  - Link back to login
  - Skip-to-content link

**Scope Note:** Per PRD constraints, MVP implementation will show informational message directing users to contact administrator. Full self-registration is out of scope for MVP but component structure is prepared for future enhancement.

##### **C. Password Recovery Page** (`/auth/forgot-password`)
- **File:** `src/pages/auth/forgot-password.astro` (NEW)
- **Purpose:** Initiate password reset flow
- **Components:**
  - ForgotPasswordForm component (React)
  - Instructions and security messaging
  - Link back to login
  - Skip-to-content link

##### **D. Password Reset Page** (`/auth/reset-password`)
- **File:** `src/pages/auth/reset-password.astro` (NEW)
- **Purpose:** Complete password reset with token
- **Components:**
  - ResetPasswordForm component (React)
  - Password strength indicator
  - Security requirements display
  - Link back to login

##### **E. Authentication Callback Page** (`/auth/callback`)
- **File:** `src/pages/auth/callback.astro` (EXISTS as untracked, requires implementation)
- **Purpose:** Handle Supabase auth redirects (magic link, OAuth, password reset)
- **Behavior:**
  - Extract auth tokens from URL hash/query parameters
  - Validate session with Supabase
  - Fetch user profile (role, propertyId)
  - Store session in HTTP-only cookie
  - Redirect to role-appropriate landing page
  - Display error messages for invalid/expired tokens

**Technical Details:**
- Uses `supabase.auth.exchangeCodeForSession()` for PKCE flow
- Handles both hash-based tokens (magic link) and query-based codes (OAuth)
- Implements proper error handling for expired links

#### 1.1.2 Protected Application Pages

**Locations:** `src/pages/admin/`, `src/pages/app/`

All application pages require authentication and implement role-based authorization.

##### **Root Page** (`/`)
- **File:** `src/pages/index.astro`
- **Current Behavior:** Displays Welcome component
- **Required Changes:**
  - Add server-side auth check
  - If unauthenticated: redirect to `/auth/login`
  - If authenticated: redirect based on role
    - Admin → `/admin/properties` (default admin landing)
    - Tenant → `/app/readings/add` (default tenant landing)
  - Remove Welcome component usage

##### **Admin Pages** (`/admin/*`)
- **Existing Pages:** properties, contracts, monthly-advances, readings, reports, profile
- **Required Changes:**
  - Add auth guard at top of each page frontmatter
  - Require admin role
  - Redirect to `/auth/login` if not authenticated
  - Return 403 if authenticated but not admin role
  - No changes to component logic

##### **Tenant Pages** (`/app/*`)
- **Existing Pages:** readings/add, readings/history, profile
- **Required Changes:**
  - Add auth guard at top of each page frontmatter
  - Accept tenant or admin role (admin can view tenant perspective)
  - Redirect to `/auth/login` if not authenticated
  - Validate property_id scope for tenants
  - No changes to component logic

### 1.2 React Components Architecture

#### 1.2.1 Authentication Forms

All authentication forms follow consistent patterns:
- Client-side rendering (`client:load` directive)
- Controlled inputs with React state
- Zod schema validation
- Error boundary handling
- Loading states
- Accessibility features (ARIA labels, live regions, focus management)
- Polish (pl-PL) language throughout

##### **A. LoginForm Component**
- **File:** `src/components/auth/LoginForm.tsx`
- **Status:** EXISTS (requires enhancement)
- **Responsibility:**
  - Display email input field
  - **Primary flow:** "Send Magic Link" button (current behavior)
  - **Secondary flow:** Toggle to show password field + "Sign In" button (NEW)
  - Handle form submission to appropriate endpoint
  - Display loading states during API calls
  - Show success/error messages
  - Provide links to registration and password recovery

**State Management:**
```typescript
{
  email: string;
  password: string; // NEW
  authMethod: 'magic-link' | 'password'; // NEW
  status: 'idle' | 'pending' | 'success' | 'error';
  fieldError: string | null;
  apiError: string | null;
  successMessage: string | null;
}
```

**Validation Cases:**
- Empty email → "Podaj adres e-mail."
- Invalid email format → "Podaj poprawny adres e-mail."
- Empty password (when password method selected) → "Podaj hasło."
- API validation errors → Display server message
- Network errors → "Wystąpił błąd połączenia. Spróbuj ponownie."

**User Flows:**

*Magic Link Flow (Primary):*
1. User enters email
2. Clicks "Wyślij link logowania"
3. System calls `POST /api/v1/auth/magic-link`
4. Success: "Jeśli konto istnieje, wysłaliśmy link logowania na wskazany adres."
5. User checks email, clicks link
6. Redirects to `/auth/callback` → processes token → redirects to app

*Password Flow (Secondary):*
1. User clicks "Zaloguj się hasłem" toggle
2. Form shows email + password fields
3. User enters credentials
4. Clicks "Zaloguj się"
5. System calls `POST /api/v1/auth/sign-in`
6. Success: Store session, redirect to role-based landing page
7. Error: Display "Nieprawidłowy email lub hasło."

**Enhanced Features:**
- Remember last authentication method in localStorage
- Auto-focus email field on mount
- Prevent double submission
- Clear errors on input change

##### **B. RegistrationForm Component**
- **File:** `src/components/auth/RegistrationForm.tsx` (NEW)
- **Status:** NEW (MVP shows informational message only)
- **Responsibility:**
  - Display informational message: "Rejestracja użytkowników jest zarządzana przez administratora systemu. Skontaktuj się z administratorem, aby uzyskać dostęp."
  - Provide contact information or link
  - Future: Full registration flow with email, password, role selection (admin-only)

**MVP Implementation:**
```typescript
export function RegistrationForm() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-muted bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Rejestracja użytkowników jest zarządzana przez administratora systemu.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Skontaktuj się z administratorem, aby uzyskać dostęp.
        </p>
      </div>
      <Button asChild variant="outline" className="w-full">
        <a href="/auth/login">Wróć do logowania</a>
      </Button>
    </div>
  );
}
```

##### **C. ForgotPasswordForm Component**
- **File:** `src/components/auth/ForgotPasswordForm.tsx` (NEW)
- **Responsibility:**
  - Display email input field
  - Submit to password recovery endpoint
  - Show success message (always, to prevent user enumeration)
  - Handle errors gracefully

**State Management:**
```typescript
{
  email: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  fieldError: string | null;
  apiError: string | null;
}
```

**Validation Cases:**
- Empty email → "Podaj adres e-mail."
- Invalid email format → "Podaj poprawny adres e-mail."
- API errors → Generic error, no user enumeration

**User Flow:**
1. User enters email
2. Clicks "Wyślij link resetowania hasła"
3. System calls `POST /api/v1/auth/recover-password`
4. Success message: "Jeśli konto istnieje, wysłaliśmy instrukcje resetowania hasła."
5. User checks email, clicks reset link
6. Redirects to `/auth/reset-password` with token

**Security Considerations:**
- Always return success message (prevent user enumeration)
- Rate limiting via middleware (5 requests per 10 minutes per IP)
- Log attempts for security monitoring

##### **D. ResetPasswordForm Component**
- **File:** `src/components/auth/ResetPasswordForm.tsx` (NEW)
- **Responsibility:**
  - Display new password and confirm password fields
  - Show password strength indicator
  - Submit to password reset endpoint with token
  - Handle success and error states
  - Redirect to login on success

**State Management:**
```typescript
{
  password: string;
  passwordConfirm: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  fieldErrors: { password?: string; passwordConfirm?: string };
  apiError: string | null;
  passwordStrength: 'weak' | 'medium' | 'strong';
}
```

**Validation Cases:**
- Empty password → "Podaj hasło."
- Password too short → "Hasło musi mieć co najmniej 8 znaków."
- Passwords don't match → "Hasła muszą być identyczne."
- Password too weak → "Hasło jest zbyt słabe. Użyj kombinacji liter, cyfr i znaków specjalnych."
- Expired/invalid token → "Link resetowania hasła wygasł lub jest nieprawidłowy."

**User Flow:**
1. User arrives from email link with token in URL
2. Enters new password and confirmation
3. Password strength indicator updates in real-time
4. Clicks "Zresetuj hasło"
5. System calls `POST /api/v1/auth/reset-password` with token
6. Success: "Hasło zostało zmienione. Możesz się teraz zalogować."
7. Auto-redirect to `/auth/login` after 3 seconds

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: One special character (recommended)

##### **E. LogoutButton Component**
- **File:** `src/components/auth/LogoutButton.tsx` (EXISTS as untracked, requires implementation)
- **Responsibility:**
  - Display logout button
  - Handle logout action (clear session)
  - Redirect to login page
  - Show loading state during logout

**Implementation:**
```typescript
export function LogoutButton({ className }: { className?: string }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiPost('/api/v1/auth/logout');
      // Clear any client-side state
      // Session is cleared via HTTP-only cookie by server
      window.location.href = '/auth/login';
    } catch (error) {
      // Log error but still redirect
      console.error('Logout error:', error);
      window.location.href = '/auth/login';
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant="ghost"
      className={className}
    >
      {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
    </Button>
  );
}
```

#### 1.2.2 Navigation Components

##### **A. RoleNav Component**
- **File:** `src/components/nav/RoleNav.astro`
- **Status:** EXISTS (requires enhancement)
- **Required Changes:**
  - Add LogoutButton component at end of navigation links
  - Pass current user context (role, display name)
  - Style logout button consistently with other nav items

**Updated Structure:**
```astro
<nav aria-label="Nawigacja główna">
  <div class="flex items-center justify-between">
    <ul class="flex flex-wrap items-center gap-2">
      {/* existing navigation links */}
    </ul>
    <div class="ml-auto">
      <LogoutButton client:load />
    </div>
  </div>
</nav>
```

##### **B. Layout Component**
- **File:** `src/layouts/Layout.astro`
- **Status:** EXISTS (no changes required)
- **Note:** Already provides consistent structure for all pages

### 1.3 Authentication State Management

#### 1.3.1 Session Storage Strategy

**Primary Method: HTTP-Only Cookies (Server-Side)**

Session tokens are stored in HTTP-only cookies set by the server, providing security against XSS attacks. This is the recommended approach for Astro SSR applications.

**Cookie Configuration:**
- Name: `sb-access-token`, `sb-refresh-token`
- HttpOnly: `true`
- Secure: `true` (production), `false` (development)
- SameSite: `Lax`
- Path: `/`
- Max-Age: 30 days (2,592,000 seconds) per FR-001

**Alternative Method: LocalStorage (Client-Side, Optional)**

For client-side state hydration in React components, session metadata (non-sensitive) can be stored in localStorage:

```typescript
// src/lib/client/auth-storage.ts (NEW)
interface SessionMetadata {
  userId: string;
  role: 'tenant' | 'admin';
  propertyId: string | null;
  email: string;
  displayName: string | null;
  expiresAt: number;
}

export const sessionStorage = {
  save(metadata: SessionMetadata): void {
    localStorage.setItem('session-metadata', JSON.stringify(metadata));
  },
  
  get(): SessionMetadata | null {
    const data = localStorage.getItem('session-metadata');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  
  clear(): void {
    localStorage.removeItem('session-metadata');
  },
  
  isExpired(): boolean {
    const metadata = this.get();
    if (!metadata) return true;
    return Date.now() > metadata.expiresAt;
  }
};
```

**Important:** Actual JWT tokens are NEVER stored in localStorage for security reasons. Only non-sensitive metadata for UI hydration.

#### 1.3.2 Client-Side Auth Context (Optional Enhancement)

For React components that need auth state, a context provider can be implemented:

**File:** `src/lib/client/AuthContext.tsx` (NEW, optional)

```typescript
interface AuthContextValue {
  user: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  role: 'tenant' | 'admin' | null;
  propertyId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Note:** This is optional for MVP. Current implementation uses server-side props passed to pages, which is sufficient. Context is useful if many components need auth state.

### 1.4 Error Handling & Validation

#### 1.4.1 Client-Side Validation

All forms implement multi-layer validation:

1. **Browser HTML5 Validation:** `required`, `type="email"`, `minlength`
2. **Custom JavaScript Validation:** Via `setCustomValidity()` API
3. **Zod Schema Validation:** On form submission
4. **Server-Side Validation:** Final validation via API

**Error Display Strategy:**
- Field-level errors: Red border + error message below field
- Form-level errors: Alert component at top of form
- Success messages: Green alert with icon
- Loading states: Disabled inputs + spinner on button

**ARIA Accessibility:**
- `aria-invalid="true"` on error fields
- `aria-describedby` linking field to error message
- `aria-live="polite"` for status messages
- Focus management (auto-focus first error field)

#### 1.4.2 Error Messages Catalog

**Authentication Errors:**
- `invalid_credentials` → "Nieprawidłowy email lub hasło."
- `user_not_found` → Generic success message (prevent enumeration)
- `expired_token` → "Link wygasł. Poproś o nowy link."
- `invalid_token` → "Link jest nieprawidłowy. Poproś o nowy link."
- `email_not_confirmed` → "Potwierdź swój adres email przed zalogowaniem."
- `too_many_requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut."

**Validation Errors:**
- `email_required` → "Podaj adres e-mail."
- `email_invalid` → "Podaj poprawny adres e-mail."
- `password_required` → "Podaj hasło."
- `password_too_short` → "Hasło musi mieć co najmniej 8 znaków."
- `passwords_mismatch` → "Hasła muszą być identyczne."
- `password_too_weak` → "Hasło jest zbyt słabe."

**System Errors:**
- `network_error` → "Wystąpił błąd połączenia. Sprawdź internet i spróbuj ponownie."
- `internal_error` → "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."
- `unexpected_error` → "Wystąpił nieoczekiwany błąd. Skontaktuj się z administratorem."

### 1.5 Loading & Transition States

#### 1.5.1 Form Submission States

- **Idle:** Normal state, all controls enabled
- **Pending:** Submit button disabled, spinner shown, inputs disabled
- **Success:** Success message shown, form may be disabled
- **Error:** Error message shown, form re-enabled

#### 1.5.2 Page Transitions

- **Authentication Callback:** Loading spinner while processing tokens
- **Role-Based Redirect:** Brief loading state during redirect
- **Logout:** Button shows "Wylogowywanie..." during API call

#### 1.5.3 Accessibility Considerations

- Loading states announced via `aria-live` regions
- Focus management preserved during state changes
- Skip-to-content links on all auth pages
- Keyboard navigation fully supported
- Screen reader friendly labels and hints

---

## 2. BACKEND LOGIC

### 2.1 API Endpoints Architecture

#### 2.1.1 Authentication Endpoints

**Base Path:** `/api/v1/auth/`

All authentication endpoints use POST method and return JSON responses.

##### **A. Request Magic Link** (`POST /api/v1/auth/magic-link`)
- **File:** `src/pages/api/v1/auth/magic-link.ts`
- **Status:** EXISTS (no changes required)
- **Purpose:** Generate and send magic link for passwordless login

**Request Schema:**
```typescript
{
  email: string; // Valid email format
}
```

**Validation:** Zod schema `RequestMagicLinkSchema`

**Response:**
```typescript
// Always returns 200 to prevent user enumeration
{
  status: "sent"
}
```

**Business Logic:**
1. Validate email format
2. Call `supabaseAdmin.auth.admin.generateLink()` with type "magiclink"
3. Set redirectTo to `${origin}/auth/callback`
4. Supabase sends email (or logs in dev mode)
5. Always return success (even if user doesn't exist)
6. Log errors internally without exposing to client

**Error Handling:**
- 400: Invalid request format
- 200: All other cases (success or silent failure)

**Rate Limiting:** 5 requests per 10 minutes per IP (via middleware)

##### **B. Sign In with Password** (`POST /api/v1/auth/sign-in`)
- **File:** `src/pages/api/v1/auth/sign-in.ts` (NEW)
- **Purpose:** Authenticate user with email and password

**Request Schema:**
```typescript
{
  email: string;
  password: string;
}
```

**Validation:** Zod schema `SignInSchema` (NEW)
```typescript
// src/lib/validators/auth.ts
export const SignInSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
```

**Response:**
```typescript
// Success: 200
{
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
  role: 'tenant' | 'admin';
  propertyId: string | null;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}
```

**Business Logic:**
1. Validate request body with SignInSchema
2. Call `supabase.auth.signInWithPassword({ email, password })`
3. If auth fails: return 401 Unauthorized
4. If auth succeeds: fetch user profile from profiles table
5. Set HTTP-only cookies with access_token and refresh_token
6. Return user data and role information

**Error Handling:**
- 400: Invalid request format
- 401: Invalid credentials
- 500: Server error

**Rate Limiting:** 10 requests per 10 minutes per IP (via middleware)

##### **C. Logout** (`POST /api/v1/auth/logout`)
- **File:** `src/pages/api/v1/auth/logout.ts` (NEW)
- **Purpose:** End user session and clear tokens

**Request:** No body required

**Response:**
```typescript
// Success: 200
{
  status: "logged_out"
}
```

**Business Logic:**
1. Extract access token from cookie
2. If token exists: call `supabase.auth.signOut()`
3. Clear session cookies (set Max-Age=0)
4. Return success response

**Error Handling:**
- 200: Always return success (even if no session exists)

##### **D. Recover Password** (`POST /api/v1/auth/recover-password`)
- **File:** `src/pages/api/v1/auth/recover-password.ts` (NEW)
- **Purpose:** Initiate password reset flow

**Request Schema:**
```typescript
{
  email: string;
}
```

**Validation:** Zod schema `RecoverPasswordSchema` (NEW)

**Response:**
```typescript
// Always returns 200 to prevent user enumeration
{
  status: "sent"
}
```

**Business Logic:**
1. Validate email format
2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
3. Set redirectTo to `${origin}/auth/reset-password`
4. Supabase sends password reset email
5. Always return success (even if user doesn't exist)
6. Log attempts for security monitoring

**Error Handling:**
- 400: Invalid request format
- 200: All other cases (success or silent failure)

**Rate Limiting:** 3 requests per 10 minutes per IP per email (via middleware)

##### **E. Reset Password** (`POST /api/v1/auth/reset-password`)
- **File:** `src/pages/api/v1/auth/reset-password.ts` (NEW)
- **Purpose:** Complete password reset with token

**Request Schema:**
```typescript
{
  token: string; // From URL parameter or body
  password: string; // New password
}
```

**Validation:** Zod schema `ResetPasswordSchema` (NEW)
```typescript
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
});
```

**Response:**
```typescript
// Success: 200
{
  status: "password_reset"
}
```

**Business Logic:**
1. Validate request body
2. Call `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`
3. If token invalid/expired: return 400 error
4. Call `supabase.auth.updateUser({ password })`
5. Return success response

**Error Handling:**
- 400: Invalid/expired token or weak password
- 500: Server error

##### **F. Authentication Callback Handler** (Server-Side Logic)
- **File:** `src/pages/auth/callback.astro`
- **Purpose:** Process Supabase auth redirects and establish session

**URL Parameters:**
- Hash parameters: `#access_token=...&refresh_token=...` (magic link)
- Query parameters: `?code=...` (PKCE OAuth flow)
- Query parameter: `?error=...` (error cases)

**Server-Side Logic:**
```astro
---
const url = new URL(Astro.request.url);
const code = url.searchParams.get('code');
const error = url.searchParams.get('error');

if (error) {
  // Handle error: display error page
  return Astro.redirect('/auth/login?error=' + encodeURIComponent(error));
}

if (code) {
  // Exchange code for session (PKCE flow)
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (exchangeError || !data.session) {
    return Astro.redirect('/auth/login?error=invalid_code');
  }
  
  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, property_id, display_name')
    .eq('user_id', data.user.id)
    .single();
  
  if (!profile) {
    return Astro.redirect('/auth/login?error=profile_not_found');
  }
  
  // Set session cookies
  Astro.cookies.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  
  Astro.cookies.set('sb-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  
  // Redirect based on role
  const destination = profile.role === 'admin' ? '/admin/properties' : '/app/readings/add';
  return Astro.redirect(destination);
}

// No code, expect hash params (handled client-side for magic link)
// Render page with JavaScript to extract hash params
---
```

**Client-Side Logic (for hash-based tokens):**
```typescript
// Embedded in callback page
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const accessToken = hashParams.get('access_token');
const refreshToken = hashParams.get('refresh_token');

if (accessToken && refreshToken) {
  // Call API to set session cookies
  await fetch('/api/v1/auth/set-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
  
  // Redirect will be handled by API response
} else {
  window.location.href = '/auth/login?error=no_tokens';
}
```

##### **G. Set Session** (`POST /api/v1/auth/set-session`)
- **File:** `src/pages/api/v1/auth/set-session.ts` (NEW)
- **Purpose:** Convert client-provided tokens to HTTP-only cookies

**Request Schema:**
```typescript
{
  accessToken: string;
  refreshToken: string;
}
```

**Response:**
```typescript
{
  redirectTo: string; // Role-based landing page
}
```

**Business Logic:**
1. Validate tokens by calling `supabase.auth.getUser(accessToken)`
2. Fetch user profile to determine role
3. Set HTTP-only cookies
4. Return redirect destination based on role

#### 2.1.2 User Profile Endpoints

##### **A. Get Current User** (`GET /api/v1/me`)
- **File:** `src/pages/api/v1/me.ts`
- **Status:** EXISTS (no changes required)
- **Purpose:** Fetch authenticated user profile
- **Authentication:** Required (JWT from cookie)

**Response:**
```typescript
{
  profile: {
    user_id: string;
    email: string;
    role: 'tenant' | 'admin';
    property_id: string | null;
    display_name: string | null;
    created_at: string;
    updated_at: string;
  }
}
```

##### **B. Update Current User** (`PATCH /api/v1/me`)
- **File:** `src/pages/api/v1/me.ts`
- **Status:** EXISTS (no changes required)
- **Purpose:** Update user email (display_name could be added)
- **Authentication:** Required

### 2.2 Data Models & Validation Schemas

#### 2.2.1 Zod Validation Schemas

**File:** `src/lib/validators/auth.ts` (NEW)

```typescript
import { z } from 'zod';

// Request magic link
export const RequestMagicLinkSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Sign in with password
export const SignInSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Recover password
export const RecoverPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Reset password
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number")
    .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
});

// Set session from client tokens
export const SetSessionSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Registration (future)
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
  displayName: z.string().optional(),
  role: z.enum(['tenant', 'admin']),
  propertyId: z.string().uuid().optional(),
});
```

**File:** `src/lib/validators/index.ts` (UPDATE)

```typescript
// Export existing validators
export * from './reading.validators';
export * from './report.validators';
// ... other validators

// Export new auth validators
export * from './auth';
```

#### 2.2.2 TypeScript Type Definitions

**File:** `src/types/auth.ts` (NEW)

```typescript
import type { User } from '@supabase/supabase-js';

export type UserRole = 'tenant' | 'admin';

export interface AuthSession {
  user: User;
  role: UserRole;
  propertyId: string | null;
  displayName: string | null;
}

export interface AuthSuccessResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
  role: UserRole;
  propertyId: string | null;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 2.3 Authentication Service Layer

#### 2.3.1 Auth Service Refactoring

**File:** `src/lib/api/auth.ts` (MAJOR UPDATE)

**Current State:** Contains hardcoded auth stub

**Required Changes:** Replace stub with proper JWT validation while maintaining dev mode option

```typescript
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@/db/supabase.client';
import { errorResponse } from '@/lib/errors';
import type { UserRole } from '@/types/auth';

interface AuthOptions {
  requireAdmin?: boolean;
}

interface AuthSuccess {
  success: true;
  user: User;
  role: UserRole;
  propertyId: string | null;
  displayName: string | null;
}

interface AuthFailure {
  success: false;
  response: Response;
}

type AuthResult = AuthSuccess | AuthFailure;

// Dev mode configuration
const DEV_MODE = import.meta.env.DEV && import.meta.env.ENABLE_AUTH_STUB === 'true';
const DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_TEST_ROLE: UserRole = "tenant";
const DEFAULT_TEST_PROPERTY_ID = "10000000-0000-0000-0000-000000000001";

/**
 * Dev mode auth stub (backwards compatible)
 */
function buildHardcodedAuth(): AuthSuccess {
  const userId = process.env.TEST_AUTH_USER_ID ?? DEFAULT_TEST_USER_ID;
  const rawRole = process.env.TEST_AUTH_ROLE;
  const role: UserRole = rawRole === 'tenant' || rawRole === 'admin' ? rawRole : DEFAULT_TEST_ROLE;
  const propertyId = role === 'admin' ? null : (process.env.TEST_AUTH_PROPERTY_ID ?? DEFAULT_TEST_PROPERTY_ID);

  const user = {
    id: userId,
    app_metadata: {},
    user_metadata: {},
    email: 'test@example.com',
  } as User;

  return {
    success: true,
    user,
    role,
    propertyId,
    displayName: 'Test User',
  };
}

/**
 * Extract and validate session from request
 */
async function extractSessionFromRequest(
  request: Request,
  supabase: SupabaseClient
): Promise<AuthSuccess | AuthFailure> {
  // 1. Try to extract token from Cookie header
  const cookieHeader = request.headers.get('Cookie');
  let accessToken: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('sb-access-token='));
    if (tokenCookie) {
      accessToken = tokenCookie.split('=')[1];
    }
  }

  // 2. Fallback: Try Authorization header (for API calls from client)
  if (!accessToken) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
  }

  // 3. No token found
  if (!accessToken) {
    return {
      success: false,
      response: errorResponse(401, 'unauthorized', 'Authentication required'),
    };
  }

  // 4. Validate token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return {
      success: false,
      response: errorResponse(401, 'invalid_token', 'Invalid or expired session'),
    };
  }

  // 5. Fetch user profile from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, property_id, display_name')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      response: errorResponse(404, 'profile_not_found', 'User profile not found'),
    };
  }

  // 6. Return authenticated user data
  return {
    success: true,
    user,
    role: profile.role as UserRole,
    propertyId: profile.property_id,
    displayName: profile.display_name,
  };
}

/**
 * Main authentication function for API routes
 * @param request - Astro request object
 * @param locals - Astro locals (contains supabase client)
 * @param options - Auth options (requireAdmin, etc.)
 */
export async function requireAuth(
  request: Request,
  locals: App.Locals,
  options: AuthOptions = {}
): Promise<AuthResult> {
  // Dev mode bypass
  if (DEV_MODE) {
    const auth = buildHardcodedAuth();
    if (options.requireAdmin && auth.role !== 'admin') {
      return {
        success: false,
        response: errorResponse(403, 'forbidden', 'Insufficient permissions'),
      };
    }
    return auth;
  }

  // Production: Extract and validate session
  const auth = await extractSessionFromRequest(request, locals.supabase);

  if (!auth.success) {
    return auth;
  }

  // Check admin requirement
  if (options.requireAdmin && auth.role !== 'admin') {
    return {
      success: false,
      response: errorResponse(403, 'forbidden', 'Admin access required'),
    };
  }

  return auth;
}
```

#### 2.3.2 Auth Guard for Astro Pages

**File:** `src/lib/api/auth-guard.ts` (NEW)

```typescript
import type { AstroGlobal } from 'astro';
import type { AuthSession, UserRole } from '@/types/auth';
import type { SupabaseClient } from '@/db/supabase.client';

interface AuthGuardOptions {
  requireAdmin?: boolean;
  allowedRoles?: UserRole[];
}

interface AuthGuardResult {
  authenticated: boolean;
  redirectResponse?: Response;
  session?: AuthSession;
}

// Dev mode configuration (same as auth.ts)
const DEV_MODE = import.meta.env.DEV && import.meta.env.ENABLE_AUTH_STUB === 'true';

/**
 * Auth guard for Astro pages (server-side)
 * Usage in page frontmatter:
 * 
 * const guard = await authGuard(Astro, { requireAdmin: true });
 * if (guard.redirectResponse) return guard.redirectResponse;
 * const { session } = guard;
 */
export async function authGuard(
  astro: AstroGlobal,
  options: AuthGuardOptions = {}
): Promise<AuthGuardResult> {
  // Dev mode bypass
  if (DEV_MODE) {
    const userId = import.meta.env.TEST_AUTH_USER_ID ?? "00000000-0000-0000-0000-000000000002";
    const role = (import.meta.env.TEST_AUTH_ROLE ?? 'tenant') as UserRole;
    const propertyId = role === 'admin' ? null : (import.meta.env.TEST_AUTH_PROPERTY_ID ?? "10000000-0000-0000-0000-000000000001");

    const session: AuthSession = {
      user: { id: userId, email: 'test@example.com' } as any,
      role,
      propertyId,
      displayName: 'Test User',
    };

    if (options.requireAdmin && role !== 'admin') {
      return {
        authenticated: false,
        redirectResponse: astro.redirect('/auth/login?error=insufficient_permissions'),
      };
    }

    return { authenticated: true, session };
  }

  // Production: Extract token from cookie
  const accessToken = astro.cookies.get('sb-access-token')?.value;

  if (!accessToken) {
    return {
      authenticated: false,
      redirectResponse: astro.redirect('/auth/login'),
    };
  }

  // Validate token
  const supabase = astro.locals.supabase as SupabaseClient;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    // Clear invalid cookies
    astro.cookies.delete('sb-access-token');
    astro.cookies.delete('sb-refresh-token');
    return {
      authenticated: false,
      redirectResponse: astro.redirect('/auth/login?error=session_expired'),
    };
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, property_id, display_name')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      authenticated: false,
      redirectResponse: astro.redirect('/auth/login?error=profile_not_found'),
    };
  }

  const session: AuthSession = {
    user,
    role: profile.role as UserRole,
    propertyId: profile.property_id,
    displayName: profile.display_name,
  };

  // Check role requirements
  if (options.requireAdmin && session.role !== 'admin') {
    return {
      authenticated: false,
      redirectResponse: astro.redirect('/auth/login?error=insufficient_permissions'),
    };
  }

  if (options.allowedRoles && !options.allowedRoles.includes(session.role)) {
    return {
      authenticated: false,
      redirectResponse: astro.redirect('/auth/login?error=insufficient_permissions'),
    };
  }

  return { authenticated: true, session };
}
```

#### 2.3.3 Profile Service Updates

**File:** `src/lib/services/ProfileService.ts` (UPDATE)

Add methods for profile management during auth flows:

```typescript
/**
 * Create user profile after registration
 */
static async createProfile(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  propertyId: string | null = null,
  displayName: string | null = null
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      role,
      property_id: propertyId,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return data;
}

/**
 * Check if user profile exists
 */
static async profileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw new Error(`Failed to check profile: ${error.message}`);
  }

  return !!data;
}
```

### 2.4 Middleware Updates

#### 2.4.1 Session Validation Middleware

**File:** `src/middleware/index.ts` (UPDATE)

Add session validation for API routes and rate limiting for auth endpoints:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { supabaseAdmin } from '@/db/supabase.client';
import { errorResponse } from '@/lib/errors';

// Rate limiting configuration
const TASK_RATE_LIMIT_WINDOW_MS = 60_000;
const TASK_RATE_LIMIT_MAX_REQUESTS = 5;

const AUTH_RATE_LIMIT_WINDOW_MS = 600_000; // 10 minutes
const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

const RECOVERY_RATE_LIMIT_WINDOW_MS = 600_000; // 10 minutes
const RECOVERY_RATE_LIMIT_MAX_REQUESTS = 3;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const schedulerBuckets = new Map<string, RateLimitBucket>();
const authBuckets = new Map<string, RateLimitBucket>();
const recoveryBuckets = new Map<string, RateLimitBucket>();

// Helper functions (existing)
const isSchedulerTaskRequest = (url: URL): boolean => 
  url.pathname.startsWith('/api/v1/_tasks/run');

const isAuthRequest = (url: URL): boolean => 
  url.pathname.startsWith('/api/v1/auth/') && 
  !url.pathname.includes('/auth/logout');

const isRecoveryRequest = (url: URL): boolean => 
  url.pathname === '/api/v1/auth/recover-password' || 
  url.pathname === '/api/v1/auth/reset-password';

const getClientIdentifier = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first) return first.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
};

const checkRateLimit = (
  clientId: string,
  buckets: Map<string, RateLimitBucket>,
  maxRequests: number,
  windowMs: number
): boolean => {
  const now = Date.now();
  const bucket = buckets.get(clientId);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(clientId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const clientId = getClientIdentifier(context.request);

  // Rate limiting for scheduler tasks
  if (isSchedulerTaskRequest(url)) {
    if (!checkRateLimit(clientId, schedulerBuckets, TASK_RATE_LIMIT_MAX_REQUESTS, TASK_RATE_LIMIT_WINDOW_MS)) {
      return errorResponse(429, 'rate_limited', 'Too many scheduler task requests');
    }
  }

  // Rate limiting for auth requests
  if (isAuthRequest(url)) {
    const limits = isRecoveryRequest(url)
      ? { buckets: recoveryBuckets, max: RECOVERY_RATE_LIMIT_MAX_REQUESTS, window: RECOVERY_RATE_LIMIT_WINDOW_MS }
      : { buckets: authBuckets, max: AUTH_RATE_LIMIT_MAX_REQUESTS, window: AUTH_RATE_LIMIT_WINDOW_MS };

    if (!checkRateLimit(clientId, limits.buckets, limits.max, limits.window)) {
      return errorResponse(429, 'rate_limited', 'Too many authentication requests. Please try again later.');
    }
  }

  // Attach Supabase client to locals
  context.locals.supabase = supabaseAdmin;

  return next();
});
```

### 2.5 Server-Side Rendering Updates

#### 2.5.1 Protected Pages Pattern

All protected pages (admin/*, app/*) should follow this pattern:

**Example: Admin Properties Page**

```astro
---
// src/pages/admin/properties/index.astro
import { authGuard } from '@/lib/api/auth-guard';
import Layout from '@/layouts/Layout.astro';
// ... other imports

const guard = await authGuard(Astro, { requireAdmin: true });
if (guard.redirectResponse) return guard.redirectResponse;

const { session } = guard;

// Fetch data using session context
const supabase = Astro.locals.supabase;
const { data: properties } = await supabase
  .from('properties')
  .select('*');

const pageTitle = "Nieruchomości";
---

<Layout title={pageTitle}>
  <RoleNav role={session.role} currentPath={Astro.url.pathname} />
  <main>
    <h1>{pageTitle}</h1>
    <!-- Component receives session as prop if needed -->
    <PropertiesList properties={properties} client:load />
  </main>
</Layout>
```

**Example: Tenant Readings Page**

```astro
---
// src/pages/app/readings/add.astro
import { authGuard } from '@/lib/api/auth-guard';
import Layout from '@/layouts/Layout.astro';

const guard = await authGuard(Astro, { allowedRoles: ['tenant', 'admin'] });
if (guard.redirectResponse) return guard.redirectResponse;

const { session } = guard;

// For tenants, enforce property_id scope
if (session.role === 'tenant' && !session.propertyId) {
  return Astro.redirect('/auth/login?error=no_property_assigned');
}

const pageTitle = "Dodaj odczyt";
---

<Layout title={pageTitle}>
  <RoleNav role={session.role} currentPath={Astro.url.pathname} />
  <main>
    <h1>{pageTitle}</h1>
    <ReadingsForm 
      propertyId={session.propertyId} 
      role={session.role}
      client:load 
    />
  </main>
</Layout>
```

#### 2.5.2 Root Page Role-Based Routing

**File:** `src/pages/index.astro` (MAJOR UPDATE)

```astro
---
import { authGuard } from '@/lib/api/auth-guard';

const guard = await authGuard(Astro);

if (!guard.authenticated) {
  return guard.redirectResponse; // Redirects to /auth/login
}

const { session } = guard;

// Role-based routing
const destination = session.role === 'admin' 
  ? '/admin/properties' 
  : '/app/readings/add';

return Astro.redirect(destination);
---

<!-- No content needed, always redirects -->
```

### 2.6 Error Response Standardization

**File:** `src/lib/errors.ts` (UPDATE)

Add auth-specific error helpers:

```typescript
export function authErrorResponse(
  status: number,
  code: string,
  message: string
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        type: 'authentication_error',
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="api"',
      },
    }
  );
}
```

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Integration

#### 3.1.1 Authentication Flow Architecture

The system uses Supabase Auth as the authentication provider, supporting two primary flows:

##### **Flow 1: Magic Link Authentication (Primary, Passwordless)**

Per PRD FR-001 requirement.

**Steps:**

1. **User Initiates Login:**
   - User visits `/auth/login`
   - Enters email address
   - Clicks "Wyślij link logowania"

2. **Backend Generates Magic Link:**
   - Frontend calls `POST /api/v1/auth/magic-link` with email
   - Backend validates email format
   - Backend calls `supabaseAdmin.auth.admin.generateLink()`:
     ```typescript
     const { data, error } = await supabaseAdmin.auth.admin.generateLink({
       type: 'magiclink',
       email,
       options: {
         redirectTo: `${origin}/auth/callback`,
       },
     });
     ```
   - Supabase sends email with magic link
   - Backend returns success (always, to prevent user enumeration)

3. **User Clicks Magic Link:**
   - Email contains link: `https://app.example.com/auth/callback#access_token=...&refresh_token=...`
   - User clicks link, browser navigates to callback page

4. **Callback Page Processes Tokens:**
   - Page extracts tokens from URL hash
   - Calls backend `POST /api/v1/auth/set-session` to convert to HTTP-only cookies
   - Backend validates tokens with Supabase
   - Backend fetches user profile (role, propertyId)
   - Backend sets session cookies
   - Frontend redirects to role-based landing page

5. **Session Established:**
   - User is authenticated
   - Session stored in HTTP-only cookies
   - Subsequent requests include cookies automatically
   - Session valid for 30 days per FR-001

**Security Considerations:**
- Magic links expire after 60 minutes (Supabase default)
- One-time use tokens (token invalidated after use)
- Tokens stored in URL hash (not sent to server)
- Prevents user enumeration (always returns success)

##### **Flow 2: Email/Password Authentication (Secondary)**

For administrative convenience and explicit user request.

**Steps:**

1. **User Initiates Login:**
   - User visits `/auth/login`
   - Toggles to password method
   - Enters email and password
   - Clicks "Zaloguj się"

2. **Backend Validates Credentials:**
   - Frontend calls `POST /api/v1/auth/sign-in` with email and password
   - Backend calls `supabase.auth.signInWithPassword()`:
     ```typescript
     const { data, error } = await supabase.auth.signInWithPassword({
       email,
       password,
     });
     ```
   - If credentials invalid: return 401 error
   - If valid: fetch user profile

3. **Session Establishment:**
   - Backend sets HTTP-only cookies with tokens
   - Backend returns user data and role
   - Frontend redirects to role-based landing page

4. **Session Established:**
   - Same as magic link flow
   - Session valid for 30 days

**Security Considerations:**
- Rate limiting: 10 attempts per 10 minutes per IP
- Generic error message (prevent user enumeration)
- Passwords hashed with bcrypt by Supabase
- No password stored client-side

##### **Flow 3: Password Recovery**

**Steps:**

1. **User Initiates Recovery:**
   - User visits `/auth/forgot-password`
   - Enters email
   - Clicks "Wyślij link resetowania hasła"

2. **Backend Sends Recovery Email:**
   - Frontend calls `POST /api/v1/auth/recover-password`
   - Backend calls `supabase.auth.resetPasswordForEmail()`:
     ```typescript
     const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: `${origin}/auth/reset-password`,
     });
     ```
   - Supabase sends password reset email
   - Backend returns success (always)

3. **User Clicks Reset Link:**
   - Email contains link: `https://app.example.com/auth/reset-password#access_token=...&type=recovery`
   - User clicks link, navigates to reset page

4. **User Sets New Password:**
   - Reset page displays password fields
   - User enters new password (validated for strength)
   - Clicks "Zresetuj hasło"
   - Frontend calls `POST /api/v1/auth/reset-password` with token and new password

5. **Backend Resets Password:**
   - Validates token with `supabase.auth.verifyOtp()`
   - Updates password with `supabase.auth.updateUser()`
   - Returns success
   - Frontend redirects to login

**Security Considerations:**
- Reset tokens expire after 60 minutes
- One-time use tokens
- Password strength validation (8+ chars, mixed case, numbers)
- Rate limiting: 3 attempts per 10 minutes per IP

#### 3.1.2 Session Management

##### **Session Storage**

Sessions are stored in HTTP-only cookies for security:

**Cookie Structure:**
```
sb-access-token: JWT access token (short-lived, 1 hour default)
sb-refresh-token: JWT refresh token (long-lived, 30 days per FR-001)
```

**Cookie Attributes:**
- `HttpOnly: true` - Prevents JavaScript access (XSS protection)
- `Secure: true` (production) - HTTPS only
- `SameSite: Lax` - CSRF protection
- `Path: /` - Available to all routes
- `Max-Age: 2592000` - 30 days per FR-001

##### **Session Validation**

On every protected route request:

1. **Extract Token:**
   - Server reads `sb-access-token` from Cookie header
   - Fallback: Read `Authorization: Bearer <token>` header (for API calls)

2. **Validate Token:**
   ```typescript
   const { data: { user }, error } = await supabase.auth.getUser(accessToken);
   ```
   - Supabase validates JWT signature
   - Checks expiration
   - Returns user data if valid

3. **Fetch Profile:**
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('role, property_id, display_name')
     .eq('user_id', user.id)
     .single();
   ```
   - Retrieves role and property context
   - Required for authorization

4. **Attach to Context:**
   - Session data attached to request context
   - Available to API handlers and page components

##### **Token Refresh**

Automatic token refresh handled by Supabase client:

```typescript
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Server-side, no persistence needed
  },
});
```

For long-lived sessions (30 days), refresh tokens are used:
- Access token expires after 1 hour
- Refresh token valid for 30 days
- Client automatically refreshes using refresh token
- New access token issued transparently

##### **Session Termination**

**Explicit Logout:**
```typescript
// POST /api/v1/auth/logout
await supabase.auth.signOut();
// Clear cookies
Astro.cookies.delete('sb-access-token');
Astro.cookies.delete('sb-refresh-token');
```

**Automatic Expiration:**
- After 30 days of inactivity
- User must re-authenticate

**Forced Logout:**
- Admin can revoke sessions via Supabase dashboard
- Next request fails validation
- User redirected to login

#### 3.1.3 Row Level Security (RLS)

Per PRD FR-002, RLS is enforced at database level.

##### **Profiles Table Policies**

**File:** `supabase/migrations/20251019120100_create_rls_policies.sql` (existing)

Policies ensure users can only access their own profile:

```sql
-- Tenants can read own profile
CREATE POLICY "Tenants can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can update own profile (display_name only)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only admins can insert profiles (registration)
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

##### **Data Access Policies**

All tables enforce RLS based on property_id:

**Tenant Access:**
- Tenants can only access data for their assigned property_id
- Validated via profiles.property_id lookup
- Enforced at database level

**Admin Access:**
- Admins have full access across all properties
- No property_id restriction

**Example Policy (Readings Table):**
```sql
-- Tenants can read readings for their property
CREATE POLICY "Tenants can read own property readings"
  ON readings
  FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'tenant'
    )
  );

-- Admins can read all readings
CREATE POLICY "Admins can read all readings"
  ON readings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

##### **Auth.uid() Function**

Supabase provides `auth.uid()` function in RLS policies:
- Returns authenticated user ID from JWT
- Automatically extracted from request
- Null if not authenticated
- Policies deny access when null

##### **Service Role Bypass**

Admin operations use service role key:
- Bypasses RLS for administrative tasks
- Used for seeding, migrations, system operations
- Never exposed to client

```typescript
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

#### 3.1.4 Email Configuration

##### **SMTP Settings**

Supabase Auth sends emails via configured SMTP:

**Development:**
- Emails logged to console (Inbucket or similar)
- No actual delivery
- Magic links and reset links visible in logs

**Production:**
- Configure SMTP in Supabase dashboard
- Example: Gmail SMTP, SendGrid, AWS SES
- Environment variables:
  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=noreply@example.com
  SMTP_PASSWORD=<app-password>
  ```

##### **Email Templates**

Supabase provides default templates, customizable in dashboard:

**Magic Link Email:**
- Subject: "Magic Link - Rental Utilities Billing System"
- Body: "Click this link to sign in: {{ .ConfirmationURL }}"
- Expires in 60 minutes

**Password Reset Email:**
- Subject: "Reset Your Password - Rental Utilities Billing System"
- Body: "Click this link to reset your password: {{ .ConfirmationURL }}"
- Expires in 60 minutes

**Customization:**
- Polish (pl-PL) language
- Custom branding
- Updated via Supabase Auth > Email Templates

#### 3.1.5 Development Mode Configuration

For local development without real authentication:

##### **Enable Auth Stub**

**File:** `.env.local`

```env
# Enable hardcoded auth for development
ENABLE_AUTH_STUB=true

# Configure test user
TEST_AUTH_USER_ID=00000000-0000-0000-0000-000000000002
TEST_AUTH_ROLE=tenant
TEST_AUTH_PROPERTY_ID=10000000-0000-0000-0000-000000000001
```

##### **Behavior**

When `ENABLE_AUTH_STUB=true`:
- All auth checks return hardcoded user
- No actual JWT validation
- No Supabase API calls
- Allows rapid development without auth overhead
- **Must be disabled in production**

##### **Switching Roles**

Change `TEST_AUTH_ROLE` to test different permissions:
```env
TEST_AUTH_ROLE=admin  # Test admin features
TEST_AUTH_ROLE=tenant # Test tenant features
```

#### 3.1.6 Security Best Practices

##### **Password Security**
- Minimum 8 characters
- Mixed case required
- Numbers required
- Special characters recommended
- Hashed with bcrypt by Supabase
- Never stored in plaintext

##### **Token Security**
- JWT tokens signed with secret
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (30 days)
- HTTP-only cookies prevent XSS
- SameSite prevents CSRF

##### **Rate Limiting**
- Magic link: 5/10min per IP
- Sign in: 10/10min per IP
- Password recovery: 3/10min per IP per email
- Implemented in middleware

##### **User Enumeration Prevention**
- Magic link always returns success
- Password recovery always returns success
- Sign in returns generic error
- No distinction between "user not found" and "wrong password"

##### **Logging and Monitoring**
- All auth attempts logged
- Failed login attempts tracked
- Password reset requests logged
- No PII in logs (email hashed or abbreviated)
- Logs retained per FR-022 (90 days for technical logs)

---

## 4. IMPLEMENTATION CHECKLIST

### 4.1 Files to Create

**Authentication Pages:**
- [ ] `src/pages/auth/register.astro`
- [ ] `src/pages/auth/forgot-password.astro`
- [ ] `src/pages/auth/reset-password.astro`

**React Components:**
- [ ] `src/components/auth/RegistrationForm.tsx`
- [ ] `src/components/auth/ForgotPasswordForm.tsx`
- [ ] `src/components/auth/ResetPasswordForm.tsx`
- [ ] `src/components/auth/LogoutButton.tsx` (exists as untracked, implement)

**API Endpoints:**
- [ ] `src/pages/api/v1/auth/sign-in.ts`
- [ ] `src/pages/api/v1/auth/logout.ts`
- [ ] `src/pages/api/v1/auth/recover-password.ts`
- [ ] `src/pages/api/v1/auth/reset-password.ts`
- [ ] `src/pages/api/v1/auth/set-session.ts`

**Libraries and Utilities:**
- [ ] `src/lib/validators/auth.ts`
- [ ] `src/lib/api/auth-guard.ts`
- [ ] `src/lib/client/auth-storage.ts` (optional)
- [ ] `src/lib/client/AuthContext.tsx` (optional)
- [ ] `src/types/auth.ts`

### 4.2 Files to Update

**Authentication:**
- [ ] `src/components/auth/LoginForm.tsx` - Add password method toggle
- [ ] `src/pages/auth/login.astro` - Add navigation links
- [ ] `src/pages/auth/callback.astro` - Implement token processing
- [ ] `src/lib/api/auth.ts` - Replace stub with JWT validation
- [ ] `src/lib/validators/index.ts` - Export auth validators

**Navigation and Layout:**
- [ ] `src/components/nav/RoleNav.astro` - Add logout button
- [ ] `src/pages/index.astro` - Implement role-based routing

**Middleware and Services:**
- [ ] `src/middleware/index.ts` - Add auth rate limiting
- [ ] `src/lib/services/ProfileService.ts` - Add profile creation methods
- [ ] `src/lib/errors.ts` - Add auth error helpers

**Protected Pages (Add auth guards):**
- [ ] `src/pages/admin/properties/index.astro`
- [ ] `src/pages/admin/contracts/index.astro`
- [ ] `src/pages/admin/monthly-advances/index.astro`
- [ ] `src/pages/admin/readings/index.astro`
- [ ] `src/pages/admin/reports/index.astro`
- [ ] `src/pages/admin/profile/index.astro`
- [ ] `src/pages/app/readings/add.astro`
- [ ] `src/pages/app/readings/history.astro`
- [ ] `src/pages/app/profile/index.astro`

**Environment and Configuration:**
- [ ] `src/env.d.ts` - Add ENABLE_AUTH_STUB type
- [ ] Create `.env.local.example` with auth stub documentation

### 4.3 Files to Remove

None. All existing files remain compatible.

### 4.4 Database Migrations

No new migrations required. Existing schema supports authentication:
- `auth.users` table (Supabase managed)
- `profiles` table (already exists)
- RLS policies (already configured)

### 4.5 Testing Strategy

**Unit Tests:**
- [ ] Auth validators (Zod schemas)
- [ ] Auth service functions (requireAuth, extractSession)
- [ ] Auth guard function
- [ ] Password strength validation
- [ ] Rate limiting logic

**Integration Tests:**
- [ ] Magic link flow (end-to-end)
- [ ] Password sign-in flow
- [ ] Password recovery flow
- [ ] Session validation
- [ ] Token refresh
- [ ] Logout

**Manual Testing:**
1. **Magic Link Login:**
   - Request magic link
   - Check email/logs
   - Click link
   - Verify redirect to correct landing page
   - Verify session persists

2. **Password Login:**
   - Toggle to password method
   - Enter valid credentials
   - Verify redirect
   - Test invalid credentials
   - Test rate limiting

3. **Password Recovery:**
   - Request reset link
   - Check email/logs
   - Click link
   - Set new password
   - Verify can login with new password

4. **Authorization:**
   - Login as tenant
   - Try accessing admin routes (should redirect/403)
   - Try accessing other property data (should be blocked by RLS)
   - Login as admin
   - Verify full access

5. **Session Management:**
   - Login
   - Close browser
   - Reopen and verify still logged in
   - Logout
   - Verify redirect to login
   - Verify cannot access protected routes

6. **Dev Mode:**
   - Set ENABLE_AUTH_STUB=true
   - Verify stub auth works
   - Switch roles via env
   - Verify role-based access

---

## 5. MIGRATION PATH

### 5.1 Phase 1: Core Infrastructure (Week 1)

**Goal:** Establish authentication foundation without breaking existing functionality.

**Tasks:**
1. Create auth validators and types
2. Implement auth-guard.ts for pages
3. Update auth.ts with JWT validation and dev mode flag
4. Update middleware with auth rate limiting
5. Implement callback page token processing
6. Create logout endpoint and button

**Testing:**
- Dev mode with ENABLE_AUTH_STUB=true still works
- Existing API endpoints unchanged
- No regressions in current functionality

### 5.2 Phase 2: Authentication Pages (Week 2)

**Goal:** Implement login, password recovery, and registration pages.

**Tasks:**
1. Enhance LoginForm with password method
2. Create ForgotPasswordForm and page
3. Create ResetPasswordForm and page
4. Create RegistrationForm and page (MVP stub)
5. Implement sign-in and recovery endpoints

**Testing:**
- Magic link flow works end-to-end
- Password login works
- Password recovery works
- All forms validate correctly
- Error messages display properly

### 5.3 Phase 3: Protected Routes (Week 3)

**Goal:** Add auth guards to all protected pages.

**Tasks:**
1. Update root page with role-based routing
2. Add auth guards to all admin pages
3. Add auth guards to all tenant pages
4. Update navigation with logout button
5. Test role-based access

**Testing:**
- Unauthenticated users redirected to login
- Role-based landing pages work
- Tenants cannot access admin routes
- Admin can access all routes
- RLS enforced at database level

### 5.4 Phase 4: Production Readiness (Week 4)

**Goal:** Finalize configuration and documentation.

**Tasks:**
1. Disable ENABLE_AUTH_STUB in production
2. Configure production SMTP
3. Customize email templates
4. Add comprehensive error handling
5. Documentation and training

**Testing:**
- End-to-end testing in production-like environment
- Load testing for rate limits
- Security audit
- User acceptance testing

### 5.5 Rollback Strategy

If issues arise during migration:

1. **Enable Dev Mode Globally:**
   ```env
   ENABLE_AUTH_STUB=true
   ```
   System falls back to hardcoded auth.

2. **Revert Specific Changes:**
   - All changes are additive
   - No breaking changes to existing code
   - Can revert page-by-page if needed

3. **Database Rollback:**
   - No schema changes required
   - No data migration needed
   - No rollback required

---

## 6. CONCLUSION

This architecture specification provides a comprehensive blueprint for implementing authentication and authorization in the Rental Utilities Billing System. The design:

1. **Complies with PRD Requirements:**
   - Magic link authentication (FR-001)
   - 30-day sessions (FR-001)
   - Role-based access control (FR-002)
   - RLS enforcement (FR-002)
   - Minimal PII storage (FR-003)

2. **Extends Functionality:**
   - Password-based authentication (secondary)
   - Password recovery flow
   - Registration page structure (MVP stub)
   - Comprehensive error handling
   - Accessibility features

3. **Maintains Compatibility:**
   - No breaking changes to existing code
   - Dev mode for rapid development
   - Gradual migration path
   - Rollback safety

4. **Follows Best Practices:**
   - HTTP-only cookies for session storage
   - JWT validation with Supabase
   - Rate limiting for security
   - User enumeration prevention
   - Comprehensive logging and auditing

The specification is ready for implementation following the phased migration plan.

---

**End of Specification**

