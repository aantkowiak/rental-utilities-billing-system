## UI View Implementation — Login (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Local state in `LoginForm`:
  - `email: string`, `status: "idle" | "pending" | "success" | "error"`, `apiError?: string`.
  - Derived: `isDisabled = status === "pending"`.
  - Refs: `emailRef` to focus the field on validation error.
- Validation
  - Use native `type="email"` and `required` for HTML5 validation.
  - On submit, check validity via `form.reportValidity()`; focus first invalid.
- Submission
  - Set `status="pending"` → call `apiPost` to `/api/v1/auth/magic-link` → set `status="success"` on resolve.
  - Capture network failures, set `status="error"` and `apiError`.

### 5) Styling & Layout
- Page layout (Astro): centered container `max-w-sm mx-auto px-4 py-8` within `<main>`.
- Form spacing: vertical stack `space-y-4` and label/input pairing with `block` labels.
- Button: `Button` with default variant; disabled when pending.
- Accessibility: single `h1`, inputs with `id`/`htmlFor`, `aria-live="polite"` region for success.

### 6) Error Handling & Edge Cases
- 400 (invalid JSON) unlikely from this view; treat any non-OK as generic error toast + keep form enabled.
- Network failures: show inline `ErrorAlert` and keep `status="error"` until user edits.
- Prevent duplicate submits: ignore clicks while `status="pending"`.
- Announce success in `aria-live` and suggest checking inbox; do not expose server internals.

Summary of this iteration
- Added clear local state model and validation strategy.
- Defined responsive layout with accessible semantics.
- Mapped error behaviors for network and unexpected failures.

Next 3 actions (Iteration 3)
- Performance: minor – memoize submit handler, avoid re-renders; lazy-load any icons.
- Testing: unit test form interactions (valid/invalid submit, success/error states) using `fireEvent.click`.
- Optional: minor copy/UX refinements and rate-limit messaging.


