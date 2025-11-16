## UI View Implementation — Admin Properties (Iteration 3)

This iteration covers steps 7–8 from `.ai/ui-implementation/ui-view-implementation.md`.

### 7) Performance Optimization
- Memoize rows and dialog components; keep handlers stable.
- Avoid refetch storms by batching invalidations after multiple quick edits.
- If list grows, paginate client-side (optional) or add server params later.

### 8) Testing
- Create property
  - Open dialog → fill → `fireEvent.click` Save → expect POST and item appears.
  - Duplicate label (409) → expect inline error.
- Edit property
  - Change label → Save → expect PATCH; 404 → toast and refetch.
- Delete property
  - Confirm delete → expect DELETE; ensure row removed after refetch.
- Permissions
  - 403 on POST/PATCH/DELETE → inline banner and disabled actions.


