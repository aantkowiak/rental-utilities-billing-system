# GitHub Actions Workflow Setup

This document describes the setup required for the Pull Request CI workflow.

## Overview

The `pull-request.yml` workflow performs the following checks on every pull request:

1. **Lint** - Code quality checks using ESLint
2. **Unit Tests** - Runs Vitest unit tests with coverage (parallel with E2E)
3. **E2E Tests** - Runs Playwright end-to-end tests with coverage (parallel with Unit Tests)
4. **Status Comment** - Posts a summary comment to the PR with results

## Required GitHub Secrets

To run the E2E tests in the CI environment, you need to configure the following secrets in your GitHub repository:

Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

### Required Secrets:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations in tests)

## Environment Configuration

The workflow uses the `integration` environment for E2E tests. You can configure this in your repository:

Go to: `Settings` → `Environments` → `New environment`

- Name: `integration`
- Protection rules: (optional) Add reviewers if needed
- Environment secrets: Can override repository secrets here if needed

## Local Development

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on the environment variables:
```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Public Environment Variables (exposed to client)
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Test Environment
NODE_ENV=test
```

### Running Tests Locally

```bash
# Run linter
npm run lint

# Run unit tests with coverage
npm run test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode (for debugging)
npm run test:e2e:ui
```

## Workflow Details

### Job Dependencies

```
lint
 ├── unit-test (runs in parallel after lint)
 └── e2e-test (runs in parallel after lint)
      └── status-comment (runs after all jobs complete)
```

### Coverage Collection

- **Unit Tests**: Coverage is collected in the `coverage/` directory
- **E2E Tests**: Coverage would be collected in the `coverage-e2e/` directory (if configured with Playwright coverage tools)

Both coverage reports are uploaded as artifacts and available for 7 days after the workflow run.

### Status Comment

The workflow automatically posts/updates a comment on the PR with:
- Overall status (✅ success or ❌ failure)
- Individual check results
- Link to the workflow run for detailed logs

## Troubleshooting

### E2E Tests Not Running

If E2E tests are skipped, check:
1. `playwright.config.ts` exists in the repository root
2. Playwright is installed in dependencies (`@playwright/test`)
3. `test:e2e` script exists in `package.json`

### Missing Environment Variables

If tests fail due to missing environment variables:
1. Verify all required secrets are set in GitHub repository settings
2. Check that the `integration` environment is configured
3. Ensure secret names match exactly (case-sensitive)

### Coverage Not Generated

If coverage reports are missing:
1. Verify `@vitest/coverage-v8` is installed
2. Check that coverage configuration exists in `vitest.config.ts`
3. Ensure tests are actually running (not skipped)

## Action Versions

The workflow uses the following GitHub Actions:
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/upload-artifact@v4`
- `actions/download-artifact@v4`
- `actions/github-script@v7`

These are regularly maintained and updated to the latest stable versions.

