# API Endpoint Implementation Plan (sections 1–9): PATCH `/v1/me`

## 1. Endpoint Overview
Allow an authenticated user (tenant or admin) to update their own profile’s display name.

## 2. Request Details
- HTTP Method: PATCH  
- URL: `/v1/me`
- Headers  
  - `Authorization: Bearer <JWT>` – issued by Supabase
  - `Content-Type: application/json`
- Body  
  ```jsonc
  {
    "displayName": "Optional new name"
  }
  ```
- Parameters  
  - Required: none  
  - Optional body property: `displayName` (string, trimmed; allow `null` / absence to keep unchanged)

## 3. Used Types
- DTO: `ProfileDTO`
- Command Model: `UpdateMeCmd`  
  ```ts
  export type UpdateMeCmd = { displayName?: string };
  ```

## 4. Response Details
- 200 OK  
  ```jsonc
  {
    "profile": { /* ProfileDTO of caller after update */ }
  }
  ```
- Error codes  
  - 400 Bad Request – validation failed  
  - 401 Unauthorized – missing / invalid JWT  
  - 404 Not Found – profile row missing (shouldn’t happen for valid users)  
  - 500 Server Error – unhandled

## 5. Data Flow
1. Astro API route `src/pages/api/v1/me.patch.ts` receives request.  
2. `supabase.auth.getUser(jwt)` → validate & extract `user.id`.  
3. Parse & validate body → `UpdateMeCmd`.  
4. Call `ProfileService.updateDisplayName(userId, displayName?)`.  
   - If `displayName` provided → update `profiles` row, set `updated_at = now()`.  
   - If omitted/empty → skip column update.  
5. Fetch updated profile row, map to `ProfileDTO` (`snake_case`→`camelCase`).  
6. Return `{ profile }`.  
7. Errors are caught; mapped to uniform error wrapper.

## 6. Security Considerations
- Authentication: JWT verified via Supabase SDK.  
- Authorization: update constrained to `user.id` only; enforced twice:  
  1. Route logic uses caller `user.id`.  
  2. Supabase RLS on `profiles` (`user_id = auth.uid()`).  
- Validation: trim string, max 60 chars, prohibit control chars / leading/trailing spaces.  
- Rate-limit (global middleware) applies.  
- HTTPS enforced by infra.

## 7. Error Handling
| Scenario | Status | Code | Message |
|----------|--------|------|---------|
| Missing/invalid JWT | 401 | `unauthorized` | Not authenticated |
| Body not JSON | 400 | `invalid_json` | Malformed JSON |
| `displayName` too long | 400 | `display_name_length` | Must be ≤ 60 chars |
| `displayName` has control chars | 400 | `display_name_invalid_chars` | Invalid characters |
| Profile row absent | 404 | `profile_not_found` | Profile not found |
| DB failure | 500 | `internal_error` | Unexpected error |

Errors returned as  
```json
{ "error": { "code": "invalid_json", "message": "...", "details": {} } }
```

## 8. Performance Considerations
- Single row update & select → negligible overhead.  
- Use projection (`select *`) once; avoid duplicate queries.  
- Database index on PK (`profiles.user_id`) already exists.

## 9. Implementation Steps
1. **Route scaffold**  
   `src/pages/api/v1/me.patch.ts` exporting named handler per Astro conventions.  
2. **Schema & validation**  
   - Add `src/lib/validators/profileValidator.ts` with Zod schema:  
     ```ts
     export const updateMeSchema = z.object({
       displayName: z.string().trim().max(60).optional(),
     });
     ```  
3. **Service**  
   - `src/lib/services/ProfileService.ts`  
     - `updateDisplayName(userId: string, displayName?: string)` returning `ProfileDTO`.  
4. **Error helper**  
   Ensure existing `errorResponse()` utility covers 400/404/500; add new codes if needed.  
5. **Unit tests** (`src/lib/services/__tests__/ProfileService.test.ts`)  
   - Valid update, no update, invalid length, unauthorized.  
6. **Integration test** for API route using Supabase test client (mock).  
7. **Documentation**  
   - Update OpenAPI/README with endpoint spec.  
8. **Deploy & verify**  
   - Run `npm run lint && npm run test`.  
   - Smoke test via curl/Postman.  
9. **Monitoring**  
   - Ensure log entries (info: updateMe, warn: validation, error: db).  
   - Dashboards/alerts for 5xx spikes.
