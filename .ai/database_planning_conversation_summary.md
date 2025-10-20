<conversation_summary>
<decisions>
1. Use a single `readings` table holding the three meter values (`cold_m3`, `hot_m3`, `heating_gj` – numeric(10,3)), with `origin` (`tenant` / `admin_replacement`), `reading_type` (`regular` / `baseline`), per-meter `*_replaced` flags, optional `comment_text` + `comment_visible_to_tenant`, soft-delete `deleted_at`, and range/enum checks.
2. `admin_replacement` rows require `effective_month` (date truncated to 1st) and take absolute precedence when anchoring month **N**; otherwise the latest reading in the combined −3/+5 window (ordered by `reading_at DESC, id DESC`) anchors the month.
3. A single baseline row is required at `properties.start_month` with all three `*_replaced` flags TRUE.
4. No separate meter or replacement tables; no persisted anchor table; anchoring is computed on demand by a SQL helper function.
5. Store only raw (un-rounded) numbers in `reports`; persist the anchor reading IDs and `monthly_conditions_id`; rounding happens at query/UI layer. No `calc_version` column for now.
6. Use plain `text` columns with `CHECK` constraints instead of PostgreSQL enums for easier future changes.
7. Keep RLS simple: rely on `auth.uid()` + JWT `role` claim; tenants scoped via active `contracts`, admins via `profiles.role = 'admin'`.
8. Minimal indexes: `readings(property_id, reading_at DESC)`, partial unique `readings(property_id, effective_month)` for replacements, `monthly_conditions(property_id, month)`, unique `reports(contract_id, month)`, and unique `report_emails(report_id, recipient_email)` (`citext`).
9. Skip advisory locks; the unique constraint on `reports` is sufficient to avoid duplicate generations in low-traffic MVP.
10. Drop anomaly / high-deviation features for MVP; calculations always use deltas, respecting replacement flags.
</decisions>

<matched_recommendations>
1. Single property + `contracts` table to enforce exactly one active tenant (unique GIST on `tstzrange`).
2. Represent months as `date` truncated to first-of-month and index everywhere.
3. Combined `readings` table with range checks and descending index.
4. `admin_replacement` rows flagged in `readings` instead of separate `meter_replacements` table.
5. Anchoring computed on the fly via helper function with simplified precedence.
6. `monthly_conditions` table per property/month storing prices, forecasts, and advance payment.
7. `reports` table unique per `(contract_id, month)` with status lifecycle (`draft → realized → unlocked`).
8. Email idempotency/throttling via `report_emails` + `report_email_attempts` (recipients deduped using `citext`).
9. Row Level Security on `property_id`, tenants restricted by active `contracts`, admins full access.
10. Minimal index strategy; defer partitioning / advisory locks until scale demands.
</matched_recommendations>

<database_planning_summary>
**a. Main requirements**  
• Single property MVP, one active tenant at a time.  
• Monthly settlement with −3/+5 reading window, latest-reading anchoring, admin replacements mid-month.  
• Precise rounding (3-dec readings, 4-dec prices, 2-dec amounts) but raw values stored.  
• Email delivery with idempotency/throttling; full audit trail and soft deletes.  
• Strong but simple RLS driven by property scope.

**b. Key entities & relationships**  
• `properties 1-* contracts (active tenant)`  
• `properties 1-* readings`  
• `properties 1-* monthly_conditions`  
• `contracts 1-* reports 1-* report_emails 1-* report_email_attempts`  
• `auth.users 1-1 profiles`

**c. Security & scalability**  
• RLS on `property_id`; tenants limited to their contract and to INSERT/UPDATE in window; admins unrestricted.  
• Soft-delete instead of hard delete; triggers to block editing when report is realized.  
• Minimal indexes for MVP; no partitioning or advisory locks until traffic grows.  
• Idempotent email sends enforced by unique constraints + timestamps.

**d. Unresolved issues / further clarification**  
None – user accepted all simplifications.
</database_planning_summary>

<unresolved_issues>
None
</unresolved_issues>
</conversation_summary>
