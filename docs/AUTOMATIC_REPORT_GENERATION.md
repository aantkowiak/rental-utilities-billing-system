# Automatic Report Generation

## Overview

The system automatically generates and regenerates reports whenever readings or monthly advances are modified. This ensures that reports are always up-to-date with the latest data.

## Implementation

### Trigger Points

Reports are automatically processed after:
1. **Creating a new reading** (`POST /api/v1/readings`)
2. **Updating a reading** (`PATCH /api/v1/readings/:id`)
3. **Updating reading months** (`PATCH /api/v1/readings/:id/months`)
4. **Creating monthly advances** (`POST /api/v1/monthly-advances`)
5. **Updating monthly advances** (`PATCH /api/v1/monthly-advances/:id`)

### How It Works

When any of the above operations complete successfully, the system calls `ReportService.recomputeAll()` in the background.

#### ReportService.recomputeAll() Behavior

The function performs the following steps:

1. **Find all complete reading pairs**
   - Queries all readings with `base_for_month` set
   - Queries all readings with `final_for_month` set
   - Identifies property+month combinations that have both base and final readings

2. **For each complete pair:**
   - Checks if a report already exists
   - If report exists: **regenerates it** with current data
   - If report doesn't exist:
     - Checks if monthly advances exist for that property+month
     - Checks if an active contract exists for that property+month
     - If all data is available: **creates a new report**

3. **Clean up orphaned reports**
   - Deletes reports where the reading pair no longer exists (e.g., reading was deleted)

### Report Generation Requirements

For a report to be automatically created, the following must all exist:
- ✅ Base reading (with `base_for_month` = target month)
- ✅ Final reading (with `final_for_month` = target month)
- ✅ Monthly advances for the property and month
- ✅ Active contract for the property during that month

If any of these are missing, the system will log an informational message and skip report creation.

### Example Scenario

**Admin adds readings for May 2025:**

1. Admin creates base reading for May 2025 → assigns `base_for_month = "2025-05-01"`
2. Admin creates final reading for May 2025 → assigns `final_for_month = "2025-05-01"`
3. After step 2, `recomputeAll()` is triggered
4. System detects complete pair for property+May 2025
5. System checks monthly advances exist for May 2025 ✅
6. System checks contract exists ✅
7. **New report is automatically created for May 2025**

**Later, admin updates monthly advances:**

1. Admin updates manager fee for May 2025
2. `recomputeAll()` is triggered
3. System finds existing report for May 2025
4. **Report is automatically regenerated** with new values

## Logging

The system logs detailed information during report processing:

```
[ReportService.recomputeAll] Found 5 complete reading pairs
[ReportService.recomputeAll] Created new report abc-123 for property xyz, month 2025-05
[ReportService.recomputeAll] Regenerated report def-456 for property xyz, month 2025-04
[ReportService.recomputeAll] Skipping property xyz, month 2025-06 - missing monthly advances
[ReportService.recomputeAll] Deleted 2 orphaned report(s)
```

## User Story

This implements **US-081**: Auto-generate after M+1 complete
- When readings for month M are complete (both base and final assigned), the system automatically generates the report
- No manual intervention required
- Report is immediately available in the admin panel

## API Behavior

The background processing is **non-blocking**:
- The API returns success immediately after creating/updating the reading or advance
- Report generation happens asynchronously
- If report generation fails, it's logged but doesn't affect the API response
- Users can refresh the reports list to see newly created reports

## Testing

To test automatic report creation:

1. Ensure property has monthly advances for target month
2. Ensure contract exists for property
3. Create/update base reading with `base_for_month` set
4. Create/update final reading with `final_for_month` set
5. Wait ~1 second
6. Check reports list - new report should appear

## Future Enhancements

Potential improvements:
- Real-time WebSocket notifications when reports are created/updated
- Batch processing for better performance with many properties
- Retry mechanism with exponential backoff
- Email notifications when reports are auto-generated (per US-081 full spec)

