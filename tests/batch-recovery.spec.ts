import { expect, test } from "@playwright/test";

test("batch job restores selected DOCX files after refresh", async ({ page }) => {
  await page.goto("/batch", { waitUntil: "networkidle" });

  const docxPicker = page.locator('input[type="file"][accept=".docx"][multiple]').first();
  await docxPicker.setInputFiles("references/sample-assignments.docx");
  await expect(page.getByText("sample-assignments.docx", { exact: true }).first()).toBeVisible();

  // Let the debounced IndexedDB checkpoint finish before simulating a refresh.
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.getByText("sample-assignments.docx", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("status")).toContainText("1");
});
