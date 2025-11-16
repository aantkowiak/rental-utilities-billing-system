import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Add Reading Page
 * Provides an abstraction layer for interacting with the tenant reading form
 */
export class AddReadingPage {
  readonly page: Page;
  readonly readingDateInput: Locator;
  readonly coldWaterInput: Locator;
  readonly hotWaterInput: Locator;
  readonly heatingInput: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.readingDateInput = page.locator('[data-test-id="reading-date-input"]');
    this.coldWaterInput = page.locator('[data-test-id="cold-water-input"]');
    this.hotWaterInput = page.locator('[data-test-id="hot-water-input"]');
    this.heatingInput = page.locator('[data-test-id="heating-input"]');
    this.submitButton = page.locator('[data-test-id="submit-reading-button"]');
    // Toast messages - look for either "Dodano odczyt" (new) or "Zmieniono odczyt" (updated)
    this.successToast = page.locator('[role="status"]').filter({ hasText: /Dodano odczyt|Zmieniono odczyt/ });
  }

  async goto() {
    await this.page.goto("/app/readings/add");
  }

  async fillReadingForm(data: {
    readingDate: string;
    coldWater: string;
    hotWater: string;
    heating: string;
  }) {
    await this.readingDateInput.fill(data.readingDate);
    await this.coldWaterInput.fill(data.coldWater);
    await this.hotWaterInput.fill(data.hotWater);
    await this.heatingInput.fill(data.heating);
  }

  async submitReading() {
    await this.submitButton.click();
  }

  async waitForSuccessMessage() {
    await this.successToast.waitFor({ state: "visible", timeout: 10000 });
  }

  async getSuccessMessageText() {
    return await this.successToast.textContent();
  }

  async isSubmitButtonDisabled() {
    return await this.submitButton.isDisabled();
  }
}

