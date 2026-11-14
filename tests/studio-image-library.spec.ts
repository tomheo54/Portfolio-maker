import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);

test("Studio image library can be reused by another assignment without auto-attaching", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByText(/Bài tập & Dự án/).first().click();

  await page.getByText("#1 —", { exact: false }).first().click();
  await expect(page.getByText("Quản lý Hình ảnh Bài tập")).toBeVisible();
  const imageInput = page.locator('input[accept="image/*"]').first();
  await imageInput.setInputFiles({
    name: "library-check.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });

  const libraryCard = page.getByRole("button", { name: /Thư viện của tôi/ }).filter({ has: page.getByAltText("library-check.png") });
  await expect(libraryCard).toBeVisible();
  await libraryCard.click();
  await expect(libraryCard).toHaveClass(/border-emerald-600/);

  await page.getByText("#2 —", { exact: false }).first().click();
  const sharedLibraryCard = page.getByRole("button", { name: /Thư viện của tôi/ }).filter({ has: page.getByAltText("library-check.png") });
  await expect(sharedLibraryCard).toBeVisible();
  await expect(sharedLibraryCard).toHaveClass(/border-stone-200/);
  await sharedLibraryCard.click();
  await expect(sharedLibraryCard).toHaveClass(/border-emerald-600/);
});
