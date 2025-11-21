# E2E Teardown Documentation

## Overview

The global teardown script (`e2e/global-teardown.ts`) automatically cleans up test data from the Supabase database after all Playwright tests have completed.

## How It Works

1. **Runs After All Tests**: The teardown is configured in `playwright.config.ts` via the `globalTeardown` option
2. **Finds Test User**: Searches for the user specified by `E2E_USER_EMAIL` environment variable
3. **Cleans Up Data**: Deletes all readings and reports associated with the test user's property

## Configuration

### Required Environment Variables

Add these variables to your `.env.test` file:

```bash
# Test user credentials
E2E_USER_EMAIL=tenant1@example.com
E2E_PASSWORD=password123

# Supabase configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

> **Note**: The `SUPABASE_SERVICE_ROLE_KEY` above is the default key for local Supabase instances. For production or other environments, use the appropriate service role key.

## Data Cleanup Process

The teardown performs the following steps:

1. **User Lookup**: Finds the user by email using Supabase Admin API
2. **Property Identification**: Gets the user's associated property from their profile
3. **Report Deletion**: Deletes all reports for the property
4. **Reading Deletion**: Deletes all readings for the property

### Tables Affected

- `reports` - All reports where `property_id` matches the test user's property
- `readings` - All readings where `property_id` matches the test user's property

## Usage

The teardown runs automatically when you execute Playwright tests:

```bash
npm run test:e2e
```

### Output Example

```
🧹 Starting global teardown...
📧 Cleaning up data for user: tenant1@example.com
🔍 Finding user by email...
✅ Found user: 123e4567-e89b-12d3-a456-426614174000
🔍 Finding user's property...
✅ Found property: 10000000-0000-0000-0000-000000000001
🗑️  Deleting reports...
✅ Deleted 3 report(s)
🗑️  Deleting readings...
✅ Deleted 15 reading(s)

✨ Global teardown completed successfully!
```

## Error Handling

- If the user is not found, the teardown skips cleanup gracefully
- If no property is associated with the user, the teardown skips cleanup
- Errors are logged but don't fail the test suite

## Security

The teardown uses the Supabase Admin Client with the service role key, which:
- Bypasses Row Level Security (RLS)
- Has full database access
- Should only be used in test environments

⚠️ **Never use the service role key in production client-side code!**

## Related Files

- `e2e/global-teardown.ts` - Teardown implementation
- `playwright.config.ts` - Playwright configuration with teardown setup
- `scripts/create-test-users.js` - Script to create test users
- `.env.test` - Test environment configuration

## Troubleshooting

### Teardown Not Running

1. Check that `globalTeardown` is configured in `playwright.config.ts`
2. Verify `.env.test` contains all required variables
3. Ensure the Supabase instance is running

### Data Not Being Cleaned

1. Verify `E2E_USER_EMAIL` matches an existing user
2. Check that the user has an associated property in their profile
3. Confirm the service role key has proper permissions
4. Review the teardown logs for error messages

### Service Role Key Invalid

For local Supabase instances, use the default demo key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

For other environments, find the key in:
- Supabase Dashboard → Settings → API → service_role key
- Local: `supabase/config.toml` or `supabase status` output

