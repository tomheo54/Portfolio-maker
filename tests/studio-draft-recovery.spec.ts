import { expect, test } from "@playwright/test";

test("Studio restores the current draft and undo history after refresh", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  const templatePicker = page.getByRole("combobox", { name: "Chọn bộ Template" });
  await expect(templatePicker).toBeVisible();
  await page.waitForTimeout(500);

  await templatePicker.selectOption("bento-grid");
  const undoButton = page.getByRole("button", { name: "Hoàn tác (Undo)" });
  await expect(undoButton).toBeEnabled();
  await page.waitForTimeout(900);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("combobox", { name: "Chọn bộ Template" })).toHaveValue("bento-grid");
  await expect(page.getByRole("button", { name: "Hoàn tác (Undo)" })).toBeEnabled();
  await page.getByRole("button", { name: "Hoàn tác (Undo)" }).click();
  await expect(page.getByRole("combobox", { name: "Chọn bộ Template" })).toHaveValue("canva-editorial");
});

test("Studio clearly reports local draft save failure instead of showing a false success", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  await expect(page.getByRole("combobox", { name: "Chọn bộ Template" })).toBeVisible();
  await page.getByText(/Bài tập & Dự án/).first().click();
  await expect(page.getByText("Chi tiết Bài #1")).toBeVisible();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    };
  });

  await page.getByText("Tên bài tập").locator("..").locator("input").fill("Bản chỉnh sửa cần lưu");
  await expect(page.getByText("Tự lưu lỗi")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("status").filter({ hasText: "giải phóng dung lượng" })).toBeVisible();
});

test("saved projects stay unique, can be renamed, and use an in-app deletion confirmation", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Chọn bộ Template" }).selectOption("bento-grid");
  await expect(page.getByRole("button", { name: "Hoàn tác (Undo)" })).toBeEnabled();
  await page.waitForTimeout(1000);

  await page.goto("/", { waitUntil: "networkidle" });
  const draftCard = page.locator("article").filter({ has: page.getByRole("button", { name: /^Xóa bản nháp / }) }).first();
  await expect(draftCard).toBeVisible();
  const draftHref = await draftCard.getByRole("link").getAttribute("href");
  if (!draftHref) throw new Error("Saved draft card is missing its Studio link.");
  await expect(page.locator("article").filter({ has: page.locator(`a[href="${draftHref}"]`) })).toHaveCount(1);

  await page.getByRole("button", { name: /^Mở thư viện dự án$/ }).click();
  await draftCard.getByRole("button", { name: /^Đổi tên dự án / }).click();
  await page.getByRole("textbox", { name: "Tên dự án" }).fill("Portfolio thử nghiệm");
  await page.getByRole("button", { name: "Lưu tên dự án" }).click();
  await expect(draftCard).toContainText("Portfolio thử nghiệm");
  await expect(draftCard).toContainText("Nháp");

  await page.getByRole("link", { name: /Portfolio thử nghiệm/ }).click();
  await expect(page.getByRole("combobox", { name: "Chọn bộ Template" })).toBeVisible();
  await page.getByRole("link", { name: /Portfolio Studio/ }).click();
  await expect(page).toHaveURL("/");
  const reopenedDraftCard = page.locator("article").filter({ has: page.locator(`a[href="${draftHref}"]`) });
  await expect(reopenedDraftCard).toHaveCount(1);
  await expect(reopenedDraftCard).toContainText("Portfolio thử nghiệm");

  const reopenedDeleteButton = reopenedDraftCard.getByRole("button", { name: /^Xóa bản nháp / });
  await reopenedDeleteButton.click();
  const confirmation = page.getByRole("alertdialog", { name: "Xóa dự án này?" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText("Không thể hoàn tác.");
  await confirmation.getByRole("button", { name: "Hủy" }).click();
  await expect(confirmation).toHaveCount(0);
  await reopenedDeleteButton.click();
  await page.getByRole("alertdialog", { name: "Xóa dự án này?" }).getByRole("button", { name: "Xóa dự án" }).click();
  await expect(page.locator(`a[href="${draftHref}"]`)).toHaveCount(0);
});

test("successful ZIP export marks the local project as completed", async ({ page }) => {
  await page.route("**/api/portfolios", (route) =>
    route.fulfill({ status: 200, json: { slug: "portfolio-test" } }),
  );
  await page.route("**/api/export", (route) =>
    route.fulfill({ status: 200, contentType: "application/zip", body: "fake-zip" }),
  );
  await page.goto("/studio", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Xuất ZIP" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất ZIP" }).click();
  await downloadPromise;

  await page.goto("/", { waitUntil: "networkidle" });
  const projectCard = page.locator("article").filter({ has: page.locator('a[href^="/studio?draft="]') }).first();
  await expect(projectCard).toContainText("Hoàn thành");
});
