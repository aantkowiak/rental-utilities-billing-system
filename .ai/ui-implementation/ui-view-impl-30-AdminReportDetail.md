## UI View Implementation — Admin Report Detail (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize item list and totals; keep action handlers stable.
- Avoid full rerender after minor state flips by isolating action state.

### 8) Testing
- Load success/404/403 paths
  - Mock GET detail accordingly; verify respective UI states.
- Actions
  - Resend/Regenerate: `fireEvent.click` → POST calls; buttons disabled while pending; toast shown; refetch on success.
  - Toggle realized/unlock: toggle → POST with status; confirm unlock path.
- Error toasts
  - Simulate server errors → toast; ensure UI re-enables controls.


