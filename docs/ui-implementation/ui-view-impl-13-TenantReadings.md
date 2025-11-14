## UI View Implementation — Tenant Readings (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Local form state in `ReadingForm`:
  - `coldM3`, `hotM3`, `heatingGj` as strings for controlled inputs; parse on submit.
  - `readingAt` (`datetime-local` or date-time input consistent with tenant flow).
  - `pending: boolean`, `fieldErrors?: Record<string,string>`, `serverError?: string`.
  - `currentReading?: ReadingDTO` (latest for month), `isEditMode = !!currentReading`.
- Context
  - Resolve `propertyId` (tenant: fixed; use `usePropertyScope` if needed for context).
  - Compute month window in Europe/Warsaw (−3/+5 days): derive `isWithinWindow` and disable inputs if false.
- Data fetching
  - On mount and when month changes, GET `/api/v1/readings?propertyId=...&from=...&to=...` to load latest.
  - Store `currentReading` and prefill the form when present.

### 5) Styling & Layout
- Form layout: stacked inputs with labels; responsive container `max-w-xl mx-auto px-4 py-6`.
- Numeric inputs: `inputMode="decimal"`, `step="0.001"`, `min="0"`.
- Clamp precision on blur to 3 decimals (comma or dot accepted): normalize on change, clamp on blur.
- Badge for anchored reading: small neutral badge next to value.
- CTA: primary `Button`; disabled when outside window or pending.

### 6) Error Handling & Edge Cases
- 422: map server field errors into `fieldErrors` and render near inputs; focus first invalid.
- 403: render inline access message using `ErrorAlert` (no redirect).
- 409: show non-blocking toast and refetch latest.
- Time window edges: recompute `isWithinWindow` on page visibility/focus; debounce refetch on window focus.
- Network: show toast; keep prior data; allow retry.

Summary of this iteration
- Defined local/remote state strategy with month-scoped loading and edit mode.
- Specified responsive, accessible form layout with precision handling.
- Codified server error mappings and edge behaviors.

Next 3 actions (Iteration 3)
- Performance: memoize handlers; avoid recompute of window logic; minimal re-renders.
- Testing: cover precision clamp, window disable, 422 mapping, 409 refetch using `fireEvent.click`.
- Optional: add optimistic UI for PATCH when safe.


