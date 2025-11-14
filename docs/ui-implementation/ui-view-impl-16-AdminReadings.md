## UI View Implementation — Admin Readings (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Filters: `propertyId`, `month` (from `?month=` and `localStorage`), derive `from`/`to` date range.
- Data: `items?: ReadingDTO[]`, `loading: boolean`, `error?: string`.
- Forms/Modals
  - Edit/Create form state: values, `pending: boolean`, `fieldErrors`.
  - Replacement modal state: open/close, payload, `pending`.
  - Row-level pending maps for edit/delete/replacement to avoid global disabling.
- Recalc panel: input state for `fromMonth`/`toMonth` and `pending` to show overlay spinner.
- Fetch list on filters change: GET `/api/v1/readings?propertyId=...&from=...&to=...`.

### 5) Styling & Layout
- Desktop-first table at `md:` breakpoints; responsive stacking on small screens.
- Action cells with clear icon/text buttons; destructive actions styled via `variant="destructive"`.
- Modals: centered, trap focus, labels for inputs; use `space-y-*` utilities.
- Recalc overlay: full-screen semi-transparent backdrop with spinner; `aria-busy` and `aria-live` updates.

### 6) Error Handling & Edge Cases
- 422 on create/update/replacement: map to `fieldErrors`; focus first invalid field.
- 403 on admin-only routes: inline banner using `ErrorAlert`.
- 409 on business conflicts: toast + refetch list to reconcile.
- Delete: native confirm; handle 404 gracefully if row missing; refetch on success.
- Recalc: handle 400 validation with inline messages; 500 with toast; ensure overlay always cleared.

Summary of this iteration
- Established comprehensive state for filters, forms, modals, and background jobs.
- Defined accessible, desktop-first layout with clear action affordances.
- Codified robust error behaviors including conflicts and validation.

Next 3 actions (Iteration 3)
- Performance: memoize rows; virtualize if list grows (not needed per plan now).
- Testing: table actions (edit/delete/replacement), recalc overlay flows via `fireEvent.click`.
- Optional: optimistic update for PATCH when safe; cancelable in-flight requests.


