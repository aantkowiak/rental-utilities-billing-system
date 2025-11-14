## UI View Implementation — Admin Readings (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize table rows and action handlers (`React.memo`, `useCallback`).
- Avoid full table rerender by isolating row state (pending flags) per row.
- Debounce filter changes (month/property) before fetch.
- Skip unnecessary refetches by comparing previous filter values.

### 8) Testing
- List load
  - Mock GET list → expect rows rendered with correct badges/columns.
- Edit flow
  - Open edit → change value → `fireEvent.click` Save → expect PATCH and toast; field error mapping on 422.
- Delete flow
  - Confirm delete → expect DELETE and row removed after refetch.
- Replacement flow
  - Open modal → submit → expect POST replacement and refetch.
- Recalc anchors
  - Fill panel → submit → overlay spinner visible; expect POST with payload, success toast, overlay hidden.


