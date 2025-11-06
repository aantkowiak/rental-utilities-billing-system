## UI View Implementation — Admin Monthly Conditions

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Monthly Conditions" (path `/admin/monthly-conditions`).
- Purpose: Create/edit per-month conditions; respect locks when linked to realized reports.
- Key components: Monthly Conditions Table/Form; lock state banner; Save CTA.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Admin-only; inline validation; disable inputs when locked with clear explanation.
- Month filter via `?month=` and `localStorage`.

### Types
- DTOs: `MonthlyConditionDTO` (`src/types.ts`).
- Commands: `CreateMonthlyConditionCmd`, `UpdateMonthlyConditionCmd` (`src/types.ts`).
- Responses: `MonthlyConditionListResponse`, `MonthlyConditionResponse` (`src/types/monthlyConditions.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/monthly-conditions.astro` → shell + `FiltersBar` + `MonthlyConditionsTable`
- `MonthlyConditionsTable` (React)
  - Rows: tariffs, fixed fees, forecasts, advancePayment
  - Lock banner: displays when month is locked by realized reports; disables inputs
  - Actions: Save per-row or bulk Save
  - Uses: `Button`, `ErrorAlert`

## 2) API Integration
- List: `GET /api/v1/monthly-conditions?propertyId=...&month=YYYY-MM`
- Create: `POST /api/v1/monthly-conditions`
- Item: `GET /api/v1/monthly-conditions/:id`, `PATCH /api/v1/monthly-conditions/:id`, `DELETE /api/v1/monthly-conditions/:id`
- Client: `apiGet`, `apiPost`; add `apiPatch`/`apiDelete` next

Proposed client calls
```ts
await apiGet<import("@/types/monthlyConditions").MonthlyConditionListResponse>(listUrl);
await apiPost<import("@/types/monthlyConditions").MonthlyConditionResponse>("/api/v1/monthly-conditions", createCmd);
// upcoming helpers: apiPatch(`/api/v1/monthly-conditions/${id}`, updateCmd), apiDelete(...)
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


