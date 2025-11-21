## UI View Implementation — Admin Properties (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Data: `items?: PropertyDTO[]`, `loading: boolean`, `error?: string`.
- Dialogs: `createOpen: boolean`, `editOpenById`, each with form values, `pending`, `fieldErrors`.
- Delete: `pendingDeleteById` to disable only the target row.
- Fetch list on mount and after any mutation: GET `/api/v1/properties`.

### 5) Styling & Layout
- Table with label, startMonth, optional address, contracts summary (if available).
- Header actions: New Property (primary `Button`).
- Forms: labeled inputs with compact layout; visible focus and proper `id`/`htmlFor`.

### 6) Error Handling & Edge Cases
- 409 duplicate label on create/update: inline error message near label.
- 404 on update/delete: toast and refetch to reconcile.
- 403: inline banner indicating insufficient permissions.
- Confirm before delete; disable actions while pending.

Summary of this iteration
- Added list/dialog state and granular pending controls.
- Defined accessible table and modal forms.
- Mapped duplicate, not-found, and permission errors.

Next 3 actions (Iteration 3)
- Performance: memoize rows and dialogs; keep handlers stable.
- Testing: create/edit/delete flows with error states using `fireEvent.click`.
- Optional: sort by label; client filter.


