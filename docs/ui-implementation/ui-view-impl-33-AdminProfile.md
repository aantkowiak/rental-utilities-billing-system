## UI View Implementation — Admin Profile (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Minimal form; no special optimization needed.
- Keep submit handler stable via `useCallback`.

### 8) Testing
- Save success
  - Type new name → `fireEvent.click` Save → expect PATCH `/api/v1/me` and success toast.
- 422 field error
  - Mock validation error → expect inline error and focus on input.
- 404 profile missing
  - Mock 404 → expect inline banner.
- Network error
  - Mock rejection → expect toast and button re-enabled.


