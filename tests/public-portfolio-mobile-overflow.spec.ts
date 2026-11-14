import { expect, test } from "@playwright/test";

test("public portfolio avoids horizontal overflow on mobile while scrolling vertically", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const slug of [
    "portfolio-mau-hoan-chinh",
    "portfolio-mau-public",
    "bai1portfolio",
    "mau-portfolio-01",
    "mau-portfolio-02",
    "mau-portfolio-03",
    "mau-portfolio-04",
    "mau-portfolio-05",
    "mau-portfolio-06",
  ]) {
    await page.goto(`/${slug}`, { waitUntil: "networkidle" });

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportHeight: document.documentElement.clientHeight,
      documentHeight: document.documentElement.scrollHeight,
    }));

    expect(
      dimensions.documentWidth,
      `/${slug} should not overflow horizontally`,
    ).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.documentHeight).toBeGreaterThan(
      dimensions.viewportHeight,
    );
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
  }
});
