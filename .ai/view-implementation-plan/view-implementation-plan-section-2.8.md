# API Endpoint Implementation Plan: Scheduler Tasks (Section 2.8)

## 1. Endpoint Overview
Internal endpoint to manually trigger background cron-like tasks.

| Method | Path | Purpose |
| POST | /v1/_tasks/run/{taskName} | Trigger task |

Supported `taskName`: `day1Reminder`, `autoGenerate`, `adminReminder`.

## 2. Request Details
- Header: `x-service-role-key: <key>` (compared with env var)

## 3. Used Types
None (simple trigger).

## 4. Response Details
- 202 Accepted `{ status: "queued" }`
- 404 if taskName unknown.

## 5. Data Flow
1. Validate service role key.
2. Enqueue background job to task processor.

## 6. Security Considerations
- Endpoint not exposed publicly; authenticated via secret key.
- Rate-limit per IP.

## 7. Error Handling
| Case | Code |
| Missing/invalid key | 401 |
| Unknown task | 404 |
| Server error | 500 |

## 8. Performance
- Immediate enqueue then return.

## 9. Implementation Steps
1. Env var `SERVICE_ROLE_KEY`.
2. Route `src/pages/api/v1/_tasks/run/[taskName].post.ts`.
3. Task dispatcher service.
4. Tests.
