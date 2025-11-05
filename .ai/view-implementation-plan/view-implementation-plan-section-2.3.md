# API Endpoint Implementation Plan: Properties (Section 2.3)

## 1. Endpoint Overview
CRUD endpoints for `Property` resource allowing admins to manage properties and tenants to read their own.

| Method | Path | Purpose |
|--------|------|---------|
| GET | /v1/properties | List properties (admin = all, tenant = own) |
| POST | /v1/properties | Create new property (admin) |
| GET | /v1/properties/{propertyId} | Get single property |
| PATCH | /v1/properties/{propertyId} | Update property (admin) |
| DELETE | /v1/properties/{propertyId} | Delete property (admin) |

## 2. Request Details
### 2.1 List
- Query params: `page`, `pageSize` (int≥1, default 1 & 20)
### 2.2 Create
```jsonc
{
  "label": "Building A/12",
  "startMonth": "2024-01-01" // first day of month
}
```
### 2.3 Update
Partial body identical to create.

## 3. Used Types
- DTO: `PropertyDTO`
- Commands:
  - `CreatePropertyCmd` (label, startMonth)
  - `UpdatePropertyCmd` (partial)

## 4. Response Details
- List → 200 `{ items: PropertyDTO[], page, pageSize, total }`
- Create → 201 `{ property: PropertyDTO }`
- Get → 200 `{ property: PropertyDTO }`
- Update → 200 `{ property: PropertyDTO }`
- Delete → 204 no body

## 5. Data Flow
1. API route resolves Supabase user & role.
2. Service `PropertyService` handles DB interactions.
3. Tenants queries use `current_property_ids()` helper for RLS.
4. Pagination via `range()` on Supabase query.

## 6. Security Considerations
- JWT required.
- Role check: only `admin` can POST/PATCH/DELETE.
- RLS on `properties` ensures tenants see only own ids.
- Validate `startMonth` is first day of month.

## 7. Error Handling
| Case | Status |
|------|--------|
| Validation fail | 400 |
| Unauthorized | 401 |
| Forbidden (role) | 403 |
| Not found id | 404 |
| Conflict duplicate label (optional) | 409 |
| Server error | 500 |

## 8. Performance Considerations
- Index already on PK; add composite (label) if frequently filtered.
- Limit pageSize ≤ 100.

## 9. Implementation Steps
1. Create `PropertyService` with methods: list, create, get, update, delete.
2. Validators using Zod for create/update.
3. Implement API routes `src/pages/api/v1/properties/*.ts`.
4. Shared helper for pagination metadata.
5. Unit tests per service; integration tests per route.
6. Update OpenAPI docs.
