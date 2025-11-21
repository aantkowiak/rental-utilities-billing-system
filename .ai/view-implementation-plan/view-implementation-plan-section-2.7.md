# API Endpoint Implementation Plan: Reports (Section 2.7)

## 1. Endpoint Overview
Billing report generation, retrieval, status update, regeneration and email sending.

| Method | Path | Purpose |
| GET | /v1/reports | List reports |
| POST | /v1/reports/generate | Generate new report |
| GET | /v1/reports/{id} | Report detail |
| PATCH | /v1/reports/{id} | Update status |
| POST | /v1/reports/{id}/regenerate | Regenerate & diff |
| POST | /v1/reports/{id}/send-email | Send or resend email |

## 2. Request Details
Generate body: `contractId`, `month`.

Status update body: `{ "status": "realized"|"unlocked" }`

## 3. Used Types
- DTO: `ReportDTO`
- Commands: `GenerateReportCmd`, `UpdateReportStatusCmd`

## 4. Response Details
- Generate 201 `{ report }`
- Regenerate 200 `{ report, diff }`
- Email 202 Accepted

## 5. Data Flow
1. Validate readings completeness before generate.
2. Calculate costs via `ReportCalculatorService` (decimal.js precise).
3. Store report rows + cost lines.
4. Send email async via queue; store attempts.

## 6. Security Considerations
- Tenants read only own contracts.
- Admin required for generation, status change, email resend.
- Rate-limit email resends.

## 7. Error Handling
| Case | Status |
| Missing readings | 422 |
| Duplicate report | 409 |
| Forbidden | 403 |
| Not found | 404 |
| Server | 500 |

## 8. Performance
- Heavy calc in worker; keep route responsive.
- Index contract_id, month unique.

## 9. Implementation Steps
1. Calculator service unit-tested.
2. Routes & validators.
3. Email queue integration.
4. Tests & docs.
