## UI View Implementation — Admin Profile (Iteration 2)

This iteration covers steps 4–6 from `.ai/ui-implementation/ui-view-implementation.md`.

### 4) State Management
- Local state in `ProfileForm`:
  - `displayName: string`, `pending: boolean`, `fieldError?: string`, `serverError?: string`.
- Submit
  - PATCH `/api/v1/me` with `{ displayName }`; on success, show toast and optionally update any header display name.

### 5) Styling & Layout
- Compact single-field form: label and input with `Button` primary CTA.
- Container: `max-w-md mx-auto px-4 py-6` with clear `h1`.
- Accessibility: associate label with input; `aria-invalid` when field error present.

### 6) Error Handling & Edge Cases
- 422: inline field error; focus input.
- 404: inline banner (profile missing); keep UI usable.
- Network: toast and remain on form; allow retry.

Summary of this iteration
- Defined simple state and submission for profile update.
- Specified accessible minimal layout.
- Mapped common error paths.

Next 3 actions (Iteration 3)
- Performance: trivial; no special optimization needed.
- Testing: submit success, 422 inline, 404 banner using `fireEvent.click`.
- Optional: optimistic update of any display name badge in shell.


