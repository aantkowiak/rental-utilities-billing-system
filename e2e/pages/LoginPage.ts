import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Login Page
 * Provides an abstraction layer for interacting with the login page
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-test-id="email-input"]');
    this.passwordInput = page.locator('[data-test-id="password-input"]');
    this.submitButton = page.locator('[data-test-id="login-submit-button"]');
    // More flexible error message locator - finds by text content
    this.errorMessage = page.locator("text=/Nieprawidłowy|Invalid|error/i").first();
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  /**
   * Fills login form and submits without waiting for navigation
   * Use this when you want to test error cases or handle navigation separately
   */
  async attemptLogin(email: string, password: string) {
    await this.emailInput.waitFor({ state: "visible" });
    await this.emailInput.clear();
    await this.emailInput.fill(email);
    await this.passwordInput.waitFor({ state: "visible" });
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Performs a successful login and waits for redirect
   * Use this for happy path scenarios
   */
  async login(email: string, password: string) {
    await this.attemptLogin(email, password);
    // Wait for successful redirect after login
    await this.page.waitForURL(/\/app\/readings\/add/, { timeout: 20000 });
  }

  async waitForErrorMessage() {
    await this.errorMessage.waitFor({ state: "visible" });
  }

  async getErrorMessageText() {
    return await this.errorMessage.textContent();
  }
}
