<conversation_summary>
<decisions>
1. Adopt the principle: choose the technically simplest solution; otherwise use the recommended minimal approach.
2. Create role-guarded areas with separate layouts: `/app` (tenant) and `/admin` (admin).
3. Use normal scrolling and load all data at once (datasets are small); no virtualization.
4. Eagerly preload all major datasets after authentication; cap concurrency to ~4; keep cache in memory only; refetch on window focus.
5. Remove CSV export from MVP (UI and flows).
6. Do not expose internal scheduler task triggers in the UI.
7. Polish-only UI; use pl-PL locale, PLN currency, and strict rounding (3/4/2).
8. Use a global month filter in admin via native `input type="month"`, synced to `?month=YYYY-MM` and `localStorage`; default to current month; include a “Bieżący miesiąc” reset.
9. Tenant readings: single combined form; compute −3/+5 window in Europe/Warsaw; disable outside window; allow tenant edits within window; admin can backdate with `datetime-local`; support minimal replacement modal and anchor recalc; show a small “Kotwica” badge on anchored readings.
10. Reports: support generate/regenerate/resend; show last email attempt summary only; “Mark realized” toggles without confirm; “Unlock” requires confirm; hide “Regenerate” when realized; rely on server throttle; keep “Generate” visible but disabled with inline reason when prerequisites missing.
11. Authentication: Supabase magic link; handle callback on `/auth/login`; fetch `/v1/me` on boot; guard routes via middleware and client; redirect by role; respect `returnUrl`; attach `Authorization` via a tiny `http.ts` wrapper with a 20s timeout.
12. Error handling (minimal): 401→login; 403→inline “brak dostępu”; 409→toast + refetch; 422→inline details; 429/500→toast; simple page-level fallback.
13. State management: TanStack Query for server state; no cache persistence; refetch on focus and ~60s interval; show spinners only after 300ms debounce.
14. Responsiveness and layout: tenant mobile-first; admin desktop-first tables at ≥md; top text-only navigation; no sidebar or breadcrumbs.
15. Accessibility: semantic landmarks (`header/nav/main/footer`), single `h1`, a skip-to-content link, visible focus, move focus to first invalid field.
16. Localization: Polish-only; small `pl.ts` for common strings; inline literals allowed for MVP.
17. Branding and context: text header with favicon; show single property label in headers; no property switcher.
18. UI patterns: one primary CTA per view; inline text row actions; native `confirm()` for destructive actions; no unsaved-change prompts; non-blocking toasts; simple overlay spinner for blocking actions.
19. Formatting & inputs: central helpers for 3/4/2 decimals and PLN; accept comma/dot; `inputMode="decimal"` with `step="0.001"/"0.0001"`; clamp precision on blur.
20. Deep links and history: support `?month=YYYY-MM` and direct links to report detail; default to current month on invalid values.
</decisions>
<matched_recommendations>
1. Role-guarded shells and navigation per role (tenant/admin) adopted.
2. Month filtering with native `input type="month"` and URL sync adopted.
3. Tenant reading window logic (Europe/Warsaw −3/+5), combined form, and admin backdating adopted.
4. Anchor visualization, admin replacement modal, and recalc action adopted.
5. Reports actions (generate/regenerate/resend) with minimal UI and realized/ unlock rules adopted.
6. Minimal error-to-UI code mapping adopted.
7. Data layer: TanStack Query + tiny `http.ts` wrapper adopted; in-memory cache only.
8. pl-PL formatting and rounding helpers (3/4/2) adopted.
9. Accessibility baseline (landmarks, skip link, focus management) adopted.
10. Normal scrolling with full dataset rendering adopted; no CSV export.
</matched_recommendations>
<ui_architecture_planning_summary>
<a. Main UI architecture requirements>
- Separate role areas: `/app` (tenant), `/admin` (admin), guarded by middleware and client.
- Polish-only UI, pl-PL number/currency formatting, and strict rounding (consumption 3, prices 4, amounts 2).
- Normal scroll; load all data; eager preload post-auth; ephemeral client cache; refetch on focus.
- Admin-wide month state using native month input; synced to URL (`YYYY-MM`) and `localStorage`.
- Minimalistic UI patterns using Shadcn/ui + Tailwind; one primary CTA per view; text-only nav.

<b. Key views, screens, and user flows>
- Public: `/auth/login` (request magic link + callback handling).
- Tenant: 
  - `/app/readings`: combined form; −3/+5 window enforcement; success toast; inline edit within window; show anchored reading indicator.
  - `/app/reports`: list with month filter; detail `/app/reports/:id`.
- Admin:
  - `/admin/readings`: list grouped by month; create/edit readings (backdate), replacement modal, anchor recalc; anchor badge.
  - `/admin/monthly-conditions`: per-month form; forecast=0 info; block edits if linked realized reports.
  - `/admin/reports`: list/detail; generate/regenerate/resend; realized toggle; unlock confirm; disabled generate with inline reason.
  - `/admin/properties`, `/admin/contracts`: simple lists and detail edits as needed for MVP onboarding (inline in Properties).

<c. API integration and state management strategy>
- Auth/session via Supabase; on boot call `/v1/me`; attach JWT via `http.ts`.
- Endpoints:
  - Readings: `/v1/readings` CRUD, `/v1/readings/{id}/replacement`, `/v1/readings/recalculate-anchors`.
  - Monthly conditions: `/v1/monthly-conditions` CRUD.
  - Reports: `/v1/reports`, `/v1/reports/generate`, `/v1/reports/{id}`, `/v1/reports/{id}/regenerate`, `/v1/reports/{id}/send-email`.
  - Profiles: `/v1/me` (and minimal `/v1/profiles/{userId}` for admin).
- TanStack Query keys per resource/filters; in-memory only; refetch on focus/60s; invalidate minimal scopes after mutations.
- Formatting helpers and Europe/Warsaw timezone normalization for form inputs and display.

<d. Responsiveness, accessibility, and security considerations>
- Responsiveness: tenant mobile-first; admin tables at ≥md; centered max-width container.
- Accessibility: landmarks, single `h1`, skip link, visible focus, focus-first error on submit.
- Security: RLS on backend; UI guards by role and route; redirect on 401; avoid storing tokens/PII in `localStorage`.

<e. Unresolved issues or clarifications>
- Deviation threshold configuration UI deferred (server defaults used for warnings).
- Admin cockpit KPIs skipped for MVP; may add later if needed.
- Exact Polish copy can be refined during implementation; `pl.ts` to centralize common labels.
</ui_architecture_planning_summary>
<unresolved_issues>
- None blocking for MVP; thresholds UI and any future admin dashboard metrics are deferred.
</unresolved_issues>
</conversation_summary>