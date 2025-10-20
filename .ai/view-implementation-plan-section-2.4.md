# API Endpoint Implementation Plan: Contracts (Section 2.4)

## 1. Endpoint Overview
Manage rental contracts linking tenant users to properties over a period.

| Method | Path | Purpose |
|--------|------|---------|
| GET | /v1/contracts | List contracts (filters) |
| POST | /v1/contracts | Create contract (admin) |
| GET | /v1/contracts/{contractId} | Get contract detail |
| PATCH | /v1/contracts/{contractId} | Update contract (admin) |
| DELETE | /v1/contracts/{contractId} | Delete contract (admin) |

## 2. Request Details
### Filters for list
`propertyId`, `tenantUserId`, `active`, `page`, `pageSize`

### Create
```jsonc
{
  "propertyId": "uuid",
  "tenantUserId": "uuid",
  "period": { "from": "2024-01-01", "to": "2024-12-31" }
}
```

## 3. Used Types
- DTO: `ContractDTO`
- Commands: `CreateContractCmd`, `UpdateContractCmd`

## 4. Response Details
- List 200 `{ items, page, pageSize, total }`
- Create 201 `{ contract }`
- Detail 200 `{ contract }`
- Update 200 `{ contract }`
- Delete 204

## 5. Data Flow
1. Role check.
2. Overlap validation via DB EXCLUDE constraint `(property_id, period)`.
3. Service `ContractService` encapsulates logic.

## 6. Security Considerations
- Tenants can only view own (`tenant_user_id`).
- Admin required for mutations.
- RLS enforced.

## 7. Error Handling
| Scenario | Status |
| Overlap period | 409 |
| Validation | 400 |
| Forbidden | 403 |
| Not found | 404 |
| Server | 500 |

## 8. Performance
- Index on property_id, period gist.

## 9. Implementation Steps
1. `ContractService` list/create/... with overlap catch.
2. Validators (period non-empty, from<to, first day align optional).
3. Routes `api/v1/contracts` & `[contractId].ts`.
4. Tests + docs.
