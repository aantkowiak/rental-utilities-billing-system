## UI View Implementation — Admin Reports List

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Reports List" (path `/admin/reports`).
- Purpose: Manage generation/regeneration/resend; toggle realized; unlock with confirm.
- Key components: Table/List; Row actions (Generate, Regenerate, Resend); Realized toggle; Unlock confirm.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Admin-only; rely on server throttling; hide Regenerate when realized; disabled reasons inline.
- Month filter via `?month=` and `localStorage`.

### Types
- DTOs: `ReportDTO`, `ReportEmailAttemptDTO` (`src/types.ts`).
- Commands: `GenerateReportCmd`, `RegenerateReportCmd`, `SendReportEmailCmd`, `UpdateReportStatusCmd` (`src/types.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/reports.astro` → shell + `FiltersBar` + `AdminReportsTable`
- `AdminReportsTable` (React)
  - Columns: contract/property, month, status, realized toggle, last email attempt
  - Row actions: Generate, Regenerate, Resend; Unlock (confirm)
  - Uses: `Button`, `ErrorAlert`

## 2) API Integration
Note: Reports endpoints are planned but not present yet in `src/pages/api/v1`.
- List: `GET /api/v1/reports?month=YYYY-MM`
- Generate: `POST /api/v1/reports/generate`
- Regenerate: `POST /api/v1/reports/:id/regenerate`
- Resend email: `POST /api/v1/reports/:id/send-email`
- Toggle realized/unlock: `POST /api/v1/reports/:id` with `UpdateReportStatusCmd`
- Client: `apiGet`, `apiPost`

Proposed client calls
```ts
await apiGet<{ items: import("@/types").ReportDTO[] }>(`/api/v1/reports?month=${month}`);
await apiPost<void>("/api/v1/reports/generate", cmd);
await apiPost<void>(`/api/v1/reports/${id}/regenerate`);
await apiPost<void>(`/api/v1/reports/${id}/send-email`);
await apiPost<void>(`/api/v1/reports/${id}`, { status });
```

## 3) User Interactions
- Month filter drives list; default to current month.
- Row actions honor allowed states; disabled show inline reason.
- Unlock requires native confirm; success toasts; refetch after any action.

Done in this iteration
- Defined table and action set.
- Specified planned endpoints and client usage.
- Listed user behaviors.

Next 3 actions
- State Management: query with month key; batch invalidations after actions.
- Styling & Layout: desktop-first table; action toolbar with clear disabled state.
- Error Handling & Edge Cases: throttle actions; handle 403/409/429 with inline/toast mapping.


