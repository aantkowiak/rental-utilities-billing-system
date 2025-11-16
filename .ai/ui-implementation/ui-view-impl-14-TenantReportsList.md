## UI View Implementation — Tenant Reports List (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Month filter
  - Read from `?month=YYYY-MM` with fallback to current month.
  - Persist to `localStorage` on change; update query param without full navigation.
  - Derived: `isValidMonth` with graceful reset when invalid.
- Data
  - `items?: ReportDTO[]`, `loading: boolean`, `error?: string`.
  - Fetch on mount and whenever `month` changes: GET `/api/v1/reports?month=...` (planned endpoint).
- Actions
  - Row action pending flags: `pendingGenerateById`, `pendingResendById` maps to disable only that row.

### 5) Styling & Layout
- Layout: header with month selector (native `input type="month"`), then table/list.
- Table: columns for month, status, last email attempt; action cell with buttons.
- Buttons: use `Button` with variants (primary for Generate/Resend; ghost for disabled states with tooltip/title).
- Accessibility: labels for month selector; use `aria-disabled` and `title` for disabled reasons.

### 6) Error Handling & Edge Cases
- 403: show `ErrorAlert` inline; keep page accessible.
- Action throttling: disable buttons while a row mutation is pending; ignore repeated clicks.
- 409/429/500: show toast; refetch list after conflicts/success.
- Invalid month param: reset to current and replace URL to avoid history noise.

Summary of this iteration
- Added month-scoped state and data model with per-row pending flags.
- Defined minimal, accessible table layout with selector.
- Captured error/edge flows including throttling and invalid filters.

Next 3 actions (Iteration 3)
- Performance: memoize row components; key list by ID; avoid re-renders.
- Testing: month change triggers fetch; action buttons disabled while pending; toast/refetch flows.
- Optional: introduce a small `useMonth` hook for reuse.


