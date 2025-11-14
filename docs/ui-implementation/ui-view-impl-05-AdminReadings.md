## UI View Implementation — Admin Readings

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Readings" (path `/admin/readings`).
- Purpose: Review, create/edit readings (backdating), replacement readings, and anchor recalculation.
- Key components: Readings Table, Reading Form (admin), Replacement Modal, Anchor Recalc Panel.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Admin-only actions guarded server-side; show inline 403 where relevant.
- Month filter via `FiltersBar` stored in `?month=` and `localStorage`.

### Types
- DTOs: `ReadingDTO` (`src/types.ts`).
- Commands: `CreateReadingCmd`, `UpdateReadingCmd`, `CreateReadingReplacementCmd`, `RecalculateAnchorsCmd` (`src/types.ts`).
- Responses: `ReadingListResponse`, `ReadingResponse` (`src/types/readings.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/readings.astro` → shell + `FiltersBar` + `ReadingsTable` + `AnchorRecalcPanel`
- `ReadingsTable` (React)
  - Columns: property, meter type, value, `readingAt`, anchor badge, replacement presence
  - Row actions: Edit, Delete, Replacement
  - Uses: `ErrorAlert`, `Button`
- `ReadingForm` (admin variant)
  - Fields: meter values, `datetime-local` for backdating, optional comment
- `ReplacementForm` (modal)
  - Fields: effectiveMonth and meter values
- `AnchorRecalcPanel`
  - Controls: property selector (scoped), from/to months, CTA

## 2) API Integration
- List/create/update/delete
  - `GET /api/v1/readings?propertyId=...&from=...&to=...`
  - `POST /api/v1/readings`
  - `PATCH /api/v1/readings/:id`
  - `DELETE /api/v1/readings/:id`
- Replacement: `POST /api/v1/readings/:id/replacement`
- Recalc anchors: `POST /api/v1/readings/recalculate-anchors`
- Client: `apiGet`, `apiPost`; add `apiPatch`/`apiDelete` next

Proposed client calls
```ts
await apiGet<import("@/types/readings").ReadingListResponse>(listUrl);
await apiPost<import("@/types/readings").ReadingResponse>("/api/v1/readings", createCmd);
// forthcoming helpers: apiPatch(`/api/v1/readings/${id}`, updateCmd); apiDelete(`/api/v1/readings/${id}`)
await apiPost<unknown>(`/api/v1/readings/${id}/replacement`, replacementCmd);
await apiPost<{ status: string }>("/api/v1/readings/recalculate-anchors", recalcCmd);
```

## 3) User Interactions
- Month filter updates list; persisted in query/localStorage.
- Row actions:
  - Edit: opens form prefilled; on save, toast + refetch; show 422 inline; 409 toast.
  - Delete: native confirm, then DELETE; toast + refetch.
  - Replacement: opens modal; POST replacement; toast + refetch.
- Recalc Anchors: overlay spinner while pending; toast on success; handle 400/500 via inline/ toast.

Done in this iteration
- Defined component structure with forms, modal, and panel.
- Mapped all readings endpoints and client usage.
- Listed core interactions and error behaviors.

Next 3 actions
- State Management: query for list keyed by property/month; modal state; mutations with optimistic UI where safe.
- Styling & Layout: desktop-first table ≥md; accessible modals.
- Error Handling & Edge Cases: prevent duplicate submissions; show disabled reasons when actions unavailable.


