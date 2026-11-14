import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { PortfolioDocumentSchema } from "@/schema/portfolio.schema";

async function exportArchive(
  request: APIRequestContext,
  document: unknown,
) {
  const response = await request.post("/api/export", {
    data: { document, format: "zip" },
  });
  expect(response.ok()).toBeTruthy();
  return JSZip.loadAsync(await response.body());
}

test("ZIP exports preserve table-of-contents settings and keep legacy defaults", async ({
  request,
}) => {
  const sourcePath = path.join(
    process.cwd(),
    "data/portfolios/portfolio-mau-hoan-chinh.json",
  );
  const source = PortfolioDocumentSchema.parse(
    JSON.parse(fs.readFileSync(sourcePath, "utf8")),
  );

  const customized = PortfolioDocumentSchema.parse({
    ...source,
    slug: `toc-custom-${Date.now()}`,
    theme: {
      ...source.theme,
      tableOfContents: {
        placement: "floating",
        side: "right",
        style: "outline",
      },
    },
  });
  const archive = await exportArchive(request, customized);
  const indexHtml = await archive.file("index.html")!.async("string");
  const css = await archive.file("assets/styles.css")!.async("string");
  const manifest = JSON.parse(
    await archive.file("portfolio-source.json")!.async("string"),
  );

  expect(indexHtml).toContain(
    'data-toc-placement="floating" data-toc-side="right" data-toc-style="outline"',
  );
  expect(css).toContain(
    '.nav[data-toc-placement="floating"][data-toc-side="right"] { right: 16px; left: auto; }',
  );
  expect(css).toContain('.nav[data-toc-style="outline"] .nav-links a');
  expect(manifest.document.theme.tableOfContents).toEqual({
    placement: "floating",
    side: "right",
    style: "outline",
  });

  const legacyArchive = await exportArchive(request, source);
  const legacyHtml = await legacyArchive.file("index.html")!.async("string");
  expect(legacyHtml).toContain(
    'data-toc-placement="floating" data-toc-side="left" data-toc-style="pill"',
  );

  const topArchive = await exportArchive(request, {
    ...source,
    slug: `toc-top-${Date.now()}`,
    theme: {
      ...source.theme,
      tableOfContents: {
        placement: "top",
        side: "left",
        style: "pill",
      },
    },
  });
  const topHtml = await topArchive.file("index.html")!.async("string");
  const topCss = await topArchive.file("assets/styles.css")!.async("string");
  expect(topHtml).toContain('data-toc-placement="top"');
  expect(topHtml.indexOf('<nav class="nav')).toBeLessThan(
    topHtml.indexOf("<main class="),
  );
  expect(topCss).toContain(
    '.nav[data-toc-placement="top"] .nav-links {',
  );
  expect(topCss).toContain("position: sticky; top: 0");
  expect(topCss).toContain("width: max-content; max-width: 100%; margin: 0 auto;");
  expect(topCss).toContain("overflow-x: auto");
  expect(topCss).toContain(
    '.nav[data-toc-placement="top"] .nav-inner > strong',
  );
  expect(topCss).toContain("scrollbar-width: thin");
  expect(topCss).toContain('.nav[data-toc-placement="top"] .nav-links::-webkit-scrollbar');
});

test("top portfolio table of contents stays pinned and centered while scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Mục lục", exact: true }).click();
  await page.getByLabel("Vị trí mục lục").selectOption("top");

  const frame = page.locator('iframe[title^="Xem trước Portfolio"]');
  const preview = page.frameLocator('iframe[title^="Xem trước Portfolio"]');
  const navigation = preview.getByTestId(
    "public-portfolio-section-navigation",
  );
  await expect(navigation).toBeVisible();

  const initialMetrics = await navigation.evaluate((element) => {
    const links = element.firstElementChild;
    if (!(links instanceof HTMLElement)) {
      throw new Error("Portfolio navigation links are missing.");
    }

    const navRect = element.getBoundingClientRect();
    const linksRect = links.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      top: navRect.top,
      navCenter: navRect.left + navRect.width / 2,
      linksCenter: linksRect.left + linksRect.width / 2,
      heroTop: window.document.getElementById("hero")?.getBoundingClientRect().top,
    };
  });
  expect(initialMetrics.position).toBe("sticky");
  expect(initialMetrics.top).toBe(0);
  expect(Math.abs(initialMetrics.linksCenter - initialMetrics.navCenter)).toBeLessThan(1);
  expect(initialMetrics.heroTop).toBeGreaterThan(0);

  await frame.evaluate((element) => {
    (element as HTMLIFrameElement).contentWindow?.scrollTo(0, 1000);
  });
  await expect
    .poll(() =>
      frame.evaluate(
        (element) => (element as HTMLIFrameElement).contentWindow?.scrollY ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      navigation.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(0);
});

test("Studio exposes page placement, floating side, and visual style controls", async ({
  page,
}) => {
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Mục lục", exact: true }).click();

  const placement = page.getByLabel("Vị trí mục lục");
  const side = page.getByLabel("Cạnh hiển thị mục lục");
  const style = page.getByLabel("Kiểu hiển thị mục lục");

  await placement.selectOption("top");
  await expect(side).toHaveCount(0);
  await placement.selectOption("floating");
  await side.selectOption("right");
  await style.selectOption("outline");
  await expect(placement).toHaveValue("floating");
  await expect(side).toHaveValue("right");
  await expect(style).toHaveValue("outline");
});

test("top section navigation is inset on desktop and hidden for tablet/mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Mục lục", exact: true }).click();
  await page.getByLabel("Vị trí mục lục").selectOption("top");
  await page.getByRole("button", { name: "Xem toàn cảnh Portfolio" }).click();

  const navigation = page.getByTestId("portfolio-section-navigation");
  await expect(navigation).toBeVisible();
  const readMetrics = () => navigation.evaluate((element) => {
    const owner = element.parentElement?.firstElementChild;
    if (!(owner instanceof HTMLElement)) {
      throw new Error("Portfolio owner label is missing from the navigation.");
    }

    const ownerRect = owner.getBoundingClientRect();
    const navigationRect = element.getBoundingClientRect();
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
      ownerText: owner.textContent?.trim() ?? "",
      ownerRight: ownerRect.right,
      ownerBottom: ownerRect.bottom,
      navigationLeft: navigationRect.left,
      navigationTop: navigationRect.top,
    };
  });

  const desktopMetrics = await readMetrics();
  expect(desktopMetrics.ownerText).not.toBe("");
  expect(desktopMetrics.ownerRight).toBeLessThanOrEqual(desktopMetrics.navigationLeft + 1);

  await page.setViewportSize({ width: 520, height: 900 });
  await expect(navigation).toBeHidden();
});
