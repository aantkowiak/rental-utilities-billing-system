## UI View Implementation — Admin Reports List (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Month filter: from `?month=YYYY-MM` with localStorage persistence and validation.
- Data: `items?: ReportDTO[]`, `loading: boolean`, `error?: string`.
- Row action states: `pendingGenerateById`, `pendingRegenerateById`, `pendingResendById`, `pendingToggleById`.
- Fetch on month change: GET `/api/v1/reports?month=...` (planned).

### 5) Styling & Layout
- Table with columns: contract/property, month, status, realized toggle, last email attempt, actions.
- Action toolbar per row with `Button` variants; hide Regenerate when realized.
- Month selector in header using native `input type="month"`.

### 6) Error Handling & Edge Cases
- 403: inline banner via `ErrorAlert`.
- Toggle realized/unlock: show confirm for unlock; disable toggle while pending; toast on success.
- 409/429/500: toast and refetch; disabled reasons surfaced via `title` or inline hint.
- Invalid month automatically reset to current with URL replace.

Summary of this iteration
- Added month-scoped data state and granular row-level pending flags.
- Specified accessible table and action layout.
- Captured permission, conflict, and unlock confirm behaviors.

Next 3 actions (Iteration 3)
- Performance: memoize row components; keep action closures stable.
- Testing: generate/regenerate/resend/toggle flows, disabled reasons, confirm prompts with `fireEvent.click`.
- Optional: batch refetch after multiple actions.


