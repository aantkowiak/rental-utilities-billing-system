# API Endpoint Implementation Plan: Authentication – Magic Link (Section 2.1)

## 1. Endpoint Overview
Single endpoint to request a Supabase magic-link email for login/registration. Always returns 200 to avoid user enumeration.

| Method | Path | Purpose |
|--------|------|---------|
| POST | /v1/auth/magic-link | Request magic-link email |

## 2. Request Details
Headers:
- `Content-Type: application/json`

Body:
```jsonc
{
  "email": "user@example.com"
}
```
Required field `email` – valid RFC 5322 address, max 254 chars, case-insensitive.

## 3. Used Types
Command: `RequestMagicLinkCmd`
```ts
export interface RequestMagicLinkCmd { email: string }
```
No DTO returned.

## 4. Response Details
- 200 OK `{ "status": "sent" }` always, even if user not found.

## 5. Data Flow
1. Parse & validate email.
2. Normalise to lower-case.
3. Call Supabase Admin SDK `generateLink({ type:'magiclink', email })`.
4. Log request (info). If error from SDK, log error but still return 200.
5. Optionally throttle by IP/email (rate-limit middleware).

## 6. Security Considerations
- No authentication required.
- Avoid user enumeration by constant 200 response.
- Enforce rate limits (e.g., 5/min per IP & email).
- Use HTTPS.

## 7. Error Handling
Internally log errors; client still receives 200. Server errors bubble to logs/monitoring.

## 8. Performance Considerations
- Supabase email send ~sub-second; return after promise resolves.

## 9. Implementation Steps
1. Zod validator: `email().max(254)`.
2. Route `src/pages/api/v1/auth/magic-link.post.ts`.
3. Use Supabase Admin client (service role key env).
4. Add rate-limit middleware entry.
5. Unit test: valid email returns 200; invalid email 400.
6. Update OpenAPI docs.
