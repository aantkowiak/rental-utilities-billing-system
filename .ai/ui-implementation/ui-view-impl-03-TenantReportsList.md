## UI View Implementation — Tenant Reports List

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Tenant Reports List" (path `/app/reports`).
- Purpose: Show monthly reports list with status and basic actions (generate/resend when permitted).
- Key components: Table/List, Month selector, Row actions.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Use named exports; `pl-PL` formatting; non-blocking toasts for ops.
- Global month filter via `?month=YYYY-MM` (default current), stored in `localStorage`.

### Types
- DTOs: `ReportDTO`, `ReportEmailAttemptDTO` (`src/types.ts`).
- Commands: `GenerateReportCmd`, `SendReportEmailCmd` (`src/types.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `app/reports.astro` → shell + `TenantReportsTable`
- `TenantReportsTable` (React)
  - Children: `FiltersBar` (month), table rows with status, actions area
  - Uses: `Button`, `ErrorAlert`

Hierarchy
- `app/reports.astro`
  - `RoleNav`
  - `FiltersBar` (month)
  - `TenantReportsTable`
    - `ErrorAlert`
    - Row action buttons (Generate/Resend)

Responsibilities
- Page: reads/saves `month` from query/localStorage; provides to table.
- Table: fetch list, render status, expose allowed row actions, disabled with inline reasons.

## 2) API Integration
Note: Reports endpoints are planned in the UI plan but not present yet in `src/pages/api/v1`. Define expected contracts now.
- List: `GET /api/v1/reports?month=YYYY-MM` → `{ items: ReportDTO[] }`
- Generate: `POST /api/v1/reports/generate` with `GenerateReportCmd`
- Resend email: `POST /api/v1/reports/:id/send-email` with `SendReportEmailCmd`
- Client: `apiGet`, `apiPost`

Proposed client calls
```ts
const list = await apiGet<{ items: import("@/types").ReportDTO[] }>(`/api/v1/reports?month=${month}`);
await apiPost<void>("/api/v1/reports/generate", cmd);
await apiPost<void>(`/api/v1/reports/${reportId}/send-email`);
```

## 3) User Interactions
- Month selection updates query param and triggers refetch.
- Row actions
  - Generate: only when allowed; disabled button shows reason (tooltip/title).
  - Resend email: available when applicable; show success toast on completion.
- Errors
  - 403 inline message; 409/429/500 toasts; refetch on success or conflict.

Done in this iteration
- Defined component tree and responsibilities.
- Specified planned endpoints and client usage.
- Listed interactions and error behaviors.

Next 3 actions
- State Management: TanStack Query for list keyed by month; simple in-memory cache.
- Styling & Layout: responsive list/table; status badges; visible focus.
- Error Handling & Edge Cases: throttle actions per row; disabled reasons surfaced inline.


