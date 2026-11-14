import { expect, test } from "@playwright/test";

test("section appearance colors reach non-contact blocks and their surfaces", async ({
  page,
}) => {
  await page.goto("/portfolio-mau-hoan-chinh", { waitUntil: "networkidle" });

  const colors = {
    heading: "#123456",
    text: "#234567",
    surface: "#345678",
  };
  await page.evaluate((sectionColors) => {
    document
      .querySelectorAll<HTMLElement>('[data-section-type]:not([data-section-type="contact"])')
      .forEach((section) => {
        section.dataset.sectionCustomHeadingColor = "true";
        section.dataset.sectionCustomTextColor = "true";
        section.dataset.sectionCustomSurface = "true";
        section.style.setProperty("--section-heading-color", sectionColors.heading);
        section.style.setProperty("--section-text-color", sectionColors.text);
        section.style.setProperty("--section-surface-color", sectionColors.surface);
      });
  }, colors);

  const sections = ["hero", "about", "skills", "experience", "education", "projects"];
  for (const sectionId of sections) {
    const section = page.locator(`#${sectionId}`);
    if (!(await section.count())) continue;
    await expect(section).toBeVisible();
    const heading = section.locator("h1, h2").first();
    await expect(heading).toHaveCSS("color", "rgb(18, 52, 86)");
    const text = section.locator("p, li").first();
    if (await text.count()) {
      await expect(text).toHaveCSS("color", "rgb(35, 69, 103)");
    }
  }

  const surfaces = [
    page.locator('#about [data-about-frame]').first(),
    page.locator("#skills .surface-block").first(),
    page.locator("#experience .surface-block").first(),
    page.locator("#education .surface-block").first(),
    page.locator("#projects article").first(),
  ];
  for (const surface of surfaces) {
    if (await surface.count()) {
      await expect(surface).toHaveCSS("background-color", "rgb(52, 86, 120)");
    }
  }
});
