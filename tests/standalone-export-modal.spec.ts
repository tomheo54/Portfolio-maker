import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
import { PortfolioDocumentSchema } from "@/schema/portfolio.schema";
import { collectAndMapAssets, renderStandaloneHtml, renderStandaloneCss } from "@/services/export/zip-exporter";

test.describe("Standalone Export ZIP & Modal Parity", () => {
  test("generates standalone ZIP with rich modal, visual parity, and offline functioning", async ({
    page,
    request,
  }) => {
    const sourcePath = path.join(
      process.cwd(),
      "data/portfolios/portfolio-mau-hoan-chinh.json",
    );
    const sourceDoc = PortfolioDocumentSchema.parse(
      JSON.parse(fs.readFileSync(sourcePath, "utf8")),
    );

    // Export portfolio as ZIP via API
    const response = await request.post("/api/export", {
      data: { document: sourceDoc, format: "zip" },
    });
    expect(response.ok()).toBeTruthy();

    const zipBuffer = await response.body();
    const zip = await JSZip.loadAsync(zipBuffer);

    // Verify ZIP contains index.html, styles.css, manifest, project pages
    const indexFile = zip.file("index.html");
    const cssFile = zip.file("assets/styles.css");
    const manifestFile = zip.file("portfolio-source.json");
    expect(indexFile).not.toBeNull();
    expect(cssFile).not.toBeNull();
    expect(manifestFile).not.toBeNull();

    const indexHtml = await indexFile!.async("string");
    const stylesCss = await cssFile!.async("string");

    // R2: Verify background subtle grid pattern & visuals
    expect(stylesCss).toContain("background-image: linear-gradient(");
    expect(stylesCss).toContain("background-size: 40px 40px");
    expect(stylesCss).toContain("backdrop-filter: blur(10px)");
    expect(stylesCss).toContain(".modal-backdrop");
    expect(stylesCss).toContain(".modal-panel");

    // Route offline emulation: serve ONLY files from the generated ZIP
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.route("https://standalone-portfolio.test/**", async (route) => {
      const url = new URL(route.request().url());
      const relPath = url.pathname.replace(/^\/+/, "") || "index.html";
      const file = zip.file(relPath);
      if (!file) {
        await route.fulfill({ status: 404, body: "Not found in ZIP" });
        return;
      }
      const ext = relPath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        svg: "image/svg+xml",
        json: "application/json",
      };
      await route.fulfill({
        status: 200,
        contentType: mimeTypes[ext ?? ""] || "application/octet-stream",
        body: await file.async("nodebuffer"),
      });
    });

    await page.goto("https://standalone-portfolio.test/index.html", {
      waitUntil: "networkidle",
    });

    // Verify zero console or page errors
    expect(consoleErrors).toEqual([]);

    // Verify navigation bar is present and floating/sticky
    const nav = page.locator("nav.nav");
    await expect(nav).toBeVisible();

    // R1: Modal Dialog Popup
    // Verify modal is initially closed
    const modal = page.locator("#assignment-modal");
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Click assignment card
    const firstCard = page.locator("#projects [data-project-card]").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Verify modal opened without navigating away
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    expect(page.url()).toContain("index.html");

    // Verify modal content: title, heading, metrics, tags, counter badge
    const modalContent = page.locator("#modal-content");
    await expect(modalContent.locator("h2")).toBeVisible();
    const projectTitle = await modalContent.locator("h2").textContent();
    expect(projectTitle?.trim().length).toBeGreaterThan(0);

    // Verify counter badge
    const counterBadge = page.locator("#modal-counter-badge");
    await expect(counterBadge).toContainText("01 /");

    // Verify inter-assignment navigation
    const nextBtn = page.locator("#modal-next-btn");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Verify title updated to project 2
    await expect(counterBadge).toContainText("02 /");
    const secondProjectTitle = await modalContent.locator("h2").textContent();
    expect(secondProjectTitle).not.toEqual(projectTitle);

    // Verify previous button returns to project 1
    const prevBtn = page.locator("#modal-prev-btn");
    await prevBtn.click();
    await expect(counterBadge).toContainText("01 /");
    await expect(modalContent.locator("h2")).toHaveText(projectTitle!);

    // Verify close controls: close button
    const closeBtn = page.locator("#modal-close-btn");
    await closeBtn.click();
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Verify ESC key close
    await firstCard.click();
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    await page.keyboard.press("Escape");
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Verify "Xem chi tiết bài làm" button also opens modal
    const detailBtn = page.locator("#projects button.btn-outline").first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await expect(modal).toHaveAttribute("aria-hidden", "false");
      await page.locator("#modal-close-btn").click();
      await expect(modal).toHaveAttribute("aria-hidden", "true");
    }

    // Verify fullscreen toggle and edge navigation visibility
    await firstCard.click();
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    const edgeNav = page.locator(".modal-edge-nav").first();
    const fullscreenBtn = page.locator("#modal-fullscreen-btn");
    await expect(fullscreenBtn).toBeVisible();
    await fullscreenBtn.click();
    await expect(page.locator(".modal-panel")).toHaveClass(/is-fullscreen/);
    await expect(edgeNav).toBeHidden();

    // Press Escape to exit fullscreen only (modal remains open)
    await page.keyboard.press("Escape");
    await expect(page.locator(".modal-panel")).not.toHaveClass(/is-fullscreen/);
    await expect(modal).toHaveAttribute("aria-hidden", "false");

    // Test Lightbox open and synchronization
    const zoomBtn = page.locator(".modal-zoom-btn").first();
    if (await zoomBtn.isVisible()) {
      await zoomBtn.click();
      const lightbox = page.locator("#modal-lightbox");
      await expect(lightbox).toBeVisible();
      await expect(lightbox).toHaveAttribute("aria-hidden", "false");

      // Press Escape to close lightbox only (modal remains open)
      await page.keyboard.press("Escape");
      await expect(lightbox).toBeHidden();
      await expect(modal).toHaveAttribute("aria-hidden", "false");
    }

    // Close modal with Escape
    await page.keyboard.press("Escape");
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Verify active section tracking on scroll
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const heroLink = page.locator('.nav-links a[href="#hero"]');
    await expect(heroLink).toHaveClass(/active/);

    // Scroll to projects
    await page.locator("#projects").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const projectsLink = page.locator('.nav-links a[href="#projects"]');
    await expect(projectsLink).toHaveClass(/active/);
  });

  test("renders 0-media placeholder gracefully without console errors", async ({
    page,
    request,
  }) => {
    const sourcePath = path.join(
      process.cwd(),
      "data/portfolios/portfolio-mau-hoan-chinh.json",
    );
    const sourceDoc = PortfolioDocumentSchema.parse(
      JSON.parse(fs.readFileSync(sourcePath, "utf8")),
    );

    // Modify first project to have 0 media items
    const docWithZeroMedia = {
      ...sourceDoc,
      sections: sourceDoc.sections.map((sec) => {
        if (sec.type === "projects") {
          return {
            ...sec,
            projects: sec.projects.map((p, idx) =>
              idx === 0 ? { ...p, media: [] } : p
            ),
          };
        }
        return sec;
      }),
    };

    const res = await request.post("/api/export", {
      data: { document: docWithZeroMedia, format: "zip" },
    });
    expect(res.ok()).toBeTruthy();
    const zip = await JSZip.loadAsync(await res.body());

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.route("https://zero-media.test/**", async (route) => {
      const url = new URL(route.request().url());
      const relPath = url.pathname.replace(/^\/+/, "") || "index.html";
      const file = zip.file(relPath);
      if (!file) {
        await route.fulfill({ status: 404 });
        return;
      }
      await route.fulfill({
        status: 200,
        body: await file.async("nodebuffer"),
      });
    });

    await page.goto("https://zero-media.test/index.html", { waitUntil: "networkidle" });
    expect(consoleErrors).toEqual([]);

    // Open first project modal (which has 0 media items)
    await page.locator("#projects [data-project-card]").first().click();
    const modal = page.locator("#assignment-modal");
    await expect(modal).toHaveAttribute("aria-hidden", "false");

    // Verify dashed placeholder text is displayed
    const placeholder = modal.locator("#modal-media-slot .modal-media-box");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText("Chưa có hình ảnh đính kèm cho bài tập này");
    expect(consoleErrors).toEqual([]);
  });
});
