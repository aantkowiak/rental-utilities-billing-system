# Testing Guide

This project uses **Vitest** for unit/integration tests and **Playwright** for end-to-end tests.

## Tech Stack

- **Vitest 2.1.4** - Unit and integration tests with code coverage
- **Testing Library 16.2.0** - React component testing
- **Playwright 1.49.1** - E2E testing (Chromium/Desktop Chrome)
- **jsdom 25.0.1** - DOM emulation for component tests

## Coverage Targets

- Lines: ≥80%
- Functions: ≥80%
- Branches: ≥75%
- Statements: ≥80%

---

## Unit Tests (Vitest)

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode - runs tests on file changes
npm run test:watch

# UI mode - visual test runner
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
src/
├── lib/
│   ├── services.ts
│   └── __tests__/
│       └── services.test.ts
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── __tests__/
│   │       └── button.test.tsx
```

### Best Practices

#### 1. Use `vi` for Test Doubles

```typescript
import { vi } from "vitest";

// Function mock
const mockFn = vi.fn();

// Spy on existing functions
vi.spyOn(object, "method");

// Global mocks
vi.stubGlobal("fetch", mockFetch);
```

#### 2. Leverage `vi.mock()` Factory Pattern

```typescript
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));
```

#### 3. Use Inline Snapshots

```typescript
expect(complexObject).toMatchInlineSnapshot(`
  {
    "id": 1,
    "name": "Test",
  }
`);
```

#### 4. Structure Tests with AAA Pattern

```typescript
it("should handle user click", () => {
  // Arrange
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);

  // Act
  fireEvent.click(screen.getByRole("button"));

  // Assert
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### 5. Component Testing with Testing Library

```typescript
import { render, screen, fireEvent } from "@testing-library/react";

it("should render button", () => {
  render(<Button>Click me</Button>);
  const button = screen.getByRole("button", { name: /click me/i });
  expect(button).toBeInTheDocument();
});
```

**Important**: Always use `fireEvent.click()` for click actions in unit tests.

### Configuration

- **Config**: `vitest.config.ts`
- **Setup**: `vitest.setup.ts`
- **Environment**: 
  - `node` for lib/services
  - `jsdom` for React components

---

## E2E Tests (Playwright)

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# UI mode - visual test runner
npm run test:e2e:ui

# Debug mode - step through tests
npm run test:e2e:debug

# Generate tests using codegen
npm run test:e2e:codegen

# View test report
npm run test:e2e:report
```

### Test Structure

```
e2e/
├── pages/           # Page Object Models
│   └── LoginPage.ts
├── fixtures/        # Test fixtures
│   └── auth.fixture.ts
└── auth.spec.ts     # Test specs
```

### Best Practices

#### 1. Use Page Object Model

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

#### 2. Use Custom Fixtures

```typescript
// e2e/fixtures/auth.fixture.ts
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

#### 3. Use Resilient Locators

```typescript
// Prefer role-based locators
await page.getByRole("button", { name: "Submit" });

// Use data-testid for complex elements
await page.locator('[data-testid="user-profile"]');
```

#### 4. Implement Visual Testing

```typescript
await expect(page).toHaveScreenshot("login-page.png", {
  maxDiffPixels: 100,
});
```

#### 5. Use Browser Contexts

```typescript
test("isolated test", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Test in isolated context
  await context.close();
});
```

### Configuration

- **Config**: `playwright.config.ts`
- **Browser**: Chromium/Desktop Chrome only
- **Base URL**: `http://localhost:4321`
- **Reports**: HTML and JSON

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
```

---

## Debugging

### Unit Tests

```bash
# Run specific test file
npx vitest run src/lib/__tests__/example.test.ts

# Filter tests by name
npx vitest -t "should handle click"

# UI mode for debugging
npm run test:ui
```

### E2E Tests

```bash
# Debug mode with Playwright Inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# View trace of failed tests
npx playwright show-trace trace.zip
```

---

## Common Issues

### Vitest

**Issue**: Tests fail with "Cannot find module"
- **Solution**: Check path aliases in `vitest.config.ts`

**Issue**: DOM methods not available
- **Solution**: Ensure test file matches `jsdom` environment pattern

### Playwright

**Issue**: Tests timeout
- **Solution**: Increase timeout in `playwright.config.ts` or check if server is running

**Issue**: Visual tests fail on CI
- **Solution**: Generate baseline screenshots on CI platform

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)

