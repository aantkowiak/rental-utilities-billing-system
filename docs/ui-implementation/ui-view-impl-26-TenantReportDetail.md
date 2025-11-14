## UI View Implementation — Tenant Report Detail (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize the line items section with `React.memo` if items are static for the view.
- Keep resend handler stable with `useCallback`.
- Avoid recompute of totals by memoizing derived totals.

### 8) Testing
- Load success
  - Mock GET detail → render → expect metadata and totals displayed.
- 404 and 403
  - Mock 404/403 → expect inline `ErrorAlert` with correct messaging.
- Resend action
  - `fireEvent.click` Resend → expect POST and toast; button disabled while pending; detail refetched on success.


