# UI Architecture for Rental Utilities Billing System

## 1. UI Structure Overview

- Role-guarded areas with separate shells and layouts:
  - Tenant application at `/app/*`.
  - Admin console at `/admin/*`.
  - Public authentication at `/auth/login`.
- Route protection:
  - Guard via server middleware and client checks after boot.
  - Redirect on 401 to `/auth/login`; inline 403 messages; minimal page-level fallback for 500s.
- Data and performance:
  - Small datasets; normal scrolling; render full lists (no virtualization).
  - Eagerly preload key datasets post-auth; in-memory cache only; refetch on window focus and ~60s.
  - One primary CTA per view; non-blocking toasts; overlay spinner only for blocking actions.
- Global filtering (admin):
  - Native `input type="month"` stored in `?month=YYYY-MM` and `localStorage`; defaults to current month; reset to “Bieżący miesiąc”.
- Localization and formatting:
  - Polish-only UI; `pl-PL` locale; PLN currency.
  - Strict rounding: consumption 3 decimals, unit prices 4, amounts 2. Accept comma/dot; clamp precision on blur.
- Accessibility:
  - Semantic landmarks (`header`, `nav`, `main`, `footer`), single `h1`, skip-to-content link, visible focus.
  - On form submit, move focus to first invalid field; inline errors for 422.
- Security and privacy:
  - Supabase magic link auth; JWT attached via HTTP wrapper with 20s timeout.
  - UI respects role (tenant/admin) and property-level access; no tokens/PII in `localStorage`.
- Branding and context:
  - Text header with favicon; show single property label in headers; no property switcher.

## 2. View List

### Public

- View name: Login
  - View path: `/auth/login`
  - Main purpose: Start and complete magic-link authentication flow.
  - Key information to display:
    - Email input; submit to request magic link.
    - Callback handling status (success/failure) when returning with token.
  - Key view components:
    - Header with app name/icon, simple form, status/alert area.
  - UX, accessibility, and security considerations:
    - Keep form minimal; inline validation; visible focus; announce success/failure.
    - No role data shown until authenticated; handle throttling errors with toast.
  - APIs used: `POST /api/v1/auth/magic-link`; on boot `GET /api/v1/me` (when available) for session/role.
  - Requirements covered: Auth (magic link), error mapping (401→login, 422 inline, 429 toast).

### Tenant

- View name: Tenant Readings
  - View path: `/app/readings`
  - Main purpose: Submit and edit monthly meter readings within allowed time window; show latest state.
  - Key information to display:
    - Current month context; last submitted reading; window status; anchored badge on anchored readings.
    - Combined form (meter value, datetime in Europe/Warsaw, optional notes if present later).
  - Key view components:
    - Combined Reading Form; Inline validation messages; Success toast; Small “Kotwica” badge; Submit CTA.
  - UX, accessibility, and security considerations:
    - Enforce −3/+5 day window (Europe/Warsaw). Outside window: disable inputs with inline reason.
    - Tenants can edit within window; focus first invalid; show non-blocking toast on success.
    - 403 shown inline if property access mismatch; 409 conflict as toast + refetch.
  - APIs used: `GET/POST/PATCH /api/v1/readings`, `GET /api/v1/readings/:id`.
  - Requirements covered: Decisions 9, 12, 15, 19.

- View name: Tenant Reports List
  - View path: `/app/reports`
  - Main purpose: Show monthly reports relevant to the tenant with basic actions (generate/resend if allowed).
  - Key information to display:
    - Month selector, list of reports with status, last email attempt summary.
  - Key view components:
    - Table/List, Month selector (optional tenant scope), Row actions (Generate, Resend) with inline disabled states.
  - UX, accessibility, and security considerations:
    - Keep actions minimal; show disabled reasons; hide Regenerate when realized.
    - Rely on server throttles; confirm for destructive/unlock if exposed.
  - APIs used: `GET /api/v1/reports`, `POST /api/v1/reports/generate`, `POST /api/v1/reports/:id/send-email`.
  - Requirements covered: Decisions 10, 12, 14.

- View name: Tenant Report Detail
  - View path: `/app/reports/:id`
  - Main purpose: Show report detail; allow resend when permitted.
  - Key information to display:
    - Report metadata, items, totals (PLN), last email attempt.
  - Key view components:
    - Detail panel, monetary formatting helpers, “Resend” primary CTA if applicable.
  - UX, accessibility, and security considerations:
    - Read-only when realized; concise monetary formatting; inline 403 message when lacking access.
  - APIs used: `GET /api/v1/reports/:id`, `POST /api/v1/reports/:id/send-email`.
  - Requirements covered: Decisions 10, 18, 19.

### Admin

- View name: Admin Readings
  - View path: `/admin/readings`
  - Main purpose: Review, create/edit readings (with backdating), replacement readings, and anchor recalculation.
  - Key information to display:
    - Month filter, readings table (property, meter type, value, readingAt), anchor badge, replacement presence.
  - Key view components:
    - Readings Table; Reading Form (admin can use `datetime-local` and backdate); Replacement Modal; “Kotwica” badges; Anchor Recalc Panel.
  - UX, accessibility, and security considerations:
    - Inline row actions; native confirm for destructive; overlay spinner for recalculation.
    - 409 conflict toast + refetch; 422 inline when locked by reports; admin-only actions guarded.
  - APIs used: `GET/POST/PATCH/DELETE /api/v1/readings`, `POST /api/v1/readings/:id/replacement`, `POST /api/v1/readings/recalculate-anchors`.
  - Requirements covered: Decisions 3, 4, 9, 12, 18.

- View name: Admin Monthly Conditions
  - View path: `/admin/monthly-conditions`
  - Main purpose: Create/edit per-month conditions; respect locks when linked to realized reports.
  - Key information to display:
    - Month filter, condition fields (tariffs, fixed fees), lock status, forecast=0 info.
  - Key view components:
    - Monthly Conditions Table/Form; Inline validation and locked state banner; Save CTA.
  - UX, accessibility, and security considerations:
    - When locked: disable inputs with inline explanation; 422 details inline.
  - APIs used: `GET/POST/PATCH/DELETE /api/v1/monthly-conditions`.
  - Requirements covered: Decisions 2, 5, 12.

- View name: Admin Reports List
  - View path: `/admin/reports`
  - Main purpose: Manage generation/regeneration/resend; toggle realized; unlock with confirm.
  - Key information to display:
    - Month filter, status, realized toggle, last email attempt summary.
  - Key view components:
    - Table/List; Row actions (Generate, Regenerate, Resend); Realized toggle; Unlock with confirm.
  - UX, accessibility, and security considerations:
    - Hide Regenerate when realized; disabled Generate shows inline reason; rely on server throttling.
  - APIs used: `GET /api/v1/reports`, `POST /api/v1/reports/generate`, `GET/POST /api/v1/reports/:id`, `POST /api/v1/reports/:id/regenerate`, `POST /api/v1/reports/:id/send-email`.
  - Requirements covered: Decisions 5, 10, 12, 18.

- View name: Admin Report Detail
  - View path: `/admin/reports/:id`
  - Main purpose: Inspect a report; manage resend; toggle realized/unlock as permitted.
  - Key information to display:
    - Metadata, line items, totals (PLN), realized state, email attempt summary.
  - Key view components:
    - Detail layout; monetary formatting; Row/toolbar actions.
  - UX, accessibility, and security considerations:
    - Confirm for unlock; non-blocking toasts; read-only when realized.
  - APIs used: `GET /api/v1/reports/:id`, `POST /api/v1/reports/:id/regenerate`, `POST /api/v1/reports/:id/send-email`.
  - Requirements covered: Decisions 10, 18, 19.

- View name: Admin Properties
  - View path: `/admin/properties`
  - Main purpose: CRUD for properties to support onboarding and assignment.
  - Key information to display:
    - Property label, address, linked contracts summary.
  - Key view components:
    - Properties table/list; Inline create/edit; Simple detail drawer/modal if needed.
  - UX, accessibility, and security considerations:
    - Admin-only; confirm destructive; inline validation.
  - APIs used: `GET/POST /api/v1/properties`, `GET/PATCH/DELETE /api/v1/properties/:id`.
  - Requirements covered: Decision 7 (branding context), 14 (desktop tables), 12 (errors).

- View name: Admin Contracts
  - View path: `/admin/contracts`
  - Main purpose: CRUD for contracts to tie tenants to properties.
  - Key information to display:
    - Property, tenant, start/end dates, active flag.
  - Key view components:
    - Contracts list; Inline create/edit/detail.
  - UX, accessibility, and security considerations:
    - Admin-only; confirm destructive; inline 422 feedback if validation emerges.
  - APIs used: `GET/POST /api/v1/contracts`, `GET/PATCH/DELETE /api/v1/contracts/:contractId`.
  - Requirements covered: Decisions 7, 12, 14.

- View name: Admin Profile (minimal)
  - View path: `/admin/profile` (optional) / Tenant Profile at `/app/profile`
  - Main purpose: Update display name (PATCH `/v1/me` once normalized).
  - Key information to display:
    - Display name field.
  - Key view components:
    - Simple form; Save CTA; Inline error area.
  - UX, accessibility, and security considerations:
    - Handle known routing issue until endpoint is normalized; provide fallback messaging.
  - APIs used: `PATCH /api/v1/me` (pending route normalization).
  - Requirements covered: Decision 11, 12.

Note: Internal task trigger UI is omitted from MVP per decision. Anchor recalculation is exposed via the admin readings view only.

## 3. User Journey Map

- Entry and authentication
  - User lands on `/auth/login`, requests magic link, completes email flow, and is redirected with token.
  - On boot, client fetches session/profile; middleware and client guards decide destination.
  - Redirect rules: tenant → `/app/readings`; admin → `/admin/readings`; respect `returnUrl` when present.

- Tenant primary flow (submit monthly reading)
  1. Arrive at `/app/readings` with current month context.
  2. If within −3/+5 window (Europe/Warsaw), form is enabled; otherwise disabled with reason.
  3. Enter value (comma/dot accepted); blur clamps precision; submit.
  4. On success: toast confirmation; table/card updates; anchored badge shown where applicable.
  5. If 409: show toast and refetch; if 422: show inline field errors; if 403: inline access message.

- Admin primary flow (prepare month and generate reports)
  1. Set month in header (stored in `?month=` and `localStorage`).
  2. Review `/admin/readings`; backdate or add missing readings; use Replacement Modal for corrections; recalc anchors if needed.
  3. Open `/admin/monthly-conditions`; edit values; if locked by realized reports, see inline lock banner.
  4. Go to `/admin/reports`; click Generate (or Regenerate when allowed); disabled state shows reason if prerequisites missing.
  5. Inspect a report at `/admin/reports/:id`; send email; toggle realized; Unlock requires confirm.

- Error and recovery
  - 401 redirects to login; 403 inline message; 409 toast + refetch; 422 inline field errors; 429/500 toasts.
  - Page-level fallback shown for unexpected failures.

## 4. Layout and Navigation Structure

- Shells
  - Tenant shell (`/app/*`): mobile-first; centered max-width container; top text-only navigation.
  - Admin shell (`/admin/*`): desktop-first tables at ≥md; top text-only nav; no sidebar or breadcrumbs.
- Navigation
  - Top nav entries by role:
    - Tenant: Readings, Reports, Profile (optional).
    - Admin: Readings, Monthly Conditions, Reports, Properties, Contracts, Profile (optional).
  - Header shows single property label for context; favicon branding.
  - Skip-to-content link at top for accessibility.
- Loading and feedback
  - Debounced spinners (≥300ms) for data loads; non-blocking toasts for operations; overlay spinner for blocking tasks.
- Deep links and history
  - Support `?month=YYYY-MM` everywhere month applies; default to current month on invalid values.
  - Support direct links to report detail.

## 5. Key Components

- Cross-view components
  - Role Navigation (`RoleNav`): top navigation adapting to tenant/admin.
  - Error Alert (`ErrorAlert`): inline error banners and page-level fallback.
  - Filters Bar (`FiltersBar`): houses month input and controls on admin views.
  - Button (`ui/button`): primary/secondary CTAs consistent with shadcn/ui.
- Domain components
  - Reading Form (`ReadingForm`): combined tenant/admin form; admin variant supports `datetime-local`.
  - Readings Table (`ReadingsTable`): list with inline actions and “Kotwica” anchor badges.
  - Replacement Form (`ReplacementForm`): minimal modal for admin corrections.
  - Monthly Conditions Table (`MonthlyConditionsTable`): per-month editable rows with lock states.
  - Anchor Recalc Panel (`AnchorRecalcPanel`): scoped action panel to trigger recalculation.
  - Properties List (`PropertyList`), Contracts List (`ContractsList`): simple list/crud.
- Client and services
  - HTTP wrapper (`http.ts`): attaches `Authorization`, JSON handling, 20s timeout.
  - TanStack Query setup: query keys per resource and month filter; in-memory cache only; refetch on focus/~60s.
  - Formatting helpers: pl-PL number/currency; 3/4/2 precision; comma/dot acceptance; clamp on blur.

---

This UI architecture aligns with the available API endpoints, session decisions, and MVP scope: separate role shells, month-scoped admin workflows, combined tenant readings with strict windows, minimal error handling, Polish localization and formatting, and simple accessible layouts without virtualization or CSV export.

