# REST API Plan

## 1. Resources

| Resource | DB Table | Description |
|----------|----------|-------------|
| Property | `properties` | Residential property being billed. Exactly one active tenant at a time. |
| Profile | `profiles` | Supabase user profile, holds role and optional display name. |
| Contract | `contracts` | Active rental contract linking tenant user to a property for a period. |
| MonthlyCondition | `monthly_conditions` | Versioned monthly rates, forecasts and advance payment. |
| Reading | `readings` | Meter readings (cold, hot, heating) collected from tenant/admin. |
| Report | `reports` | Monthly billing report produced per contract×month. |
| ReportEmail | `report_emails` | Recipient addresses for each report. |
| ReportEmailAttempt | `report_email_attempts` | Delivery attempts with status & error. |

## 2. Endpoints

### 2.1 Authentication (Supabase Magic Link)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/magic-link` | Request a magic-link email (tenant & admin). Body: `{ email: string }` → 200 OK always (email may or may not exist).
| GET  | `/v1/auth/callback`   | Client-side only. Front-end exchanges hash for session via Supabase SDK – **no backend route**.

> All subsequent requests contain `Authorization: Bearer <jwt>` issued by Supabase. JWT claims include `role` and `sub` (user id).

### 2.2 Profiles

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| GET | `/v1/me` | Return current user profile. | Uses JWT `sub`.
| PATCH | `/v1/me` | Update own display name. Body: `{ displayName?: string }` | Tenant & admin.
| GET | `/v1/profiles/{userId}` | Admin fetch other user profile. | `role = admin` only.

### 2.3 Properties

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/properties` | List properties (admin) or own (tenant). Supports `?page & pageSize`.
| POST | `/v1/properties` | Create property (admin). Body: `{ label, startMonth }`.
| GET | `/v1/properties/{propertyId}` | Get property details. |
| PATCH | `/v1/properties/{propertyId}` | Update property (admin). |
| DELETE | `/v1/properties/{propertyId}` | Delete property (admin). Rare; checks cascade.

### 2.4 Contracts

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| GET | `/v1/contracts` | List contracts. Filters: `propertyId`, `tenantUserId`, `active=true`, `page`, `pageSize`.
| POST | `/v1/contracts` | Create contract (admin). `{ propertyId, tenantUserId, period:{ from,to } }`.
| GET | `/v1/contracts/{contractId}` | Details. |
| PATCH | `/v1/contracts/{contractId}` | Update contract (admin). Period update validates GIST exclude.
| DELETE | `/v1/contracts/{contractId}` | Delete contract (admin).

### 2.5 Monthly Conditions

| Method | Path |
|--------|------|
| GET | `/v1/monthly-conditions` | List by `propertyId`, `month`, `page`.
| POST | `/v1/monthly-conditions` | Create. `{ propertyId, month, managerFee, priceCold, priceHotHeating, priceHeating, forecastCold, forecastHot, forecastHeating, advancePayment }`.
| GET | `/v1/monthly-conditions/{id}` | Get.
| PATCH | `/v1/monthly-conditions/{id}` | Update – allowed only when linked reports are not realized.
| DELETE | `/v1/monthly-conditions/{id}` | Admin – soft-delete not needed; hard delete guarded.

### 2.6 Readings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/readings` | List readings. Filters: `propertyId`, `month`, `origin`, `readingType`, `page`, `pageSize`.
| POST | `/v1/readings` | Create reading. Tenant validates −3/+5 window & values range. `{ propertyId, readingAt, coldM3, hotM3, heatingGj }`.
| GET | `/v1/readings/{readingId}` | Details.
| PATCH | `/v1/readings/{readingId}` | Update reading (tenant limited by window; admin anytime).
| DELETE | `/v1/readings/{readingId}` | Soft delete → sets `deletedAt` (admin only).

#### 2.6.1 Reading Anchoring & Replacement

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/readings/{readingId}/replacement` | Admin create replacement to override anchor. Body: `{ effectiveMonth }`.
| POST | `/v1/readings/recalculate-anchors` | Recompute anchors for given `propertyId` & `month` (admin). Triggers background job.

### 2.7 Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/reports` | List by `contractId`, `month`, `status`, `page`.
| POST | `/v1/reports/generate` | Generate report for `{ contractId, month }`. Validates completeness, uniqueness; returns report.
| GET | `/v1/reports/{reportId}` | Report detail incl. cost lines.
| PATCH | `/v1/reports/{reportId}` | Update status (`realized`, `unlocked`) – admin.
| POST | `/v1/reports/{reportId}/regenerate` | Regenerate & diff – admin.
| POST | `/v1/reports/{reportId}/send-email` | Manual resend respecting throttling.

### 2.8 Scheduler (internal)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/_tasks/run/{taskName}` | Trigger cron-like tasks manually (Day1 reminder, autoGenerate, adminReminder). Requires service role key.


#### Pagination, Filtering, Sorting

Not needed at the moment.
---
## 3. Validation & Business Logic

### 3.1 Validation per Resource

- **Reading**:
  - `coldM3, hotM3, heatingGj` ≥ 0, ≤ 9 999 999.999 (schema).
  - Max 3 decimal places.
  - Tenant origin only allowed inside −3/+5 window (FR-005) else 403.
- **MonthlyCondition**:
  - `month` must be first day of month ✓ CHECK.
  - Uniqueness `(propertyId, month)` enforced → 409.
  - Forecasts may be 0 but return 200 with warning header.
- **Contract**:
  - Period stored as `tstzrange`; server ensures no overlap per property (`&&` GIST exclude) else 409.
- **Report**:
  - Generation blocked until anchored readings for M & M+1 exist (FR-060). 422 error `missing_readings` with list.
  - Exactly one per `(contract, month)` → 409 on duplicate unless `regenerate`.
  - Rounding implemented with helper service using decimal.js to match FR-011.

### 3.2 Business Logic Endpoints Mapping

| Feature | Endpoint(s) | Notes |
|---------|-------------|-------|
| Magic-link auth | `/v1/auth/magic-link` | Uses Supabase SDK below.
| Reading window enforcement | `/v1/readings` POST/PATCH | Checks window on server.
| Reading anchoring rules | `/v1/readings/recalculate-anchors` background job run hourly; service role.
| Replacement reading | `/v1/readings/{id}/replacement` |
| Report generation & costs | `/v1/reports/generate` | Implements formulas FR-009-011.
| Email send & retry | `/v1/reports/{id}/send-email` + background workers | Stores attempts.
| Scheduler Day1 reminder | `_tasks` endpoints triggered hourly cron on platform. |

---

## 4. Error Handling

| Code | Meaning |
|------|---------|
| 400 | Validation error (malformed payload, missing fields) |
| 401 | Missing / invalid JWT |
| 403 | Forbidden by role or RLS |
| 404 | Resource not found or not accessible |
| 409 | Conflict (uniqueness, contract overlap, duplicate report) |
| 422 | Business rule violation (missing readings, invalid window) |
| 429 | Rate-limited |
| 500 | Unhandled server error |

Errors return JSON `{ error: { code, message, details? } }`.

---

## 5. Security & Performance

- Enforce HTTPS; HSTS 1 year.
- Use Supabase RLS plus explicit row-scoped queries.
- Parameterized queries to prevent SQL injection.
- Pagination defaults to limit 20; indexes noted in schema used in queries (e.g. readings `(property_id, reading_at DESC)` for list & anchor).
- Background jobs run with `service` role key bypassing RLS where appropriate.
- Throttled email resend & magic-link.
