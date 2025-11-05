# UI Architecture Plan (MVP)

Date: 2025-10-30

## Tech and Structure
- Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui
- Project structure:
  - `src/pages` (Astro pages)
  - `src/layouts` (Astro layouts)
  - `src/components` (React/ASTRO UI)
  - `src/components/ui` (Shadcn/ui)
  - `src/lib` (services/helpers; add client HTTP + query hooks)
  - `src/db` (Supabase)
  - `src/pages/api` (API routes)
  - `src/types.ts` and `src/types/*` (DTOs)
  - `public`, `src/assets`

## Navigation and Roles
- Admin: Properties, Contracts, Monthly Conditions, Readings, Tasks
- Tenant: My Property, My Readings, Profile
- Client-side: hide admin actions for tenants; server enforces via APIs.

## Data Fetching and State
- TanStack Query v5 for fetching/caching/invalidation.
- Endpoints have no pagination; UI performs single-call fetches per list view.
- For large datasets, use virtualization via `@tanstack/react-virtual` to keep UI responsive.
- Query keys:
  - `["properties"]`
  - `["contracts", { propertyId?, tenantUserId?, active? }]`
  - `["monthlyConditions", { propertyId?, month? }]`
  - `["readings", { propertyId, from?, to? }]`

## Authentication
- Magic-link request via `POST /api/v1/auth/magic-link`.
- Temporary: show a small dev banner for current role sourced from server stub when available; future: implement `/auth/callback` to complete Supabase session.

## Error Handling
- Normalize API errors via `{ error: { code, message } }`.
- Show field-level zod errors inline; 403/404 dedicated views; 5xx retry toast.
- Map known domain codes:
  - Contracts: `contract_overlap`, `foreign_key_violation`
  - Monthly conditions: `monthly_condition_locked`, `conflict`
  - Readings: `forbidden`, `reading_not_found`, `conflict`

## Screens and Flows

### Admin
- Properties
  - List all (search by label), create/edit/delete.
  - Endpoints: GET/POST `/v1/properties`, GET/PATCH/DELETE `/v1/properties/:id`
- Contracts
  - List all with filters: property, tenant, active.
  - Create/update, handle 409 overlaps, delete.
  - Endpoints: GET/POST `/v1/contracts`, GET/PATCH/DELETE `/v1/contracts/:id`
- Monthly Conditions
  - Table filtered by property and month.
  - Create/update; handle duplicate (409) and locked-by-reports (422) with disabled edit/delete.
  - Endpoints: GET/POST `/v1/monthly-conditions`, GET/PATCH/DELETE (if added) `/v1/monthly-conditions/:id`
- Readings
  - List all for selected property with optional date range; virtualization on.
  - Admin replacement create; update; soft-delete; show queued “anchor recalculation” notice after mutations.
  - Endpoints: GET/POST `/v1/readings`, GET/PATCH/DELETE `/v1/readings/:id`, POST `/v1/readings/:id/replacement`
- Tasks (Anchors)
  - Admin-only action to queue recalculation: property + optional month range.
  - Show non-blocking 202 “Queued” banner; display last queued time.
  - Endpoint: POST `/v1/readings/recalculate-anchors`

### Tenant
- My Property
  - Read-only property details (scoped by server).
- My Readings
  - List all for tenant’s property; create/update within allowed window; virtualization on.
- Profile
  - Edit display name.
  - Endpoint: PATCH `/v1/me`

## Filters and Scoping
- Admin: global property switcher (URL + local storage).
- Tenant: auto-scope to own `propertyId` (no switcher).
- Persist filters in URL query params where applicable.

## Accessibility and Responsiveness
- Keyboard-first navigation, form labels/ARIA, focus outlines, color-contrast-safe tokens.
- Mobile-first responsive tables: transform to cards at small breakpoints.

## Components and Files (proposed)
- Pages (Astro):
  - `src/pages/admin/properties.astro`
  - `src/pages/admin/contracts.astro`
  - `src/pages/admin/monthly-conditions.astro`
  - `src/pages/admin/readings.astro`
  - `src/pages/admin/tasks.astro`
  - `src/pages/app/my-property.astro`
  - `src/pages/app/readings.astro`
  - `src/pages/app/profile.astro`
  - `src/layouts/Layout.astro` (wraps nav, role banner)
- React components:
  - `src/components/properties/PropertyList.tsx`
  - `src/components/contracts/ContractsList.tsx`
  - `src/components/monthly/MonthlyConditionsTable.tsx`
  - `src/components/readings/ReadingsTable.tsx` (virtualized)
  - `src/components/readings/ReadingForm.tsx`, `ReplacementForm.tsx`
  - `src/components/tasks/AnchorRecalcPanel.tsx`
  - `src/components/nav/RoleNav.tsx`, `src/components/common/FiltersBar.tsx`
- Client data layer:
  - `src/lib/client/http.ts` (fetch wrapper + error handling)
  - `src/lib/client/hooks/usePropertyScope.ts`

## Endpoints Without Pagination
- All list views call their respective endpoints once per filter set.
- Use virtualization to maintain smooth UI for large collections.
- For readings, require `propertyId`; allow optional `from`/`to` to bound result sizes when needed.

## Validation
- Mirror server Zod schemas in client (`src/lib/client/schemas/*`) for form validation.
- Convert dates with UTC-safe utils and ISO strings.

## Mutations and Cache
- On create/update/delete:
  - Show toast, refetch queries by key, update optimistic rows where safe.
  - After readings mutations: show “Anchor recalculation queued (if applicable)” banner.

## Security
- Hide admin controls client-side; rely on server `requireAuth` for enforcement.
- Avoid exposing tenant-only property IDs outside their scope.

---

## Q + A (Finalized Decisions)

1. Should navigation separate Admin vs Tenant capabilities?
   - Decision: Yes
   - Recommendation: Provide role-based nav groups; hide admin-only actions client-side; keep server checks.

2. How should property scoping work across lists and detail views?
   - Decision: Go with Recommendation
   - Recommendation: Admin property switcher; tenants auto-scope. Persist in URL + local storage.

3. What pagination pattern should we use for lists?
   - Decision: Remove pagination entirely (API and UI)
   - Recommendation: Single-call lists; use virtualization for large sets.

4. How should readings CRUD differ for tenants vs admins?
   - Decision: Go with Recommendation
   - Recommendation: Tenants limited by window; admins can replace/update/delete with toasts and cache invalidation.

5. How do we trigger and represent the anchors recalculation job in UI?
   - Decision: Go with Recommendation
   - Recommendation: Admin-only action; POST `/v1/readings/recalculate-anchors`; show 202 queued banner.

6. How should monthly conditions editing handle duplicates and report locks?
   - Decision: Go with Recommendation
   - Recommendation: Inline errors for duplicates; lock badge disables edit/delete when linked to realized reports.

7. How should contracts management handle active status and overlap errors?
   - Decision: Go with Recommendation
   - Recommendation: Filters (property, tenant, active). Client validate period; show 409 overlap inline.

8. What is the authentication UX given magic-link behavior and current stubbed backend auth?
   - Decision: Go with Recommendation
   - Recommendation: Email-only sign-in; always neutral success. Dev role banner until real callback.

9. How should we standardize error display and form validation?
   - Decision: Go with Recommendation
   - Recommendation: Central API error mapper; zod field errors; dedicated 403/404 views; 5xx retry toast.

10. What state and data-fetching libraries should we use?
   - Decision: Go with Recommendation
   - Recommendation: TanStack Query v5; Zod; date utils; virtualization for long lists.

---

## Skeletons (Files and minimal examples)

- Astro page example (`src/pages/admin/properties.astro`):

```astro
---
import Layout from "../../layouts/Layout.astro";
---

<Layout title="Properties">
  <main>
    <h1>Properties</h1>
  </main>
</Layout>
```

- React component example (`src/components/nav/RoleNav.tsx`):

```tsx
export function RoleNav(): JSX.Element {
  return (
    <nav aria-label="Primary" />
  );
}
```

- Client http wrapper example (`src/lib/client/http.ts`):

```ts
export interface ApiError {
  code: string;
  message: string;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok && json?.error) throw json.error as ApiError;
  return json as T;
}
```
