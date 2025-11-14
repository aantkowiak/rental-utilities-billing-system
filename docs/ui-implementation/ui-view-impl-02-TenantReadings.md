## UI View Implementation — Tenant Readings

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Tenant Readings" (path `/app/readings`).
- Purpose: Submit and edit monthly readings within −3/+5 day window; show latest state and anchored badge.
- Key components: Combined Reading Form, inline validation, success toast, small "Kotwica" badge.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Use named exports; keep errors inline for 422; show toast for 409/429/500.
- Respect `pl-PL` formatting; clamp precision on blur (3 decimals m3, 2 for amounts).

### Types
- DTOs: `ReadingDTO` (`src/types.ts`).
- Commands: `CreateReadingCmd`, `UpdateReadingCmd` (`src/types.ts`).
- Responses: `ReadingListResponse`, `ReadingResponse` (`src/types/readings.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `app/readings.astro` → renders tenant shell + `ReadingForm`
- `ReadingForm` (React)
  - Fields: meter values (`coldM3`, `hotM3`, `heatingGj`), `readingAt` (Europe/Warsaw), optional comment
  - Controls: primary Submit; disabled when outside window
  - Badges: small "Kotwica" when reading is anchored
  - Uses: `ErrorAlert`, `Button`

Hierarchy
- `app/readings.astro`
  - `RoleNav`
  - `ReadingForm`
    - `ErrorAlert`
    - `Button`

Responsibilities
- Shell/page: layout, month context summary, route guard.
- `ReadingForm`: load latest reading, enforce window, submit create/update.

## 2) API Integration
- List/create: `GET /api/v1/readings?propertyId=...&from=YYYY-MM-DD&to=YYYY-MM-DD`, `POST /api/v1/readings`
- Item: `GET /api/v1/readings/:id`, `PATCH /api/v1/readings/:id`
- Client: `apiGet`, `apiPost` (extend with `apiPatch` in `src/lib/client/http.ts` next)

Proposed client calls
```ts
const list = await apiGet<import("@/types/readings").ReadingListResponse>(
  `/api/v1/readings?propertyId=${propertyId}&from=${from}&to=${to}`
);
const created = await apiPost<import("@/types/readings").ReadingResponse>("/api/v1/readings", createCmd);
// PATCH will use a forthcoming apiPatch helper
```

Notes
- Enforcement of tenant property access is server-side; pass `propertyId` from context.
- Recalc anchors is queued by server automatically after create/update.

## 3) User Interactions
- Input handling
  - Accept comma/dot decimals; clamp to 3 decimals on blur; prevent negatives.
  - `readingAt` bound to local timezone Europe/Warsaw; validate −3/+5 window; disable when outside.
- Submit
  - Create new if no reading for month; otherwise edit latest (PATCH).
  - On success: non-blocking toast, refresh list; on 409: toast + refetch; on 422: inline field errors; on 403: inline access message.
- Focus management
  - On submit with errors, focus first invalid.

Done in this iteration
- Defined component tree and responsibilities.
- Mapped CRUD endpoints and client usage.
- Listed concrete validations and success/error behaviors.

Next 3 actions
- State Management: local form state + derived disabled; fetch latest reading on mount.
- Styling & Layout: mobile-first form within centered container; visible focus.
- Error Handling & Edge Cases: handle race on month boundary; debounce refetch on visibilitychange.


