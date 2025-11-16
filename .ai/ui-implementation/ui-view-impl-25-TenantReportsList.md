## UI View Implementation — Tenant Reports List (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Keep month in a single state source to avoid double renders (sync URL → state once).
- Memoize row components with `React.memo`; pass stable handlers via `useCallback`.
- Avoid list re-creation: key by `report.id` and keep stable array references where possible.

### 8) Testing
- Month change
  - Update `input[type=month]` → expect fetch with new month and list update.
- Generate/Resend actions
  - Click Generate/Resend → `fireEvent.click` → expect POST calls and success toast; buttons disabled while pending.
- Disabled reasons
  - Mock item not eligible → expect button disabled with `title` containing reason.
- 403 inline
  - Mock 403 on list → expect `ErrorAlert` rendered with message.


