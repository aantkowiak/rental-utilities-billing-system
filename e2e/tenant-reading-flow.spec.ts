import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { AddReadingPage } from "./pages/AddReadingPage";

test.describe.configure({ mode: 'serial' });

test.describe("Tenant Reading Flow", () => {
  let loginPage: LoginPage;
  let addReadingPage: AddReadingPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    addReadingPage = new AddReadingPage(page);
  });

  test("should complete full tenant reading submission flow", async ({ page }) => {
    // Step 1: Navigate to login page
    await loginPage.goto();
    await expect(page).toHaveURL(/.*login/);

    // Step 2: Login with tenant credentials
    const email = process.env.E2E_USER_EMAIL || "tenant1@example.com";
    const password = process.env.E2E_PASSWORD || "password123";
    
    await loginPage.login(email, password);

    // Step 3: Verify redirect to reading page after successful login (already handled in login method)
    await expect(page).toHaveURL(/\/app\/readings\/add/);

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");

    // Step 4: Verify navigation link is present
    const navLink = page.locator('[data-test-id="nav-add-reading"]');
    await expect(navLink).toBeVisible();

    // Step 5: Fill the reading form with valid data
    // Generate a date within the valid window (current time)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const readingDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    await addReadingPage.fillReadingForm({
      readingDate,
      coldWater: "123.456",
      hotWater: "78.9",
      heating: "45.678",
    });

    // Step 6: Submit the reading
    await addReadingPage.submitReading();

    // Step 7: Verify success message appears (either "Dodano" or "Zmieniono")
    await addReadingPage.waitForSuccessMessage();
    const successText = await addReadingPage.getSuccessMessageText();
    expect(successText).toBeTruthy();
    expect(successText).toMatch(/Dodano odczyt|Zmieniono odczyt/i);
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    // Login first
    await loginPage.goto();
    const email = process.env.E2E_USER_EMAIL || "tenant1@example.com";
    const password = process.env.E2E_PASSWORD || "password123";
    await loginPage.login(email, password);

    // Wait for reading page (already handled in login method)
    await expect(page).toHaveURL(/\/app\/readings\/add/);
    await page.waitForLoadState("networkidle");

    // Try to submit with empty fields (clear them first)
    await addReadingPage.coldWaterInput.clear();
    await addReadingPage.hotWaterInput.clear();
    await addReadingPage.heatingInput.clear();

    // Attempt to submit
    await addReadingPage.submitButton.click();

    // Verify that form is not submitted (button should still be visible and not in loading state)
    await expect(addReadingPage.submitButton).toBeVisible();
    
    // Verify we're still on the same page (no redirect happened)
    await expect(page).toHaveURL(/\/app\/readings\/add/);
  });
});

