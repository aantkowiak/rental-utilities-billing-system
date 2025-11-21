## UI View Implementation — Admin Report Detail

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Report Detail" (path `/admin/reports/:id`).
- Purpose: Inspect a report; manage resend; toggle realized/unlock as permitted.
- Key components: Detail layout; monetary formatting; action toolbar.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Confirm unlock; non-blocking toasts; read-only when realized.

### Types
- DTOs: `ReportDTO`, `ReportEmailAttemptDTO` (`src/types.ts`).
- Commands: `RegenerateReportCmd`, `SendReportEmailCmd`, `UpdateReportStatusCmd` (`src/types.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/reports/[id].astro` → shell + `AdminReportDetail`
- `AdminReportDetail` (React)
  - Sections: metadata, items, totals (PLN), last email attempt
  - Actions: Resend, Regenerate, Toggle realized, Unlock (confirm)
  - Uses: `Button`, formatting helpers

## 2) API Integration
Note: Reports endpoints planned but not present yet in `src/pages/api/v1`.
- Detail: `GET /api/v1/reports/:id`
- Resend: `POST /api/v1/reports/:id/send-email`
- Regenerate: `POST /api/v1/reports/:id/regenerate`
- Toggle realized/unlock: `POST /api/v1/reports/:id` with `UpdateReportStatusCmd`
- Client: `apiGet`, `apiPost`

Proposed client calls
```ts
await apiGet<import("@/types").ReportDTO>(`/api/v1/reports/${id}`);
await apiPost<void>(`/api/v1/reports/${id}/send-email`);
await apiPost<void>(`/api/v1/reports/${id}/regenerate`);
await apiPost<void>(`/api/v1/reports/${id}`, { status });
```

## 3) User Interactions
- Resend/Regenerate buttons shown based on state; hide Regenerate when realized.
- Toggle realized; Unlock requires confirm; show toasts; refetch on success.
- Inline 403 message when lacking access.

Done in this iteration
- Defined detail structure and action set.
- Specified planned endpoints and client usage.
- Listed user behaviors and state constraints.

Next 3 actions
- State Management: query detail + invalidation after any action.
- Styling & Layout: concise layout with currency formatting.
- Error Handling & Edge Cases: handle 404; throttle repeated actions.


