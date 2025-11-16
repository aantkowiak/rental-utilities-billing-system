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
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    // More flexible error message locator - finds by text content
    this.errorMessage = page.locator("text=/Nieprawidłowy|Invalid|error/i").first();
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForErrorMessage() {
    await this.errorMessage.waitFor({ state: "visible" });
  }

  async getErrorMessageText() {
    return await this.errorMessage.textContent();
  }
}
