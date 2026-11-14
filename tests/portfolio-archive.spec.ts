import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
import { PortfolioDocumentSchema } from "@/schema/portfolio.schema";
import {
  PORTFOLIO_SOURCE_FORMAT,
  PORTFOLIO_SOURCE_MANIFEST_FILENAME,
  PORTFOLIO_SOURCE_VERSION,
  PortfolioSourceManifestSchema,
} from "@/schema/portfolio-archive.schema";
import { DEFAULT_CONCLUSION_CONFIG } from "@/templates/blocks/conclusion-defaults";

test("single and bulk ZIP exports keep an editable source manifest and bundled image refs", async ({
  request,
}) => {
  const sourcePath = path.join(process.cwd(), "data/portfolios/portfolio-mau-hoan-chinh.json");
  const document = PortfolioDocumentSchema.parse(
    JSON.parse(fs.readFileSync(sourcePath, "utf8")),
  );

  const singleResponse = await request.post("/api/export", {
    data: { document, format: "zip" },
  });
  expect(singleResponse.ok()).toBeTruthy();
  const singleZip = await JSZip.loadAsync(await singleResponse.body());
  const singleManifestFile = singleZip.file(PORTFOLIO_SOURCE_MANIFEST_FILENAME);
  expect(singleManifestFile).not.toBeNull();
  const singleManifest = PortfolioSourceManifestSchema.parse(
    JSON.parse(await singleManifestFile!.async("string")),
  );
  expect(singleManifest.format).toBe(PORTFOLIO_SOURCE_FORMAT);
  expect(singleManifest.version).toBe(PORTFOLIO_SOURCE_VERSION);
  expect(singleManifest.document.slug).toBe(document.slug);

  const bulkResponse = await request.post("/api/export", {
    data: { documents: [document, { ...document, id: `${document.id}-copy`, slug: `${document.slug}-copy` }] },
  });
  expect(bulkResponse.ok()).toBeTruthy();
  const bulkZip = await JSZip.loadAsync(await bulkResponse.body());
  const manifestPaths = Object.keys(bulkZip.files).filter((filePath) =>
    filePath.endsWith(`/${PORTFOLIO_SOURCE_MANIFEST_FILENAME}`),
  );
  expect(manifestPaths).toHaveLength(2);

  for (const manifestPath of manifestPaths) {
    const manifestFile = bulkZip.file(manifestPath);
    expect(manifestFile).not.toBeNull();
    const manifest = PortfolioSourceManifestSchema.parse(
      JSON.parse(await manifestFile!.async("string")),
    );
    const archiveDirectory = manifestPath.slice(0, manifestPath.lastIndexOf("/") + 1);
    const visit = (value: unknown) => {
      if (typeof value === "string" && value.startsWith("portfolio-asset:")) {
        const relativePath = value.slice("portfolio-asset:".length);
        expect(bulkZip.file(`${archiveDirectory}${relativePath}`)).not.toBeNull();
      } else if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(visit);
      }
    };
    visit(manifest.document);
  }
});

test("ZIP project pages preserve per-project chapter visibility and layouts", async ({ request }) => {
  const sourcePath = path.join(process.cwd(), "data/portfolios/portfolio-mau-hoan-chinh.json");
  const sourceDocument = PortfolioDocumentSchema.parse(
    JSON.parse(fs.readFileSync(sourcePath, "utf8")),
  );
  const projectsSection = sourceDocument.sections.find((section) => section.type === "projects");
  if (!projectsSection || projectsSection.type !== "projects" || !projectsSection.projects[0]) {
    throw new Error("The project display fixture requires at least one project.");
  }
  const firstProjectTitle = projectsSection.projects[0].title;
  const customChapter = "CHAPTER_VISIBILITY_TEST";
  const customExercise = "EXERCISE_VISIBILITY_TEST";
  const customDocxLabel = "OPEN_ASSIGNMENT_DOCX";
  const customRawExcerpt = "RAW_EXTRACTED_ASSIGNMENT_EXPORT_TEST";
  const customConclusionTitle = "CONCLUSION_EXPORT_TEST";
  const assignmentUrl = "https://example.com/assignment.docx";
  const document = PortfolioDocumentSchema.parse({
    ...sourceDocument,
    slug: `project-display-${Date.now()}`,
    sections: sourceDocument.sections.map((section) => {
      if (section.type === "projects") {
        return {
          ...section,
          projects: section.projects.map((project, index) => index === 0
            ? {
                ...project,
                chapterTitle: customChapter,
                exerciseNumber: customExercise,
                docxUrl: assignmentUrl,
                docxLinkLabel: customDocxLabel,
                fullRawExcerpt: customRawExcerpt,
                showChapter: false,
                showExercise: false,
                chapterLayout: "banner",
                exerciseLayout: "inline",
                detailLayout: "two-column",
              }
            : project),
        };
      }
      if (section.type === "contact") {
        const conclusion = section.conclusion ?? DEFAULT_CONCLUSION_CONFIG;
        return {
          ...section,
          conclusion: {
            ...conclusion,
            title: customConclusionTitle,
            layout: "timeline" as const,
            cards: conclusion.cards.map((card, index) =>
              index === 0
                ? {
                    ...card,
                    titleFontFamily: "Lora",
                    titleAlign: "right" as const,
                  }
                : card,
            ),
          },
        };
      }
      return section;
    }),
  });

  const response = await request.post("/api/export", {
    data: { document, format: "zip" },
  });
  expect(response.ok()).toBeTruthy();
  const archive = await JSZip.loadAsync(await response.body());
  const indexPage = archive.file("index.html");
  const projectPage = archive.file("projects/project-1.html");
  expect(indexPage).not.toBeNull();
  expect(projectPage).not.toBeNull();
  const indexHtml = await indexPage!.async("string");
  const html = await projectPage!.async("string");
  const renderedIndexHtml = indexHtml.replace(
    /<script id="portfolio-projects-data" type="application\/json">[\s\S]*?<\/script>/,
    "",
  );
  expect(renderedIndexHtml).not.toContain(customChapter);
  expect(renderedIndexHtml).not.toContain(customExercise);
  expect(renderedIndexHtml).toContain(customConclusionTitle);
  expect(renderedIndexHtml).toContain('data-conclusion-layout="timeline"');
  expect(renderedIndexHtml).toContain('font-family:"Lora"');
  expect(renderedIndexHtml).toContain("text-align:right");
  expect(renderedIndexHtml).toContain(customDocxLabel);
  expect(renderedIndexHtml).toContain(assignmentUrl);
  expect(html).toContain('data-project-detail="1"');
  expect(html).toContain('class="detail-title"');
  expect(html).toContain(firstProjectTitle.replace(/&/g, "&amp;"));
  expect(html).toContain('href="../assets/styles.css"');
  expect(html).not.toContain("<iframe");
  expect(html).not.toContain(customChapter);
  expect(html).not.toContain(customExercise);
  expect(html).toContain(customRawExcerpt);
});

test("Studio imports an exported ZIP into the local draft library", async ({ page, request }) => {
  const sourcePath = path.join(process.cwd(), "data/portfolios/portfolio-mau-hoan-chinh.json");
  const sourceDocument = PortfolioDocumentSchema.parse(
    JSON.parse(fs.readFileSync(sourcePath, "utf8")),
  );
  const sourceProjects = sourceDocument.sections.find((section) => section.type === "projects");
  if (!sourceProjects || sourceProjects.type !== "projects" || !sourceProjects.projects[0]) {
    throw new Error("The archive fixture needs at least one project with an image.");
  }
  const firstProject = sourceProjects.projects[0];
  const secondProjectMedia = sourceProjects.projects[1]?.media[0];
  if (!secondProjectMedia) {
    throw new Error("The archive fixture needs a second project image to test reordering.");
  }
  const originalImageUrls = [
    ...firstProject.media.map((media) => media.url),
    secondProjectMedia.url,
  ];
  const expectedMediaCaptions = [
    secondProjectMedia.caption,
    ...firstProject.media.map((media) => media.caption),
  ];
  const originalTitle = firstProject.title;
  const editedTitle = `${originalTitle} · Imported Edit`;
  const document = PortfolioDocumentSchema.parse({
    ...sourceDocument,
    id: `${sourceDocument.id}-archive-roundtrip`,
    slug: `archive-roundtrip-${Date.now()}`,
    sections: sourceDocument.sections.map((section) => section.type === "projects"
      ? {
          ...section,
          projects: section.projects.map((project, index) => index === 0
            ? {
                ...project,
                media: [
                  ...project.media,
                  { ...secondProjectMedia, id: "archive-roundtrip-secondary-image" },
                ],
                docxUrl: "https://example.com/assignment-source.docx",
              }
            : project,
          ),
        }
      : section,
    ),
  });
  const response = await request.post("/api/export", {
    data: { document, format: "zip" },
  });
  expect(response.ok()).toBeTruthy();

  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Mở ZIP đã xuất" }).click();
  await page.locator('input[type="file"][accept=".zip,application/zip"]').setInputFiles({
    name: "portfolio-editable.zip",
    mimeType: "application/zip",
    buffer: await response.body(),
  });

  await expect(page.locator('p[role="status"]')).toContainText("Đã nhập", { timeout: 10_000 });
  await page.getByRole("button", { name: "Đóng" }).click();

  // Edit the imported project title and reorder its image so both values must
  // survive the next export/import cycle.
  await page.getByText(/Bài tập & Dự án/i).first().click();
  const projectTitleInput = page.getByText("Tên bài tập", { exact: true }).locator("..").locator("input");
  await expect(projectTitleInput).toHaveValue(originalTitle);
  await projectTitleInput.fill(editedTitle);
  const moveImageToPrimary = page.getByRole("button", { name: "Đưa lên làm ảnh chính" }).last();
  await expect(moveImageToPrimary).toBeVisible();
  await moveImageToPrimary.click();
  await expect(page.getByRole("button", { name: "Đưa lên làm ảnh chính" })).toHaveCount(originalImageUrls.length - 1);

  // Studio's normal export path also publishes first; stub that write so this
  // test only creates an archive and does not alter checked-in portfolio data.
  await page.route("**/api/portfolios", (route) => route.fulfill({ status: 200, body: "{}" }));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất ZIP" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const exportedZip = await JSZip.loadAsync(await fs.promises.readFile(downloadedPath!));

  const roundTripManifestFile = exportedZip.file(PORTFOLIO_SOURCE_MANIFEST_FILENAME);
  expect(roundTripManifestFile).not.toBeNull();
  const roundTripManifest = PortfolioSourceManifestSchema.parse(
    JSON.parse(await roundTripManifestFile!.async("string")),
  );
  const roundTripProjects = roundTripManifest.document.sections.find((section) => section.type === "projects");
  expect(roundTripProjects?.type).toBe("projects");
  if (roundTripProjects?.type !== "projects") throw new Error("The exported source lost its projects section.");
  expect(roundTripProjects.projects[0].title).toBe(editedTitle);
  expect(roundTripProjects.projects[0].docxUrl).toBe("https://example.com/assignment-source.docx");
  expect(roundTripProjects.projects[0].media.map((media) => media.caption)).toEqual(expectedMediaCaptions);

  const offlineIndexFile = exportedZip.file("index.html");
  const offlineCssFile = exportedZip.file("assets/styles.css");
  const offlineProjectFile = exportedZip.file("projects/project-1.html");
  expect(offlineIndexFile).not.toBeNull();
  expect(offlineCssFile).not.toBeNull();
  expect(offlineProjectFile).not.toBeNull();
  const offlineIndex = await offlineIndexFile!.async("string");
  const offlineProject = await offlineProjectFile!.async("string");
  expect(offlineIndex).toContain('href="./assets/styles.css"');
  expect(offlineIndex).toContain("https://example.com/assignment-source.docx");
  expect(offlineIndex).toContain(editedTitle);
  expect(offlineProject).toContain('data-project-detail="1"');
  expect(offlineProject).toContain(editedTitle);
  expect(offlineProject).not.toContain("<iframe");

  const archivedImages = Object.keys(exportedZip.files).filter((entry) => entry.startsWith("assets/images/"));
  expect(archivedImages.length).toBeGreaterThan(0);
  const firstExportedImageRef = roundTripProjects.projects[0].media[0].url;
  expect(firstExportedImageRef).toMatch(/^portfolio-asset:assets\/images\//);
  expect(exportedZip.file(firstExportedImageRef.slice("portfolio-asset:".length))).not.toBeNull();

  // Serve only entries from the downloaded archive to emulate opening it
  // offline: the entry page, styles, local images and project detail all load
  // without the Next.js application server.
  await page.route("https://offline-portfolio.test/**", async (route) => {
    const relativePath = new URL(route.request().url()).pathname.replace(/^\/+/, "") || "index.html";
    const entry = exportedZip.file(relativePath);
    if (!entry) {
      await route.fulfill({ status: 404, body: "Not found in offline ZIP" });
      return;
    }
    const extension = relativePath.split(".").pop()?.toLowerCase();
    const contentType = extension === "css"
      ? "text/css"
      : extension === "html"
      ? "text/html; charset=utf-8"
      : extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : extension === "webp"
      ? "image/webp"
      : extension === "svg"
      ? "image/svg+xml"
      : "application/octet-stream";
    await route.fulfill({ status: 200, contentType, body: await entry.async("nodebuffer") });
  });
  await page.goto("https://offline-portfolio.test/index.html");
  await expect(
    page.locator("#projects").getByText(editedTitle, { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('link[rel="stylesheet"][href="./assets/styles.css"]')).toBeAttached();
  await page.locator("img").evaluateAll((images) => images.forEach((image) => { (image as HTMLImageElement).loading = "eager"; }));
  await expect.poll(() => page.locator("img").evaluateAll((images) =>
    images.every((image) => (image as HTMLImageElement).complete),
  )).toBe(true);
  const brokenLocalImages = await page.locator("img").evaluateAll((images) =>
    images.filter((image) => image.getAttribute("src")?.startsWith("./assets/") &&
      (!(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)).map((image) => image.getAttribute("src")),
  );
  expect(brokenLocalImages).toEqual([]);

  const projectImage = page.locator("#projects [data-open-project]").first();
  await expect(projectImage).toBeVisible();
  await projectImage.click();
  await expect(page.locator("#assignment-modal")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#modal-content h2")).toHaveText(editedTitle);
  await page.locator("#modal-close-btn").click();
  await expect(page.locator("#assignment-modal")).toHaveAttribute("aria-hidden", "true");

  await page.locator('a[href="projects/project-1.html"]').first().click();
  await expect(page).toHaveURL("https://offline-portfolio.test/projects/project-1.html");
  await expect(page.locator("[data-project-detail='1']")).toBeVisible();
  await expect(page.getByRole("heading", { name: editedTitle, level: 1 })).toBeVisible();
  await expect(page.locator(".detail-media img").first()).toBeVisible();
});
