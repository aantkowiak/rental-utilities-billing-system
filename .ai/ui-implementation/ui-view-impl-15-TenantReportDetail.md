## UI View Implementation — Tenant Report Detail (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Routing: read `id` param from Astro page and pass to React component.
- Data: `report?: ReportDTO`, `loading: boolean`, `error?: string`.
  - Fetch on mount and on `id` change: GET `/api/v1/reports/:id` (planned).
- Actions: `pendingResend: boolean` to disable the resend CTA while posting.

### 5) Styling & Layout
- Detail layout: sections for metadata, items, totals (PLN), last email attempt.
- Formatting: use `Intl.NumberFormat('pl-PL', { style:'currency', currency:'PLN' })` for amounts.
- CTA: primary `Button` for Resend, conditionally rendered; layout spacing via `space-y-6`.

### 6) Error Handling & Edge Cases
- 404: show inline not-found message within `ErrorAlert`.
- 403: inline access message; no redirect.
- Resend errors: show toast; keep button enabled after failure; refetch detail on success.
- Network: show toast and keep stale data if present.

Summary of this iteration
- Established fetch/pending state and conditional actions.
- Defined clear, readable layout with localized currency formatting.
- Mapped 404/403 and resend failure behaviors.

Next 3 actions (Iteration 3)
- Performance: memoize heavy item rendering; split sections if large.
- Testing: load success/404/403, resend button behavior via `fireEvent.click`.
- Optional: skeleton placeholders while loading.


