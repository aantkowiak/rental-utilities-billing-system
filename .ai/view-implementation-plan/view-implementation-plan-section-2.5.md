# API Endpoint Implementation Plan: Monthly Advances (Zaliczki miesięczne) (Section 2.5)

## 1. Endpoint Overview
Manage monthly rates, forecasts and advance payments per property per month.

| Method | Path | Purpose |
| GET | /v1/monthly-advances | List records |
| POST | /v1/monthly-advances | Create record (admin) |
| GET | /v1/monthly-advances/{id} | Get record |
| PATCH | /v1/monthly-advances/{id} | Update record (admin) |
| DELETE | /v1/monthly-advances/{id} | Delete record (admin) |

## 2. Request Details
Filters: `propertyId`, `month`, `page`

Create payload includes all cost & forecast fields.

## 3. Used Types
- DTO: `MonthlyAdvanceDTO`
- Commands: `CreateMonthlyAdvanceCmd`, `UpdateMonthlyAdvanceCmd`

## 4. Response Details
- Similar to other CRUD.

## 5. Data Flow
1. Validate uniqueness (propertyId, month).
2. On update, block when reports with status≠draft exist.
3. Service `MonthlyAdvanceService` handles.

## 6. Security Considerations
- Admin only for mutations.
- Tenants read their property only.

## 7. Error Handling
| Violation | Code |
| Duplicate key | 409 |
| Business rule – has realized reports | 422 |

## 8. Performance
- Unique index covers property+month.

## 9. Implementation Steps
1. Service + validators.
2. Routes.
3. Tests/doc.
