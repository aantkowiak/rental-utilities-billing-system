## UI View Implementation — Login

### Implementation Plan
- Source: `.ai/ui-plan.md`, section "View name: Login" (path `/auth/login`).
- Purpose: Request magic link and handle callback status.
- Key components: Header, simple form, status/alert area.

### Implementation Rules
- Tech: Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui.
- Follow workspace coding practices (early returns, inline error messages, guard clauses).
- Use named exports for all components.
- Testing: use `fireEvent.click` for click actions.
- Prefer existing styles from `src/styles/global.css` and component utilities; avoid ad-hoc CSS.

### Types
- Commands/DTOs: none required for request body beyond `{ email: string }`.
- Shared: see `src/types.ts` for conventions; `RequestMagicLinkCmd` shape aligns with `{ email: string }`.

### Implementation Approach
This iteration implements steps 1–3 (Component Structure, API Integration, User Interactions). Next steps will cover State Management, Styling/Layout, and Error Handling/Edge Cases.

## 1) Component Structure
- Page shell: `auth/login.astro`
  - Renders app header (text + favicon)
  - Hosts `LoginForm` client component
- `LoginForm` (React)
  - Children: `ErrorAlert` (for inline validation/API errors), `Button` from `src/components/ui/button`
  - Fields: email (type="email"), submit CTA
  - Status area: success info after request

Hierarchy
- `auth/login.astro`
  - `LoginForm`
    - `ErrorAlert`
    - `Button`

Responsibilities
- `auth/login.astro`: layout, accessibility landmarks, page `h1`.
- `LoginForm`: manage form state, validation, submit, success message.
- `ErrorAlert`: display inline error details for invalid input (422/400 equivalent).

## 2) API Integration
- Endpoint: `POST /api/v1/auth/magic-link` (see `src/pages/api/v1/auth/magic-link.ts`). Returns `{ status: "sent" }` with 200.
- HTTP client: use `apiPost` from `src/lib/client/http.ts`.

Proposed client call
```ts
await apiPost<{ status: string }>("/api/v1/auth/magic-link", { email });
```

Notes
- No session return; the endpoint always returns 200 by design. Show a generic success state.
- Future: optional session bootstrap via `GET /api/v1/me` when available.

## 3) User Interactions
- Submit email
  - Disable CTA while pending; show success message on resolve.
  - Validate format client-side; focus first invalid field.
  - Map 400 (validation) to inline field errors (if ever returned).
- Keyboard/accessibility
  - Enter key submits; visible focus; `aria-live` polite for success.
- Errors
  - Network failure: show non-blocking toast and keep form enabled.

Done in this iteration
- Defined component tree and responsibilities.
- Mapped API endpoint and client call.
- Listed concrete user interactions and behaviors.

Next 3 actions
- State Management: local state for email, pending, error/success; derive disabled.
- Styling & Layout: responsive centered card; use `Button` and semantic form controls.
- Error Handling & Edge Cases: throttle button to avoid rapid re-submits; announce success via `aria-live`.


