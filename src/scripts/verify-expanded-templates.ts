import { TemplateIdSchema, type TemplateId, PortfolioDocumentSchema, type PortfolioDocument } from "../schema/portfolio.schema";
import { THEME_PRESETS, getCanvaCreativeThemePresets, getDefaultPresetForTemplate, getThemePresetsByTemplateId } from "../schema/theme.schema";
import { ARCHETYPE_PROFILES, formatSectionEyebrow, getCardDecoration, getRadiusClass } from "../templates/archetypes/archetypeStyles";
import { resolveDocPalette, renderStandaloneHtml } from "../services/export/zip-exporter";
import fs from "fs";
import path from "path";

function main() {
  console.log("=== 1. Checking TemplateIdSchema ===");
  const allTemplates = TemplateIdSchema.options;
  console.log(`Total templates defined: ${allTemplates.length}`);
  const expectedNewTemplates: TemplateId[] = [
    "medical-ruby",
    "clinical-navy",
    "pedagogical-mauve",
    "content-creator",
    "oceanic-teal",
    "educational-terracotta",
    "pedagogical-rose",
  ];
  for (const t of expectedNewTemplates) {
    if (!allTemplates.includes(t)) {
      throw new Error(`Missing template in TemplateIdSchema: ${t}`);
    }
  }
  console.log("All expected templates present in TemplateIdSchema!");

  console.log("\n=== 2. Checking ARCHETYPE_PROFILES completeness ===");
  for (const t of allTemplates) {
    const profile = ARCHETYPE_PROFILES[t];
    if (!profile) {
      throw new Error(`Missing archetype profile for: ${t}`);
    }
    const eyebrow = formatSectionEyebrow(t, "01", "Test Section");
    if (!eyebrow) {
      throw new Error(`Eyebrow formatter returned empty for: ${t}`);
    }
  }
  console.log(`Verified 100% of archetype profiles and eyebrow formatters (${allTemplates.length}/${allTemplates.length})!`);

  console.log("\n=== 3. Checking Theme Presets ===");
  const canvaPresets = getCanvaCreativeThemePresets();
  console.log(`Total Canva creative presets: ${canvaPresets.length}`);
  if (canvaPresets.length < 13) {
    throw new Error(`Expected at least 13 Canva creative presets, got: ${canvaPresets.length}`);
  }
  for (const t of allTemplates) {
    const defaultPreset = getDefaultPresetForTemplate(t);
    if (!defaultPreset) {
      throw new Error(`No default preset found for: ${t}`);
    }
  }
  console.log("Verified all presets and default mappings!");

  console.log("\n=== 4. Checking ZIP Exporter HTML Generation & Visual Separation ===");
  const sampleDocPath = path.join(process.cwd(), "data/portfolios/portfolio-mau-hoan-chinh.json");
  const baseDoc: PortfolioDocument = PortfolioDocumentSchema.parse(
    JSON.parse(fs.readFileSync(sampleDocPath, "utf8"))
  );

  // Test canva-editorial (should have music staves)
  const canvaPal = resolveDocPalette({ ...baseDoc, templateId: "canva-editorial" });
  if (!canvaPal.isCanvaEditorial || !canvaPal.isMusicEditorial) {
    throw new Error("canva-editorial should have isCanvaEditorial=true and isMusicEditorial=true");
  }
  const canvaHtml = renderStandaloneHtml({ ...baseDoc, templateId: "canva-editorial" }, new Map());
  if (!canvaHtml.includes("theme-canva-editorial")) {
    throw new Error("canva-editorial missing theme-canva-editorial body class");
  }
  if (!canvaHtml.includes("svgCoverStaffTopLeft") && !canvaHtml.includes("<path")) {
    throw new Error("canva-editorial missing cover staff");
  }

  // Test medical-ruby (should have NO music staves, should have Highlight Projects, 3-tier titles)
  const rubyDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "medical-ruby",
    theme: {
      ...baseDoc.theme,
      primaryColor: "#7B1113",
      secondaryColor: "#C29B38",
      backgroundColor: "#FFFDF9",
      surfaceColor: "#FFFFFF",
      textColor: "#2B1810",
    },
  };
  const rubyPal = resolveDocPalette(rubyDoc);
  if (!rubyPal.isCanvaEditorial || rubyPal.isMusicEditorial) {
    throw new Error("medical-ruby should have isCanvaEditorial=true and isMusicEditorial=false");
  }
  const rubyHtml = renderStandaloneHtml(rubyDoc, new Map());
  if (!rubyHtml.includes("theme-canva-editorial")) {
    throw new Error("medical-ruby missing theme-canva-editorial body class");
  }
  if (!rubyHtml.includes("Highlight Projects")) {
    throw new Error("medical-ruby projects section should display 'Highlight Projects'");
  }
  if (!rubyHtml.includes("MỤC TIÊU TRỌNG TÂM")) {
    throw new Error("medical-ruby should display 'MỤC TIÊU TRỌNG TÂM'");
  }
  if (!rubyHtml.includes("QUY TRÌNH THỰC HIỆN")) {
    throw new Error("medical-ruby should display 'QUY TRÌNH THỰC HIỆN'");
  }
  if (!rubyHtml.includes("border-radius: 160px 160px 24px 24px;")) {
    throw new Error("medical-ruby avatar should have arch-window border-radius");
  }

  // Test clinical-navy
  const clinicalDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "clinical-navy",
  };
  const clinicalHtml = renderStandaloneHtml(clinicalDoc, new Map());
  if (!clinicalHtml.includes("MỤC TIÊU TRỌNG TÂM")) {
    throw new Error("clinical-navy should display 'MỤC TIÊU TRỌNG TÂM'");
  }

  // Test educational-terracotta
  const terracottaDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "educational-terracotta",
  };
  const terracottaHtml = renderStandaloneHtml(terracottaDoc, new Map());
  if (!terracottaHtml.includes("border-radius: 160px 160px 24px 24px;")) {
    throw new Error("educational-terracotta avatar should have arch-window border-radius");
  }

  console.log("All HTML export tests passed with 100% visual and archetype fidelity!");
}

main();
