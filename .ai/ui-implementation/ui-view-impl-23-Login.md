## UI View Implementation — Login (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Keep `LoginForm` small; avoid unnecessary state.
- Memoize `onSubmit` with `useCallback` to keep prop stability if lifted.
- Use `React.memo` only if `LoginForm` becomes a child of a frequently rerendering parent.
- Defer non-critical UI (e.g., success icon) with dynamic import if needed.

### 8) Testing
- Form submission success
  - Enter valid email → `fireEvent.click` submit → expect success message and disabled button during request.
- Validation
  - Empty email → submit → expect native validity prevents submit and focus on email input.
- Network error
  - Mock `apiPost` rejection → submit → expect inline error rendered and button re-enabled.

Notes
- Favor integration-style unit tests for the component with Vitest + React Testing Library.


