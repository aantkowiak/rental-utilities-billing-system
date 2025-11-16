import { test, expect } from "./fixtures/auth.fixture";

test.describe("Authentication Flow", () => {
  test("should display login page correctly", async ({ loginPage, page }) => {
    await loginPage.goto();

    // Verify page loaded
    await expect(page).toHaveURL(/.*login/);

    // Check for login form elements
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should show error on invalid credentials", async ({ loginPage }) => {
    await loginPage.goto();

    // Attempt login with invalid credentials (no redirect expected)
    await loginPage.attemptLogin("invalid@example.com", "wrongpassword");

    // Wait for and verify error message
    await loginPage.waitForErrorMessage();
    const errorText = await loginPage.getErrorMessageText();
    expect(errorText).toBeTruthy();
  });

  test("should take screenshot on failure", async ({ page, loginPage }) => {
    test.skip(!!process.env.CI && process.platform === "linux", "Visual snapshot not available for Linux in CI");
    
    await loginPage.goto();

    // Visual comparison example
    await expect(page).toHaveScreenshot("login-page.png", {
      maxDiffPixels: 100,
    });
  });
});
