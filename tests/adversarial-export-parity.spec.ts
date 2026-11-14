import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
import { PortfolioDocumentSchema, PortfolioDocument } from "@/schema/portfolio.schema";

test.describe("Adversarial Edge-Case Suite: ZIP Exporter & Modal Parity", () => {
  test("handles special characters, minimal projects, keyboard nav wrapping, and zero-dependency offline behavior", async ({
    page,
    request,
  }) => {
    const sourcePath = path.join(
      process.cwd(),
      "data/portfolios/portfolio-mau-hoan-chinh.json",
    );
    const sourceDoc: PortfolioDocument = PortfolioDocumentSchema.parse(
      JSON.parse(fs.readFileSync(sourcePath, "utf8")),
    );

    // Create an edge-case portfolio document
    const customDoc: PortfolioDocument = {
      ...sourceDoc,
      slug: "adversarial-edge-portfolio",
      seo: {
        ...sourceDoc.seo,
        title: "Test <Portfolio> & 'Special' \"Chars\"",
        description: "Testing <script>alert('xss')</script> in SEO & tags",
      },
      sections: sourceDoc.sections.map((sec) => {
        if (sec.type === "projects") {
          return {
            ...sec,
            projects: [
              {
                id: "proj-special-1",
                slug: "proj-special-1",
                title: "Bài tập 1: <TagTest> & \"Quotes\" 'Single' & Ampersand",
                category: "UI/UX & <Design>",
                summary: "Quá trình <b>thực hiện</b> với ký tự đặc biệt & ampersands.",
                assignmentBrief: "Yêu cầu <đề bài> chi tiết (INF2501) - Special & characters.",
                suggestedAiImagePrompt: "Special prompt <with tags>",
                preferredImageStyle: "editorial-illustration" as const,
                processSteps: [
                  "Bước 1: <Phân tích> & thiết kế",
                  "Bước 2: 'Kiểm thử' \"UI\"",
                ],
                obstaclesAndSolutions: "Khó khăn với <HTML> & giải pháp là escape an toàn.",
                keyTakeaways: [
                  "Kỹ năng <Flexbox> & Grid",
                  "Khả năng thích ứng & bảo mật",
                ],
                promptComparison: {
                  initialPrompt: "Prompt <ban đầu> 'chưa tối ưu'",
                  improvedPrompt: "Prompt <cải tiến> \"tối ưu hơn\"",
                  aiOutput: "Kết quả AI với ký tự <đặc biệt>",
                },
                showPromptComparison: true,
                tags: ["HTML&CSS", "<React>", "\"NextJS\"", "'Tailwind'"],
                metrics: [
                  { label: "Tốc độ <LCP>", value: "99% & 0.8s" },
                  { label: "Độ chính xác", value: "100%" },
                ],
                links: [
                  { label: "Live Demo <External>", url: "https://example.com/demo" },
                  { label: "Unsafe Script Link", url: "javascript:alert('pwned')" },
                ],
                fullRawExcerpt: "Trích xuất <nguyên bản> từ bài tập: Line 1\nLine 2 & \"quotes\"",
                media: [
                  {
                    id: "m-1",
                    url: "/presets/project-content.svg",
                    sourceType: "docx-extracted" as const,
                    caption: "Caption với <ký tự> đặc biệt",
                  },
                  {
                    id: "m-2",
                    url: "/presets/project-design.svg",
                    sourceType: "ai-generated" as const,
                    caption: "Caption ảnh thứ 2",
                    aiPromptUsed: "Prompt minh họa <AI>",
                  },
                ],
              },
              {
                // Completely minimal project: no tags, no metrics, no media, no optional fields
                id: "proj-minimal-2",
                slug: "proj-minimal-2",
                title: "Bài tập 2: Tối giản",
                category: "Minimal",
                summary: "Summary ngắn",
                suggestedAiImagePrompt: "Minimal prompt",
                preferredImageStyle: "editorial-illustration" as const,
                keyTakeaways: [],
                tags: [],
                metrics: [],
                links: [],
                media: [],
              },
            ],
          };
        }
        return sec;
      }),
    };

    // Export ZIP
    const exportRes = await request.post("/api/export", {
      data: { document: customDoc, format: "zip" },
    });
    expect(exportRes.ok()).toBeTruthy();

    const zip = await JSZip.loadAsync(await exportRes.body());
    const indexFile = zip.file("index.html");
    const cssFile = zip.file("assets/styles.css");
    expect(indexFile).not.toBeNull();
    expect(cssFile).not.toBeNull();

    const indexHtml = await indexFile!.async("string");
    // Verify script json does not contain unescaped raw '<' that could break script tag
    expect(indexHtml).not.toContain("<script>alert('xss')</script>");

    // Emulate strict offline environment
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.route("https://adversarial-test.internal/**", async (route) => {
      const url = new URL(route.request().url());
      const relPath = url.pathname.replace(/^\/+/, "") || "index.html";
      const file = zip.file(relPath);
      if (!file) {
        await route.fulfill({ status: 404, body: "Not found" });
        return;
      }
      const ext = relPath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css",
        png: "image/png",
        jpg: "image/jpeg",
        svg: "image/svg+xml",
        json: "application/json",
      };
      await route.fulfill({
        status: 200,
        contentType: mimeTypes[ext ?? ""] || "application/octet-stream",
        body: await file.async("nodebuffer"),
      });
    });

    await page.goto("https://adversarial-test.internal/index.html", {
      waitUntil: "networkidle",
    });
    expect(consoleErrors).toEqual([]);

    const modal = page.locator("#assignment-modal");
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Click card 1
    const cards = page.locator("#projects [data-project-card]");
    await expect(cards).toHaveCount(2);
    await cards.first().click();

    // Verify modal is opened
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    const modalContent = page.locator("#modal-content");

    // Verify special characters rendered cleanly (as text, not raw tags)
    await expect(modalContent.locator("h2")).toContainText("<TagTest> & \"Quotes\" 'Single'");
    await expect(modalContent).toContainText("Yêu cầu <đề bài> chi tiết");
    await expect(modalContent).toContainText("<HTML> & giải pháp là escape an toàn");
    await expect(modalContent).toContainText("#HTML&CSS");
    await expect(modalContent).toContainText("#<React>");

    // Verify unsafe link protocol was sanitized to '#' in client modal DOM
    const unsafeLinkEl = modalContent.locator('a:has-text("Unsafe Script Link")');
    await expect(unsafeLinkEl).toHaveAttribute("href", "#");

    // Test inter-assignment navigation: Wrap forward (1 -> 2)
    const nextBtn = page.locator("#modal-next-btn");
    await nextBtn.click();
    const counterBadge = page.locator("#modal-counter-badge");
    await expect(counterBadge).toContainText("02 / 02");
    await expect(modalContent.locator("h2")).toContainText("Bài tập 2: Tối giản");

    // Project 2 has 0 media: verify placeholder is displayed cleanly without error
    const mediaSlot = modalContent.locator("#modal-media-slot");
    await expect(mediaSlot).toContainText("Chưa có hình ảnh đính kèm cho bài tập này");

    // Test wrap forward from last to first (2 -> 1)
    await nextBtn.click();
    await expect(counterBadge).toContainText("01 / 02");
    await expect(modalContent.locator("h2")).toContainText("Bài tập 1:");

    // Test wrap backward from first to last (1 -> 2)
    const prevBtn = page.locator("#modal-prev-btn");
    await prevBtn.click();
    await expect(counterBadge).toContainText("02 / 02");

    // Keyboard Arrow navigation: ArrowLeft wraps back to 1
    await page.keyboard.press("ArrowLeft");
    await expect(counterBadge).toContainText("01 / 02");

    // Keyboard Arrow navigation: ArrowRight moves to 2
    await page.keyboard.press("ArrowRight");
    await expect(counterBadge).toContainText("02 / 02");

    // Switch back to 1 to test Lightbox and image switching
    await page.keyboard.press("ArrowLeft");
    await expect(counterBadge).toContainText("01 / 02");

    // Check thumbnail switching (Project 1 has 2 media items)
    const thumbnails = modalContent.locator(".modal-thumb-btn");
    await expect(thumbnails).toHaveCount(2);
    await thumbnails.nth(1).click();
    await expect(modalContent.locator(".modal-media-box img")).toBeVisible();
    await expect(modalContent.locator(".modal-media-badge")).toContainText("Ảnh minh họa AI");

    // Test Lightbox open
    const zoomBtn = modalContent.locator(".modal-zoom-btn");
    await zoomBtn.click();
    const lightbox = page.locator("#modal-lightbox");
    await expect(lightbox).toBeVisible();
    await expect(page.locator("#lightbox-counter")).toContainText("2 / 2");

    // ArrowLeft in Lightbox cycles to image 1
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#lightbox-counter")).toContainText("1 / 2");

    // Escape in Lightbox closes Lightbox only, modal remains open
    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
    await expect(modal).toHaveAttribute("aria-hidden", "false");

    // Escape closes modal
    await page.keyboard.press("Escape");
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Edge Case: Deep linking via ?project=2 directly opens project 2 modal
    await page.goto("https://adversarial-test.internal/index.html?project=2", {
      waitUntil: "networkidle",
    });
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("#modal-counter-badge")).toContainText("02 / 02");
    await expect(page.locator("#modal-content h2")).toContainText("Bài tập 2: Tối giản");

    // Close modal via Close button
    await page.locator("#modal-close-btn").click();
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    // Verify zero console errors throughout entire interaction
    expect(consoleErrors).toEqual([]);
  });

  test("single-project edge case hides edge nav and handles prompt comparison toggling", async ({
    page,
    request,
  }) => {
    const sourcePath = path.join(
      process.cwd(),
      "data/portfolios/portfolio-mau-hoan-chinh.json",
    );
    const sourceDoc: PortfolioDocument = PortfolioDocumentSchema.parse(
      JSON.parse(fs.readFileSync(sourcePath, "utf8")),
    );

    const singleProjDoc: PortfolioDocument = {
      ...sourceDoc,
      theme: {
        ...sourceDoc.theme,
        tableOfContents: {
          placement: "floating",
          side: "right",
          style: "minimal",
        },
      },
      sections: sourceDoc.sections.map((sec) => {
        if (sec.type === "projects") {
          return {
            ...sec,
            projects: [
              {
                id: "single-p",
                slug: "single-p",
                title: "Bài tập Duy Nhất",
                category: "Solo",
                summary: "Một bài tập duy nhất",
                suggestedAiImagePrompt: "Solo project prompt",
                preferredImageStyle: "editorial-illustration" as const,
                keyTakeaways: [],
                tags: ["SoloTag"],
                metrics: [],
                links: [],
                media: [],
                showPromptComparison: false,
                promptComparison: {
                  initialPrompt: "Hidden initial",
                  improvedPrompt: "Hidden improved",
                  aiOutput: "Hidden output",
                },
              },
            ],
          };
        }
        return sec;
      }),
    };

    const res = await request.post("/api/export", {
      data: { document: singleProjDoc, format: "zip" },
    });
    expect(res.ok()).toBeTruthy();
    const zip = await JSZip.loadAsync(await res.body());

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.route("https://single-project.internal/**", async (route) => {
      const url = new URL(route.request().url());
      const relPath = url.pathname.replace(/^\/+/, "") || "index.html";
      const file = zip.file(relPath);
      if (!file) {
        await route.fulfill({ status: 404 });
        return;
      }
      const ext = relPath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css",
        svg: "image/svg+xml",
      };
      await route.fulfill({
        status: 200,
        contentType: mimeTypes[ext ?? ""] || "text/plain",
        body: await file.async("nodebuffer"),
      });
    });

    await page.goto("https://single-project.internal/index.html", {
      waitUntil: "networkidle",
    });
    expect(consoleErrors).toEqual([]);

    // Verify floating nav styling with side=right
    const nav = page.locator("nav.nav");
    await expect(nav).toHaveAttribute("data-toc-placement", "floating");
    await expect(nav).toHaveAttribute("data-toc-side", "right");

    // Open project modal
    await page.locator("#projects [data-project-card]").first().click();
    const modal = page.locator("#assignment-modal");
    await expect(modal).toHaveAttribute("aria-hidden", "false");

    // Float prev and next edge buttons as well as top-bar nav buttons should be hidden for single-project
    const floatPrev = page.locator("#modal-float-prev");
    const floatNext = page.locator("#modal-float-next");
    await expect(floatPrev).toBeHidden();
    await expect(floatNext).toBeHidden();

    const topPrev = page.locator("#modal-prev-btn");
    const topNext = page.locator("#modal-next-btn");
    await expect(topPrev).toBeHidden();
    await expect(topNext).toBeHidden();

    // Verify prompt comparison is NOT rendered because showPromptComparison is false
    const content = page.locator("#modal-content");
    await expect(content).not.toContainText("So sánh Prompt");
    await expect(content).not.toContainText("Hidden initial");

    // Verify single project counter badge
    await expect(page.locator("#modal-counter-badge")).toContainText("01 / 01");

    expect(consoleErrors).toEqual([]);
  });

  test("non-Canva templates (tech-developer, bento-grid) maintain visual parity, floating badges, and interactive modal dialog", async ({
    page,
    request,
  }) => {
    const sourcePath = path.join(
      process.cwd(),
      "data/portfolios/portfolio-mau-hoan-chinh.json",
    );
    const sourceDoc: PortfolioDocument = PortfolioDocumentSchema.parse(
      JSON.parse(fs.readFileSync(sourcePath, "utf8")),
    );

    // Test tech-developer archetype with floating decorations & effects
    const techDoc: PortfolioDocument = {
      ...sourceDoc,
      templateId: "tech-developer",
      slug: "tech-developer-adversarial",
      theme: {
        ...sourceDoc.theme,
        primaryColor: "#0284C7",
        secondaryColor: "#0F172A",
        backgroundColor: "#0F172A",
        textColor: "#F8FAFC",
        tableOfContents: {
          placement: "top",
          side: "left",
          style: "outline",
        },
        effects: {
          enableFloat: true,
          enableGlow: true,
          enableTilt: true,
          enableSparkles: true,
          revealVariant: "fade-up",
          enableParallax: true,
        },
      },
      sections: sourceDoc.sections.map((sec) => {
        if (sec.type === "hero") {
          return {
            ...sec,
            decorations: [
              {
                id: "dec-1",
                type: "badge" as const,
                label: "Full-Stack Dev",
                position: { top: "10%", left: "5%", zIndex: 10, rotate: 0 },
              },
              {
                id: "dec-2",
                type: "floating-tag" as const,
                label: "AI Engineer",
                position: { bottom: "15%", right: "8%", zIndex: 10, rotate: 0 },
              },
            ],
          };
        }
        return sec;
      }),
    };

    const res = await request.post("/api/export", {
      data: { document: techDoc, format: "zip" },
    });
    expect(res.ok()).toBeTruthy();
    const zip = await JSZip.loadAsync(await res.body());

    const cssContent = await zip.file("assets/styles.css")!.async("string");
    const htmlContent = await zip.file("index.html")!.async("string");

    // R2: Verify theme-matched background color, grid pattern, floating badges, and effects
    expect(cssContent).toContain("background-color: var(--bg)");
    expect(cssContent).toContain("linear-gradient(90deg");
    expect(cssContent).toContain("background-size: 40px 40px");
    expect(htmlContent).toContain("hero-floating-badge");
    expect(htmlContent).toContain("Full-Stack Dev");
    expect(htmlContent).toContain("AI Engineer");
    expect(htmlContent).toContain("portfolio-export-effects");

    // Offline simulation
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.route("https://tech-dev.internal/**", async (route) => {
      const url = new URL(route.request().url());
      const relPath = url.pathname.replace(/^\/+/, "") || "index.html";
      const file = zip.file(relPath);
      if (!file) {
        await route.fulfill({ status: 404 });
        return;
      }
      const ext = relPath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css",
        svg: "image/svg+xml",
      };
      await route.fulfill({
        status: 200,
        contentType: mimeTypes[ext ?? ""] || "application/octet-stream",
        body: await file.async("nodebuffer"),
      });
    });

    await page.goto("https://tech-dev.internal/index.html", {
      waitUntil: "networkidle",
    });
    expect(consoleErrors).toEqual([]);

    // Verify sticky top pill navigation with outline style
    const nav = page.locator("nav.nav");
    await expect(nav).toHaveAttribute("data-toc-placement", "top");
    await expect(nav).toHaveAttribute("data-toc-style", "outline");

    // R1: Clicking assignment card in non-Canva template opens the rich modal
    const firstProjectCard = page.locator("#projects [data-project-card]").first();
    await expect(firstProjectCard).toBeVisible();
    await firstProjectCard.click();

    const modal = page.locator("#assignment-modal");
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    const modalContent = page.locator("#modal-content");
    await expect(modalContent.locator("h2")).toBeVisible();

    // Verify inter-assignment navigation works smoothly in non-Canva template
    const nextBtn = page.locator("#modal-next-btn");
    await nextBtn.click();
    await expect(page.locator("#modal-counter-badge")).toContainText("02 /");

    // Close modal
    await page.keyboard.press("Escape");
    await expect(modal).toHaveAttribute("aria-hidden", "true");

    expect(consoleErrors).toEqual([]);
  });
});
