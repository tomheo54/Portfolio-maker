import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("one DOCX is discovered as one portfolio with selectable assignment entries", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/batch", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Một file DOCX.*lọc nhiều bài/i }).click();
  await page.getByLabel("Chọn một file .docx").setInputFiles("references/sample-assignments.docx");
  await expect(page.getByText(/Tìm thấy \d+ bài/).first()).toBeVisible({ timeout: 30_000 });

  const assignmentChoices = page.locator('input[type="checkbox"][aria-label^="Đưa bài"]');
  const detectedCount = await assignmentChoices.count();
  expect(detectedCount).toBeGreaterThan(1);
  await assignmentChoices.first().uncheck();
  await expect(page.getByText(`Đã chọn ${detectedCount - 1}/${detectedCount} bài cho portfolio này.`)).toBeVisible();

  await page.getByLabel("Chế độ xử lý hình ảnh").selectOption("docx-extract");
  await page.getByRole("button", { name: /Chạy sản xuất hàng loạt/i }).click();

  await expect(page.getByRole("heading", { name: /Đã xuất bản 1 trang Portfolio thành công/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(`${detectedCount - 1} bài tập`, { exact: true })).toBeVisible();
});

test("multiple DOCX files each create one whole-file portfolio in the chosen order", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/batch", { waitUntil: "networkidle" });

  const sample = readFileSync("references/sample-assignments.docx");
  const multipleFilesBranch = page.getByRole("button", { name: /Nhiều file DOCX.*mỗi file một bài/i });
  await multipleFilesBranch.click();
  const fileInput = page.getByLabel("Thêm nhiều file .docx");
  const studentOne = { name: "student-one.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: sample };
  const studentTwo = { name: "student-two.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: sample };
  await page.getByLabel("CSV thông tin học viên").fill(
    "tenfile,hoten,chucdanh,email\nstudent-one.docx,Nguyen An,Giang vien,nguyen@example.com\nstudent-two.docx,Tran Binh,Giang vien,tran@example.com",
  );
  await fileInput.setInputFiles([
    studentOne,
    studentTwo,
  ]);

  await expect(page.getByText(/1 bài \(toàn bộ file\)/)).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByTestId("batch-import-count")).toContainText("Đã thêm 2 file");

  await expect(page.getByRole("checkbox", { name: /Đưa bài .*student-one.docx/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Đưa student-two.docx lên trước" }).first().click();
  await expect(page.getByText("1. student-two.docx", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Xóa student-two.docx" }).click();
  await expect(page.getByTestId("batch-import-count")).toContainText("Đã thêm 1 file");
  await fileInput.setInputFiles(studentTwo);
  await expect(page.getByText(/1 bài \(toàn bộ file\)/)).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByTestId("batch-import-count")).toContainText("Đã thêm 2 file");
  await expect(page.getByRole("checkbox", { name: /Đưa bài .*student-two.docx/ })).toHaveCount(0);

  await page.getByLabel("Chế độ xử lý hình ảnh").selectOption("docx-extract");
  await page.getByRole("button", { name: /Chạy sản xuất hàng loạt/i }).click();

  await expect(page.getByRole("heading", { name: /Đã xuất bản 2 trang Portfolio thành công/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("1 bài tập", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Nguyen An", { exact: true })).toBeVisible();
  await expect(page.getByText("Tran Binh", { exact: true })).toBeVisible();
  await expect(page.getByText("Giang vien", { exact: true })).toHaveCount(2);
});
