## UI View Implementation — Admin Profile (minimal)

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Admin Profile (minimal)" (path `/admin/profile`; tenant variant at `/app/profile`).
- Purpose: Update display name.
- Key components: Simple form; Save CTA; inline error area.

### Implementation Rules
- Tech: Astro, React, TS, Tailwind, Shadcn/ui.
- Handle known routing nuances until endpoint normalization; provide fallback messaging.

### Types
- DTOs: `ProfileDTO` (`src/types.ts`).
- Commands: `UpdateMeCmd` (`src/types.ts`).

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page: `admin/profile.astro` → shell + `ProfileForm`
- `ProfileForm` (React)
  - Field: displayName
  - Actions: Save (primary)
  - Uses: `ErrorAlert`, `Button`

## 2) API Integration
- Update profile: `PATCH /api/v1/me` (see `src/pages/api/v1/me.patch.ts`)
- Client: add `apiPatch` to `src/lib/client/http.ts`

Proposed client call
```ts
// with apiPatch helper
await apiPatch<{ profile: import("@/types").ProfileDTO }>("/api/v1/me", { displayName });
```

## 3) User Interactions
- Save submits PATCH; on success: toast; optionally reflect new display name in header.
- On 422: inline field error; on 404: inline message; network errors via toast.

Done in this iteration
- Defined simple form structure and responsibilities.
- Mapped endpoint and client usage.
- Listed interactions and error mapping.

Next 3 actions
- State Management: local input state; pending flag; disable while saving.
- Styling & Layout: compact form; visible focus.
- Error Handling & Edge Cases: debounce submit; optimistic header update on success.


