# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Rental Utilities Billing System.

## Available Workflows

### `pull-request.yml` - Pull Request CI

Automatically runs on every pull request to the `master` branch.

**Workflow Steps:**

```
┌─────────────┐
│    Lint     │
└──────┬──────┘
       │
    ┌──┴───────────────┐
    │                  │
┌───▼────┐      ┌──────▼─────┐
│  Unit  │      │    E2E     │
│ Tests  │      │   Tests    │
└───┬────┘      └──────┬─────┘
    │                  │
    └──┬───────────────┘
       │
┌──────▼──────────┐
│ Status Comment  │
└─────────────────┘
```

1. **Lint** - Validates code quality using ESLint
2. **Unit Tests** - Runs Vitest tests with coverage (parallel)
3. **E2E Tests** - Runs Playwright tests with coverage (parallel)
4. **Status Comment** - Posts PR comment with results

**Features:**
- ✅ Parallel execution of unit and E2E tests for faster feedback
- ✅ Coverage collection for both unit and E2E tests
- ✅ Automatic browser installation for Playwright
- ✅ Environment-specific secrets for integration tests
- ✅ Automated PR status comments with emoji indicators
- ✅ Test artifacts uploaded for debugging (7-day retention)

**Requirements:**
- Node.js version specified in `.nvmrc` (currently 22.14.0)
- GitHub secrets configured for Supabase (see WORKFLOW_SETUP.md)
- Integration environment set up in GitHub repository settings

For detailed setup instructions, see [WORKFLOW_SETUP.md](../WORKFLOW_SETUP.md).

