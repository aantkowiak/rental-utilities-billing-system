## UI View Implementation — Admin Monthly Conditions (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Filters: `propertyId`, `month` via query/localStorage; validate month format.
- Data: `items?: MonthlyConditionDTO[]`, `loading: boolean`, `error?: string`.
- Edit state: per-row editable values; `pendingById` map; `fieldErrorsById` for inline validation.
- Create: new-row draft with same structures; `pendingCreate`.
- Fetch on filter changes: GET `/api/v1/monthly-conditions?propertyId=...&month=...`.

### 5) Styling & Layout
- Grid/table layout for fields: labels in header, inputs per row; sticky header at `md+`.
- Lock banner above the table when locked; disable inputs with tooltip/title explaining reason.
- Buttons: Save (primary), Delete (destructive), Add row (secondary).

### 6) Error Handling & Edge Cases
- 422: show field-level messages inline; preserve user inputs; focus first invalid input.
- 403: inline banner; hide create/delete when forbidden.
- 404 on PATCH/DELETE: toast and refetch to reconcile.
- Delete confirm; prevent accidental removal.
- Month changes reset draft states after confirm prompt if unsaved edits exist.

Summary of this iteration
- Established robust per-row edit/draft states keyed by ID.
- Laid out an accessible grid with clear lock handling.
- Covered validation, permission, and navigation-edge behaviors.

Next 3 actions (Iteration 3)
- Performance: memoize rows; minimize re-renders on per-field changes.
- Testing: save/delete flows, locked state disabled behavior, 422 mapping with `fireEvent.click`.
- Optional: bulk save with batched requests.


