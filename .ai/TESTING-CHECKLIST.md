# Testing Checklist

Use this checklist to ensure comprehensive test coverage for new features.

## Before Writing Tests

- [ ] Read testing documentation (`docs/TESTING.md`)
- [ ] Understand the feature/component requirements
- [ ] Identify testable scenarios (happy path, edge cases, errors)
- [ ] Check if similar tests already exist

## Unit Tests (Vitest)

### For Services/Libraries (`src/lib/`)

- [ ] Test happy path scenarios
- [ ] Test error handling
- [ ] Test edge cases (null, undefined, empty arrays, etc.)
- [ ] Test async operations (promises, async/await)
- [ ] Mock external dependencies (Supabase, API calls)
- [ ] Test with various input types
- [ ] Verify return values
- [ ] Check side effects (if any)
- [ ] Use inline snapshots for complex outputs
- [ ] Follow AAA pattern (Arrange-Act-Assert)

### For React Components (`src/components/`)

- [ ] Test component renders correctly
- [ ] Test with different props
- [ ] Test user interactions (click, input, submit)
- [ ] Test conditional rendering
- [ ] Test disabled/loading states
- [ ] Test error states
- [ ] Test accessibility (roles, labels)
- [ ] Mock external hooks/context
- [ ] Use `fireEvent.click()` for click actions
- [ ] Use semantic queries (getByRole, getByLabelText)

### Coverage Requirements

- [ ] Lines: ≥80%
- [ ] Functions: ≥80%
- [ ] Branches: ≥75%
- [ ] Statements: ≥80%

## E2E Tests (Playwright)

### Test Planning

- [ ] Identify user flows to test
- [ ] Create Page Object Models for new pages
- [ ] Create fixtures if needed (auth, data setup)
- [ ] Plan test data requirements

### Test Implementation

- [ ] Use Page Object Model pattern
- [ ] Use resilient locators (role-based preferred)
- [ ] Test critical user journeys
- [ ] Test happy paths
- [ ] Test error scenarios
- [ ] Test form validation
- [ ] Test navigation flows
- [ ] Implement visual testing where appropriate
- [ ] Use browser contexts for isolation
- [ ] Add appropriate wait conditions

### E2E Best Practices

- [ ] Tests are independent (can run in any order)
- [ ] Tests clean up after themselves
- [ ] Use fixtures for common setup
- [ ] Use data-testid for complex elements
- [ ] Add meaningful test descriptions
- [ ] Keep tests focused (one flow per test)

## Code Quality

- [ ] Tests are readable and maintainable
- [ ] Tests have descriptive names
- [ ] Tests follow project conventions
- [ ] No magic numbers or strings
- [ ] Proper error messages in assertions
- [ ] Tests run quickly
- [ ] No console errors/warnings
- [ ] All tests pass locally

## Documentation

- [ ] Add JSDoc comments for complex test logic
- [ ] Update Page Object Models if UI changed
- [ ] Document test data requirements
- [ ] Note any test environment dependencies

## CI/CD

- [ ] Tests pass in CI pipeline
- [ ] Coverage thresholds met
- [ ] No flaky tests
- [ ] Tests don't depend on external services (unless mocked)
- [ ] Appropriate timeouts configured

## Before Merging

- [ ] All tests pass (`npm test`)
- [ ] Coverage report reviewed (`npm run test:coverage`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No linter errors (`npm run lint`)
- [ ] Code formatted (`npm run format`)

## Common Pitfalls to Avoid

### Vitest
- ❌ Forgetting to clear mocks between tests
- ❌ Not using proper environment (jsdom vs node)
- ❌ Testing implementation details instead of behavior
- ❌ Overly complex test setup
- ❌ Not testing error cases

### Playwright
- ❌ Using fragile CSS selectors
- ❌ Not waiting for elements properly
- ❌ Tests depending on specific timing
- ❌ Not isolating tests with contexts
- ❌ Testing too much in a single test

## Quick Commands

```bash
# Run all unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E UI mode
npm run test:e2e:ui

# Debug E2E
npm run test:e2e:debug
```

## Resources

- [Testing Guide](./TESTING.md)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)

