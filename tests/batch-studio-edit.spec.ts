import fs from "fs";
import path from "path";
import { expect, test } from "@playwright/test";
import { PortfolioDocumentSchema } from "@/schema/portfolio.schema";

test("a generated Batch result is saved as a completed library project and opens in Studio", async ({ page }) => {
  const sourcePath = path.join(process.cwd(), "data/portfolios/portfolio-mau-hoan-chinh.json");
  const document = PortfolioDocumentSchema.parse(JSON.parse(fs.readFileSync(sourcePath, "utf8")));
  await page.route("**/api/batch", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      portfolios: [{
        slug: document.slug,
        fullName: document.profileOwner?.fullName ?? "Portfolio test",
        roleTitle: document.profileOwner?.roleTitle ?? "Student",
        url: `/${document.slug}`,
        assignmentCount: 1,
        docxImages: 1,
        aiImages: 0,
        document,
      }],
    }),
  }));

  await page.goto("/batch", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nạp lô mẫu" }).click();
  await expect(page.getByText("Sẵn sàng 1 tài liệu minh họa • không gán danh tính cá nhân")).toBeVisible();
  await page.getByRole("button", { name: "Chạy sản xuất hàng loạt" }).click();
  await expect(page.getByText("Đã xuất bản 1 trang Portfolio thành công!")).toBeVisible();

  const draftId = `batch-result-${document.slug}`;
  const savedDraft = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("portfolio-studio-drafts", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{
      name: string;
      status: string;
      completionReason?: string;
    } | undefined>((resolve, reject) => {
      const request = database
        .transaction("drafts_v2", "readonly")
        .objectStore("drafts_v2")
        .get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return record;
  }, draftId);
  expect(savedDraft).toMatchObject({
    name: document.profileOwner?.fullName ?? document.slug,
    status: "completed",
    completionReason: "published",
  });
  expect(
    await page.evaluate(() =>
      localStorage.getItem("portfolio-studio-active-draft"),
    ),
  ).toBeNull();

  const libraryPage = await page.context().newPage();
  await libraryPage.goto("/", { waitUntil: "networkidle" });
  const libraryCard = libraryPage
    .locator("article")
    .filter({ has: libraryPage.locator(`a[href="/studio?draft=${draftId}"]`) });
  await expect(libraryCard).toContainText("Hoàn thành");
  await libraryPage.close();

  await page.getByRole("button", { name: /Sửa .* trong Studio/ }).click();

  await expect(page).toHaveURL(/\/studio\?draft=batch-result-/);
  const templatePicker = page.getByRole("combobox", { name: "Chọn bộ Template" });
  await expect(templatePicker).toBeVisible();
  await expect(templatePicker).toHaveValue(document.templateId);
  await expect.poll(() =>
    page.evaluate(() =>
      localStorage.getItem("portfolio-studio-active-draft"),
    ),
  ).toBe(draftId);
  await expect(page.getByRole("button", { name: "Bản nháp" })).toBeVisible();
  await page.getByRole("button", { name: "Bản nháp" }).click();
  const draftLibrary = page.getByRole("dialog", { name: "Dự án đang làm trên máy này" });
  await expect(draftLibrary).toContainText(document.profileOwner?.fullName ?? document.slug);
  await expect(draftLibrary.getByRole("button", { name: "Đang mở" })).toBeVisible();
  await draftLibrary.getByRole("button", { name: "Đóng" }).click();
  await page.getByText(/Bài tập & Dự án/).first().click();
  const projectTitle = page.getByText("Tên bài tập", { exact: true }).locator("..").locator("input");
  const projects = document.sections.find((section) => section.type === "projects");
  if (projects?.type !== "projects" || !projects.projects[0]) throw new Error("Batch fixture needs a project.");
  const editedTitle = `${projects.projects[0].title} · sửa tiếp`;
  await expect(projectTitle).toHaveValue(projects.projects[0].title);
  await projectTitle.fill(editedTitle);
  await expect(page.getByText("Đã tự lưu")).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("combobox", { name: "Chọn bộ Template" })).toBeVisible();
  await page.getByText(/Bài tập & Dự án/).first().click();
  const reloadedTitle = page.getByText("Tên bài tập", { exact: true }).locator("..").locator("input");
  await expect(reloadedTitle).toHaveValue(editedTitle);
});

test("Batch reports an invalid portfolio instead of opening an unusable Studio draft", async ({ page }) => {
  const sourcePath = path.join(process.cwd(), "data/portfolios/portfolio-mau-hoan-chinh.json");
  const document = PortfolioDocumentSchema.parse(JSON.parse(fs.readFileSync(sourcePath, "utf8")));
  await page.route("**/api/batch", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      portfolios: [{
        slug: document.slug,
        fullName: document.profileOwner?.fullName ?? "Portfolio test",
        roleTitle: document.profileOwner?.roleTitle ?? "Student",
        url: `/${document.slug}`,
        assignmentCount: 1,
        docxImages: 1,
        aiImages: 0,
        document: {},
      }],
    }),
  }));

  await page.goto("/batch", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nạp lô mẫu" }).click();
  await expect(page.getByText("Sẵn sàng 1 tài liệu minh họa • không gán danh tính cá nhân")).toBeVisible();
  await page.getByRole("button", { name: "Chạy sản xuất hàng loạt" }).click();
  await page.getByRole("button", { name: /Sửa .* trong Studio/ }).click();
  await expect(page.getByText(/Dữ liệu Portfolio không hợp lệ/)).toBeVisible();
  await expect(page).toHaveURL(/\/batch$/);
});
