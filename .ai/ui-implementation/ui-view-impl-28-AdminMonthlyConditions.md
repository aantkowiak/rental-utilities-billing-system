## UI View Implementation — Admin Monthly Conditions (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize row components; avoid recreating arrays/objects on each keystroke.
- Batch state updates inside a single `setState` where possible for form edits.
- Debounce save clicks if using per-keystroke autosave (not required now).

### 8) Testing
- Load and render
  - Mock GET list → expect rows rendered with values; lock banner visible when locked.
- Save update
  - Edit a field → `fireEvent.click` Save → expect PATCH and toast; on 422, inline error shown.
- Create/delete
  - Add row → Save → expect POST and new row appears; delete confirm and row removal after DELETE.
- Permissions
  - Mock 403 → expect controls disabled/hidden and an inline banner.


