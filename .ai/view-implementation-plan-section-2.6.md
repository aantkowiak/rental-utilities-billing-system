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
Create body: `propertyId`, `readingAt`, `coldM3`, `hotM3`, `heatingGj`.
Validation: values ≥0 ≤9_999_999.999, max 3 decimals; tenant origin −3/+5 day window.

## 3. Used Types
- DTO: `ReadingDTO`
- Commands: `CreateReadingCmd`, `UpdateReadingCmd`, `CreateReadingReplacementCmd`

## 4. Response Details
- Standard CRUD with 200/201/204.
- Replacement returns 201 `{ reading }`.
- Recalculate anchors 202 Accepted when queued.

## 5. Data Flow
1. Determine origin (`tenant` vs `admin_replacement`).
2. Validate window & ranges.
3. Store reading; trigger background recalculation for anchors if needed.

## 6. Security Considerations
- Tenants restricted by RLS + window.
- Admin unrestricted.
- Replacement endpoint admin only.

## 7. Error Handling
| Scenario | Status |
|----------|--------|
| Window violation | 403 |
| Duplicate replacement month | 409 |
| Validation | 400 |
| Not found | 404 |
| Server | 500 |

## 8. Performance
- Index on (property_id, reading_at DESC).
- Background tasks asynchronous.

## 9. Implementation Steps
1. Validation helpers for decimal precision.
2. Service for CRUD & replacement.
3. Worker/cron to process recalc requests.
4. Routes.
5. Tests.
