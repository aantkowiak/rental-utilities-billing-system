## UI View Implementation — Admin Contracts (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize row and dialog components; pass stable event handlers.
- Avoid re-creating select options for properties/tenants on each render.
- Pre-validate period overlap client-side to short-circuit obvious conflicts.

### 8) Testing
- Create
  - Fill valid period → `fireEvent.click` Save → POST called; item visible after refetch.
  - Overlap (409) → inline error; FK violation (400) → inline near selectors.
- Edit
  - Change period/active → Save → PATCH; 404 → toast + refetch.
- Delete
  - Confirm delete → DELETE; row removed after refetch.
- Permissions
  - 403 on mutation → banner and disabled actions.


