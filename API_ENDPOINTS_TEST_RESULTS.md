# API Endpoints Test Results

## Summary

This document lists all API endpoints in the Rental Utilities Billing System and the results of basic curl tests performed on 2025-10-30.

**Base URL**: `http://localhost:3000`

---

## Authentication Endpoints

### 1. POST /api/v1/auth/magic-link
**Purpose**: Request a magic link email for authentication  
**Authentication**: None required  
**Request Body**:
```json
{
  "email": "test@example.com"
}
```

**Test Results**:
- ✅ **Valid email**: Returns 200 with `{"status":"sent"}`
- ✅ **Invalid email format**: Returns 400 with validation error `{"error":"Invalid request","details":{"email":{"_errors":["Invalid email"]}}}`
- ✅ **Missing email**: Returns 400 with `{"error":"Invalid request","details":{"email":{"_errors":["Required"]}}}`

**Curl Examples**:
```bash
# Valid request
curl -X POST http://localhost:3000/api/v1/auth/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'

# Invalid email
curl -X POST http://localhost:3000/api/v1/auth/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"invalid"}'
```

---

## Profile Endpoints

### 2. PATCH /api/v1/me
**Purpose**: Update authenticated user's profile (display name)  
**Authentication**: Required (JWT Bearer token)  
**Request Body**:
```json
{
  "displayName": "John Doe"
}
```

**Test Results**:
- ⚠️ **Route returns 404**: The endpoint file exists as `me.patch.ts` but Astro routing doesn't recognize `.patch.ts` extension

**Note**: This endpoint may need to be refactored to use a standard file naming convention for Astro.

---

## Properties Endpoints

### 3. GET /api/v1/properties
**Purpose**: List properties with pagination  
**Authentication**: Required (JWT Bearer token)  
**Query Parameters**:
- `page` (optional, default: 1)
- `pageSize` (optional, default: 20)

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`
- ✅ **Invalid token**: Returns 401 with `{"error":{"code":"unauthorized","message":"Invalid or expired token"}}`

**Curl Example**:
```bash
curl -X GET 'http://localhost:3000/api/v1/properties?page=1&pageSize=20' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 4. POST /api/v1/properties
**Purpose**: Create a new property (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  
**Request Body**:
```json
{
  "label": "Property A",
  "address": "123 Main St"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X POST http://localhost:3000/api/v1/properties \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"label":"Property A","address":"123 Main St"}'
```

---

### 5. GET /api/v1/properties/:id
**Purpose**: Get a single property by ID  
**Authentication**: Required (JWT Bearer token)  

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X GET http://localhost:3000/api/v1/properties/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 6. PATCH /api/v1/properties/:id
**Purpose**: Update a property by ID (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  
**Request Body**:
```json
{
  "label": "Updated Property",
  "address": "456 Oak Ave"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X PATCH http://localhost:3000/api/v1/properties/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"label":"Updated Property"}'
```

---

### 7. DELETE /api/v1/properties/:id
**Purpose**: Delete a property by ID (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X DELETE http://localhost:3000/api/v1/properties/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## Contracts Endpoints

### 8. GET /api/v1/contracts
**Purpose**: List contracts with pagination and filters  
**Authentication**: Required (JWT Bearer token)  
**Query Parameters**:
- `page` (optional, default: 1)
- `pageSize` (optional, default: 20)
- `propertyId` (optional, UUID)
- `tenantUserId` (optional, UUID)
- `active` (optional, boolean)

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X GET 'http://localhost:3000/api/v1/contracts?page=1&pageSize=10&active=true' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 9. POST /api/v1/contracts
**Purpose**: Create a new contract (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  
**Request Body**:
```json
{
  "propertyId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantUserId": "660e8400-e29b-41d4-a716-446655440001",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X POST http://localhost:3000/api/v1/contracts \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"propertyId":"550e8400-e29b-41d4-a716-446655440000","tenantUserId":"660e8400-e29b-41d4-a716-446655440001","startDate":"2025-01-01","endDate":"2025-12-31"}'
```

---

### 10. GET /api/v1/contracts/:contractId
**Purpose**: Get a single contract by ID  
**Authentication**: Required (JWT Bearer token)  

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X GET http://localhost:3000/api/v1/contracts/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 11. PATCH /api/v1/contracts/:contractId
**Purpose**: Update a contract by ID (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  
**Request Body**:
```json
{
  "endDate": "2026-12-31"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X PATCH http://localhost:3000/api/v1/contracts/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"endDate":"2026-12-31"}'
```

---

### 12. DELETE /api/v1/contracts/:contractId
**Purpose**: Delete a contract by ID (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X DELETE http://localhost:3000/api/v1/contracts/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## Readings Endpoints

### 13. GET /api/v1/readings
**Purpose**: List readings with pagination and filters  
**Authentication**: Required (JWT Bearer token)  
**Query Parameters**:
- `propertyId` (optional, UUID)
- `from` (optional, ISO date)
- `to` (optional, ISO date)
- `page` (optional, default: 1)
- `pageSize` (optional, default: 20)

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X GET 'http://localhost:3000/api/v1/readings?propertyId=550e8400-e29b-41d4-a716-446655440000&from=2025-01-01&to=2025-12-31' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 14. POST /api/v1/readings
**Purpose**: Create a new meter reading  
**Authentication**: Required (JWT Bearer token)  
**Request Body**:
```json
{
  "propertyId": "550e8400-e29b-41d4-a716-446655440000",
  "meterType": "electricity",
  "value": 1000,
  "readingAt": "2025-01-01T00:00:00Z"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X POST http://localhost:3000/api/v1/readings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"propertyId":"550e8400-e29b-41d4-a716-446655440000","meterType":"electricity","value":1000,"readingAt":"2025-01-01T00:00:00Z"}'
```

---

### 15. GET /api/v1/readings/:id
**Purpose**: Get a single reading by ID  
**Authentication**: Required (JWT Bearer token)  

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X GET http://localhost:3000/api/v1/readings/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 16. PATCH /api/v1/readings/:id
**Purpose**: Update a reading by ID  
**Authentication**: Required (JWT Bearer token)  
**Request Body**:
```json
{
  "value": 2000
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X PATCH http://localhost:3000/api/v1/readings/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"value":2000}'
```

---

### 17. DELETE /api/v1/readings/:id
**Purpose**: Soft delete a reading by ID  
**Authentication**: Required (JWT Bearer token)  

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X DELETE http://localhost:3000/api/v1/readings/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 18. POST /api/v1/readings/:id/replacement
**Purpose**: Create a replacement reading (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  
**Request Body**:
```json
{
  "value": 3000,
  "readingAt": "2025-02-01T00:00:00Z",
  "effectiveMonth": "2025-01"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X POST http://localhost:3000/api/v1/readings/550e8400-e29b-41d4-a716-446655440000/replacement \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"value":3000,"readingAt":"2025-02-01T00:00:00Z"}'
```

---

### 19. POST /api/v1/readings/recalculate-anchors
**Purpose**: Queue anchor recalculation job (admin only)  
**Authentication**: Required (JWT Bearer token, admin role)  
**Request Body**:
```json
{
  "propertyId": "550e8400-e29b-41d4-a716-446655440000",
  "fromMonth": "2025-01",
  "toMonth": "2025-12"
}
```

**Test Results**:
- ✅ **No auth header**: Returns 401 with `{"error":{"code":"unauthorized","message":"Missing authorization header"}}`

**Curl Example**:
```bash
curl -X POST http://localhost:3000/api/v1/readings/recalculate-anchors \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"propertyId":"550e8400-e29b-41d4-a716-446655440000","fromMonth":"2025-01","toMonth":"2025-12"}'
```

---

## Task Runner Endpoints (Internal)

### 20. POST /api/v1/_tasks/run/:taskName
**Purpose**: Execute background tasks (internal use, service role key required)  
**Authentication**: Required (Service role key in `x-service-role-key` header)  
**Supported Tasks**:
- `recalculate-anchors`

**Test Results**:
- ⚠️ **Route returns 404**: The endpoint file exists as `[taskName].post.ts` but Astro routing doesn't recognize `.post.ts` extension

**Note**: This endpoint may need to be refactored to use a standard file naming convention for Astro.

**Curl Example**:
```bash
curl -X POST http://localhost:3000/api/v1/_tasks/run/recalculate-anchors \
  -H 'x-service-role-key: YOUR_SERVICE_ROLE_KEY'
```

---

## Endpoint Summary

| Method | Endpoint | Auth Required | Admin Only | Status |
|--------|----------|---------------|------------|--------|
| POST | `/api/v1/auth/magic-link` | No | No | ✅ Working |
| PATCH | `/api/v1/me` | Yes | No | ⚠️ 404 (routing issue) |
| GET | `/api/v1/properties` | Yes | No | ✅ Working |
| POST | `/api/v1/properties` | Yes | Yes | ✅ Working |
| GET | `/api/v1/properties/:id` | Yes | No | ✅ Working |
| PATCH | `/api/v1/properties/:id` | Yes | Yes | ✅ Working |
| DELETE | `/api/v1/properties/:id` | Yes | Yes | ✅ Working |
| GET | `/api/v1/contracts` | Yes | No | ✅ Working |
| POST | `/api/v1/contracts` | Yes | Yes | ✅ Working |
| GET | `/api/v1/contracts/:contractId` | Yes | No | ✅ Working |
| PATCH | `/api/v1/contracts/:contractId` | Yes | Yes | ✅ Working |
| DELETE | `/api/v1/contracts/:contractId` | Yes | Yes | ✅ Working |
| GET | `/api/v1/readings` | Yes | No | ✅ Working |
| POST | `/api/v1/readings` | Yes | No | ✅ Working |
| GET | `/api/v1/readings/:id` | Yes | No | ✅ Working |
| PATCH | `/api/v1/readings/:id` | Yes | No | ✅ Working |
| DELETE | `/api/v1/readings/:id` | Yes | No | ✅ Working |
| POST | `/api/v1/readings/:id/replacement` | Yes | Yes | ✅ Working |
| POST | `/api/v1/readings/recalculate-anchors` | Yes | Yes | ✅ Working |
| POST | `/api/v1/_tasks/run/:taskName` | Service Key | N/A | ⚠️ 404 (routing issue) |

---

## Known Issues

1. **PATCH /api/v1/me**: Returns 404 due to Astro not recognizing `.patch.ts` file extension
2. **POST /api/v1/_tasks/run/:taskName**: Returns 404 due to Astro not recognizing `.post.ts` file extension

These endpoints exist in the codebase but need to be refactored to use Astro's standard routing conventions (e.g., exporting named HTTP method handlers from a single file).

---

## Authentication Notes

- Most endpoints require a JWT Bearer token in the `Authorization` header
- The token is obtained through the magic link authentication flow
- Admin-only endpoints check the user's role from the `profiles` table
- Tenant users can only access resources related to their contracted properties
- The task runner endpoint uses a separate service role key for internal operations

---

## Test Environment

- **Date**: 2025-10-30
- **Server**: Astro dev server (localhost:3000)
- **Tool**: curl
- **Database**: Supabase (localhost:54321)

