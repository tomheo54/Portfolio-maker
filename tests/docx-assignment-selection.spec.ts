import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";

test("multiple DOCX files each become one ordered article without assignment selection", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Nhập file \.docx bài tập/i }).click();
  const wizard = page.getByRole("dialog");
  await expect(wizard).toBeVisible();

  await wizard.getByRole("button", { name: /Nhiều DOCX.*mỗi file một bài/i }).click();
  const sampleDocx = fs.readFileSync(path.join(process.cwd(), "references/sample-assignments.docx"));
  await wizard.getByTestId("docx-file-input").setInputFiles([
    { name: "lesson-a.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: sampleDocx },
    { name: "lesson-b.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: sampleDocx },
  ]);

  await wizard.getByRole("button", { name: /Tiếp tục cấu hình ảnh/i }).click();
  await wizard.getByRole("button", { name: /Đọc các file DOCX/i }).click();
  const groups = wizard.getByTestId("assignment-source-group");
  await expect(wizard.getByTestId("docx-source-status")).toHaveCount(2);
  await expect(wizard.getByTestId("docx-source-status").first()).toContainText(/1 bài \(toàn bộ file\)/);
  await expect(wizard.getByTestId("detected-assignment-checkbox")).toHaveCount(0);
  await expect(wizard.getByText("2 bài theo thứ tự file")).toBeVisible();
  await wizard.getByRole("button", { name: "Đưa lesson-b.docx lên trước" }).click();
  const orderedFiles = wizard.getByRole("list", { name: "Thứ tự bài theo file" }).locator("li");
  await expect(orderedFiles.first()).toContainText("lesson-b.docx");
  await expect(groups).toHaveCount(0);

  await wizard.getByRole("button", { name: "Quay lại" }).click();
  await wizard.getByRole("button", { name: "Bỏ file lesson-b.docx" }).click();
  await wizard.getByRole("button", { name: /Tiếp tục cấu hình ảnh/i }).click();
  await expect(wizard.getByText("1 bài theo thứ tự file")).toBeVisible();
  await expect(wizard.getByTestId("detected-assignment-checkbox")).toHaveCount(0);
});

test("a single DOCX scan lets the user add or remove assignments from its detected list", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Nhập file \.docx bài tập/i }).click();
  const wizard = page.getByRole("dialog");
  await wizard.getByRole("button", { name: /Một DOCX.*lọc nhiều bài/i }).click();
  const sampleDocx = fs.readFileSync(path.join(process.cwd(), "references/sample-assignments.docx"));
  await wizard.getByTestId("docx-file-input").setInputFiles({
    name: "all-assignments.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: sampleDocx,
  });

  await wizard.getByRole("button", { name: /Tiếp tục cấu hình ảnh/i }).click();
  await wizard.getByRole("button", { name: /Đọc các file DOCX/i }).click();
  const assignmentChoices = wizard.getByTestId("detected-assignment-checkbox");
  await expect(assignmentChoices).toHaveCount(3, { timeout: 35_000 });
  await expect(wizard.getByText("Đã chọn 3 / 3 bài")).toBeVisible();
  await assignmentChoices.first().uncheck();
  await expect(wizard.getByText("Đã chọn 2 / 3 bài")).toBeVisible();
});

test("single-file filtering splits only headings beginning with Bài", async ({ page }) => {
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(process.cwd(), "references/sample-assignments.docx")));
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Bài 1: Nội dung đầu tiên</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>PHẦN I: Phần nội dung không phải bài mới</w:t></w:r></w:p>
        <w:p><w:r><w:t>Nội dung chi tiết</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Bài 2: Nội dung thứ hai</w:t></w:r></w:p>
        <w:p><w:r><w:t>Kết thúc</w:t></w:r></w:p>
        <w:sectPr/>
      </w:body>
    </w:document>`);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const response = await page.request.post("/api/docx-ingest?assignmentMode=bai-headings", {
    multipart: {
      files: {
        name: "filtered.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer,
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as { extractions: Array<{ detectedAssignments: Array<{ rawHeading: string; rawText: string }> }> };
  const assignments = payload.extractions[0].detectedAssignments;
  expect(assignments.map((assignment) => assignment.rawHeading)).toEqual([
    "Bài 1: Nội dung đầu tiên",
    "Bài 2: Nội dung thứ hai",
  ]);
  expect(assignments[0].rawText).toContain("PHẦN I");
});
