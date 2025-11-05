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
### Filters for list (`GET /v1/contracts`)
- `propertyId` (uuid) — optional, admin only
- `tenantUserId` (uuid) — optional for admins; tenants are auto-scoped to their user id
- `active` (boolean) — `true` to include contracts whose period overlaps `now`, `false` to exclude
- `page`, `pageSize` — positive integers (default 1 / 20, capped at 100)

### Create (`POST /v1/contracts`)
```jsonc
{
  "propertyId": "uuid",
  "tenantUserId": "uuid",
  "period": { "from": "2024-01-01", "to": "2024-12-31" }
}
```
`period.from` and `period.to` must be valid `YYYY-MM-DD` dates with `to` on or after `from`.

## 3. Used Types
- `ContractDTO`, `ContractPeriod`, `CreateContractCmd`, `UpdateContractCmd` from `src/types.ts`
- Contract API helpers in `src/types/contracts.ts` (`ContractFilters`, builders, defaults)
- Validation schemas in `src/lib/validators/contracts.ts` and `contractPeriod.ts`

## 4. Response Details
- List 200: `{ "items": ContractDTO[], "page": number, "pageSize": number, "total": number }`
- Create 201 / Detail 200 / Update 200: `{ "contract": ContractDTO }`
- Delete 204: empty body

`ContractDTO.period` is exposed as `{ from: string, to: string }` (inclusive boundaries).

## 5. Data Flow
1. Authenticate via `Authorization: Bearer <JWT>` and resolve role from `profiles`.
2. `ContractService` (`src/lib/services/ContractService.ts`) handles CRUD with Supabase:
   - Applies tenant scoping, pagination, and active-range filtering.
   - Normalises `period` to Postgres `tstzrange` (`[start, end)` with end shifted +1 day).
3. DB overlap conflicts surface as Postgres `23P01` and map to 409 responses.

## 6. Security Considerations
- Tenants are forcibly scoped to their own `tenant_user_id` in addition to RLS.
- Only admins can create, update, or delete contracts (guarded in routes and service).
- Supabase RLS (`contracts` policies) remains the last line of defence.

## 7. Error Handling
| Scenario | Status | Notes |
|----------|--------|-------|
| Overlap period | 409 | `contract_overlap` error code |
| Validation | 400 | Zod validation errors returned under `error.details` |
| Forbidden | 403 | Missing admin role or unsupported profile role |
| Not found | 404 | Contract missing or RLS filtered |
| Unauthorized | 401 | Missing/invalid bearer token |
| Server | 500 | Logged with route-specific prefix |

## 8. Performance
- Reuse existing GiST exclusion index on `(property_id, period)` for overlap queries.
- Pagination defaults to 20 items; range queries pushed down to Supabase for counting.

## 9. Implementation Summary
1. Added typed contract helpers (`src/types/contracts.ts`) and period validators (`src/lib/validators/contractPeriod.ts`, `contracts.ts`).
2. Implemented `ContractService` with pagination, tenant scoping, and overlap mapping.
3. Created API routes:
   - `src/pages/api/v1/contracts/index.ts` (list/create)
   - `src/pages/api/v1/contracts/[contractId].ts` (detail/update/delete)
4. Added Vitest harness + specs for service and routes.
5. Refreshed this document to reflect final behaviour.

## 10. Tests
- `src/lib/services/__tests__/ContractService.test.ts`
- `src/pages/api/v1/contracts/__tests__/contracts.routes.test.ts`
Run with `npm run test` (Vitest, Node environment).
