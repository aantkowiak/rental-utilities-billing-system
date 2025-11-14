## UI View Implementation — Admin Contracts (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Data: `items?: ContractDTO[]`, `loading: boolean`, `error?: string`.
- Dialogs: create/edit with fields `propertyId`, `tenantUserId`, `period.from`, `period.to`, `active?`, `pending`, `fieldErrors`.
- Delete: `pendingDeleteById` map.
- Fetch: GET `/api/v1/contracts` on mount and after mutations.

### 5) Styling & Layout
- Table columns: property, tenant, period, active; header with New Contract.
- Forms: date pickers (`input type="date"`) for period; dropdowns/selects for property and tenant identifiers.
- Accessible labels and helper text for overlap constraints.

### 6) Error Handling & Edge Cases
- 409 overlap: inline error near period inputs; optionally highlight the offending range.
- 400 FK violation: inline error near selectors.
- 403/404: inline banner or toast + refetch.
- Delete confirm; disable while pending.

Summary of this iteration
- Established create/edit/delete state and fetch cycles.
- Laid out table and forms with accessible inputs.
- Captured conflict and FK error flows.

Next 3 actions (Iteration 3)
- Performance: memoize lists; avoid rerender on unrelated dialog state.
- Testing: overlap conflict, FK violation, happy path via `fireEvent.click`.
- Optional: client-side pre-check for overlaps before submit.


