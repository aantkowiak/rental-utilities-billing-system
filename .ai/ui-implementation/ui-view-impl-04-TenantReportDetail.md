## UI View Implementation — Tenant Report Detail

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Tenant Report Detail" (path `/app/reports/:id`).
- Purpose: Show report detail; allow resend when permitted.
- Key components: Detail panel, monetary formatting helpers, primary CTA (Resend) when applicable.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Use named exports; `pl-PL` currency formatting; read-only when realized.

### Types
- DTOs: `ReportDTO`, `ReportEmailAttemptDTO` (`src/types.ts`).
- Commands: `SendReportEmailCmd` (`src/types.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `app/reports/[id].astro` → shell + `TenantReportDetail`
- `TenantReportDetail` (React)
  - Sections: metadata, line items, totals (PLN), last email attempt summary
  - Actions: Resend button if allowed
  - Uses: `Button`, formatting helpers

Hierarchy
- `app/reports/[id].astro`
  - `RoleNav`
  - `TenantReportDetail`

Responsibilities
- Page: extract `id` param; provide to detail component.
- Detail: fetch report, render read-only view, expose Resend when permitted.

## 2) API Integration
Note: Reports endpoints are planned but not yet present in `src/pages/api/v1`.
- Detail: `GET /api/v1/reports/:id` → `ReportDTO`
- Resend: `POST /api/v1/reports/:id/send-email`
- Client: `apiGet`, `apiPost`

Proposed client calls
```ts
const report = await apiGet<import("@/types").ReportDTO>(`/api/v1/reports/${id}`);
await apiPost<void>(`/api/v1/reports/${id}/send-email`);
```

## 3) User Interactions
- Resend CTA
  - Shown only when allowed; disabled with reason otherwise.
  - On success: toast and refetch detail to update last attempt.
- Inline access error (403) when lacking permission.

Done in this iteration
- Defined component structure and data responsibilities.
- Specified planned endpoints and client usage.
- Enumerated user interactions and behaviors.

Next 3 actions
- State Management: query for detail with refetch on focus and after resend.
- Styling & Layout: compact readable layout with clear monetary formatting.
- Error Handling & Edge Cases: handle 404 with inline message; network errors via toast.


