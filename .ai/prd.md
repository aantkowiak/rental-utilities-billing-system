# Product Requirements Document (PRD) - Rental Utilities Billing System
## 1. Product Overview
The Rental Utilities Billing System is an MVP web application to calculate, communicate, and audit monthly utility costs for a single residential property with exactly one active tenant at any time. It standardizes meter reading collection, monthly anchoring logic, consumption and cost calculations, report generation, and delivery with strong auditability and access control.

Scope is limited to one property, one active tenant, monthly settlement periods (no proration), and Polish market conventions: locale pl-PL, currency PLN, and VAT included in unit prices. The system enforces role-based behavior with tenant and administrator roles. Tenants can submit readings only within a limited monthly time window and view their reports. Administrators manage monthly conditions (rates, forecasts, advance payment), handle meter replacements, generate/regenerate reports, mark reports as realized, unlock when needed, and export CSV.

Key features include: reading anchoring for month N using a −3/+5 day window, precise rounding rules (consumption 3 decimals, prices 4 decimals, amounts 2 decimals half-up), monthly versioned conditions effective from the first of each month, automated and manual report emailing with idempotency and throttling, complete business audit trail including HTML snapshots of sent reports, DST-safe scheduling for reminders and automation, and privacy-first data handling with RLS.

## 2. User Problem
Administrators currently face error-prone manual workflows (spreadsheets, emails) to collect readings, apply rounding rules, compute monthly costs, and keep a reliable audit trail. There is risk of missing or late readings, inconsistent rounding, duplicate email deliveries, and lack of traceability for overrides or retroactive changes. Tenants need a simple, time-bounded way to enter readings and understand how their utility charges were calculated without back-and-forth.

The system solves these pains by: enforcing a predictable data collection window; automatically anchoring readings to months; applying precise rounding; versioning rates/forecasts by month; blocking report generation when data is incomplete; delivering reports via email with idempotency/throttling; logging all changes with diffs and HTML snapshots; and enabling CSV export for oversight. Strong RLS and minimal PII protect tenant privacy.

## 3. Functional Requirements
FR-001 Authentication and sessions
- Sign-in via Supabase Magic Link (passwordless). Sessions last 30 days.
- Roles: tenant and administrator.
- Unauthorized users cannot access any data.

FR-002 Authorization and RLS
- Row Level Security active. Tenant can only access data scoped to assigned propertyId.
- Administrator has full access within propertyId.
- System enforces exactly one active tenant per property at a time.

FR-003 Tenant profile and PII
- Only email and optional displayName are stored. No phone or correspondence address.
- Emails are used for authentication and report delivery; recipients are deduplicated by email address.

FR-004 Reading types and units
- Meters: cold water (m³), hot water (m³), heating (GJ). All meters must exist.
- Reading precision: up to 3 decimal places. Range: 0–9,999,999.999.

FR-005 Reading entry window and UI behavior
- Window to anchor to month N: from last 3 days of month N−1 through first 5 days of month N (inclusive).
- Tenant can submit and update readings only within this window; fields are disabled outside the window with a clear message.
- Administrator can add/edit readings at any time and can backdate; comment is optional.

FR-006 Reading anchoring rules
- The system selects the reading that anchors month **N** as follows:
  1. If an administrator-entered **replacement reading** (`origin = admin_replacement`) exists with `effective_month = N`, use that row.
  2. Otherwise, choose the **latest** reading in the combined window (last 3 days of N−1 **and** first 5 days of N), ordered by `reading_at DESC, id DESC`.
- One reading may anchor at most one month. UI indicates which reading was selected.

FR-007 Multiple readings in window and admin replacements
- Multiple tenant readings in the −3/+5 window are allowed; the rule in FR-006 always chooses the latest.
- Administrators can add a **replacement reading** at any time (with `origin = admin_replacement`, `effective_month` set) to override anchoring for that month. The operation is audited and labeled in UI.

FR-008 Onboarding readings
- System requires a start month and baseline values for all meters.
- First report for month N can be generated only after readings for N and N+1 exist (one per meter per month after anchoring).

FR-009 Consumption calculation
- For each meter: `consumption(N) = reading(N+1) − reading(N)`.
- If any meter was replaced between N and N+1 (indicated by `*_replaced = TRUE` on the replacement row), consumption is computed from the new baseline value without additional anomaly handling.
- Display precision: consumption 3 decimals.

FR-010 Pricing and forecasts (monthly conditions)
- Effective from the first day of the month: fixed manager fee, unit price cold water (PLN/m³), unit price hot water heating component (PLN/m³), unit price heating (PLN/GJ), monthly forecasts for each meter, advancePayment.
- Hot water cost unit price = cold water unit price + hot water heating unit price.
- Forecasts equal to 0 are allowed and produce an informational warning only.
- Conditions and advancePayment are versioned monthly.

FR-011 Cost formulas and rounding
- Monthly cost per meter: 
  - cold water cost = consumption_cold × price_cold
  - hot water cost = consumption_hot × (price_cold + price_heating_hot)
  - heating cost = consumption_heating × price_heating
- Fixed cost = manager fee − (forecast_cold × price_cold + forecast_hot × (price_cold + price_heating_hot) + forecast_heating × price_heating)
- Actual rent = fixed cost + (sum of meter costs).
- Balance = advancePayment − actual rent.
- Rounding: consumption 3 decimals; prices 4 decimals; line item costs rounded to 2 decimals half-up; totals, actual rent, and balance rounded to 2 decimals half-up.

FR-012 Report generation prerequisites and uniqueness
- To generate report for month M, anchored readings must exist for M and M+1 for all meters.
- If any reading is missing, generation is blocked with a clear message.
- Exactly one report per (contract × month). Regeneration overwrites values and records diffs.

FR-013 Report status lifecycle and locking
- Status realized indicates the report is finalized and locked against further modifications.
- Only administrator can unlock; reason is not required. All such actions are audited.

FR-014 Report delivery via email
- Upon generation, send report as HTML with inline CSS plus plaintext alternative to tenant and administrator in pl-PL.
- Deduplicate recipients when emails are identical.
- Subject format: [PropertyLabel or formatted address] — Raport: MMMM YYYY (pl-PL).
- Store HTML snapshot for each successful send.

FR-015 Email idempotency and throttling
- Idempotency key: (reportId, recipient). Track lastSentAt.
- Enforce minimum 10 minutes between successful sends per report/recipient.
- Log send attempts, results, and reasons.

FR-016 Regeneration and resend
- Regenerating a report does not send email automatically.
- Administrator can trigger manual resend; idempotency and throttling apply.

FR-017 Scheduler
- Day 1 at 09:00 Europe/Warsaw: send reminder to tenant to submit readings.
- After all three meters for month M+1 are complete: auto-calculate and send report for month M to both parties.
- +72 hours after send: if report not realized, remind administrator.
- Handle DST: scheduler runs hourly and triggers when local time is 09:00 ±15 minutes.
- Reliability: retry transient email errors after 5 minutes, 1 hour, and 24 hours.

FR-018 Meter replacement
- Effective from a specified month with a specified new baseline value; serial number is optional; no reason required.
- Months prior to replacement remain unchanged. From the replacement month onward, readings are computed from new baseline; monotonicity relative to earlier months may be broken.
- Changes affecting realized months require admin confirmation and auditing (modal confirmation; optional note).

FR-019 Warnings and anomalies
- High deviation warning when consumption deviates by more than 50% from the relevant monthly forecast; threshold configurable per meter and property.
- Saving with warning is allowed; comment is optional.
- Show warnings inline in reading form, as icons in reading history, and as notes in report emails.

FR-020 Localization and formatting
- Locale pl-PL and currency PLN throughout UI and emails.
- Present numbers consistent with rounding rules from FR-011.

FR-021 CSV export
- Administrator-only. Readings export selectable by date range and per meter.
- Reports export by months including consumption, costs, fixed cost, actual rent, and balance.
- Headers, separator, and encoding to be finalized in a subsequent iteration.

FR-022 Auditing and retention
- Record every modification with before/after diff, actor, and timestamp.
- Store HTML snapshots of each email send.
- Retain business audit indefinitely. Retain technical transport and scheduler logs for 90 days; exclude PII.

FR-023 Admin cockpit
- Provide monthly overview: completeness of readings, number of warnings, last email send, and recent errors.
- Navigation links to Readings and Reports.

FR-024 Environments and delivery
- Development environment provides email preview without actual sending; logs content for inspection.
- Secrets (e.g., Gmail app password) are stored as environment variables.

## 4. Product Boundaries
In scope
- Single property with exactly one active tenant.
- Monthly settlements only; no proration within a month.
- Email delivery only (HTML + plaintext); no attachments.
- pl-PL locale and PLN currency.
- CSV export for admin.

Out of scope (MVP)
- Multiple properties or multiple simultaneous tenants.
- Payment processing, invoicing, or receivables management.
- Prorated settlements or mid-month contract starts/ends.
- SMS, push notifications, or WhatsApp delivery channels.
- PDF or image attachments in emails.
- Multi-language UI other than pl-PL.
- Rich tenant profiles (phone, postal address) beyond email and optional displayName.
- Complex tariff models beyond specified unit prices and forecasts.

## 5. User Stories
US-001
- Title: Tenant sign-in via magic link
- Description: As a tenant, I want to sign in using a magic link so I can access reading forms and my reports without a password.
- Acceptance Criteria:
  - Magic link request sends an email to the tenant address.
  - Opening a valid link creates a session for 30 days.
  - Expired or invalid link shows an error and denies access.

US-002
- Title: Administrator sign-in via magic link
- Description: As an administrator, I want to sign in using a magic link so I can manage conditions, readings, and reports.
- Acceptance Criteria:
  - Valid magic link authenticates the admin and creates a 30-day session.
  - Non-admin accounts cannot access admin-only screens and receive an unauthorized error.

US-003
- Title: Tenant data access limited by RLS
- Description: As a tenant, I want my access restricted so I can only see data for my assigned property.
- Acceptance Criteria:
  - Attempts to query other property data return forbidden due to RLS.
  - Tenant can view only own property readings and reports.

US-004
- Title: Admin full access within property
- Description: As an administrator, I need full read/write access to property data so I can operate monthly billing.
- Acceptance Criteria:
  - Admin can view and edit readings, conditions, reports, and exports for the property.
  - All admin actions are audited with actor and timestamp.

US-010
- Title: Initialize start month and baseline readings
- Description: As an administrator, I want to set a start month and baseline values for all meters so that reporting can begin.
- Acceptance Criteria:
  - Start month and three baseline readings are required to onboard.
  - First report for month N is allowed only when readings for N and N+1 exist for all meters.

US-020
- Title: Tenant enters reading within −3/+5 window
- Description: As a tenant, I want to submit readings only within the allowed window so that anchoring is predictable.
- Acceptance Criteria:
  - Within window, form is enabled; outside window, form is disabled with message.
  - Reading accepts up to 3 decimals and range 0–9,999,999.999.
  - Save succeeds and shows confirmation.

US-021
- Title: Admin adds or backdates reading anytime
- Description: As an administrator, I can record or correct readings at any time, including backdating.
- Acceptance Criteria:
  - Admin form allows date/time selection and optional comment.
  - Save succeeds and is audited.

US-022
- Title: Reading value validation
- Description: As a user, I want invalid readings to be rejected to avoid bad data.
- Acceptance Criteria:
  - Negative values are rejected with error.
  - More than 3 decimals are rejected with error.
  - Values above the maximum are rejected with error.

US-023
- Title: Non-monotonic reading without replacement flagged
- Description: As an administrator, I want decreases between months to be treated as anomaly and consumption 0 when no replacement is recorded.
- Acceptance Criteria:
  - Decrease without replacement sets consumption to 0 for that pair.
  - Anomaly indicator is shown in UI and noted in report.

US-030
- Title: Auto-anchor reading to month N
- Description: As a system, I want to anchor readings to a month using prioritization rules so that reports are consistent.
- Acceptance Criteria:
  - If any readings exist on days 1–5 of N, select the earliest of those.
  - Else, if readings exist in last 3 days of N−1, select the latest of those.
  - Else, month N is missing and blocks report generation.

US-031
- Title: Admin override of anchored reading
- Description: As an administrator, I want to manually select which reading anchors month N when exceptional cases occur.
- Acceptance Criteria:
  - Admin can choose a reading within the −3/+5 window to anchor N.
  - UI marks the anchoring as overridden.
  - Action is audited with before/after diff.

US-032
- Title: Tenant UI disabled outside window
- Description: As a tenant, I should see disabled inputs outside the window with a clear message.
- Acceptance Criteria:
  - Inputs are disabled outside the window.
  - Message explains next available window.

US-040
- Title: Manage monthly conditions effective from day 1
- Description: As an administrator, I want to set monthly rates, forecasts, and advancePayment effective from the first day of the month.
- Acceptance Criteria:
  - Form fields include manager fee, unit prices, forecasts, advancePayment.
  - Changes are versioned by month.
  - Retroactive changes require manual report regeneration for affected months.

US-041
- Title: Zero forecasts allowed with warning
- Description: As an administrator, I can set forecast to 0 and still generate reports.
- Acceptance Criteria:
  - Setting forecast 0 shows an informational warning.
  - Report generation is not blocked.

US-050
- Title: Compute consumption and costs with rounding rules
- Description: As a system, I compute consumption, costs, and totals with specified precisions and half-up rounding.
- Acceptance Criteria:
  - Consumption rounded to 3 decimals.
  - Prices rounded to 4 decimals.
  - Line items, totals, actual rent, and balance rounded to 2 decimals half-up.

US-051
- Title: Hot water price derived from components
- Description: As a system, I calculate hot water unit price as cold water price plus heating component.
- Acceptance Criteria:
  - hot_water_unit_price = cold_water_unit_price + hot_water_heating_unit_price.
  - Result is used in hot water cost calculation.

US-060
- Title: Report generation requires complete readings for M and M+1
- Description: As a system, I block report generation until all meters are present for M and M+1.
- Acceptance Criteria:
  - Missing any anchored reading blocks generation with message.
  - When complete, generation proceeds and produces a report.

US-061
- Title: Report uniqueness and regeneration
- Description: As a system, I ensure one report per (contract × month) and record diffs on regeneration.
- Acceptance Criteria:
  - Attempt to create a duplicate report overwrites prior data on regeneration.
  - Differences are stored in the audit log.

US-062
- Title: Mark report as realized and lock
- Description: As an administrator, I can mark a report as realized to prevent further changes.
- Acceptance Criteria:
  - After realized, edits to underlying data are blocked.
  - Admin can unlock; action is audited; reason optional.

US-070
- Title: Email delivery of generated report
- Description: As a tenant and administrator, we receive the report via email in HTML and plaintext.
- Acceptance Criteria:
  - Recipients are deduplicated by email address.
  - Subject contains property label/address and month in pl-PL format.
  - HTML snapshot stored for each successful send.

US-071
- Title: Email idempotency and throttling
- Description: As a system, I prevent duplicate sends by enforcing idempotency and at least 10 minutes between successes per recipient/report.
- Acceptance Criteria:
  - Idempotency key (reportId, recipient) prevents duplicates.
  - lastSentAt enforces 10-minute gap for successes.
  - Attempts and results are logged.

US-072
- Title: Manual resend email
- Description: As an administrator, I can manually resend a report email when needed.
- Acceptance Criteria:
  - Action available on a generated report.
  - Idempotency and throttling rules apply.

US-080
- Title: Day 1 09:00 tenant reminder
- Description: As a system, I send a reminder on day 1 at 09:00 local time to provide readings.
- Acceptance Criteria:
  - Scheduler runs hourly and triggers within 09:00 ±15 minutes.
  - Email logged with outcome and retries if transient errors occur.

US-081
- Title: Auto-generate and send after M+1 complete
- Description: As a system, I automatically calculate and send the report for month M when readings for M+1 are complete.
- Acceptance Criteria:
  - Trigger fires after all three meters for M+1 are anchored.
  - Report is generated and sent to both parties.

US-082
- Title: +72h admin reminder for unrealized report
- Description: As a system, I remind the admin 72 hours after sending if the report is not marked realized.
- Acceptance Criteria:
  - Reminder is sent only when status is not realized.
  - Logged with outcome and retries as needed.

US-090
- Title: Meter replacement from month N
- Description: As an administrator, I can record a meter replacement effective month and new baseline.
- Acceptance Criteria:
  - Replacement requires effective month and baseline; serial optional.
  - Months before N unchanged; months from N use the new baseline.
  - Confirmation modal appears if realized months could be affected.

US-091
- Title: Post-replacement monotonicity handling
- Description: As a system, I allow monotonicity breaks after replacement without blocking.
- Acceptance Criteria:
  - Consumption is computed from new baseline.
  - No blocking; anomaly not raised due to replacement.

US-100
- Title: High deviation warning
- Description: As an administrator, I want warnings when consumption deviates more than 50% from forecast.
- Acceptance Criteria:
  - Threshold configurable per meter and property.
  - Warning displayed inline, in history, and noted in report email.
  - Save allowed; comment optional.

US-110
- Title: CSV export of readings
- Description: As an administrator, I can export readings for a date range and per meter.
- Acceptance Criteria:
  - Export filters by date range and meter type.
  - CSV is generated and downloaded.

US-111
- Title: CSV export of monthly reports
- Description: As an administrator, I can export reports by month including required fields.
- Acceptance Criteria:
  - CSV includes consumption, costs, fixed cost, actual rent, and balance per month.
  - CSV format details to be finalized in a future iteration.

US-120
- Title: Comprehensive audit trail
- Description: As an administrator, I need all changes recorded with diffs and actor/time.
- Acceptance Criteria:
  - Before/after diff, actor, and timestamp stored for all modifications.
  - HTML snapshot stored for every successful email send.

US-130
- Title: Lock and unlock realized reports
- Description: As an administrator, I can mark realized to lock and optionally unlock.
- Acceptance Criteria:
  - After realized, any edit attempts return error.
  - Unlock available to admin; modal confirmation; note optional; action audited.

US-140
- Title: Deduplicate email recipients
- Description: As a system, I deduplicate recipients when admin and tenant share the same email.
- Acceptance Criteria:
  - Only one email is sent when addresses are identical.
  - Delivery logs reflect single successful send.

US-141
- Title: Email retry policy for transient errors
- Description: As a system, I retry transient failures after 5 minutes, 1 hour, and 24 hours.
- Acceptance Criteria:
  - Retries stop after success or after the final attempt.
  - Each attempt and outcome is logged.

US-142
- Title: Missing reading blocks report
- Description: As a tenant or administrator, I see that report generation is blocked until all readings for M and M+1 are present.
- Acceptance Criteria:
  - UI indicates which meter and month are missing.
  - Generation action is disabled with explanatory message.

US-143
- Title: Multiple readings within window
- Description: As a user, I see which reading was selected for anchoring when multiple exist within the window.
- Acceptance Criteria:
  - UI highlights the auto-selected reading.
  - If overridden, UI marks selection as overridden.

US-144
- Title: DST-safe scheduling
- Description: As a system, I trigger at local 09:00 ±15 minutes across DST changes.
- Acceptance Criteria:
  - Execution observed both at DST start and end within the window.
  - No duplicate triggers beyond idempotency rules.

US-150
- Title: Locale and currency formatting
- Description: As a user, I see numbers and currency formatted per pl-PL with required precisions.
- Acceptance Criteria:
  - Consumption shown to 3 decimals; prices 4; amounts 2.
  - Currency PLN formatting is applied consistently.

US-151
- Title: pl-PL language only
- Description: As a user, I expect the UI and emails in Polish.
- Acceptance Criteria:
  - UI copy and email templates are in Polish.
  - No language switch is present in MVP.

US-160
- Title: PII minimization
- Description: As a tenant, I expect only my email and optional displayName to be stored.
- Acceptance Criteria:
  - No phone or postal address fields exist.
  - Email appears in audit and delivery logs only as needed.

US-161
- Title: Environment-specific email behavior
- Description: As a developer, I need email preview without sending in development.
- Acceptance Criteria:
  - Development env renders previews and logs content.
  - Production env sends via SMTP using stored secrets.

US-170
- Title: On-time delivery performance
- Description: As an owner, I need on-time schedule execution for reminders and automated sends.
- Acceptance Criteria:
  - Day 1 reminders and auto-sends achieve at least 95% on-time within the ±15-minute window.

US-180
- Title: RLS enforcement on writes and reads
- Description: As a tenant, I can create and view only my property data.
- Acceptance Criteria:
  - Attempts to read or write outside property are forbidden.
  - Queries return only tenant-scoped rows.

US-181
- Title: Single active tenant per property
- Description: As an administrator, I need the system to enforce exactly one active tenant for a property.
- Acceptance Criteria:
  - Attempt to assign a second active tenant is rejected.
  - Replacing tenant deactivates the previous tenant.

## 6. Success Metrics
Product performance and quality
- At least 95% on-time execution of Day 1 09:00 reminders and auto-sends (±15 minutes window).
- 0 duplicate report sends per report/recipient in production (idempotency and throttling).
- Report generation automatically occurs within 5 minutes of M+1 completeness.

Data completeness and correctness
- 100% of calculation unit tests pass, including edge rounding scenarios.
- 100% of reports meet rounding rules: items to 2 decimals half-up; totals to 2 decimals half-up; consumption to 3; prices to 4.
- 0 reports generated with missing readings.

Security and privacy
- 100% of tenant requests restricted by RLS to their propertyId.
- No storage of tenant phone or postal address.

Reliability and observability
- Email retry success rate for transient failures ≥ 95% within retry policy.
- 100% of admin actions that modify data produce audited diffs with actor and timestamp.
- 100% of successful sends produce stored HTML snapshots.

Adoption and usability
- Tenant reading submission success rate ≥ 90% within the allowed window.
- Admin report marking to realized within 72 hours ≥ 90%.
