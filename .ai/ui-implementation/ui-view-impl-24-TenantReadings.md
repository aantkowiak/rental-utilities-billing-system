## UI View Implementation — Tenant Readings (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize event handlers (`useCallback`) and derived values (window bounds) with `useMemo`.
- Avoid re-renders: keep numeric inputs as strings; parse only on submit.
- Split `ReadingForm` into small subcomponents if needed; use `React.memo` for stable props.
- Debounce visibility-change refetch to avoid bursty network calls.

### 8) Testing
- Precision clamp
  - Type `1,23456` → blur → expect `1.235` stored/displayed.
- Window disable
  - Mock date outside window → expect inputs disabled and reason visible.
- Create path
  - No existing reading → fill values → `fireEvent.click` submit → expect POST called and toast.
- Edit path
  - Existing reading present → change value → submit → expect PATCH and toast.
- Error mapping
  - 422 returns field errors → expect inline errors and focus first invalid.
  - 409 on submit → expect toast and refetch.


