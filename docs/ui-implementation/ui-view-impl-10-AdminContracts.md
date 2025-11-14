## UI View Implementation — Admin Contracts

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Contracts" (path `/admin/contracts`).
- Purpose: CRUD for contracts to tie tenants to properties.
- Key components: Contracts list; inline create/edit/detail.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Admin-only; confirm destructive; inline 422 feedback if validation emerges; desktop-first tables.

### Types
- DTOs: `ContractDTO` (`src/types.ts`).
- Commands: `CreateContractCmd`, `UpdateContractCmd` (`src/types.ts`).
- Responses: `ListContractsResponse`, `ContractResponse` (`src/types/contracts.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/contracts.astro` → shell + `AdminContractsList`
- `AdminContractsList` (React)
  - Columns: property, tenant, period (from–to), active flag
  - Row actions: Edit, Delete; Inline detail
  - Header: New Contract
  - Uses: `Button`, `ErrorAlert`

## 2) API Integration
- List/create: `GET /api/v1/contracts`, `POST /api/v1/contracts`
- Item: `GET /api/v1/contracts/:contractId`, `PATCH /api/v1/contracts/:contractId`, `DELETE /api/v1/contracts/:contractId`
- Client: `apiGet`, `apiPost`; add `apiPatch`/`apiDelete` next

Proposed client calls
```ts
await apiGet<import("@/types/contracts").ListContractsResponse>("/api/v1/contracts");
await apiPost<import("@/types/contracts").ContractResponse>("/api/v1/contracts", createCmd);
// upcoming: apiPatch(`/api/v1/contracts/${id}`, updateCmd); apiDelete(`/api/v1/contracts/${id}`)
```

## 3) User Interactions
- Create/Edit validate period; on 409 overlap: inline error; on 400 FK violation: inline error.
- Delete requires confirm; success toasts; refetch after mutations.
- Tenant scoping: tenants see only own contracts (server-side enforced).

Done in this iteration
- Defined list structure and actions.
- Mapped endpoints and client usage.
- Listed interactions and conflict handling.

Next 3 actions
- State Management: query with filters; mutation invalidation; optimistic updates for edits.
- Styling & Layout: clear period display; accessible forms.
- Error Handling & Edge Cases: surface 403/404; guard against overlapping periods client-side.


