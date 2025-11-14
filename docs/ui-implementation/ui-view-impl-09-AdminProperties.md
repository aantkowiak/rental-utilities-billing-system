## UI View Implementation — Admin Properties

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Properties" (path `/admin/properties`).
- Purpose: CRUD for properties to support onboarding and assignment.
- Key components: Properties table/list; inline create/edit; simple detail drawer (optional).

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Admin-only; confirm destructive; inline validation; desktop-first tables at ≥md.

### Types
- DTOs: `PropertyDTO` (`src/types.ts`).
- Commands: `CreatePropertyCmd`, `UpdatePropertyCmd` (`src/types.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/properties.astro` → shell + `AdminPropertiesList`
- `AdminPropertiesList` (React)
  - Table columns: label, address (if available), startMonth, linked contracts count (summary)
  - Row actions: Edit, Delete
  - Header actions: New Property
  - Optional: detail drawer on row click
  - Uses: `Button`, `ErrorAlert`

## 2) API Integration
- List/create: `GET /api/v1/properties`, `POST /api/v1/properties`
- Item: `GET /api/v1/properties/:id`, `PATCH /api/v1/properties/:id`, `DELETE /api/v1/properties/:id`
- Client: `apiGet`, `apiPost` (+ add `apiPatch`/`apiDelete` next)

Proposed client calls
```ts
await apiGet<{ items: import("@/types").PropertyDTO[] }>("/api/v1/properties");
await apiPost<{ property: import("@/types").PropertyDTO }>("/api/v1/properties", createCmd);
// upcoming: apiPatch(`/api/v1/properties/${id}`, updateCmd); apiDelete(`/api/v1/properties/${id}`)
```

## 3) User Interactions
- Create/Edit dialogs with inline field validation; on success: toast + refetch.
- Delete requires confirm; on 409 duplicate label: inline message; on 404: inline error.

Done in this iteration
- Defined list structure and actions.
- Mapped endpoints and client usage.
- Listed interactions and error mapping.

Next 3 actions
- State Management: query for list; mutation invalidation; optimistic updates for edits.
- Styling & Layout: table responsive; forms with visible focus and labels.
- Error Handling & Edge Cases: handle duplicate label (409); disable delete if constrained (future).


