## UI View Implementation — Admin Reports List (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize rows and action handlers; avoid prop churn by keeping stable references.
- Do not refetch list redundantly; batch invalidations after multiple actions.
- Hide expensive UI (e.g., email attempts tooltip) behind lazy rendering.

### 8) Testing
- Load list and month change
  - Mock GET list; change month input → expect new fetch.
- Generate/Regenerate/Resend
  - Click each action with `fireEvent.click` → expect POST and toast; buttons disabled while pending.
- Toggle realized/unlock
  - Toggle realized → expect POST with status; unlock path shows confirm and then POST.
- Errors
  - 403 (list) shows banner; 409/429/500 toasts and refetch.


