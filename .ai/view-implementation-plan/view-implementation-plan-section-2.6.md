# API Endpoint Implementation Plan: Readings (Section 2.6)

## 1. Endpoint Overview
Meter readings CRUD plus replacement and anchor recalculation.

| Method | Path | Purpose |
| GET | /v1/readings | List readings |
| POST | /v1/readings | Create reading |
| GET | /v1/readings/{id} | Reading detail |
| PATCH | /v1/readings/{id} | Update reading |
| DELETE | /v1/readings/{id} | Soft delete |
| POST | /v1/readings/{id}/replacement | Create replacement reading (admin) |
| POST | /v1/readings/recalculate-anchors | Recompute anchors (admin) |

## 2. Request Details
Create body: `propertyId`, `readingAt`, `coldM3`, `hotM3`, `heatingGj`, optional `commentText`, optional `commentVisibleToTenant`.
List query: `propertyId` (UUID), optional `from`, `to`, `page`, `pageSize`.
Replacement body adds `effectiveMonth` (YYYY-MM-01) plus measurement fields.
Validation: values ≥0 ≤9_999_999.999 with ≤3 decimals; tenant origin −3/+5 day window enforced in service.

## 3. Used Types
- DTO: `ReadingDTO` (camelized row mapping)
- Commands: `CreateReadingCmd`, `UpdateReadingCmd`, `CreateReadingReplacementCmd`, `RecalculateAnchorsCmd`
- Responses: `ReadingListResponse`, `ReadingResponse`

## 4. Response Details
- Standard CRUD with 200/201/204 returning `{ reading }` or list envelope.
- Replacement returns 201 `{ reading }` with replacement flags derived from diff vs tenant reading.
- Recalculate anchors responds 202 Accepted after queueing background task.

## 5. Data Flow
1. `requireAuth` resolves role + property scope; tenant guard forbids cross-property access.
2. Zod schemas validate input, enforcing UUIDs, decimal precision, month ordering.
3. Service layer applies tenant window guard, maps rows to DTOs, normalises origin (`tenant` for CRUD, `admin_replacement` for replacements).
4. Storage operations use Supabase queries with soft-delete semantics (`deleted_at`).
5. Upsert paths schedule background recalculation via in-memory queue wrapper when month context derived.

## 6. Security Considerations
- Tenants restricted by explicit property guard + window checks (RLS still expected).
- Admin unrestricted for CRUD, with replacement endpoint requiring `requireAdmin` flag.
- Guard prevents tenants modifying admin replacements.

## 7. Error Handling
| Scenario | Status | Implementation |
|----------|--------|----------------|
| Window violation | 403 | `ReadingsServiceError("READING_WINDOW_VIOLATION")` mapped via `mapReadingsServiceError` |
| Duplicate replacement month | 409 | Unique index → error code `23505` mapped to `READING_DUPLICATE_REPLACEMENT` |
| Validation | 400 | Zod `safeParse` with structured error payloads |
| Not found | 404 | Supabase `PGRST116` normalized to `READING_NOT_FOUND` |
| Forbidden | 403 | Tenant property guard or origin mismatch |
| Server | 500 | Fallback for unexpected failures |

## 8. Performance
- Index on (property_id, reading_at DESC) leveraged by list filters.
- List endpoint paginates via Supabase `range`.
- Background tasks queued asynchronously; `Promise.resolve` wrapping defends against no-op queue implementations.

## 9. Implementation Steps (Completed)
1. Validation helpers for decimal precision + submission window (`src/lib/validation/readings.ts`).
2. Service for CRUD, replacement, soft delete with domain errors (`src/lib/services/ReadingsService.ts`).
3. In-memory recalculation queue scaffold with safe async scheduling (`src/lib/jobs/recalculateAnchors.ts`).
4. Auth-guarded API routes for CRUD, replacement, recalc endpoints (`src/pages/api/v1/readings/*`).
5. Unit + route tests covering validation, service edge cases, job triggers (`src/lib/validation/__tests__/readings.test.ts`, `src/lib/services/__tests__/ReadingsService.test.ts`, `src/pages/api/v1/readings/__tests__/readings.routes.test.ts`).

## 10. Observability & Logging
- Standardised error payloads via `errorResponse` with detailed codes.
- Console logging retained for unexpected job enqueue failures (minimal, guarded).
- Tests assert queue invocation to prevent regressions in anchor recalculation triggers.
