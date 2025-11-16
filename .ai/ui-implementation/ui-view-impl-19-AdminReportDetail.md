## UI View Implementation — Admin Report Detail (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Routing: read `id` param; pass to `AdminReportDetail`.
- Data: `report?: ReportDTO`, `loading: boolean`, `error?: string`.
- Actions: `pendingResend`, `pendingRegenerate`, `pendingToggle` to isolate button-disabled states.
- Fetch on mount and after any successful action.

### 5) Styling & Layout
- Structured sections: metadata, line items, totals (PLN), status and action toolbar, last email attempt.
- Monetary formatting via `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })`.
- Buttons: primary for Resend/Regenerate; toggle control for realized; confirm dialog for unlock.

### 6) Error Handling & Edge Cases
- 404: inline not-found; link back to list.
- 403: inline access message.
- Action errors: toast; leave current view intact; on success, refetch to reflect updates.
- Guard: hide Regenerate when realized; surface disabled reasons via `title`.

Summary of this iteration
- Built clear state model for detail and actions.
- Defined readable, accessible layout with local currency formatting.
- Mapped errors and guard behaviors including unlock confirm.

Next 3 actions (Iteration 3)
- Performance: memoize heavy subtrees; avoid unnecessary re-renders on action toggles.
- Testing: resend/regenerate/toggle flows and error states using `fireEvent.click`.
- Optional: skeleton UI while loading.


