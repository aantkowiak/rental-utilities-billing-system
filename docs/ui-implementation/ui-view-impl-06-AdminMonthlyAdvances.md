## UI View Implementation — Admin Monthly Advances

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Monthly Advances" (path `/admin/monthly-advances`).
- Purpose: Create/edit per-month advances; respect locks when linked to realized reports.
- Key components: Monthly Advances Table/Form; lock state banner; Save CTA.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Admin-only; inline validation; disable inputs when locked with clear explanation.
- Month filter via `?month=` and `localStorage`.

### Types
- DTOs: `MonthlyAdvanceDTO` (`src/types.ts`).
- Commands: `CreateMonthlyAdvanceCmd`, `UpdateMonthlyAdvanceCmd` (`src/types.ts`).
- Responses: `MonthlyAdvanceListResponse`, `MonthlyAdvanceResponse` (`src/types/monthlyAdvances.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/monthly-advances.astro` → shell + `FiltersBar` + `MonthlyAdvancesTable`
- `MonthlyAdvancesTable` (React)
  - Rows: tariffs, fixed fees, forecasts, advancePayment
  - Lock banner: displays when month is locked by realized reports; disables inputs
  - Actions: Save per-row or bulk Save
  - Uses: `Button`, `ErrorAlert`

## 2) API Integration
- List: `GET /api/v1/monthly-advances?propertyId=...&month=YYYY-MM`
- Create: `POST /api/v1/monthly-advances`
- Item: `GET /api/v1/monthly-advances/:id`, `PATCH /api/v1/monthly-advances/:id`, `DELETE /api/v1/monthly-advances/:id`
- Client: `apiGet`, `apiPost`; add `apiPatch`/`apiDelete` next

Proposed client calls
```ts
await apiGet<import("@/types/monthlyAdvances").MonthlyAdvanceListResponse>(listUrl);
await apiPost<import("@/types/monthlyAdvances").MonthlyAdvanceResponse>("/api/v1/monthly-advances", createCmd);
// upcoming helpers: apiPatch(`/api/v1/monthly-advances/${id}`, updateCmd), apiDelete(...)
```

## 3) User Interactions
- Month filter drives list; defaults to current month; invalid values reset.
- Save
  - On 422: inline field-level messages; on success: toast + refetch
  - Locked state: inputs disabled with inline explanation

Done in this iteration
- Defined table structure with lock handling and actions.
- Mapped endpoints and client usage.
- Listed user behaviors and validations.

Next 3 actions
- State Management: query keyed by property+month; mutation invalidation; in-memory cache only.
- Styling & Layout: desktop-first grid; clear disabled styling.
- Error Handling & Edge Cases: handle 403/404; confirm delete; forecast=0 info visibility.


