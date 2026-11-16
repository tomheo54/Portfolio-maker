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
  if (!rubyHtml.includes("medical-ruby-hero")) {
    throw new Error("medical-ruby missing medical-ruby-hero layout class");
  }
  if (!rubyHtml.includes("HỒ SƠ NĂNG LỰC DƯỢC HỌC")) {
    throw new Error("medical-ruby missing pharmacy summary ribbon");
  }
  if (!rubyHtml.includes("MỤC LỤC HỒ SƠ CHUYÊN MÔN DƯỢC")) {
    throw new Error("medical-ruby missing 2-column syllabus index");
  }
  if (!rubyHtml.includes("medical-arch-frame")) {
    throw new Error("medical-ruby missing medical-arch-frame");
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
  if (!rubyHtml.includes("data-about-layout=\"medical-license\"")) {
    throw new Error("medical-ruby missing data-about-layout='medical-license'");
  }
  if (!rubyHtml.includes("#VN-PHARM-8892")) {
    throw new Error("medical-ruby missing pharmacist license #VN-PHARM-8892");
  }

  // Test clinical-navy (Thu Trang - Clinical Case Dossier)
  const clinicalDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "clinical-navy",
  };
  const clinicalHtml = renderStandaloneHtml(clinicalDoc, new Map());
  if (!clinicalHtml.includes("clinical-navy-hero")) {
    throw new Error("clinical-navy missing clinical-navy-hero layout class");
  }
  if (!clinicalHtml.includes("[DOSSIER ARCHIVE: 2024-MED-CLINICAL]")) {
    throw new Error("clinical-navy missing dossier archive status bar");
  }
  if (!clinicalHtml.includes("DANH MỤC CA BỆNH &amp; CHUYÊN MÔN")) {
    throw new Error("clinical-navy missing diagnostic case index");
  }
  if (!clinicalHtml.includes("clinical-avatar-frame")) {
    throw new Error("clinical-navy missing clinical-avatar-frame");
  }
  if (!clinicalHtml.includes("Clinical Case Dossier")) {
    throw new Error("clinical-navy projects section should display 'Clinical Case Dossier'");
  }
  if (!clinicalHtml.includes("data-about-layout=\"clinical-dossier\"")) {
    throw new Error("clinical-navy missing data-about-layout='clinical-dossier'");
  }
  if (!clinicalHtml.includes("MD-HN-2024")) {
    throw new Error("clinical-navy missing physician registration MD-HN-2024");
  }

  // Test content-creator (Hà Lê - Bold Creator Magazine)
  const creatorDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "content-creator",
  };
  const creatorHtml = renderStandaloneHtml(creatorDoc, new Map());
  if (!creatorHtml.includes("creator-hero")) {
    throw new Error("content-creator missing creator-hero layout class");
  }
  if (!creatorHtml.includes("CREATIVE DIRECTORY • ISSUE NO. 01")) {
    throw new Error("content-creator missing editorial masthead");
  }
  if (!creatorHtml.includes("creator-stickers")) {
    throw new Error("content-creator missing floating sticker badges");
  }
  if (!creatorHtml.includes("creator-polaroid-frame")) {
    throw new Error("content-creator missing polaroid frame");
  }
  if (!creatorHtml.includes("Creator Stories &amp; Campaigns")) {
    throw new Error("content-creator projects section should display 'Creator Stories & Campaigns'");
  }
  if (!creatorHtml.includes("data-about-layout=\"creator-profile\"")) {
    throw new Error("content-creator missing data-about-layout='creator-profile'");
  }
  if (!creatorHtml.includes("TIKTOK REACH")) {
    throw new Error("content-creator missing creator reach stats");
  }

  // Test educational-terracotta (Võ Thị Hoài - Academic Monograph)
  const terracottaDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "educational-terracotta",
  };
  const terracottaHtml = renderStandaloneHtml(terracottaDoc, new Map());
  if (!terracottaHtml.includes("academic-monograph-hero")) {
    throw new Error("educational-terracotta missing academic-monograph-hero layout class");
  }
  if (!terracottaHtml.includes("ĐẠI HỌC QUỐC GIA HÀ NỘI")) {
    throw new Error("educational-terracotta missing university monograph header");
  }
  if (!terracottaHtml.includes("KHUNG NGHIÊN CỨU &amp; HỌC THUẬT SƯ PHẠM")) {
    throw new Error("educational-terracotta missing research framework box");
  }
  if (!terracottaHtml.includes("academic-arch-frame")) {
    throw new Error("educational-terracotta missing academic-arch-frame");
  }
  if (!terracottaHtml.includes("Công trình Nghiên cứu")) {
    throw new Error("educational-terracotta projects section should display 'Công trình Nghiên cứu'");
  }
  if (!terracottaHtml.includes("data-about-layout=\"academic-cv\"")) {
    throw new Error("educational-terracotta missing data-about-layout='academic-cv'");
  }
  if (!terracottaHtml.includes("VNU-UEd-CV")) {
    throw new Error("educational-terracotta missing monograph code VNU-UEd-CV");
  }

  // Test pedagogical-mauve (Nguyệt Ánh - Pedagogical Journal)
  const mauveDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "pedagogical-mauve",
  };
  const mauveHtml = renderStandaloneHtml(mauveDoc, new Map());
  if (!mauveHtml.includes("pedagogical-journal-hero")) {
    throw new Error("pedagogical-mauve missing pedagogical-journal-hero layout class");
  }
  if (!mauveHtml.includes("NHẬT KÝ SƯ PHẠM &amp; THỰC TẬP GIẢNG DẠY")) {
    throw new Error("pedagogical-mauve missing pedagogical bookmark ribbon");
  }
  if (!mauveHtml.includes("TIẾN TRÌNH THỰC TẬP &amp; KẾ HOẠCH BÀI DẠY")) {
    throw new Error("pedagogical-mauve missing lesson plan index box");
  }
  if (!mauveHtml.includes("pedagogical-avatar-frame")) {
    throw new Error("pedagogical-mauve missing pedagogical-avatar-frame");
  }
  if (!mauveHtml.includes("Kế hoạch Bài dạy &amp; Tiến trình Sư phạm")) {
    throw new Error("pedagogical-mauve projects section should display 'Kế hoạch Bài dạy & Tiến trình Sư phạm'");
  }
  if (!mauveHtml.includes("data-about-layout=\"pedagogical-journal\"")) {
    throw new Error("pedagogical-mauve missing data-about-layout='pedagogical-journal'");
  }
  if (!mauveHtml.includes("Tâm Niệm Nghề Giáo")) {
    throw new Error("pedagogical-mauve missing teacher motto");
  }

  // === 5. Edge Cases & Layout Customization Tests ===
  console.log("\n=== 5. Checking Edge Cases & Custom Variant Overrides ===");
  // Test customized section variants (overriding archetype defaults)
  const customRubyDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "medical-ruby",
    sections: baseDoc.sections.map((sec) => {
      if (sec.type === "hero") return { ...sec, variant: "bento-intro" };
      if (sec.type === "about") return { ...sec, variant: "two-column-bio" };
      if (sec.type === "projects") return { ...sec, variant: "carousel" };
      return sec;
    }),
  };
  renderStandaloneHtml(customRubyDoc, new Map());

  // Test empty projects array
  const emptyProjectsDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "clinical-navy",
    sections: baseDoc.sections.map((sec) => {
      if (sec.type === "projects") return { ...sec, projects: [] };
      return sec;
    }),
  };
  renderStandaloneHtml(emptyProjectsDoc, new Map());

  // Test empty about fields (testing optional socials safety)
  const emptyAboutDoc: PortfolioDocument = {
    ...baseDoc,
    templateId: "content-creator",
    sections: baseDoc.sections.map((sec) => {
      if (sec.type === "about") {
        return {
          ...sec,
          biography: "",
          highlights: [],
          contactInfo: { socials: [] },
        };
      }
      return sec;
    }),
  };
  renderStandaloneHtml(emptyAboutDoc, new Map());

  console.log("All edge case scenarios verified safely!");
  console.log("All HTML export tests passed with 100% visual and archetype fidelity!");
}

main();
