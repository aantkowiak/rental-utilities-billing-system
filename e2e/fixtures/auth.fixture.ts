import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

interface AuthFixtures {
  loginPage: LoginPage;
}

/**
 * Custom fixture for authentication-related tests
 * Extends base test with LoginPage instance
 */
export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginPage);
  },
});

export { expect } from "@playwright/test";
