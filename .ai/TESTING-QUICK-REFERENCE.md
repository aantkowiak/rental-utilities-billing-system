# Testing Quick Reference

## 📦 Installation (Already Complete)

```bash
# All dependencies are installed
# Vitest 2.1.4 ✓
# Playwright 1.49.1 ✓
# Testing Library 16.2.0 ✓
# jsdom 25.0.1 ✓
```

## 🚀 Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit tests |
| `npm run test:watch` | Watch mode for development |
| `npm run test:ui` | Visual test runner |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:e2e:ui` | E2E visual runner |
| `npm run test:e2e:debug` | Debug E2E tests |
| `npm run test:e2e:codegen` | Generate tests interactively |

## 📁 File Naming

| Type | Pattern | Location |
|------|---------|----------|
| Unit test | `*.test.ts` | `src/lib/__tests__/` |
| Component test | `*.test.tsx` | `src/components/**/__tests__/` |
| E2E test | `*.spec.ts` | `e2e/` |
| Page Object | `*Page.ts` | `e2e/pages/` |
| Fixture | `*.fixture.ts` | `e2e/fixtures/` |

## 🧪 Unit Test Template

```typescript
import { describe, it, expect, vi } from "vitest";

describe("Feature Name", () => {
  it("should do something", () => {
    // Arrange
    const input = "test";
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe("expected");
  });
});
```

## 🎭 Component Test Template

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyComponent } from "../MyComponent";

describe("MyComponent", () => {
  it("should handle click", () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    
    const button = screen.getByRole("button");
    fireEvent.click(button);
    
    expect(onClick).toHaveBeenCalled();
  });
});
```

## 🌐 E2E Test Template

```typescript
import { test, expect } from "./fixtures/auth.fixture";

test.describe("Feature", () => {
  test("should perform action", async ({ page }) => {
    await page.goto("/path");
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/success/);
  });
});
```

## 🎯 Page Object Template

```typescript
import { Page, Locator } from "@playwright/test";

export class MyPage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto("/my-page");
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

## 🔧 Mock Examples

### Mock Function
```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue("value");
mockFn.mockResolvedValue("async value");
```

### Mock Module
```typescript
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));
```

### Spy
```typescript
const spy = vi.spyOn(object, "method");
spy.mockImplementation(() => "mocked");
```

## 🎨 Common Queries

| Query | Use Case |
|-------|----------|
| `getByRole("button")` | Buttons, links |
| `getByLabelText("Email")` | Form inputs |
| `getByText("Hello")` | Text content |
| `getByTestId("my-element")` | Custom test IDs |
| `getByPlaceholderText("Search")` | Input placeholders |

## 📊 Coverage Thresholds

- **Lines**: ≥80%
- **Functions**: ≥80%
- **Branches**: ≥75%
- **Statements**: ≥80%

## 🐛 Debugging

### Unit Tests
```bash
# Run specific test
npx vitest run path/to/test.ts

# Filter by name
npx vitest -t "test name"

# UI mode
npm run test:ui
```

### E2E Tests
```bash
# Debug mode
npm run test:e2e:debug

# Specific file
npx playwright test e2e/auth.spec.ts

# Headed mode
npx playwright test --headed
```

## ⚠️ Common Mistakes

❌ **DON'T**
```typescript
// Bad: Testing implementation
expect(component.state).toBe("loading");

// Bad: Fragile selector
await page.click("#btn-123");

// Bad: Not waiting
const text = await page.textContent("div");
```

✅ **DO**
```typescript
// Good: Testing behavior
expect(screen.getByRole("status")).toHaveTextContent("Loading");

// Good: Semantic selector
await page.click('button[aria-label="Submit"]');

// Good: Wait for element
await page.waitForSelector("div");
const text = await page.textContent("div");
```

## 📚 Documentation

- [Full Testing Guide](./TESTING.md)
- [Setup Summary](./TESTING-SETUP-SUMMARY.md)
- [Testing Checklist](./TESTING-CHECKLIST.md)

## 🆘 Need Help?

1. Check the [TESTING.md](./TESTING.md) guide
2. Review example tests in `src/lib/__tests__/example.test.ts`
3. Review example E2E in `e2e/auth.spec.ts`
4. Check [Vitest docs](https://vitest.dev/)
5. Check [Playwright docs](https://playwright.dev/)

