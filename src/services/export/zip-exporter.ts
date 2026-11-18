import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type {
  AboutSection,
  ContactSection,
  ConclusionConfig,
  EducationSection,
  ExperienceSection,
  HeroSection,
  PortfolioDocument,
  PortfolioSection,
  ProjectItem,
  ProjectsSection,
  SkillsSection,
  TemplateId,
  VisualDecoration,
} from "@/schema/portfolio.schema";
import { getArchetypeDefaultVariants } from "@/templates/archetypes/archetypeStyles";
import {
  PORTFOLIO_SOURCE_FORMAT,
  PORTFOLIO_SOURCE_MANIFEST_FILENAME,
  PORTFOLIO_SOURCE_VERSION,
  type PortfolioSourceManifest,
} from "@/schema/portfolio-archive.schema";
import { getBackgroundPreset } from "@/data/background-presets";
import { sanitizeSlug } from "./portfolio-repository";
import { DEFAULT_CONCLUSION_CONFIG } from "@/templates/blocks/conclusion-defaults";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeCssColor(value?: string): string | undefined {
  const color = value?.trim();
  return color && /^#[\da-f]{3}(?:[\da-f]{3}|[\da-f]{5})?$/i.test(color)
    ? color
    : undefined;
}

function safeFontFamily(value?: string): string | undefined {
  const font = value?.trim();
  return font && /^[\w\s,'-]+$/.test(font) ? `"${font}"` : undefined;
}

function safeHref(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return "#";
}

function safeDocxHref(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return safeHref(trimmed);
  }
  return null;
}

function renderDocxLink(url: string | undefined, label?: string): string {
  const href = safeDocxHref(url);
  if (!href) return "";
  return `<a class="pill" style="margin:0;text-decoration:none;" href="${escapeHtml(
    href,
  )}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHtml(
    label || "Mở file DOCX",
  )}</a>`;
}

export interface CollectedAsset {
  originalUrl: string;
  bundleRelPath: string; // e.g. "./assets/images/1-image1.png"
  zipPath: string; // e.g. "assets/images/1-image1.png"
  buffer: Buffer;
}

const DATA_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

function resolvePublicFileBuffer(
  url: string,
): { buffer: Buffer; baseName: string } | null {
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return null;
  }

  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    // Keep original string if malformed percent encoding
  }

  const relativeUrl = decoded.replace(/^\/+/, "");
  if (!relativeUrl) return null;

  const publicDir = path.resolve(process.cwd(), "public");
  const candidate = path.resolve(publicDir, relativeUrl);
  const rel = path.relative(publicDir, candidate);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return {
      buffer: fs.readFileSync(candidate),
      baseName: path.basename(candidate) || "asset.png",
    };
  }
  return null;
}

function resolveDataImageBuffer(
  url: string,
): { buffer: Buffer; ext: string } | null {
  const match = url
    .trim()
    .match(/^data:(image\/[a-zA-Z0-9+.-]+)((?:;[^,]*)?),([\s\S]*)$/i);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const params = match[2] || "";
  const payload = match[3] || "";
  if (!payload) return null;

  const ext =
    DATA_MIME_TO_EXT[mime] ||
    mime
      .slice(mime.indexOf("/") + 1)
      .split("+")[0]
      .replace(/^x-/, "")
      .replace(/[^a-z0-9]/g, "") ||
    "img";
  const isBase64 = /;base64\b/i.test(params);

  let buffer: Buffer;
  if (isBase64) {
    buffer = Buffer.from(payload.replace(/\s+/g, ""), "base64");
  } else {
    let textPayload = payload;
    try {
      textPayload = decodeURIComponent(payload);
    } catch {
      // Use raw payload if not percent-encoded
    }
    buffer = Buffer.from(textPayload, "utf-8");
  }

  if (buffer.length === 0) return null;
  return { buffer, ext };
}

/**
 * Collects all local `public/` images (`/uploads/docx-media/`, `/uploads/ai-generated/`, `/presets/`)
 * and `data:image/...` URLs referenced in the portfolio and maps them into `./assets/images/`.
 */
export function collectAndMapAssets(
  doc: PortfolioDocument,
): Map<string, CollectedAsset> {
  const map = new Map<string, CollectedAsset>();
  let counter = 0;

  const register = (url: string | undefined, roleHint: string) => {
    if (!url || !url.trim() || map.has(url)) return;

    const publicAsset = resolvePublicFileBuffer(url);
    if (publicAsset) {
      counter += 1;
      const safeBase =
        publicAsset.baseName.replace(/[^a-zA-Z0-9._-]/g, "_") ||
        `${roleHint}.png`;
      const safeName = `${counter}-${safeBase}`;
      map.set(url, {
        originalUrl: url,
        bundleRelPath: `./assets/images/${safeName}`,
        zipPath: `assets/images/${safeName}`,
        buffer: publicAsset.buffer,
      });
      return;
    }

    const dataAsset = resolveDataImageBuffer(url);
    if (dataAsset) {
      counter += 1;
      const safeRole = roleHint.replace(/[^a-zA-Z0-9_-]/g, "-") || "image";
      const safeName = `${counter}-${safeRole}.${dataAsset.ext}`;
      map.set(url, {
        originalUrl: url,
        bundleRelPath: `./assets/images/${safeName}`,
        zipPath: `assets/images/${safeName}`,
        buffer: dataAsset.buffer,
      });
    }
  };

  register(doc.seo.ogImage, "og-image");

  // Unified Profile Owner portrait
  if (doc.profileOwner?.avatarUrl) {
    register(doc.profileOwner.avatarUrl, "owner-portrait");
  }

  // Custom background illustration
  if (doc.theme.backgroundIllustration?.customUrl) {
    register(doc.theme.backgroundIllustration.customUrl, "bg-illustration");
  }

  for (const sec of doc.sections) {
    if (sec.type === "hero") {
      register(sec.avatar.url, "avatar");
      for (const dec of sec.decorations) {
        register(dec.assetUrl, "decoration");
      }
    } else if (sec.type === "skills") {
      for (const cat of sec.categories) {
        for (const sk of cat.skills) {
          register(sk.iconUrl, "skill-icon");
        }
      }
    } else if (sec.type === "projects") {
      for (const proj of sec.projects) {
        for (const m of proj.media) {
          register(m.url, "project-media");
        }
      }
    }
  }

  return map;
}

function isDarkHexColor(hex: string): boolean {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ResolvedPalette {
  isCanvaEditorial: boolean;
  isMusicEditorial?: boolean;
  primary: string;
  secondary: string;
  bg: string;
  surface: string;
  text: string;
  frame: string;
  headingFont: string;
  bodyFont: string;
}

export const CANVA_ARCHETYPE_IDS = new Set<string>([
  "canva-editorial",
  "medical-ruby",
  "clinical-navy",
  "pedagogical-mauve",
  "content-creator",
  "oceanic-teal",
  "educational-terracotta",
  "pedagogical-rose",
  "warm-editorial",
  "creative-bold",
  "minimal-chic",
  "vibrant-student",
  "artistic-organic",
  "academic-presentation",
]);

export function resolveDocPalette(doc: PortfolioDocument): ResolvedPalette {
  const isCanvaEditorial = CANVA_ARCHETYPE_IDS.has(doc.templateId ?? "canva-editorial");
  const isMusicEditorial = doc.templateId === "canva-editorial";
  const { theme } = doc;

  const primary = theme.primaryColor || "#735340";
  const secondary = theme.secondaryColor || "#5D4037";
  const bg = theme.backgroundColor || "#FFF3E6";
  const surface = theme.surfaceColor || "#FFF8F0";
  const text = theme.textColor || "#3E2723";
  const headingFont = theme.headingFont || "Playfair Display";
  const bodyFont = theme.bodyFont || "Be Vietnam Pro";

  return {
    isCanvaEditorial,
    isMusicEditorial,
    primary,
    secondary,
    bg,
    surface,
    text,
    frame: primary,
    headingFont,
    bodyFont,
  };
}

const EXPORT_FONT_STACKS: Record<string, string> = {
  "Playfair Display": "'Playfair Display', Georgia, serif",
  "Be Vietnam Pro": "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
  Lora: "'Lora', Georgia, serif",
  "Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
  Merriweather: "'Merriweather', Georgia, serif",
  "Space Grotesk": "'Space Grotesk', sans-serif",
};

function exportFontStack(
  fontName: string | undefined,
  fallback: string,
): string {
  return (
    EXPORT_FONT_STACKS[fontName ?? ""] ??
    EXPORT_FONT_STACKS[fallback] ??
    EXPORT_FONT_STACKS["Be Vietnam Pro"]
  );
}

function applySectionTypography(
  html: string,
  section: PortfolioSection,
  defaultHeadingFont: string,
  defaultBodyFont: string,
): string {
  const headingFont = exportFontStack(section.headingFont, defaultHeadingFont);
  const bodyFont = exportFontStack(section.bodyFont, defaultBodyFont);
  const sectionOpen = html.match(/<section\b[^>]*>/i)?.[0];
  if (!sectionOpen) return html;

  const withType = sectionOpen.replace(
    "<section",
    `<section data-section-type="${section.type}"`,
  );
  const styleAttribute = withType.match(/\sstyle="([^"]*)"/i);
  const sectionStyle = [
    `--section-heading-font:${headingFont}`,
    `--section-body-font:${bodyFont}`,
    safeCssColor(section.headingColor) ? `--section-heading-color:${safeCssColor(section.headingColor)}` : "",
    safeCssColor(section.textColor) ? `--section-text-color:${safeCssColor(section.textColor)}` : "",
    safeCssColor(section.surfaceColor) ? `--section-surface-color:${safeCssColor(section.surfaceColor)}` : "",
    safeCssColor(section.backgroundColor) ? `background-color:${safeCssColor(section.backgroundColor)}` : "",
    safeCssColor(section.textColor) ? `color:${safeCssColor(section.textColor)}` : "",
  ].filter(Boolean).join(";") + ";";
  const styledOpen = styleAttribute
    ? withType.replace(
        styleAttribute[0],
        ` style="${styleAttribute[1]};${sectionStyle}"`,
      )
    : withType.replace(/<section\b/i, `<section style="${sectionStyle}"`);

  let result = html.replace(sectionOpen, styledOpen);
  if (section.tags && section.tags.length > 0) {
    const tagMarkup = `<div class="section-hashtags">${section.tags
      .map((tag) => {
        const normalizedTag = tag
          .trim()
          .replace(/^#+/, "")
          .replace(/\s+/g, "-");
        return normalizedTag
          ? `<span>#${escapeHtml(normalizedTag)}</span>`
          : "";
      })
      .filter(Boolean)
      .join("")}</div>`;
    const closingIndex = result.lastIndexOf("</section>");
    if (closingIndex !== -1 && tagMarkup) {
      result = `${result.slice(0, closingIndex)}${tagMarkup}${result.slice(
        closingIndex,
      )}`;
    }
  }
  return result;
}

export function renderStandaloneCss(doc: PortfolioDocument): string {
  const pal = resolveDocPalette(doc);
  const toc = {
    placement: doc.theme.tableOfContents?.placement ?? "floating",
    side: doc.theme.tableOfContents?.side ?? "left",
  };
  const navBg = isDarkHexColor(pal.bg)
    ? "rgba(15, 23, 42, 0.92)"
    : hexToRgba(pal.bg, 0.94);

  return `:root {
  --primary: ${pal.primary};
  --secondary: ${pal.secondary};
  --bg: ${pal.bg};
  --surface: ${pal.surface};
  --text: ${pal.text};
  --frame: ${pal.frame};
  --font-heading: ${exportFontStack(pal.headingFont, "Playfair Display")};
  --font-body: ${exportFontStack(pal.bodyFont, "Be Vietnam Pro")};
}
* { box-sizing: border-box; }
img { max-width: 100%; }
html {
  scroll-behavior: smooth;
  scrollbar-color: var(--primary) var(--bg);
  scrollbar-width: thin;
  overflow-x: hidden;
  max-width: 100%;
}
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb {
  background: var(--primary);
  border: 2px solid var(--bg);
  border-radius: 999px;
}
body {
  margin: 0;
  font-family: var(--font-body);
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
  max-width: 100%;
  background-image: linear-gradient(90deg, ${hexToRgba(pal.primary, 0.05)} 1px, transparent 1px), linear-gradient(180deg, ${hexToRgba(pal.primary, 0.05)} 1px, transparent 1px);
  background-size: 40px 40px;
}
h1, h2, h3, h4, .font-editorial {
  font-family: var(--font-heading);
}
[data-section-type] h1,
[data-section-type] h2,
[data-section-type] h3,
[data-section-type] h4,
[data-section-type] .font-editorial {
  font-family: var(--section-heading-font, var(--font-heading));
}
[data-section-type] p,
[data-section-type] li {
  font-family: var(--section-body-font, var(--font-body));
}
[data-section-type] h1,
[data-section-type] h2,
[data-section-type] h3,
[data-section-type] h4,
[data-section-type] h5,
[data-section-type] h6,
[data-section-type] .font-editorial {
  color: var(--section-heading-color, inherit) !important;
}
[data-section-type] p,
[data-section-type] li,
[data-section-type] a,
[data-section-type] span,
[data-section-type] label,
[data-section-type] small,
[data-section-type] blockquote {
  color: var(--section-text-color, inherit) !important;
}
[data-section-type] [data-about-frame],
[data-section-type] .surface-block,
[data-section-type] [data-project-card],
[data-section-type] article {
  background-color: var(--section-surface-color, var(--surface)) !important;
}
.section-hashtags {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.section-hashtags span {
  border: 1px solid var(--primary);
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--primary);
  background: var(--surface);
  font-size: 11px;
  font-weight: 600;
}
.container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.nav {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 40;
  width: max-content; max-width: calc(100vw - 32px);
  background: ${navBg};
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${hexToRgba(pal.primary, 0.18)};
  border-radius: 999px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}
.nav-inner {
  display: flex; align-items: center; justify-content: center;
  padding: 6px 14px; margin: 0 auto; gap: 8px;
}
.nav-inner > strong,
.btn-print { display: none !important; }
.nav-links {
  display: flex; gap: 4px; flex-wrap: nowrap; align-items: center;
  max-width: calc(100vw - 56px); overflow-x: auto; scrollbar-width: none;
}
.nav-links::-webkit-scrollbar { display: none; }
.nav-links a {
  text-decoration: none; color: var(--text); font-size: 12px; font-weight: 500;
  padding: 6px 12px; border-radius: 999px; opacity: 0.72; transition: all 0.2s ease;
  white-space: nowrap; flex: 0 0 auto;
}
.nav-links a:hover { opacity: 1; color: var(--primary); }
.nav-links a.active {
  color: var(--primary); opacity: 1; font-weight: 700;
  background: transparent;
  border-bottom: 2px solid var(--primary);
  border-radius: 0;
}
.nav[data-toc-style="pill"] .nav-links a.active {
  background: var(--primary); color: var(--bg, #fff); border-bottom: none; border-radius: 999px;
}
.top-nav-spacer { height: 60px; }
section { padding: 44px 0; position: relative; }
.editorial-rule { border-bottom: 1px solid ${hexToRgba(pal.primary, 0.32)}; }

/* CSS Motion & Scroll Reveal System */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes glow {
  0%, 100% {
    opacity: 0.55;
    filter: drop-shadow(0 0 12px rgba(169, 107, 84, 0.4));
  }
  50% {
    opacity: 0.95;
    filter: drop-shadow(0 0 24px rgba(169, 107, 84, 0.75));
  }
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0.25;
    transform: scale(0.75) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.15) rotate(180deg);
  }
}

@keyframes sparklePulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes tilt {
  0%, 100% {
    transform: rotate(-1.5deg);
  }
  50% {
    transform: rotate(1.5deg);
  }
}

.animate-float {
  animation: float 5s ease-in-out infinite;
}

.animate-glow {
  animation: glow 3s ease-in-out infinite;
}

.animate-sparkle {
  animation: sparkle 4s ease-in-out infinite;
}

.animate-tilt {
  animation: tilt 6s ease-in-out infinite;
}

.portfolio-export-root {
  position: relative;
  isolation: isolate;
  overflow: clip;
  min-height: 100vh;
}
.portfolio-export-root > .nav,
.portfolio-export-root > main {
  position: relative;
  z-index: 1;
}
.portfolio-export-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
.portfolio-export-background-art {
  position: absolute;
  display: block;
}
.portfolio-export-background-art--cover {
  inset: 0;
  width: 100%;
  height: 100%;
}
.portfolio-export-background-art--pattern-repeat {
  inset: 0;
  background-repeat: repeat;
  background-size: 360px auto;
}
.portfolio-export-background-art--top-right {
  top: 0;
  right: 0;
  width: 50%;
  max-width: 650px;
  aspect-ratio: 3 / 2;
}
.portfolio-export-background-art--bottom-left {
  bottom: 0;
  left: 0;
  width: 50%;
  max-width: 650px;
  aspect-ratio: 3 / 2;
}
.portfolio-export-background-art--center {
  top: 50%;
  left: 50%;
  width: 70%;
  max-width: 800px;
  height: 75%;
  transform: translate(-50%, -50%);
}
.portfolio-export-background-art--custom {
  object-fit: cover;
}
.portfolio-export-background-art--custom.portfolio-export-background-art--top-right,
.portfolio-export-background-art--custom.portfolio-export-background-art--bottom-left {
  height: auto;
  object-fit: contain;
}
.portfolio-export-background-art--custom.portfolio-export-background-art--center {
  max-width: 75%;
  max-height: 75%;
  width: auto;
  height: auto;
  object-fit: contain;
}
.portfolio-export-background-art--preset svg {
  display: block;
  width: 100%;
  height: 100%;
}
.portfolio-export-effects {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.portfolio-export-effects .effect-orb,
.portfolio-export-effects .effect-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(72px);
}
.portfolio-export-effects .effect-orb {
  width: min(36vw, 360px);
  aspect-ratio: 1;
  animation: float 6s ease-in-out infinite;
}
.portfolio-export-effects .effect-orb:nth-child(2) {
  top: 24%;
  right: -5%;
  animation-delay: 1.4s;
}
.portfolio-export-effects .effect-orb:nth-child(3) {
  bottom: 8%;
  left: 28%;
  animation-delay: 2.4s;
}
.portfolio-export-effects .effect-glow {
  width: min(42vw, 460px);
  aspect-ratio: 1;
  animation: glow 3.2s ease-in-out infinite alternate;
}
.portfolio-export-effects .effect-parallax-wash {
  position: absolute;
  inset: -12% -8% 30%;
  background:
    radial-gradient(ellipse at 30% 35%, ${hexToRgba(pal.primary, 0.22)}, transparent 65%),
    radial-gradient(ellipse at 75% 55%, ${hexToRgba(pal.secondary, 0.18)}, transparent 62%);
  filter: blur(48px);
}
.portfolio-export-effects .effect-sparkle {
  position: absolute;
  width: 18px;
  height: 18px;
  animation: sparkle 3.8s ease-in-out infinite;
}
.portfolio-export-root[data-effect-tilt="enabled"] main .surface-block:hover,
.portfolio-export-root[data-effect-tilt="enabled"] main .about-free-card:hover,
.portfolio-export-root[data-effect-tilt="enabled"] main article:hover {
  transform: perspective(1000px) rotateX(1.5deg) rotateY(-2deg) translateY(-3px);
}
.portfolio-export-root[data-effect-tilt="enabled"] main .surface-block,
.portfolio-export-root[data-effect-tilt="enabled"] main .about-free-card,
.portfolio-export-root[data-effect-tilt="enabled"] main article {
  transition: transform 0.28s ease, box-shadow 0.28s ease;
}
.portfolio-export-root[data-effect-glow="enabled"] main .surface-block,
.portfolio-export-root[data-effect-glow="enabled"] main .about-free-card,
.portfolio-export-root[data-effect-glow="enabled"] main article {
  box-shadow: 0 8px 26px -14px ${hexToRgba(pal.primary, 0.6)};
  transition: box-shadow 0.3s ease;
}
.portfolio-export-root[data-effect-glow="enabled"] main .surface-block:hover,
.portfolio-export-root[data-effect-glow="enabled"] main .about-free-card:hover,
.portfolio-export-root[data-effect-glow="enabled"] main article:hover {
  box-shadow: 0 12px 32px -10px ${hexToRgba(pal.primary, 0.75)};
}
.portfolio-export-root[data-effect-parallax="enabled"] .portfolio-export-effects {
  transform: translate3d(0, var(--portfolio-parallax-offset, 0px), 0);
}
.portfolio-export-root[data-reveal-variant="zoom-in"] .reveal-on-scroll { transform: scale(0.92); }
.portfolio-export-root[data-reveal-variant="zoom-in"] .reveal-on-scroll.is-revealed { transform: scale(1); }
.portfolio-export-root[data-reveal-variant="slide-left"] .reveal-on-scroll { transform: translateX(-32px); }
.portfolio-export-root[data-reveal-variant="slide-left"] .reveal-on-scroll.is-revealed { transform: translateX(0); }
.portfolio-export-root[data-reveal-variant="slide-right"] .reveal-on-scroll { transform: translateX(32px); }
.portfolio-export-root[data-reveal-variant="slide-right"] .reveal-on-scroll.is-revealed { transform: translateX(0); }
.portfolio-export-root[data-reveal-variant="none"] .reveal-on-scroll {
  opacity: 1; transform: none; transition: none;
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

.reveal-on-scroll {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.reveal-on-scroll.is-revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Hover Elevation & Transitions */
.hover-lift {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.12);
}

.project-media-item img {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.project-media-item:hover img {
  transform: scale(1.03);
}

.toc-pill {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toc-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.conclusion-pill-card {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.conclusion-pill-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.btn-primary, .btn-outline, .btn-print {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover, .btn-outline:hover, .btn-print:hover {
  transform: translateY(-1.5px);
}

/* Modern Glassmorphism & Depth Utilities */
.glass-panel {
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.glass-dock {
  background-color: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
}

/* Reduced motion accessibility */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .reveal-on-scroll {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  .hover-lift:hover {
    transform: none !important;
  }
  .portfolio-export-effects .effect-orb,
  .portfolio-export-effects .effect-glow,
  .portfolio-export-effects .effect-sparkle {
    animation: none !important;
    transform: none !important;
  }
  .portfolio-export-root[data-effect-tilt="enabled"] main .surface-block:hover,
  .portfolio-export-root[data-effect-tilt="enabled"] main .about-free-card:hover,
  .portfolio-export-root[data-effect-tilt="enabled"] main article:hover {
    transform: none !important;
  }
  .portfolio-export-root .portfolio-export-effects,
  .portfolio-export-root .portfolio-export-background {
    transform: none !important;
  }
}

/* Canva Slide 1 Cover Canvas */
.cover-canvas {
  position: relative; overflow: hidden; padding: 28px 16px 26px; margin-bottom: 18px;
}
.ornament-tl {
  position: absolute; top: -8px; left: -8px; width: 250px; height: 250px;
  opacity: 0.94; pointer-events: none;
}
.ornament-br {
  position: absolute; bottom: -8px; right: -8px; width: 255px; height: 226px;
  opacity: 0.94; pointer-events: none;
}
.cover-title-wrap {
  position: relative; z-index: 2; max-width: 760px; margin: 16px auto 0; text-align: center;
}
.cover-word-digital {
  position: absolute; left: 25%; top: 4%; z-index: 3;
  font-size: clamp(20px, 3vw, 34px); font-weight: 800; color: #1E120E;
}
.cover-word-year {
  position: absolute; right: 18%; bottom: 4%; z-index: 3;
  font-size: clamp(18px, 2.5vw, 28px); font-weight: 800; letter-spacing: 0.06em; color: #1E120E;
}
.cover-stars {
  display: flex; align-items: center; justify-content: center; gap: clamp(18px, 8vw, 72px); margin: 16px 0 18px;
}
.hero-grid { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 40px; align-items: center; position: relative; }
.about-hero-grid { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 36px; align-items: center; }
.about-wrap[data-about-layout="editorial-poster"] .about-hero-grid {
  grid-template-columns: 1.5fr 0.7fr; align-items: start;
}
.about-wrap[data-about-layout="editorial-poster"] .about-hero-grid > div:first-child {
  padding: 24px; border-left: 4px solid var(--primary); border-radius: 0 20px 20px 0;
  background: var(--surface);
}
.about-wrap[data-about-layout="profile-dashboard"] .about-hero-grid {
  grid-template-columns: 1.15fr 0.85fr; gap: 20px;
}
.about-wrap[data-about-layout="profile-dashboard"] .about-hero-grid > div {
  padding: 24px; border: 1px solid ${hexToRgba(pal.primary, 0.2)};
  border-radius: 24px; background: var(--surface);
}
.about-wrap[data-about-layout="spotlight"] .about-hero-grid {
  grid-template-columns: 1fr; max-width: 860px; margin: 0 auto; text-align: center;
}
.about-wrap[data-about-layout="spotlight"] .about-highlight-grid {
  text-align: left;
}
.hero-grid--centered { grid-template-columns: minmax(0, 1fr); }
.hero-copy-centered { text-align: center; }
.hero-copy-centered .hero-portfolio-line,
.hero-copy-centered .hero-eyebrow { margin-left: auto; margin-right: auto; }
.hero-copy-centered > p:not(.hero-eyebrow):not(.hero-portfolio-line) { margin-left: auto; margin-right: auto; }
.hero-copy-centered .hero-tags { text-align: center; }
.hero-copy-centered .hero-cta { justify-content: center; }
.hero-portfolio-line {
  margin: 0 0 10px; color: var(--primary); font-size: 12px; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
}
.hero-eyebrow {
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em;
  color: var(--primary); margin: 0 0 10px;
}
.avatar-frame {
  width: 100%; max-width: 340px; aspect-ratio: 3/4; object-fit: cover;
  border: 3px solid var(--frame); display: block; margin: 0 auto; background: var(--surface);
}
.avatar-arch { border-radius: 999px 999px 24px 24px; }
.avatar-circle { border-radius: 999px; aspect-ratio: 1/1; }
.avatar-rounded { border-radius: 26px; }
.avatar-blob { border-radius: 48% 52% 42% 58% / 44% 48% 52% 56%; }

.pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px;
  border-radius: 999px; font-size: 12px; font-weight: 600;
  background: var(--surface); border: 1px solid ${hexToRgba(pal.primary, 0.4)};
  color: var(--text); margin: 4px 6px 4px 0; text-decoration: none;
}
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; background: var(--primary); color: var(--bg);
  text-decoration: none; padding: 11px 22px; border-radius: 999px; font-weight: 600;
  font-size: 14px; border: 1px solid var(--primary); cursor: pointer; transition: all 0.2s ease;
}
.btn-primary:hover { background: var(--secondary); border-color: var(--secondary); }
.btn-outline {
  display: inline-flex; align-items: center; gap: 6px; background: transparent; color: var(--text);
  text-decoration: none; padding: 10px 20px; border-radius: 999px; font-weight: 600;
  font-size: 13px; border: 1.5px solid var(--primary); cursor: pointer; transition: all 0.2s ease;
}
.btn-outline:hover { background: var(--primary); color: var(--bg); }

/* Unboxed Editorial Sections on #FFF3E6 */
.section-heading {
  font-size: clamp(32px, 4.2vw, 48px); font-weight: 800; letter-spacing: -0.02em;
  margin: 0 0 18px; line-height: 1.12; color: var(--text);
}
.about-wrap { position: relative; overflow: hidden; padding-bottom: 16px; }
.about-ribbon {
  position: absolute; right: -8px; bottom: 16px; width: 120px; height: 320px;
  opacity: 0.78; pointer-events: none;
}
.about-columns {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px;
  margin-top: 28px; padding-right: 96px;
}
.about-free-grid-export {
  display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: 48px; gap: 16px; margin-top: 28px;
}
.about-default-card-grid-export {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px; margin-top: 28px;
}
.about-free-card {
  min-width: 0; overflow: auto; padding: 18px; border: 1px solid ${hexToRgba(pal.primary, 0.22)};
  border-radius: 16px; background: var(--surface);
  font-family: var(--about-card-body-font, var(--font-body));
}
.about-free-card h3, .about-free-card h4 {
  font-family: var(--about-card-heading-font, var(--font-heading));
}
.about-free-card[data-about-frame="soft"] {
  border-radius: 16px; box-shadow: 0 8px 24px -16px rgba(0,0,0,0.28);
}
.about-free-card[data-about-frame="glass"] {
  border-radius: 24px; background: color-mix(in srgb, var(--surface) 78%, transparent);
  backdrop-filter: blur(14px); box-shadow: 0 14px 32px -18px rgba(0,0,0,0.32);
}
.about-free-card[data-about-frame="outline"] {
  border: 2px solid var(--primary); border-radius: 18px; box-shadow: none;
}
.about-free-card[data-about-frame="editorial"] {
  border: 0; border-left: 4px solid var(--primary); border-radius: 0; box-shadow: none;
}
.about-free-card[data-about-frame="elevated"] {
  border-radius: 24px; box-shadow: 0 18px 38px -20px rgba(0,0,0,0.42);
}
.about-free-card[data-about-frame="dashed"] {
  border: 2px dashed var(--primary); border-radius: 18px; box-shadow: none;
}
.about-col h3 { font-size: 22px; margin: 0 0 12px; color: var(--text); }
.contact-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 14px; }
.contact-icon-badge {
  width: 28px; height: 28px; border-radius: 999px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary); color: var(--bg);
}

/* Medical Ruby Magazine (Mộc Anh) */
.medical-ruby-hero { padding: 20px 0 36px; }
.medical-ribbon { display: inline-flex; align-items: center; gap: 8px; background: var(--primary); color: #fff; padding: 6px 18px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 20px; border: 1.5px solid #C29B38; box-shadow: 0 4px 14px rgba(123,17,19,0.25); }
.medical-syllabus-box { border: 1.5px solid ${hexToRgba(pal.primary, 0.25)}; border-radius: 18px; padding: 18px; background: var(--surface); box-shadow: 0 6px 20px -6px rgba(123,17,19,0.12); margin-top: 20px; }
.medical-syllabus-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${hexToRgba(pal.primary, 0.18)}; padding-bottom: 10px; margin-bottom: 12px; }
.medical-pill { font-size: 10px; font-weight: 700; color: #854D0E; background: #FEF3C7; padding: 2px 8px; border-radius: 999px; border: 1px solid #FCD34D; }
.medical-syllabus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 12px; }
.medical-syllabus-item { padding: 8px 12px; border-radius: 8px; background: ${hexToRgba(pal.primary, 0.05)}; border: 1px solid ${hexToRgba(pal.primary, 0.12)}; }
.medical-arch-frame { position: relative; border-radius: 160px 160px 24px 24px; border: 4px solid var(--primary); padding: 4px; background: var(--surface); box-shadow: 0 0 0 2px #C29B38, 0 16px 36px -10px rgba(123,17,19,0.35); }
.medical-frame-badge { position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: #fff; border: 1.5px solid #C29B38; padding: 4px 14px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

/* Clinical Navy Dossier (Thu Trang) */
.clinical-navy-hero { padding: 20px 0 36px; }
.clinical-status-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid ${hexToRgba(pal.primary, 0.25)}; border-radius: 12px; padding: 8px 16px; background: #F1F5F9; font-family: monospace; font-size: 12px; margin-bottom: 24px; color: var(--text); }
.clinical-dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; background: #10B981; margin-right: 6px; }
.clinical-badge-pill { background: var(--primary); color: #fff; padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; }
.clinical-diagnostic-index { border: 1.5px solid ${hexToRgba(pal.primary, 0.2)}; border-radius: 12px; padding: 16px; background: var(--surface); margin-top: 20px; font-family: monospace; font-size: 12px; }
.clinical-diagnostic-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${hexToRgba(pal.primary, 0.12)}; padding-bottom: 8px; margin-bottom: 12px; font-weight: 700; color: var(--primary); }
.clinical-diagnostic-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
.clinical-diag-item { padding: 8px 10px; border-radius: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; }
.clinical-avatar-frame { border: 2px solid var(--primary); border-radius: 16px; padding: 10px; background: var(--surface); box-shadow: 0 10px 28px -8px rgba(26,18,100,0.25); }

/* Content Creator Magazine (Hà Lê) */
.creator-hero { padding: 20px 0 36px; }
.creator-masthead { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary); padding-bottom: 8px; font-size: 12px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: var(--primary); margin-bottom: 24px; }
.creator-stickers { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.creator-sticker-pill { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; border: 2px solid #000; font-size: 11px; font-weight: 900; color: #000; box-shadow: 2px 2px 0px #000; }
.sticker-yellow { background: #FDE047; transform: rotate(-2deg); }
.sticker-pink { background: #F472B6; transform: rotate(1.5deg); }
.sticker-blue { background: #38BDF8; transform: rotate(-1deg); }
.sticker-green { background: #4ADE80; transform: rotate(2deg); }
.creator-polaroid-frame { position: relative; border: 4px solid #000; border-radius: 24px; padding: 12px; background: #fff; box-shadow: 8px 8px 0px #000; transform: rotate(1.5deg); }
.creator-tape { position: absolute; top: -14px; left: 50%; transform: translateX(-50%) rotate(-2deg); width: 80px; height: 24px; background: rgba(253, 224, 71, 0.9); border: 1px solid rgba(0,0,0,0.3); }

/* Academic Monograph (Võ Thị Hoài) */
.academic-monograph-hero { padding: 20px 0 36px; }
.academic-ribbon { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary); padding-bottom: 10px; font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 24px; }
.academic-vol-tag { border: 1px solid var(--primary); padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; background: var(--bg); }
.academic-framework-box { border: 1.5px solid ${hexToRgba(pal.primary, 0.3)}; border-radius: 12px; padding: 16px; background: var(--surface); margin-top: 20px; }
.academic-arch-frame { position: relative; border-radius: 160px 160px 24px 24px; border: 3px solid var(--primary); padding: 4px; background: var(--surface); box-shadow: 0 10px 28px -6px rgba(155,48,45,0.25); }
.academic-frame-badge { position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: #fff; padding: 4px 14px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }

/* Pedagogical Journal (Nguyệt Ánh & Thùy Linh) */
.pedagogical-journal-hero { padding: 20px 0 36px; }
.pedagogical-ribbon { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${hexToRgba(pal.primary, 0.3)}; padding-bottom: 10px; font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 24px; }
.pedagogical-tag { background: ${hexToRgba(pal.primary, 0.1)}; color: var(--primary); padding: 3px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.pedagogical-index-box { border: 1.5px solid ${hexToRgba(pal.primary, 0.25)}; border-radius: 18px; padding: 16px; background: var(--surface); margin-top: 20px; }
.pedagogical-index-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 12px; }
.pedagogical-item { padding: 8px 10px; border-radius: 8px; background: ${hexToRgba(pal.primary, 0.06)}; border: 1px solid ${hexToRgba(pal.primary, 0.15)}; }
.pedagogical-avatar-frame { position: relative; border-radius: 24px; border: 2px solid ${hexToRgba(pal.primary, 0.4)}; padding: 6px; background: var(--surface); box-shadow: 0 8px 24px -6px ${hexToRgba(pal.primary, 0.2)}; }
.pedagogical-bookmark { position: absolute; top: -10px; right: 14px; background: var(--primary); color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.highlight-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--primary); margin: 0 0 2px;
}
.highlight-val { font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 12px; }
.about-highlight-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(88px, auto); gap: 12px; margin-top: 20px;
}
.about-highlight-card {
  min-width: 0; padding: 12px; border: 1px solid ${hexToRgba(pal.primary, 0.22)};
  border-radius: 12px; background: var(--surface);
}
.about-highlight-grid [data-highlight-width="1"] { grid-column: span 1; }
.about-highlight-grid [data-highlight-width="2"] { grid-column: span 2; }
.about-highlight-grid [data-highlight-width="3"] { grid-column: span 3; }
.about-highlight-grid [data-highlight-width="4"] { grid-column: span 4; }
.about-highlight-label {
  display: block; font-size: 10px; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.08em; opacity: 0.65;
}
.about-highlight-value {
  display: block; width: 100%; margin-top: 4px; overflow: hidden; white-space: nowrap;
  font-size: 18px; font-weight: 700; font-family: var(--font-heading);
}
.about-highlight-value__text { display: inline-block; white-space: nowrap; }
.about-highlight-value__text.is-overflowing {
  animation: aboutHighlightMarquee var(--about-marquee-duration) ease-in-out infinite alternate;
}
.about-highlight-value:hover .about-highlight-value__text.is-overflowing,
.about-highlight-value:focus-within .about-highlight-value__text.is-overflowing {
  animation-play-state: paused;
}
@keyframes aboutHighlightMarquee {
  from { transform: translateX(0); }
  to { transform: translateX(var(--about-marquee-distance)); }
}
@media (min-width: 640px) {
  .about-highlight-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 639px) {
  .about-highlight-grid [data-highlight-width="3"],
  .about-highlight-grid [data-highlight-width="4"] { grid-column: span 2 !important; }
}
@media (prefers-reduced-motion: reduce) {
  .about-highlight-value { overflow: visible; white-space: normal; }
  .about-highlight-value__text {
    max-width: 100%; white-space: normal; overflow-wrap: anywhere;
    animation: none !important; transform: none !important;
  }
}

/* Skills Unboxed Grid */
.skills-header-row {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
  gap: 18px; margin-bottom: 28px;
}
.skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 28px; }
.skill-col { border-top: 1px solid ${hexToRgba(pal.primary, 0.35)}; padding-top: 16px; }
.skill-col h3 { margin: 0 0 14px; font-size: 18px; color: var(--text); }
.skill-bar-track { height: 4px; border-radius: 999px; background: ${hexToRgba(pal.primary, 0.16)}; overflow: hidden; margin-top: 5px; }
.skill-bar-fill { height: 100%; border-radius: 999px; background: var(--primary); }

/* Editorial Education & Experience Entries (Left-border unboxed, no white SaaS box) */
.editorial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 28px; }
.editorial-entry { border-left: 2px solid var(--primary); padding-left: 20px; }
.period-pill {
  display: inline-block; border: 1px solid ${hexToRgba(pal.primary, 0.55)}; border-radius: 999px;
  padding: 2px 10px; font-size: 12px; font-weight: 600; color: var(--secondary);
}

/* Non-Canva fallback surface container (never forced white, never navy) */
.surface-block {
  background: var(--surface); border: 1px solid ${hexToRgba(pal.primary, 0.22)};
  border-radius: 24px; padding: 28px; margin-bottom: 22px;
}

/* Canva Slide 3: Project Header + Vinyl Sketches + 3-Col TOC */
.projects-cover-header {
  display: flex; align-items: center; justify-content: center; gap: 36px; text-align: center;
}
.projects-display-title {
  font-size: clamp(54px, 8vw, 94px); font-weight: 400; line-height: 0.98;
  letter-spacing: -0.02em; margin: 0; color: var(--text);
}
.vinyl-sketch { width: 104px; height: 104px; flex-shrink: 0; opacity: 0.85; }
.toc-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 26px 28px;
  margin-top: 38px; margin-bottom: 48px;
}
.toc-item {
  position: relative; display: flex; flex-direction: column; align-items: center; text-align: center;
}
.toc-num { font-size: 28px; font-weight: 400; color: var(--text); line-height: 1.1; }
.toc-pill {
  margin-top: 10px; width: 100%; max-width: 270px; border-radius: 999px;
  border: 1px solid var(--primary); padding: 9px 18px; font-size: 13px; font-weight: 500;
  color: var(--text); text-decoration: underline; text-decoration-color: ${hexToRgba(pal.text, 0.45)};
  text-underline-offset: 4px; transition: all 0.2s ease; display: block;
}
.toc-pill:hover { background: var(--primary); color: var(--bg); text-decoration-color: ${hexToRgba(pal.bg, 0.65)}; }
.toc-star { position: absolute; right: -22px; top: 24px; }

/* Slides 4 - 7: Assignment Chapters */
.chapter-article {
  border-top: 1px solid ${hexToRgba(pal.primary, 0.42)}; padding: 44px 0 38px;
  position: relative; scroll-margin-top: 72px;
}
.chapter-header { display: flex; gap: 22px; align-items: flex-start; margin-bottom: 26px; }
.chapter-num {
  font-size: clamp(54px, 6.2vw, 86px); font-weight: 400; line-height: 0.88;
  letter-spacing: -0.03em; color: var(--text); flex-shrink: 0;
}
.chapter-eyebrow {
  font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--secondary); margin: 2px 0 4px;
}
.chapter-title {
  font-size: clamp(22px, 2.6vw, 30px); font-weight: 700; text-transform: uppercase;
  line-height: 1.25; margin: 0; color: var(--text);
}
.chapter-label {
  font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text); margin: 0 0 8px;
}
.project-grid { display: grid; grid-template-columns: 1.02fr 0.98fr; gap: 32px; align-items: start; }
.project-grid[data-project-media-position="left"] .chapter-left-flex,
.project-grid[data-project-media-position="top"] .chapter-left-flex { order: 2; }
.project-grid[data-project-media-position="left"] .project-media-stack,
.project-grid[data-project-media-position="top"] .project-media-stack { order: 1; }
.project-grid[data-project-media-position="bottom"] .chapter-left-flex { order: 1; }
.project-grid[data-project-media-position="bottom"] .project-media-stack { order: 2; }
.project-grid[data-project-media-position="top"],
.project-grid[data-project-media-position="bottom"] { grid-template-columns: 1fr; }
.chapter-left-flex { display: flex; gap: 16px; align-items: flex-start; }
.chapter-stars-col { display: flex; flex-direction: column; gap: 14px; padding-top: 6px; flex-shrink: 0; }
.project-media-stack { display: flex; flex-direction: column; gap: 14px; position: relative; }
.project-media-item {
  position: relative; overflow: hidden; border: 3px solid var(--frame);
  background: var(--surface);
}
.canva-radius-even { border-radius: 40px; }
.canva-radius-odd { border-radius: 24px; }
.project-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; cursor: zoom-in; }
.media-badge {
  position: absolute; top: 12px; left: 12px; background: ${hexToRgba(pal.text, 0.84)}; color: var(--bg);
  font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px;
}
.metrics-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.metric-chip {
  padding: 5px 13px; border-radius: 999px; background: var(--surface);
  border: 1px solid ${hexToRgba(pal.primary, 0.45)}; font-size: 12px;
}
.takeaway-list { list-style: none; padding: 0; margin: 8px 0 18px; }
.takeaway-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; margin-bottom: 6px; }
.takeaway-dot {
  width: 6px; height: 6px; border-radius: 999px; background: var(--primary);
  margin-top: 8px; flex-shrink: 0;
}

/* Slides 8 - 10: Conclusion + Mocha Container + Thank You + Black Strip */
.conclusion-band { position: relative; padding: 36px 0 18px; overflow: hidden; }
.conclusion-spiral {
  position: absolute; left: -48px; top: -16px; width: 280px; height: 250px;
  opacity: 0.84; pointer-events: none;
}
.conclusion-heading-row {
  position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 36px;
}
.conclusion-heading {
  font-size: clamp(38px, 5vw, 60px); font-weight: 800; margin: 0; color: var(--text);
}
.conclusion-pills-grid {
  position: relative; z-index: 2; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px; max-width: 920px; margin: 34px auto 0;
}
.conclusion-pill-col { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.conclusion-pill-num { font-size: 18px; font-weight: 800; color: var(--text); }
.conclusion-pill-card {
  width: 100%; min-height: 68px; border-radius: 999px; background: var(--primary);
  color: var(--bg); padding: 12px 18px; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.4;
}
.mocha-box-wrap { position: relative; max-width: 880px; margin: 48px auto 0; }
.rota-sticker {
  position: absolute; left: -54px; top: -44px; width: 215px; height: 215px;
  z-index: 3; pointer-events: none;
}
.mocha-contact-box {
  position: relative; z-index: 2; background: var(--primary); color: var(--bg);
  border-radius: 54px; padding: 44px 48px 44px 188px;
}
.mocha-contact-box a { color: var(--bg); }
.thank-you-band { position: relative; overflow: hidden; padding: 72px 16px 76px; text-align: center; }
.halftone-left {
  position: absolute; left: -8px; top: 8px; bottom: 8px; height: 100%; width: 195px;
  opacity: 0.9; pointer-events: none;
}
.thankyou-burst {
  position: absolute; right: 0; top: 0; width: 290px; height: 230px;
  opacity: 0.95; pointer-events: none;
}
.thank-you-title {
  font-size: clamp(46px, 7vw, 86px); font-weight: 800; line-height: 1.05;
  margin: 0; color: var(--text); position: relative; z-index: 2;
}
.canva-footer-strip {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  background: #0B0908; color: rgba(255, 255, 255, 0.86); padding: 11px 28px;
  font-size: 11px; margin: 0 -24px;
}
.contact-box {
  background: var(--primary); color: var(--bg); border-radius: 36px; padding: 44px;
}
.contact-box a { color: var(--bg); }

/* Assignment Detail Modal */
.modal-backdrop {
  display: none; position: fixed; inset: 0; z-index: 60;
  background: rgba(18, 12, 10, 0.78); backdrop-filter: blur(6px);
  padding: 20px; align-items: center; justify-content: center;
}
.modal-backdrop.open { display: flex; }
.modal-panel {
  background: var(--surface); color: var(--text); max-width: 1040px; width: 100%;
  max-height: 90vh; overflow-y: auto; border-radius: 26px; padding: 24px 28px; position: relative;
  border: 1.5px solid ${hexToRgba(pal.primary, 0.25)}; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  transition: all 0.25s ease;
}
.modal-top-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border-bottom: 1px solid ${hexToRgba(pal.primary, 0.18)}; padding-bottom: 14px; margin-bottom: 16px;
}
.modal-nav-group { display: flex; align-items: center; gap: 8px; }
.modal-actions-group { display: flex; align-items: center; gap: 8px; }
.modal-counter-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 4px 12px; border-radius: 999px; background: ${hexToRgba(pal.primary, 0.12)}; color: var(--primary);
  border: 1px solid ${hexToRgba(pal.primary, 0.2)};
}
.modal-icon-btn {
  border: 1px solid ${hexToRgba(pal.primary, 0.3)}; border-radius: 999px;
  background: var(--surface); color: var(--text); width: 34px; height: 34px;
  font-size: 16px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.modal-icon-btn:hover { background: ${hexToRgba(pal.primary, 0.15)}; transform: scale(1.06); }
.modal-close {
  border: 1px solid ${hexToRgba(pal.primary, 0.3)}; border-radius: 999px;
  background: ${hexToRgba(pal.primary, 0.12)}; color: var(--primary); width: 34px; height: 34px; font-size: 20px; line-height: 1; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.modal-close:hover { background: var(--primary); color: var(--bg); transform: scale(1.06); }
.modal-panel.is-fullscreen {
  max-width: 100vw !important; width: 100vw !important; height: 100vh !important;
  max-height: 100vh !important; border-radius: 0 !important; inset: 0 !important;
  position: fixed !important; margin: 0 !important; border: none !important;
  z-index: 9999 !important;
}
.modal-edge-nav {
  position: fixed; top: 50%; transform: translateY(-50%); z-index: 65;
  width: 44px; height: 44px; border-radius: 999px;
  background: rgba(0, 0, 0, 0.65); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.25);
  font-size: 24px; font-weight: 300; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  transition: all 0.2s ease;
}
.modal-edge-nav:hover { background: rgba(0, 0, 0, 0.85); transform: translateY(-50%) scale(1.1); }
.modal-edge-prev { left: 16px; }
.modal-edge-next { right: 16px; }
.modal-backdrop.is-fullscreen .modal-edge-nav,
.modal-panel.is-fullscreen ~ .modal-edge-nav {
  display: none !important;
}
@media (max-width: 768px) {
  .modal-edge-nav { display: none !important; }
}

.modal-body-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
.modal-body-grid[data-detail-layout="compact"] { gap: 14px; }
.modal-body-grid[data-detail-layout="two-column"] { grid-template-columns: 5fr 7fr; }

.modal-media-box {
  position: relative; border-radius: 18px; overflow: hidden;
  border: 1px solid ${hexToRgba(pal.primary, 0.2)};
  background: ${hexToRgba(pal.primary, 0.04)}; display: flex; align-items: center; justify-content: center;
  min-height: 240px; max-height: 480px;
}
.modal-img {
  display: block; width: 100%; height: auto; max-height: 460px;
  object-fit: contain; cursor: zoom-in; padding: 6px;
}
.modal-media-badge {
  position: absolute; left: 10px; top: 10px; z-index: 2;
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  background: rgba(0,0,0,0.72); color: #fff; backdrop-filter: blur(4px);
}
.modal-zoom-btn {
  position: absolute; right: 10px; top: 10px; z-index: 2;
  width: 28px; height: 28px; border-radius: 999px;
  background: rgba(0,0,0,0.65); color: #fff; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.modal-zoom-btn:hover { background: rgba(0,0,0,0.85); }
.modal-img-arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
  width: 32px; height: 32px; border-radius: 999px;
  background: rgba(255,255,255,0.9); color: #1c1917; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.modal-img-arrow:hover { background: #FFFFFF; transform: translateY(-50%) scale(1.08); }
.modal-img-arrow.prev { left: 8px; }
.modal-img-arrow.next { right: 8px; }

.modal-thumb-strip {
  display: flex; gap: 8px; overflow-x: auto; padding: 6px 0; margin-top: 8px;
  scrollbar-width: thin;
}
.modal-thumb-btn {
  flex: 0 0 72px; height: 56px; border-radius: 8px; overflow: hidden;
  border: 2px solid transparent; cursor: pointer; padding: 0; background: transparent;
  opacity: 0.65; transition: all 0.2s ease;
}
.modal-thumb-btn:hover { opacity: 1; }
.modal-thumb-btn.active { border-color: var(--primary); opacity: 1; }
.modal-thumb-btn img { width: 100%; height: 100%; object-fit: cover; }

.modal-metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-top: 12px;
}
.modal-metric-chip {
  padding: 10px 12px; border-radius: 12px;
  border: 1px solid ${hexToRgba(pal.primary, 0.2)}; background: ${hexToRgba(pal.primary, 0.04)};
}
.modal-metric-chip small {
  display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7;
}
.modal-metric-chip strong {
  display: block; font-size: 15px; font-weight: 700; color: var(--primary); margin-top: 2px;
}

.brief-box {
  padding: 12px 16px; border-radius: 14px;
  background: ${hexToRgba(pal.primary, 0.06)}; border: 1px solid ${hexToRgba(pal.primary, 0.2)};
  font-size: 13.5px; line-height: 1.55; margin-bottom: 12px;
}
.brief-box strong { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.brief-box ol, .brief-box ul { margin: 6px 0 0; padding-left: 18px; }
.brief-box li { margin-bottom: 4px; font-size: 13px; }

/* Lightbox zoom overlay */
.modal-lightbox {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0, 0, 0, 0.94); backdrop-filter: blur(8px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px;
}
.lightbox-close {
  position: absolute; right: 20px; top: 20px; width: 40px; height: 40px; border-radius: 999px;
  background: rgba(255,255,255,0.15); color: #fff; border: none; font-size: 24px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
}
.lightbox-close:hover { background: rgba(255,255,255,0.3); }
.lightbox-img {
  max-width: 92vw; max-height: 80vh; object-fit: contain; border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.lightbox-caption {
  color: rgba(255, 255, 255, 0.85); font-size: 13px; margin-top: 12px; text-align: center;
}
.lightbox-nav {
  display: flex; align-items: center; gap: 16px; margin-top: 12px; color: #fff;
}
.lightbox-btn {
  width: 36px; height: 36px; border-radius: 999px;
  background: rgba(255,255,255,0.18); color: #fff; border: none; cursor: pointer;
  font-size: 20px; font-weight: bold; display: flex; align-items: center; justify-content: center;
}
.lightbox-btn:hover { background: rgba(255,255,255,0.32); }
.lightbox-counter { font-size: 13px; font-weight: 600; opacity: 0.9; }

/* Standalone Project Subpage Styles */
.project-subpage-header {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px 0; border-bottom: 1px solid ${hexToRgba(pal.primary, 0.25)}; margin-bottom: 24px;
}
.project-subpage-card {
  background: var(--surface); border: 1px solid ${hexToRgba(pal.primary, 0.25)};
  border-radius: 24px; padding: 28px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
.project-subpage-sections[data-detail-layout="two-column"] {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px;
}
.project-subpage-sections[data-detail-layout="two-column"] .project-subpage-card { margin-bottom: 0; }
.project-subpage-sections[data-detail-layout="two-column"] .project-subpage-card:last-child { grid-column: 1 / -1; }
.project-subpage-sections[data-detail-layout="compact"] { display: flex; flex-direction: column; gap: 12px; }
.project-subpage-sections[data-detail-layout="compact"] .project-subpage-card { margin-bottom: 0; padding: 18px; border-radius: 18px; }
.transition-cards-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; margin-top: 36px; padding-top: 24px;
  border-top: 1px solid ${hexToRgba(pal.primary, 0.2)};
}
.transition-card {
  display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 18px;
  background: var(--surface); border: 1px solid ${hexToRgba(pal.primary, 0.25)};
  text-decoration: none; color: inherit; transition: all 0.25s ease;
}
.transition-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.transition-card-icon {
  width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: ${hexToRgba(pal.primary, 0.12)}; color: var(--primary); font-size: 20px; font-weight: 700; flex-shrink: 0;
}
.conclusion-export { max-width: 1152px; margin: 0 auto; padding: 48px 24px; }
.conclusion-export__header { margin-bottom: 28px; }
.conclusion-export__eyebrow { color: var(--primary); font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
.conclusion-export__title { margin: 8px 0 0; font-size: clamp(30px, 5vw, 48px); line-height: 1.15; }
.conclusion-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; }
.conclusion-card { position: relative; grid-column: span var(--card-span, 4); padding: 24px; border: 1px solid; border-radius: 24px; break-inside: avoid; }
.conclusion-grid--compact { gap: 12px; }
.conclusion-grid--compact .conclusion-card { padding: 16px; border-radius: 16px; }
.conclusion-grid--masonry { display: block; columns: 2; column-gap: 20px; }
.conclusion-grid--masonry .conclusion-card { display: inline-block; width: 100%; margin: 0 0 20px; }
.conclusion-grid--editorial .conclusion-card { border: 0; border-top: 2px solid; border-radius: 0; box-shadow: none; }
.conclusion-grid--timeline .conclusion-card { margin-left: 12px; border-width: 0 0 0 2px; border-radius: 0; padding-left: 30px; box-shadow: none; }
.conclusion-grid--spotlight .conclusion-card:first-child { padding: 36px; }
.conclusion-card__number { margin: 0; font-size: 24px; font-weight: 800; }
.conclusion-timeline-number { position: absolute; top: 20px; left: -17px; display: grid; width: 32px; height: 32px; place-items: center; border: 2px solid currentColor; border-radius: 50%; background: var(--bg); font-size: 11px; font-weight: 800; }
.conclusion-closing-note { margin: 18px 0 0; padding-top: 14px; border-top: 1px solid; font-size: 12px; opacity: .8; }
.conclusion-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 32px; }
.conclusion-panel { border: 1px solid; border-radius: 22px; padding: 24px; background: var(--surface); }
.conclusion-panel h3 { margin: 0; color: var(--primary); }
@media (max-width: 760px) {
  .conclusion-export { padding: 36px 16px; }
  .conclusion-grid:not(.conclusion-grid--compact) { display: grid; grid-template-columns: 1fr; }
  .conclusion-grid:not(.conclusion-grid--compact) .conclusion-card { grid-column: 1 / -1 !important; }
  .conclusion-grid--masonry { columns: 1; }
  .conclusion-panels { grid-template-columns: 1fr; }
}

@media (max-width: 900px) {
  .hero-grid, .project-grid, .modal-body-grid, .about-hero-grid { grid-template-columns: 1fr; }
  .modal-body-grid[data-detail-layout="two-column"] { grid-template-columns: 1fr; }
  .project-subpage-sections[data-detail-layout="two-column"] { grid-template-columns: 1fr; }
  .project-subpage-sections[data-detail-layout="two-column"] .project-subpage-card:last-child { grid-column: auto; }
  .about-columns { grid-template-columns: 1fr; padding-right: 0; }
  .about-default-card-grid-export { grid-template-columns: 1fr; }
  .about-free-grid-export { grid-template-columns: 1fr; grid-auto-rows: auto; min-height: 0 !important; }
  .about-free-grid-export > [data-about-card] {
    grid-column: 1 / -1 !important; grid-row: auto !important; min-height: 0 !important;
  }
  .about-ribbon, .rota-sticker, .conclusion-spiral, .vinyl-sketch, .toc-star { display: none; }
  .toc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mocha-contact-box { padding: 32px 26px; border-radius: 36px; }
  .conclusion-pills-grid { grid-template-columns: 1fr; }
}
@media (max-width: 820px) {
  .toc-grid { grid-template-columns: 1fr; }
  .nav-inner { flex-direction: column; align-items: stretch; }
  .nav-inner > strong { text-align: center; }
  .nav-links { justify-content: center; }
  .ornament-tl, .ornament-br, .halftone-left, .thankyou-burst { opacity: 0.45; }
}
@media (max-width: 640px) {
  .container { padding-right: 16px; padding-left: 16px; }
  section { padding: 34px 0; }
  .cover-canvas { padding: 24px 8px 20px; }
  .cover-word-digital { left: 16%; top: 0; }
  .cover-word-year { right: 12%; bottom: 0; }
  .chapter-header { gap: 14px; }
  .chapter-title { overflow-wrap: anywhere; }
  .chapter-article { padding: 32px 0 28px; }
  .project-subpage-card { padding: 18px; border-radius: 18px; }
  .contact-box { padding: 28px 20px; border-radius: 24px; }
  .mocha-contact-box { padding: 24px 18px; border-radius: 24px; }
  .thank-you-band { padding: 56px 8px 60px; }
  .modal-backdrop { padding: 10px; }
  .modal-panel { padding: 18px; border-radius: 18px; max-height: 90dvh; }
  .modal-top-bar { flex-wrap: wrap; }
  .modal-img { max-height: 62dvh; }
}
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print, .nav, .modal-backdrop, .portfolio-export-effects { display: none !important; }
  .reveal-on-scroll { opacity: 1 !important; transform: none !important; }
  section { break-inside: avoid-page; page-break-inside: avoid; break-after: page; page-break-after: always; padding: 18px 0; }
  #projects { break-inside: auto; page-break-inside: auto; break-after: auto; page-break-after: auto; }
  #projects article { break-inside: avoid-page; page-break-inside: avoid; break-after: page; page-break-after: always; }
  main > section:last-child { break-after: auto; page-break-after: auto; }
}`;
}

const NAV_LABELS: Record<PortfolioSection["type"], string> = {
  hero: "Bìa mở đầu",
  about: "Giới thiệu",
  skills: "Kỹ năng",
  experience: "Kinh nghiệm",
  education: "Học vấn",
  projects: "Bài tập & Dự án tiêu biểu",
  contact: "Liên hệ",
};

function stripLeadingIndex(title: string): string {
  return title.replace(/^\d{1,2}\s*[.\-:]\s*/, "").trim() || title;
}

function svgFourPointStar(
  size: number,
  color: string = "var(--primary, #735340)",
  extraClass: string = "",
): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none"${
    extraClass ? ` class="${extraClass}"` : ""
  } aria-hidden="true"><path d="M32 2C34.5 21 43 29.5 62 32C43 34.5 34.5 43 32 62C29.5 43 21 34.5 2 32C21 29.5 29.5 21 32 2Z" fill="${color}" /></svg>`;
}

function svgCoverStaffTopLeft(
  stroke: string = "var(--text, #1C1412)",
  noteFill: string = "var(--text, #16100E)",
): string {
  const lines = [0, 12, 24, 36, 48]
    .map(
      (o) =>
        `<path d="M ${88 + o * 0.9} -10 C ${118 + o * 0.7} 135, ${78 + o * 0.5} 235, -10 ${245 + o * 0.75}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" />`,
    )
    .join("");
  return `<svg viewBox="0 0 360 360" fill="none" class="ornament-tl" aria-hidden="true">
    ${lines}
    <path d="M 165 -6 C 210 2, 260 10, 315 22" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" />
    <g transform="translate(115, 22) rotate(12)">
      <ellipse cx="0" cy="0" rx="13" ry="8.5" transform="rotate(-24)" fill="${noteFill}" />
      <path d="M 10 -4 L 10 56" stroke="${noteFill}" stroke-width="3.5" />
      <path d="M 10 18 L 42 50" stroke="${noteFill}" stroke-width="3.2" />
    </g>
    <g transform="translate(72, 128) rotate(-42)">
      <rect x="0" y="0" width="42" height="7" fill="${noteFill}" />
      <rect x="0" y="12" width="42" height="5" fill="${noteFill}" />
      <path d="M 3 4 L 3 50 M 39 4 L 39 50" stroke="${noteFill}" stroke-width="3.5" />
      <ellipse cx="-3" cy="51" rx="9" ry="6.5" transform="rotate(-20 -3 51)" fill="${noteFill}" />
      <ellipse cx="33" cy="51" rx="9" ry="6.5" transform="rotate(-20 33 51)" fill="${noteFill}" />
    </g>
    <g transform="translate(88, 205) rotate(16)">
      <ellipse cx="0" cy="0" rx="10" ry="7" transform="rotate(-22)" fill="${noteFill}" />
      <path d="M 8 -3 L 8 44" stroke="${noteFill}" stroke-width="3" />
    </g>
  </svg>`;
}

function svgCoverStaffBottomRight(
  stroke: string = "var(--text, #1C1412)",
  noteFill: string = "var(--text, #16100E)",
): string {
  const lines = [0, 12, 24, 36, 48]
    .map(
      (o) =>
        `<path d="M ${70 + o * 0.85} 325 C ${95 + o * 0.7} 210, ${205 + o * 0.45} 145, 365 ${78 + o * 0.9}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" />`,
    )
    .join("");
  return `<svg viewBox="0 0 360 320" fill="none" class="ornament-br" aria-hidden="true">
    ${lines}
    <path d="M 105 292 C 138 292, 152 268, 134 256 C 118 246, 102 262, 114 276 C 128 290, 178 274, 168 256 C 160 242, 140 250, 146 266" stroke="${noteFill}" stroke-width="4.2" stroke-linecap="round" fill="none" />
    <path d="M 192 252 C 216 244, 224 270, 200 282" stroke="${noteFill}" stroke-width="4" stroke-linecap="round" fill="none" />
    <circle cx="204" cy="288" r="3.5" fill="${noteFill}" />
    <circle cx="215" cy="281" r="3.5" fill="${noteFill}" />
    <ellipse cx="236" cy="222" rx="14" ry="10" transform="rotate(-32 236 222)" stroke="${noteFill}" stroke-width="3.5" fill="none" />
    <g transform="translate(178, 178) rotate(-32)">
      <ellipse cx="0" cy="36" rx="10" ry="7" fill="${noteFill}" />
      <path d="M 8 36 L 8 0 L 28 12" stroke="${noteFill}" stroke-width="3.5" fill="none" />
    </g>
    <g transform="translate(274, 118) rotate(-25)">
      <rect x="0" y="0" width="36" height="6" fill="${noteFill}" />
      <path d="M 3 3 L 3 40 M 33 3 L 33 40" stroke="${noteFill}" stroke-width="3.2" />
      <ellipse cx="-2" cy="40" rx="9" ry="6.5" fill="${noteFill}" />
      <ellipse cx="28" cy="40" rx="9" ry="6.5" fill="${noteFill}" />
    </g>
  </svg>`;
}

function svgVerticalMusicRibbon(
  stroke: string = "var(--text, #2A1C18)",
  noteFill: string = "var(--text, #2A1C18)",
): string {
  const lines = [0, 9, 18, 27, 36]
    .map(
      (o) =>
        `<path d="M ${42 + o} 0 C ${112 + o} 95, ${24 + o} 185, ${96 + o} 285 C ${134 + o} 340, ${88 + o} 388, ${56 + o} 420" stroke="${stroke}" stroke-width="1.2" stroke-opacity="0.72" />`,
    )
    .join("");
  const notes = [
    { x: 64, y: 78, rot: -18 },
    { x: 96, y: 158, rot: 14 },
    { x: 58, y: 235, rot: -12 },
    { x: 112, y: 318, rot: 22 },
  ]
    .map(
      (n) =>
        `<g transform="translate(${n.x}, ${n.y}) rotate(${n.rot})"><ellipse cx="0" cy="0" rx="6.5" ry="4.5" fill="${noteFill}" /><path d="M 5.5 0 L 5.5 -24 L 16 -18" stroke="${noteFill}" stroke-width="2.2" /></g>`,
    )
    .join("");
  return `<svg viewBox="0 0 180 420" fill="none" class="about-ribbon" aria-hidden="true">${lines}${notes}</svg>`;
}

function svgVinylSketch(
  stroke: string = "var(--text, #3E2723)",
  strokeSubtle: string = "var(--secondary, #5D4037)",
  extraClass: string = "vinyl-sketch",
): string {
  return `<svg viewBox="0 0 160 160" fill="none" class="${extraClass}" aria-hidden="true">
    <circle cx="80" cy="80" r="74" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="110 14 70 10" />
    <circle cx="80" cy="80" r="68" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="85 20 55 18" />
    <circle cx="80" cy="80" r="62" stroke="${strokeSubtle}" stroke-width="1" stroke-dasharray="55 24 90 12" />
    <circle cx="80" cy="80" r="55" stroke="${stroke}" stroke-width="1.3" stroke-dasharray="120 18 40 22" />
    <circle cx="80" cy="80" r="48" stroke="${strokeSubtle}" stroke-width="0.9" stroke-dasharray="45 15 65 20" />
    <circle cx="80" cy="80" r="41" stroke="${stroke}" stroke-width="1.1" stroke-dasharray="70 28 38 14" />
    <circle cx="80" cy="80" r="34" stroke="${strokeSubtle}" stroke-width="0.9" stroke-dasharray="38 12 52 18" />
    <circle cx="80" cy="80" r="24" stroke="${stroke}" stroke-width="1.4" />
    <circle cx="80" cy="80" r="17" stroke="${strokeSubtle}" stroke-width="0.8" stroke-dasharray="24 8" />
    <circle cx="80" cy="80" r="4.5" stroke="${stroke}" stroke-width="1.3" />
  </svg>`;
}

function svgSpiralMusicStaff(
  stroke: string = "var(--text, #2E1D18)",
  noteFill: string = "var(--text, #2E1D18)",
): string {
  const pts = [
    { x: 56, y: 40 },
    { x: 118, y: 18 },
    { x: 204, y: 24 },
    { x: 274, y: 74 },
    { x: 288, y: 164 },
    { x: 244, y: 238 },
    { x: 146, y: 256 },
    { x: 88, y: 204 },
    { x: 110, y: 112 },
  ]
    .map(
      (pt) =>
        `<g transform="translate(${pt.x}, ${pt.y})"><circle cx="0" cy="0" r="4" fill="${noteFill}" /><path d="M 3.5 0 L 3.5 -16 L 10 -12" stroke="${noteFill}" stroke-width="1.6" /></g>`,
    )
    .join("");
  return `<svg viewBox="0 0 360 320" fill="none" class="conclusion-spiral" aria-hidden="true">
    <path d="M 22 68 C 72 8, 224 4, 272 86 C 314 156, 266 254, 186 258 C 118 262, 74 210, 82 148 C 90 98, 138 74, 182 88 C 218 100, 232 142, 212 174 C 194 202, 152 204, 136 178 C 122 156, 136 128, 160 128 C 178 128, 188 144, 178 160 C 170 170, 156 168, 154 156" stroke="${stroke}" stroke-width="1.5" stroke-opacity="0.8" />
    <path d="M 14 82 C 68 18, 234 16, 284 98 C 328 172, 278 270, 190 274 C 112 278, 60 220, 70 148 C 80 88, 138 62, 190 78 C 232 92, 248 144, 224 182 C 202 216, 150 218, 128 186" stroke="${stroke}" stroke-width="1.1" stroke-opacity="0.65" />
    <path d="M 32 54 C 82 -2, 216 -4, 262 74 C 302 140, 256 238, 182 242 C 124 244, 88 198, 96 146" stroke="${stroke}" stroke-width="1" stroke-opacity="0.55" />
    ${pts}
  </svg>`;
}

function svgRotaSheetSticker(
  paperBg: string = "var(--surface, #FFFDF8)",
  stroke: string = "var(--text, #2E1D18)",
  noteFill: string = "var(--text, #2E1D18)",
): string {
  const staves = [46, 82, 118, 154]
    .map((topY, bIdx) => {
      const lines = [0, 4, 8, 12, 16]
        .map(
          (dy) =>
            `<line x1="14" y1="${topY + dy}" x2="134" y2="${topY + dy}" stroke="${stroke}" stroke-width="0.9" stroke-opacity="0.7" />`,
        )
        .join("");
      const dots = [28, 52, 78, 104, 120]
        .map((nx, nIdx) => {
          const cy = topY + ((nIdx * 3 + bIdx * 2) % 14);
          return `<circle cx="${nx}" cy="${cy}" r="2.2" fill="${noteFill}" /><line x1="${nx + 2}" y1="${cy}" x2="${nx + 2}" y2="${cy - 10}" stroke="${noteFill}" stroke-width="1.1" />`;
        })
        .join("");
      return lines + dots;
    })
    .join("");

  return `<svg viewBox="0 0 260 260" fill="none" class="rota-sticker" aria-hidden="true">
    <g transform="translate(18, 38) rotate(-12)">
      <rect x="0" y="0" width="148" height="190" rx="3" fill="${paperBg}" stroke="${stroke}" stroke-width="1.8" />
      <text x="74" y="30" text-anchor="middle" fill="${stroke}" style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-style:italic;font-weight:700;">~ Rota ~</text>
      ${staves}
    </g>
    <g transform="translate(175, 22)">
      <circle cx="8" cy="36" r="4" fill="${noteFill}" />
      <path d="M 11.5 36 L 11.5 14 L 24 10 L 24 32" stroke="${noteFill}" stroke-width="2.2" />
      <circle cx="21" cy="32" r="4" fill="${noteFill}" />
      <circle cx="46" cy="24" r="3.8" fill="${noteFill}" />
      <path d="M 49.5 24 L 49.5 4 L 62 0 L 62 20" stroke="${noteFill}" stroke-width="2.2" />
      <circle cx="59" cy="20" r="3.8" fill="${noteFill}" />
      <circle cx="28" cy="68" r="4.5" fill="#C93B2B" />
      <path d="M 32 68 L 32 45 L 42 50" stroke="#C93B2B" stroke-width="2.3" />
      <circle cx="46" cy="84" r="3.5" fill="${noteFill}" />
      <path d="M 49 84 L 49 66 L 58 70" stroke="${noteFill}" stroke-width="1.8" />
    </g>
  </svg>`;
}

function svgHalftoneVinylLeft(
  circleFill: string = "var(--text, #1C1613)",
  stroke: string = "var(--bg, #FFF3E6)",
): string {
  return `<svg viewBox="0 0 260 440" fill="none" class="halftone-left" aria-hidden="true">
    <defs>
      <pattern id="canva-halftone-left" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="2.1" fill="${circleFill}" />
      </pattern>
    </defs>
    <circle cx="20" cy="220" r="212" fill="url(#canva-halftone-left)" opacity="0.88" />
    <circle cx="20" cy="220" r="145" stroke="${stroke}" stroke-width="3" stroke-opacity="0.45" />
    <circle cx="20" cy="220" r="68" fill="${stroke}" fill-opacity="0.7" />
    <circle cx="20" cy="220" r="56" fill="url(#canva-halftone-left)" opacity="0.35" />
  </svg>`;
}

function svgThankYouVinylBurst(
  vinylFill: string = "var(--surface, #EAE4DB)",
  vinylStroke: string = "var(--text, #1E1815)",
  burstFill: string = "#DFB634",
): string {
  return `<svg viewBox="0 0 360 280" fill="none" class="thankyou-burst" aria-hidden="true">
    <defs>
      <pattern id="canva-halftone-right" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="1.7" fill="${vinylStroke}" />
      </pattern>
    </defs>
    <circle cx="152" cy="116" r="102" fill="${vinylFill}" />
    <circle cx="270" cy="100" r="100" fill="${vinylFill}" />
    <circle cx="152" cy="116" r="88" fill="url(#canva-halftone-right)" />
    <circle cx="152" cy="116" r="32" fill="${vinylFill}" />
    <circle cx="152" cy="116" r="6" fill="${vinylStroke}" />
    <circle cx="270" cy="100" r="88" fill="url(#canva-halftone-right)" />
    <circle cx="270" cy="100" r="32" fill="${vinylFill}" />
    <circle cx="270" cy="100" r="6" fill="${vinylStroke}" />
    <polygon points="214,34 226,105 288,82 246,138 308,214 234,174 206,246 196,174 128,194 178,136 144,78 202,110" fill="${burstFill}" />
  </svg>`;
}

function svgContactBadgeIcon(kind: "mail" | "phone" | "pin" | "globe" | "link"): string {
  if (kind === "mail") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
  }
  if (kind === "phone") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  }
  if (kind === "pin") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  }
  if (kind === "globe") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function safeContactHref(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const normalized = /^(https?:\/\/|mailto:|tel:)/i.test(trimmed)
    ? trimmed
    : /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? ""
      : `https://${trimmed}`;
  if (!normalized) return undefined;
  const safe = safeHref(normalized);
  return safe === "#" ? undefined : safe;
}

function renderAvatarClass(
  frameStyle: HeroSection["avatar"]["frameStyle"],
): string {
  switch (frameStyle) {
    case "circle":
      return "avatar-frame avatar-circle";
    case "cutout-blob":
      return "avatar-frame avatar-blob";
    case "rounded-rect":
    case "polaroid":
    case "none":
      return "avatar-frame avatar-rounded";
    default:
      return "avatar-frame avatar-arch";
  }
}

function renderDecorationsHtml(
  decorations: VisualDecoration[] | undefined,
  primaryColor = "#059669",
  secondaryColor = "#0F172A",
): string {
  if (!decorations || decorations.length === 0) return "";
  return decorations
    .map((dec) => {
      const top = dec.position.top ? `top:${dec.position.top};` : "";
      const left = dec.position.left ? `left:${dec.position.left};` : "";
      const right = dec.position.right ? `right:${dec.position.right};` : "";
      const bottom = dec.position.bottom ? `bottom:${dec.position.bottom};` : "";
      const rot = dec.position.rotate ? `transform:rotate(${dec.position.rotate}deg);` : "";
      const z = dec.position.zIndex ? `z-index:${dec.position.zIndex};` : "z-index:2;";
      const style = `position:absolute;${top}${left}${right}${bottom}${rot}${z}`;

      if (dec.type === "floating-tag" || dec.type === "badge") {
        return `<div class="hero-floating-badge" style="${style}display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid ${hexToRgba(primaryColor, 0.35)};background:rgba(255,255,255,0.92);padding:6px 14px;font-size:12px;font-weight:600;letter-spacing:0.02em;color:${secondaryColor};box-shadow:0 4px 14px rgba(0,0,0,0.06);backdrop-filter:blur(6px);white-space:nowrap;">
          <svg style="width:14px;height:14px;color:${primaryColor};fill:currentColor;" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
          <span>${escapeHtml(dec.label || "Portfolio Highlight")}</span>
        </div>`;
      }
      return "";
    })
    .join("");
}

function renderHeroHtml(
  hero: HeroSection,
  resolveSrc: (url: string) => string,
  isCanvaEditorial: boolean,
  primaryColor = "#059669",
  secondaryColor = "#0F172A",
  isMusicEditorial = false,
  templateId = "canva-editorial",
): string {
  const showAvatar = hero.showAvatar !== false && Boolean(hero.avatar.url);
  const showPortfolioLabel = hero.showPortfolioLabel !== false;
  const portfolioTitle =
    hero.portfolioLabel?.trim().replace(/^digital\s+/i, "") || "Portfolio";
  const portfolioDisplayLabel = `Digital ${portfolioTitle}`;
  const hasHeadline = Boolean(hero.headline?.trim());
  const headlineIsPortfolio = hasHeadline && /portfolio/i.test(hero.headline);
  const stickerTags = hero.decorations
    .filter((d) => d.assetUrl)
    .map(
      (d) =>
        `<img src="${escapeHtml(resolveSrc(d.assetUrl!))}" alt="${escapeHtml(
          d.label || "Decoration",
        )}" style="width:44px; height:44px; object-fit:contain;" />`,
    )
    .join("");

  const defaultVariants = getArchetypeDefaultVariants(templateId as TemplateId);
  const activeHeroVariant = hero.variant || defaultVariants.hero;

  const isMedicalRuby = activeHeroVariant === "medical-arch";
  const isClinicalNavy = activeHeroVariant === "clinical-dossier";
  const isContentCreator = activeHeroVariant === "creator-cover";
  const isEducationalTerracotta = activeHeroVariant === "academic-monograph";
  const isPedagogicalJournal = activeHeroVariant === "pedagogical-journal";

  const t = (key: string, fallback: string) => {
    const val = hero.customTexts?.[key];
    return val !== undefined && val !== "" ? escapeHtml(val) : fallback;
  };

  if (isMedicalRuby) {
    return `<section id="hero" class="reveal-on-scroll">
      <div class="medical-ruby-hero">
        <div class="medical-ribbon">
          <span>🏆 ${t("hero_med_badge", "HỒ SƠ NĂNG LỰC DƯỢC HỌC • CHUẨN GMP/GSP • CLINICAL PHARMACY")}</span>
        </div>
        <div class="hero-grid" style="align-items:center;">
          <div>
            <p class="hero-eyebrow" style="color:var(--secondary);font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">${t("hero_med_eyebrow", "DƯỢC SĨ ĐẠI HỌC • NGHIÊN CỨU &amp; BÀO CHẾ")}</p>
            <h1 class="font-editorial" style="font-size: clamp(32px, 5vw, 56px); font-weight: 700; line-height: 1.15; margin: 12px 0; color: var(--text);">${escapeHtml(
              hero.fullName,
            )}</h1>
            <p style="font-size: 18px; font-weight: 600; font-style: italic; color: var(--primary); margin-bottom: 16px;">${escapeHtml(
              hero.roleTitle,
            )}</p>
            <p style="font-size: 15px; line-height: 1.7; opacity: 0.9; margin-bottom: 24px; max-width: 540px;">${escapeHtml(
              hero.shortBio,
            )}</p>

            <div class="medical-syllabus-box">
              <div class="medical-syllabus-header">
                <span style="font-weight:700;color:var(--primary);text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">📖 ${t("hero_med_syllabus_title", "MỤC LỤC HỒ SƠ CHUYÊN MÔN DƯỢC")}</span>
                <span class="medical-pill">${t("hero_med_syllabus_badge", "SYLLABUS 2024")}</span>
              </div>
              <div class="medical-syllabus-grid">
                <div class="medical-syllabus-item"><strong>01.</strong> ${t("hero_med_item_1", "Lý lịch Dược sĩ &amp; Y đức")}</div>
                <div class="medical-syllabus-item"><strong>02.</strong> ${t("hero_med_item_2", "Chuyên môn Lâm sàng &amp; Bào chế")}</div>
                <div class="medical-syllabus-item"><strong>03.</strong> ${t("hero_med_item_3", "Đề tài &amp; Dự án trọng điểm")}</div>
                <div class="medical-syllabus-item"><strong>04.</strong> ${t("hero_med_item_4", "Chứng chỉ &amp; Tiêu chuẩn GMP")}</div>
              </div>
            </div>

            <div class="hero-cta" style="margin-top:24px;">
              ${hero.ctaButtons
                .map(
                  (btn) =>
                    `<a href="${escapeHtml(
                      btn.href,
                    )}" class="btn btn-primary" style="background:var(--primary);color:#fff;border-radius:999px;padding:12px 28px;font-weight:600;box-shadow:0 4px 14px rgba(123,17,19,0.3);">${escapeHtml(
                      btn.label,
                    )}</a>`,
                )
                .join("")}
            </div>
          </div>

          <div style="display:flex;justify-content:center;">
            ${
              showAvatar
                ? `
            <div class="medical-arch-frame">
              <img src="${escapeHtml(
                resolveSrc(hero.avatar.url),
              )}" alt="${escapeHtml(
                hero.fullName,
              )}" style="width:100%;max-width:320px;height:420px;object-fit:cover;border-radius:156px 156px 20px 20px;" />
              <div class="medical-frame-badge">${t("hero_med_avatar_badge", "TIÊU CHUẨN GMP/GSP • BỘ Y TẾ")}</div>
            </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isClinicalNavy) {
    return `<section id="hero" class="reveal-on-scroll">
      <div class="clinical-navy-hero">
        <div class="clinical-status-bar">
          <span style="font-weight:700;"><span class="clinical-dot"></span> ${t("hero_clin_badge", "[DOSSIER ARCHIVE: 2024-MED-CLINICAL]")}</span>
          <span style="opacity:0.8;">${t("hero_clin_sub", "BỆNH VIỆN BẠCH MAI • TRƯỜNG ĐH Y HÀ NỘI")}</span>
          <span class="clinical-badge-pill">${t("hero_clin_status", "STATUS: ACTIVE RESIDENT")}</span>
        </div>
        <div class="hero-grid" style="align-items:center;">
          <div>
            <p style="font-family:monospace;font-size:12px;font-weight:700;color:var(--primary);letter-spacing:0.15em;text-transform:uppercase;">${t("hero_clin_eyebrow", "[CLINICAL CASE DOSSIER // RESIDENT PROFILE]")}</p>
            <h1 style="font-size: clamp(32px, 5vw, 56px); font-weight: 800; line-height: 1.15; margin: 12px 0; color: var(--text);">${escapeHtml(
              hero.fullName,
            )}</h1>
            <p style="font-size: 16px; font-weight: 600; color: var(--primary); margin-bottom: 16px;">${escapeHtml(
              hero.roleTitle,
            )}</p>
            <p style="font-size: 15px; line-height: 1.7; opacity: 0.9; margin-bottom: 24px; max-width: 540px;">${escapeHtml(
              hero.shortBio,
            )}</p>

            <div class="clinical-diagnostic-index">
              <div class="clinical-diagnostic-header">
                <span>🩺 ${t("hero_clin_diag_title", "DANH MỤC CA BỆNH &amp; CHUYÊN MÔN")}</span>
                <span style="font-size:10px;opacity:0.7;">${t("hero_clin_diag_tag", "ICD-10 CLINICAL ARCHIVE")}</span>
              </div>
              <div class="clinical-diagnostic-grid">
                <div class="clinical-diag-item"><strong style="color:var(--primary);">[CASE 01]</strong> ${t("hero_clin_case_1", "Cấp cứu &amp; Can thiệp hồi sức")}</div>
                <div class="clinical-diag-item"><strong style="color:var(--primary);">[CASE 02]</strong> ${t("hero_clin_case_2", "Phác đồ điều trị nội khoa")}</div>
                <div class="clinical-diag-item"><strong style="color:var(--primary);">[CASE 03]</strong> ${t("hero_clin_case_3", "Chẩn đoán cận lâm sàng")}</div>
                <div class="clinical-diag-item"><strong style="color:var(--primary);">[CASE 04]</strong> ${t("hero_clin_case_4", "Y học chứng cứ &amp; Báo cáo")}</div>
              </div>
            </div>

            <div class="hero-cta" style="margin-top:24px;">
              ${hero.ctaButtons
                .map(
                  (btn) =>
                    `<a href="${escapeHtml(
                      btn.href,
                    )}" class="btn btn-primary" style="background:var(--primary);color:#fff;border-radius:8px;padding:12px 28px;font-weight:700;font-family:monospace;">${escapeHtml(
                      btn.label,
                    )}</a>`,
                )
                .join("")}
            </div>
          </div>

          <div style="display:flex;justify-content:center;">
            ${
              showAvatar
                ? `
            <div class="clinical-avatar-frame">
              <div style="font-family:monospace;font-size:9px;font-weight:700;color:var(--primary);margin-bottom:6px;">${t("hero_clin_img_tag", "[CASE_IMAGE // HIGH_RES]")}</div>
              <img src="${escapeHtml(
                resolveSrc(hero.avatar.url),
              )}" alt="${escapeHtml(
                hero.fullName,
              )}" style="width:100%;max-width:320px;height:420px;object-fit:cover;border-radius:12px;" />
              <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:monospace;font-size:10px;color:var(--primary);">
                <span>${t("hero_clin_rec_tag", "RECORD: VERIFIED")}</span>
                <span>${t("hero_clin_id_tag", "HOSPITAL ID: #9821")}</span>
              </div>
            </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isContentCreator) {
    return `<section id="hero" class="reveal-on-scroll">
      <div class="creator-hero">
        <div class="creator-masthead">
          <span>${t("hero_creator_header1", "CREATIVE DIRECTORY • ISSUE NO. 01")}</span>
          <span>${t("hero_creator_header2", "MEDIA &amp; VIRAL STORYTELLING")}</span>
          <span>${t("hero_creator_header3", "EST. 2024")}</span>
        </div>
        <div class="hero-grid" style="align-items:center;">
          <div>
            <h1 class="font-editorial" style="font-size: clamp(36px, 6vw, 68px); font-weight: 900; line-height: 0.95; margin: 12px 0; text-transform:uppercase; color: var(--text);">${escapeHtml(
              hero.fullName,
            )}</h1>
            <p style="font-size: 18px; font-weight: 800; text-transform:uppercase; color: var(--primary); margin-bottom: 16px; letter-spacing:0.05em;">${escapeHtml(
              hero.roleTitle,
            )}</p>
            <p style="font-size: 15px; line-height: 1.7; opacity: 0.9; margin-bottom: 24px; max-width: 520px; font-weight:500;">${escapeHtml(
              hero.shortBio,
            )}</p>

            <div class="creator-stickers">
              <span class="creator-sticker-pill sticker-yellow">${t("hero_creator_sticker1", "🔥 VIRAL CAMPAIGN")}</span>
              <span class="creator-sticker-pill sticker-pink">${t("hero_creator_sticker2", "🎬 TIKTOK CREATOR")}</span>
              <span class="creator-sticker-pill sticker-blue">${t("hero_creator_sticker3", "✨ 500K+ REACH")}</span>
              <span class="creator-sticker-pill sticker-green">${t("hero_creator_sticker4", "📸 VISUAL STORYTELLER")}</span>
            </div>

            <div style="margin-top:20px;display:flex;gap:16px;font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;">
              <span>• TIKTOK</span><span>• REELS</span><span>• YOUTUBE</span><span>• PODCAST</span>
            </div>

            <div class="hero-cta" style="margin-top:24px;">
              ${hero.ctaButtons
                .map(
                  (btn) =>
                    `<a href="${escapeHtml(
                      btn.href,
                    )}" class="btn btn-primary" style="background:#000;color:#fff;border-radius:999px;padding:12px 28px;font-weight:900;border:2px solid #000;box-shadow:4px 4px 0px var(--primary);">${escapeHtml(
                      btn.label,
                    )}</a>`,
                )
                .join("")}
            </div>
          </div>

          <div style="display:flex;justify-content:center;">
            ${
              showAvatar
                ? `
            <div class="creator-polaroid-frame">
              <div class="creator-tape"></div>
              <img src="${escapeHtml(
                resolveSrc(hero.avatar.url),
              )}" alt="${escapeHtml(
                hero.fullName,
              )}" style="width:100%;max-width:320px;height:400px;object-fit:cover;border-radius:16px;" />
              <p style="margin-top:12px;text-align:center;font-family:var(--font-heading);font-size:14px;font-weight:700;font-style:italic;">${t("hero_creator_caption", "Campaign On Set 2024 ⚡")}</p>
            </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isEducationalTerracotta) {
    return `<section id="hero" class="reveal-on-scroll">
      <div class="academic-monograph-hero">
        <div class="academic-ribbon">
          <span style="font-weight:700;letter-spacing:0.15em;">${t("hero_acad_header1", "ĐẠI HỌC QUỐC GIA HÀ NỘI • TRƯỜNG ĐẠI HỌC GIÁO DỤC")}</span>
          <span class="academic-vol-tag">${t("hero_acad_header2", "MONOGRAPH VOL. 2024")}</span>
        </div>
        <div class="hero-grid" style="align-items:center;">
          <div>
            <p style="font-size:12px;font-weight:700;color:var(--primary);letter-spacing:0.2em;text-transform:uppercase;">${t("hero_acad_eyebrow", "HỒ SƠ HỌC THUẬT &amp; NGHIÊN CỨU SƯ PHẠM")}</p>
            <h1 class="font-editorial" style="font-size: clamp(32px, 5vw, 56px); font-weight: 700; line-height: 1.15; margin: 12px 0; color: var(--text);">${escapeHtml(
              hero.fullName,
            )}</h1>
            <p style="font-size: 18px; font-weight: 600; font-style: italic; color: var(--primary); margin-bottom: 16px;">${escapeHtml(
              hero.roleTitle,
            )}</p>
            <p style="font-size: 15px; line-height: 1.7; opacity: 0.9; margin-bottom: 24px; max-width: 540px;">${escapeHtml(
              hero.shortBio,
            )}</p>

            <div class="academic-framework-box">
              <div style="font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:10px;letter-spacing:0.05em;">📖 ${t("hero_acad_framework_title", "KHUNG NGHIÊN CỨU &amp; HỌC THUẬT SƯ PHẠM")}</div>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--text);">
                <div><strong style="color:var(--primary);">I.</strong> ${t("hero_acad_item_1", "Lý lịch khoa học &amp; Triết lý giáo dục")}</div>
                <div><strong style="color:var(--primary);">II.</strong> ${t("hero_acad_item_2", "Năng lực sư phạm &amp; Dạy học tích cực")}</div>
                <div><strong style="color:var(--primary);">III.</strong> ${t("hero_acad_item_3", "Các công trình nghiên cứu &amp; Đề tài thực nghiệm")}</div>
                <div><strong style="color:var(--primary);">IV.</strong> ${t("hero_acad_item_4", "Xuất bản tạp chí &amp; Báo cáo sư phạm")}</div>
              </div>
            </div>

            <div class="hero-cta" style="margin-top:24px;">
              ${hero.ctaButtons
                .map(
                  (btn) =>
                    `<a href="${escapeHtml(
                      btn.href,
                    )}" class="btn btn-primary" style="background:var(--primary);color:#fff;border-radius:8px;padding:12px 28px;font-weight:600;">${escapeHtml(
                      btn.label,
                    )}</a>`,
                )
                .join("")}
            </div>
          </div>

          <div style="display:flex;justify-content:center;">
            ${
              showAvatar
                ? `
            <div class="academic-arch-frame">
              <img src="${escapeHtml(
                resolveSrc(hero.avatar.url),
              )}" alt="${escapeHtml(
                hero.fullName,
              )}" style="width:100%;max-width:320px;height:420px;object-fit:cover;border-radius:156px 156px 20px 20px;" />
              <div class="academic-frame-badge">${t("hero_acad_badge", "HỌC THUẬT &amp; NGHIÊN CỨU")}</div>
            </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isPedagogicalJournal) {
    return `<section id="hero" class="reveal-on-scroll">
      <div class="pedagogical-journal-hero">
        <div class="pedagogical-ribbon">
          <span style="font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">${t("hero_ped_header1", "NHẬT KÝ SƯ PHẠM &amp; THỰC TẬP GIẢNG DẠY")}</span>
          <span class="pedagogical-tag">${t("hero_ped_header2", "GIÁO VIÊN TƯƠNG LAI • SƯ PHẠM")}</span>
        </div>
        <div class="hero-grid" style="align-items:center;">
          <div>
            <p style="font-size:12px;font-weight:700;color:var(--primary);letter-spacing:0.15em;text-transform:uppercase;">${t("hero_ped_eyebrow", "NHẬT KÝ NGƯỜI GIÁO VIÊN TRẺ")}</p>
            <h1 class="font-editorial" style="font-size: clamp(32px, 5vw, 56px); font-weight: 700; line-height: 1.15; margin: 12px 0; color: var(--text);">${escapeHtml(
              hero.fullName,
            )}</h1>
            <p style="font-size: 17px; font-weight: 600; font-style: italic; color: var(--primary); margin-bottom: 16px;">${escapeHtml(
              hero.roleTitle,
            )}</p>
            <p style="font-size: 15px; line-height: 1.7; opacity: 0.9; margin-bottom: 24px; max-width: 540px;">${escapeHtml(
              hero.shortBio,
            )}</p>

            <div class="pedagogical-index-box">
              <div style="font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:10px;">🌸 ${t("hero_ped_plan_title", "TIẾN TRÌNH THỰC TẬP &amp; KẾ HOẠCH BÀI DẠY")}</div>
              <div class="pedagogical-index-grid">
                <div class="pedagogical-item">${t("hero_ped_item_1", "🌸 Bài 1: Chân dung người giáo viên")}</div>
                <div class="pedagogical-item">${t("hero_ped_item_2", "🌸 Bài 2: Kế hoạch bài dạy (Giáo án)")}</div>
                <div class="pedagogical-item">${t("hero_ped_item_3", "🌸 Bài 3: Hoạt động trải nghiệm sáng tạo")}</div>
                <div class="pedagogical-item">${t("hero_ped_item_4", "🌸 Bài 4: Phản tư &amp; Nhận xét học sinh")}</div>
              </div>
            </div>

            <div class="hero-cta" style="margin-top:24px;">
              ${hero.ctaButtons
                .map(
                  (btn) =>
                    `<a href="${escapeHtml(
                      btn.href,
                    )}" class="btn btn-primary" style="background:var(--primary);color:#fff;border-radius:999px;padding:12px 28px;font-weight:600;">${escapeHtml(
                      btn.label,
                    )}</a>`,
                )
                .join("")}
            </div>
          </div>

          <div style="display:flex;justify-content:center;">
            ${
              showAvatar
                ? `
            <div class="pedagogical-avatar-frame">
              <div class="pedagogical-bookmark">SƯ PHẠM 2024</div>
              <img src="${escapeHtml(
                resolveSrc(hero.avatar.url),
              )}" alt="${escapeHtml(
                hero.fullName,
              )}" style="width:100%;max-width:320px;height:420px;object-fit:cover;border-radius:20px;" />
            </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isMusicEditorial || (isCanvaEditorial && templateId === "canva-editorial")) {
    return `<section id="hero" class="reveal-on-scroll">
      <div class="cover-canvas">
        ${isMusicEditorial ? svgCoverStaffTopLeft() : ""}
        ${isMusicEditorial ? svgCoverStaffBottomRight() : ""}
        <div class="cover-title-wrap">
          ${
            showPortfolioLabel
              ? `<span class="cover-word-digital font-editorial">Digital</span>
          <svg viewBox="0 0 880 300" style="width:100%;overflow:visible;" aria-hidden="true">
            <g transform="rotate(-2.2 440 155)">
              <text x="440" y="222" text-anchor="middle" fill="var(--primary, #927869)" stroke="var(--text, #4B3128)" stroke-width="4.2" stroke-linejoin="round" style="font-family:var(--font-heading, 'Playfair Display', Georgia, serif);font-size:205px;font-weight:700;letter-spacing:-0.03em;">${escapeHtml(portfolioTitle)}</text>
            </g>
          </svg>
          <span class="cover-word-year font-editorial">2026</span>`
              : ""
          }
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;${showAvatar ? "" : "flex-direction:column;"}">
            ${showAvatar ? `<img src="${escapeHtml(resolveSrc(hero.avatar.url))}" alt="${escapeHtml(hero.fullName)}" style="width:36px;height:36px;border-radius:999px;border:2px solid var(--primary);object-fit:cover;" />` : ""}
            <div style="text-align:center;">
              <strong class="font-editorial" style="font-size:15px;color:var(--text);">${escapeHtml(hero.fullName)}</strong>
              ${hero.roleTitle ? `<span style="display:${showAvatar ? "inline" : "block"};font-size:12px;color:var(--primary);margin-left:${showAvatar ? "6px" : "0"};opacity:0.8;">${showAvatar ? "• " : ""}${escapeHtml(hero.roleTitle)}</span>` : ""}
            </div>
          </div>
          <div class="cover-stars">
            ${svgFourPointStar(24)}
            ${svgFourPointStar(28)}
            ${svgFourPointStar(24)}
          </div>
          <div class="editorial-rule"></div>
        </div>
      </div>
    </section>`;
  }

  return `<section id="hero" class="reveal-on-scroll" style="position:relative;">
    ${renderDecorationsHtml(hero.decorations, primaryColor, secondaryColor)}
    <div class="hero-grid ${showAvatar ? "" : "hero-grid--centered"}" style="position:relative;z-index:2;padding: 18px 0 36px;">
      <div class="${showAvatar ? "" : "hero-copy-centered"}">
        ${
          hasHeadline && showPortfolioLabel && !headlineIsPortfolio
            ? `<p class="hero-portfolio-line">${escapeHtml(portfolioDisplayLabel)}</p>`
            : ""
        }
        ${
          hasHeadline
            ? `<p class="hero-eyebrow">${escapeHtml(
                showPortfolioLabel && headlineIsPortfolio
                  ? portfolioDisplayLabel
                  : hero.headline,
              )}</p>`
            : ""
        }
        <h1 style="font-size: clamp(38px, 5vw, 56px); line-height: 1.12; margin: 8px 0 10px;">${escapeHtml(
          hero.fullName,
        )}</h1>
        <p style="font-size: 18px; font-weight: 600; color: var(--secondary); margin: 0 0 16px;">${escapeHtml(
          hero.roleTitle,
        )}</p>
        <p style="max-width: 60ch;">${escapeHtml(hero.shortBio)}</p>
        ${
          hero.quickTags.length > 0
            ? `<div class="hero-tags" style="margin: 18px 0;">${hero.quickTags
                .map((t) => `<span class="pill">✦ ${escapeHtml(t)}</span>`)
                .join("")}</div>`
            : ""
        }
        <div class="hero-cta" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;">
          ${hero.ctaButtons
            .map(
              (btn) =>
                `<a class="${
                  btn.style === "outline" ? "btn-outline" : "btn-primary"
                }" href="${escapeHtml(safeHref(btn.href))}">${escapeHtml(btn.label)}</a>`,
            )
            .join("")}
        </div>
        ${
          stickerTags
            ? `<div style="display:flex; gap:10px; margin-top:14px;">${stickerTags}</div>`
            : ""
        }
      </div>
      ${
        showAvatar
          ? `<div>
        <img class="${renderAvatarClass(hero.avatar.frameStyle)}" src="${escapeHtml(
            resolveSrc(hero.avatar.url),
          )}" alt="${escapeHtml(hero.fullName)}" />
      </div>`
          : ""
      }
    </div>
    <div class="kpi-divider" style="margin-top:40px;display:flex;align-items:center;gap:10px;opacity:0.85;">
      <div style="height:4px;width:32px;border-radius:999px;background:var(--primary);"></div>
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:var(--primary);">Strategy • Execution • Impact</span>
      <div style="height:1px;flex:1;background:linear-gradient(to right, ${hexToRgba(primaryColor, 0.4)}, transparent);"></div>
    </div>
  </section>`;
}

function renderAboutHtml(
  about: AboutSection,
  isCanvaEditorial: boolean,
  heroAvatarUrl?: string,
  heroFullName?: string,
  educationSec?: EducationSection,
  isMusicEditorial = false,
  templateId = "canva-editorial",
): string {
  const { contactInfo } = about;
  const eduSchool =
    about.educationSchool ||
    educationSec?.items[0]?.school ||
    about.highlights.find((h) =>
      /trường|đại học|học viện|education|school/i.test(h.label),
    )?.value ||
    "Trường Đại học";
  const eduDegree =
    about.educationDegree ||
    educationSec?.items[0]?.degree ||
    about.highlights.find((h) =>
      /chuyên ngành|ngành|degree|major/i.test(h.label),
    )?.value ||
    "Chuyên ngành Đào tạo";
  const aboutHighlightsHtml =
    about.highlights.length > 0
      ? `<div class="about-highlight-grid">
          ${about.highlights
            .map((highlight, index) => {
              const width = Math.max(1, Math.min(4, highlight.width ?? 1));
              const height = Math.max(1, Math.min(3, highlight.height ?? 1));
              return `<div class="about-highlight-card" data-highlight-width="${width}" style="grid-row:span ${height};min-height:${height * 88}px;">
                <span class="about-highlight-label">${escapeHtml(highlight.label)}</span>
                <span class="about-highlight-value" style="color:${index % 2 === 0 ? "var(--primary)" : "var(--secondary)"}"><span class="about-highlight-value__text">${escapeHtml(highlight.value)}</span></span>
              </div>`;
            })
            .join("")}
        </div>`
      : "";
  const defaultCardPositions: Record<
    string,
    { column: number; row: number; width: number; height: number }
  > = {
    contact: { column: 0, row: 0, width: 7, height: 7 },
    education: { column: 7, row: 0, width: 5, height: 3 },
    learningGoals: { column: 7, row: 3, width: 5, height: 4 },
  };
  const aboutCardTitleFallbacks = {
    contact: "Thông tin liên hệ",
    education: "Học vấn & Đào tạo",
    learningGoals: "Mục tiêu học tập & phát triển (INF2501)",
  } as const;
  const safeFontName = (font: string | undefined) =>
    font?.replace(/[^a-zA-Z0-9 -]/g, "");
  const cardHeadingFont = safeFontName(about.cardHeadingFont);
  const cardBodyFont = safeFontName(about.cardBodyFont);
  const freeAboutHeight =
    Math.max(
      ...["contact", "education", "learningGoals"].map((id) => {
        const position = about.cardPositions?.[id] ?? defaultCardPositions[id];
        return position.row + position.height;
      }),
    ) *
      64 -
    16;
  const aboutCardsStyle = [
    about.cardPositions ? `min-height:${freeAboutHeight}px;` : "",
    cardHeadingFont
      ? `--about-card-heading-font:'${cardHeadingFont}',var(--font-heading);`
      : "",
    cardBodyFont
      ? `--about-card-body-font:'${cardBodyFont}',var(--font-body);`
      : "",
  ].join("");
  const aboutCardsHtml = `<div class="${
    about.cardPositions
      ? "about-free-grid-export"
      : "about-default-card-grid-export"
  }" ${aboutCardsStyle ? `style="${escapeHtml(aboutCardsStyle)}"` : ""}>
      ${["contact", "education", "learningGoals"]
        .map((id) => {
          const position =
            about.cardPositions?.[id] ?? defaultCardPositions[id];
          const titleKey = id as keyof typeof aboutCardTitleFallbacks;
          const title =
            about.cardTitles?.[titleKey] ?? aboutCardTitleFallbacks[titleKey];
          const positionStyle = about.cardPositions
            ? `grid-column:${position.column + 1} / span ${position.width};grid-row:${position.row + 1} / span ${position.height};min-height:${position.height * 48 + (position.height - 1) * 16}px;`
            : "";

          if (id === "contact") {
            const hiddenFields = about.contactInfo.hiddenFields ?? [];
            const customContactRows = (about.contactInfo.customItems ?? []).map((item) => {
              const icon = svgContactBadgeIcon(item.icon);
              const text = `${item.label ? `${item.label}: ` : ""}${item.value}`;
              const href = safeContactHref(item.href);
              const content = `<span class="contact-icon-badge">${icon}</span><span>${escapeHtml(text)}</span>`;
              return `<div class="contact-row">${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${content}</a>` : content}</div>`;
            }).join("");
            return `<div class="about-free-card" data-about-card="contact" data-about-frame="${escapeHtml(about.cardFrame ?? "template")}" style="${positionStyle}">
                <h3>${escapeHtml(title)}</h3>
                ${contactInfo.email && !hiddenFields.includes("email") ? `<div class="contact-row"><span class="contact-icon-badge">${svgContactBadgeIcon("mail")}</span><a href="mailto:${escapeHtml(contactInfo.email)}">${escapeHtml(contactInfo.email)}</a></div>` : ""}
                ${contactInfo.phone && !hiddenFields.includes("phone") ? `<div class="contact-row"><span class="contact-icon-badge">${svgContactBadgeIcon("phone")}</span><span>${escapeHtml(contactInfo.phone)}</span></div>` : ""}
                ${contactInfo.location && !hiddenFields.includes("location") ? `<div class="contact-row"><span class="contact-icon-badge">${svgContactBadgeIcon("pin")}</span><span>${escapeHtml(contactInfo.location)}</span></div>` : ""}
                ${contactInfo.website && !hiddenFields.includes("website") ? `<div class="contact-row"><span class="contact-icon-badge">${svgContactBadgeIcon("globe")}</span><a href="${escapeHtml(safeHref(contactInfo.website))}" target="_blank" rel="noreferrer">${escapeHtml(contactInfo.website)}</a></div>` : ""}
                ${customContactRows}
              </div>`;
          }
          if (id === "education") {
            return `<div class="about-free-card" data-about-card="education" data-about-frame="${escapeHtml(about.cardFrame ?? "template")}" style="${positionStyle}">
                <h3>${escapeHtml(title)}</h3>
                <p class="highlight-label">Trường đào tạo</p>
                <p class="highlight-val">${escapeHtml(eduSchool)}</p>
                <p class="highlight-label">Chuyên ngành</p>
                <p class="highlight-val">${escapeHtml(eduDegree)}</p>
                <p class="highlight-label">${escapeHtml(about.educationPeriod ?? "Khoá K18 • Học phần INF2501")}</p>
              </div>`;
          }
          const goalTitle =
            about.cardTitles?.portfolioObjective ?? "Mục tiêu của Portfolio";
          return `<div class="about-free-card" data-about-card="learningGoals" data-about-frame="${escapeHtml(about.cardFrame ?? "template")}" style="${positionStyle}">
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(about.learningGoals ?? "Vận dụng thành thạo AI tạo sinh và thiết kế số vào giảng dạy thực tiễn.")}</p>
              <hr />
              <h4>${escapeHtml(goalTitle)}</h4>
              <p>${escapeHtml(about.portfolioObjective ?? "Tổng hợp toàn bộ học liệu, bài tập và minh chứng năng lực ứng dụng AI.")}</p>
            </div>`;
        })
        .join("")}
    </div>`;

  const defaultVariants = getArchetypeDefaultVariants(templateId as TemplateId);
  const activeAboutVariant = about.variant || defaultVariants.about;

  const isMedicalRuby = activeAboutVariant === "medical-license";
  const isClinicalNavy = activeAboutVariant === "clinical-dossier";
  const isContentCreator = activeAboutVariant === "creator-profile";
  const isEducationalTerracotta = activeAboutVariant === "academic-cv";
  const isPedagogicalJournal = activeAboutVariant === "pedagogical-journal";

  const t = (key: string, fallback: string) => {
    const val = about.customTexts?.[key];
    return val !== undefined && val !== "" ? escapeHtml(val) : fallback;
  };

  if (isMedicalRuby) {
    return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="medical-license">
      <div style="position:relative; z-index:2; margin-bottom: 24px;">
        <div class="about-hero-grid" style="grid-template-columns: 1.3fr 0.7fr; gap: 24px;">
          <div style="border: 2px solid color-mix(in srgb, var(--primary) 35%, transparent); border-radius: 24px; padding: 24px; background: var(--surface); box-shadow: 0 10px 30px -10px color-mix(in srgb, var(--primary) 15%, transparent);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-bottom: 1px solid color-mix(in srgb, var(--primary) 18%, transparent); padding-bottom: 12px; margin-bottom: 14px;">
              <span class="medical-ribbon" style="margin-bottom:0; font-size:10px; padding:4px 12px; max-width:100%; word-break:break-word;">🏆 ${t("med_badge", "HỒ SƠ HÀNH NGHỀ DƯỢC • CHUẨN GMP/GSP")}</span>
              <span class="medical-pill" style="font-family:monospace; flex-shrink:0;">${t("med_license", "#VN-PHARM-8892")}</span>
            </div>
            <h3 class="font-editorial" style="font-size:22px; font-weight:700; color:var(--text); margin:0 0 10px; word-break:break-word;">${t("med_title", "Dược sĩ Chuyên khoa &amp; Nghiên cứu Phát triển (R&amp;D)")}</h3>
            <p style="font-size:14px; line-height:1.7; color:var(--text); opacity:0.88; margin:0 0 16px; word-break:break-word;">${escapeHtml(about.biography || "Dược sĩ phụ trách kiểm soát chất lượng, nghiên cứu tối ưu hóa công thức bào chế theo tiêu chuẩn GMP-WHO và Dược điển Việt Nam V.")}</p>
            <div class="medical-syllabus-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
              <div class="medical-syllabus-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:4px;">${t("med_feat1_title", "🔬 Bào chế &amp; Độc học")}</strong>
                <span style="font-size:11px; opacity:0.85;">${t("med_feat1_desc", "Nano sinh học, viên nén phóng thích biến đổi")}</span>
              </div>
              <div class="medical-syllabus-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:4px;">${t("med_feat2_title", "📋 Tiêu chuẩn GMP-WHO")}</strong>
                <span style="font-size:11px; opacity:0.85;">${t("med_feat2_desc", "Thẩm định quy trình sản xuất, GLP phòng LAB")}</span>
              </div>
              <div class="medical-syllabus-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:4px;">${t("med_feat3_title", "💊 Dược lâm sàng")}</strong>
                <span style="font-size:11px; opacity:0.85;">${t("med_feat3_desc", "Tương tác thuốc &amp; Cảnh giác dược an toàn")}</span>
              </div>
            </div>
            <div style="margin-top:16px; padding-top:10px; border-top:1px solid color-mix(in srgb, var(--primary) 15%, transparent); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:11px; font-weight:700; color:var(--primary); word-break:break-word;">
              <span style="min-width:0; word-break:break-word;">${t("med_footer_left", "⚖️ CAM KẾT Y ĐỨC &amp; AN TOÀN SỬ DỤNG THUỐC")}</span>
              <span style="min-width:0; word-break:break-word; flex-shrink:0;">${t("med_footer_right", "BỘ Y TẾ VIỆT NAM VERIFIED")}</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${about.customTexts?.hide_med_edu !== "true" ? `<div style="border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 18px; padding: 18px; background: var(--surface);">
              <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--primary); margin:0 0 10px;">🎓 ${t("med_edu_title", "HỌC VẤN &amp; ĐÀO TẠO CHUYÊN MÔN")}</h4>
              <p style="font-weight:700; font-size:15px; margin:0 0 4px; color:var(--text);">${escapeHtml(eduSchool)}</p>
              <p style="font-weight:600; font-size:13px; margin:0 0 4px; color:var(--primary);">${escapeHtml(eduDegree)}</p>
              <p style="font-size:11px; opacity:0.75; margin:0;">${escapeHtml(about.educationPeriod || "Khoá K18 • Hệ Chính quy Dược khoa")}</p>
            </div>` : ""}
            ${about.customTexts?.hide_med_contact !== "true" ? `<div style="border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 18px; padding: 18px; background: var(--surface);">
              <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--primary); margin:0 0 10px;">✉️ ${t("med_contact_title", "THÔNG TIN LIÊN HỆ &amp; HỢP TÁC")}</h4>
              ${contactInfo.email ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(contactInfo.email)}" style="color:var(--primary);">${escapeHtml(contactInfo.email)}</a></p>` : ""}
              ${contactInfo.phone ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Hotline:</strong> ${escapeHtml(contactInfo.phone)}</p>` : ""}
              ${contactInfo.location ? `<p style="font-size:12px; margin:0;"><strong>Địa bàn:</strong> ${escapeHtml(contactInfo.location)}</p>` : ""}
            </div>` : ""}
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isClinicalNavy) {
    return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="clinical-dossier" style="font-family:monospace;">
      <div style="position:relative; z-index:2; margin-bottom: 24px;">
        <div class="about-hero-grid" style="grid-template-columns: 1.3fr 0.7fr; gap: 24px;">
          <div style="border: 2px solid var(--primary); border-radius: 16px; padding: 24px; background: var(--surface); box-shadow: 0 10px 28px -8px rgba(26,18,100,0.25);">
            <div class="clinical-status-bar" style="margin-bottom:14px; padding:6px 12px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px;">
              <span style="font-weight:700; min-width:0; word-break:break-word;"><span class="clinical-dot"></span> ${t("clin_badge", "[PHYSICIAN CLINICAL DOSSIER // MD. REGISTRATION]")}</span>
              <span class="clinical-badge-pill" style="flex-shrink:0;">${t("clin_tag", "MD-HN-2024")}</span>
            </div>
            <h3 style="font-family:sans-serif; font-size:22px; font-weight:700; color:var(--text); margin:0 0 6px; word-break:break-word;">${t("clin_title", "Bác sĩ Nội trú / Điều trị Lâm sàng")}</h3>
            <p style="font-size:12px; font-weight:600; color:var(--primary); margin:0 0 12px; word-break:break-word;">${t("clin_sub", "BỆNH VIỆN BẠCH MAI • BỘ MÔN NỘI - ĐH Y HÀ NỘI")}</p>
            <p style="font-family:sans-serif; font-size:14px; line-height:1.7; color:var(--text); opacity:0.88; margin:0 0 16px; word-break:break-word;">${escapeHtml(about.biography || "Bác sĩ lâm sàng trực tiếp điều trị tại khoa Cấp cứu & Can thiệp hồi sức tim mạch, ứng dụng y học chứng cứ trong chẩn đoán và theo dõi phác đồ.")}</p>
            <div class="clinical-diagnostic-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
              <div class="clinical-diag-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:2px;">${t("clin_feat1_title", "🩺 Cấp cứu Hồi sức")}</strong>
                <span style="font-family:sans-serif; font-size:11px; opacity:0.85;">${t("clin_feat1_desc", "ACLS nâng cao, can thiệp sốc")}</span>
              </div>
              <div class="clinical-diag-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:2px;">${t("clin_feat2_title", "📊 Y học chứng cứ")}</strong>
                <span style="font-family:sans-serif; font-size:11px; opacity:0.85;">${t("clin_feat2_desc", "Guideline AHA/ESC cập nhật")}</span>
              </div>
              <div class="clinical-diag-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:2px;">${t("clin_feat3_title", "🧬 Cận lâm sàng")}</strong>
                <span style="font-family:sans-serif; font-size:11px; opacity:0.85;">${t("clin_feat3_desc", "Chẩn đoán hình ảnh CT/MRI")}</span>
              </div>
            </div>
            <div style="margin-top:16px; padding-top:10px; border-top:1px solid rgba(26,18,100,0.15); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:11px; font-weight:700; color:var(--primary); word-break:break-word;">
              <span style="min-width:0; word-break:break-word;">${t("clin_footer_left", "STATUS: PRACTICING PHYSICIAN")}</span>
              <span style="min-width:0; word-break:break-word; flex-shrink:0;">${t("clin_footer_right", "HIPPOCRATIC OATH VERIFIED")}</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${about.customTexts?.hide_clin_edu !== "true" ? `<div style="border: 1px solid rgba(26,18,100,0.2); border-radius: 12px; padding: 18px; background: var(--surface);">
              <div class="clinical-diagnostic-header" style="font-size:11px; margin-bottom:8px;">${t("clin_edu_title", "[HOSPITAL AFFILIATIONS &amp; DEGREE]")}</div>
              <p style="font-family:sans-serif; font-weight:700; font-size:14px; margin:0 0 4px; color:var(--text);">${escapeHtml(eduSchool)}</p>
              <p style="font-family:sans-serif; font-weight:600; font-size:13px; margin:0 0 4px; color:var(--primary);">${escapeHtml(eduDegree)}</p>
              <p style="font-size:11px; opacity:0.75; margin:0;">${escapeHtml(about.educationPeriod || "Bác sĩ Nội trú Khóa K47")}</p>
            </div>` : ""}
            ${about.customTexts?.hide_clin_contact !== "true" ? `<div style="border: 1px solid rgba(26,18,100,0.2); border-radius: 12px; padding: 18px; background: var(--surface);">
              <div class="clinical-diagnostic-header" style="font-size:11px; margin-bottom:8px;">${t("clin_contact_title", "[CLINICAL CONTACT &amp; PAGER]")}</div>
              ${contactInfo.email ? `<p style="font-family:sans-serif; font-size:12px; margin:0 0 6px;"><strong>Email BV:</strong> <a href="mailto:${escapeHtml(contactInfo.email)}" style="color:var(--primary);">${escapeHtml(contactInfo.email)}</a></p>` : ""}
              ${contactInfo.phone ? `<p style="font-family:sans-serif; font-size:12px; margin:0 0 6px;"><strong>Pager / Hotline:</strong> ${escapeHtml(contactInfo.phone)}</p>` : ""}
              ${contactInfo.location ? `<p style="font-family:sans-serif; font-size:12px; margin:0;"><strong>Khoa / Phòng:</strong> ${escapeHtml(contactInfo.location)}</p>` : ""}
            </div>` : ""}
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isContentCreator) {
    return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="creator-profile">
      <div style="position:relative; z-index:2; margin-bottom: 24px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:20px;">
          ${about.customTexts?.hide_creator_stat_1 !== "true" ? `<div style="border:2px solid #000; border-radius:18px; padding:14px; background:#FDE047; box-shadow:3px 3px 0px #000;">
            <span style="font-size:10px; font-weight:900; text-transform:uppercase;">${t("creator_stat1_title", "TIKTOK REACH")}</span>
            <div style="font-size:24px; font-weight:900;">${t("creator_stat1_val", "250K+")}</div>
            <span style="font-size:11px; font-weight:700; opacity:0.8;">${t("creator_stat1_sub", "3.2M Lượt Thích")}</span>
          </div>` : ""}
          ${about.customTexts?.hide_creator_stat_2 !== "true" ? `<div style="border:2px solid #000; border-radius:18px; padding:14px; background:#F472B6; box-shadow:3px 3px 0px #000;">
            <span style="font-size:10px; font-weight:900; text-transform:uppercase;">${t("creator_stat2_title", "INSTAGRAM / REELS")}</span>
            <div style="font-size:24px; font-weight:900;">${t("creator_stat2_val", "85K+")}</div>
            <span style="font-size:11px; font-weight:700; opacity:0.8;">${t("creator_stat2_sub", "15.2% Avg. Reach")}</span>
          </div>` : ""}
          ${about.customTexts?.hide_creator_stat_3 !== "true" ? `<div style="border:2px solid #000; border-radius:18px; padding:14px; background:#38BDF8; box-shadow:3px 3px 0px #000;">
            <span style="font-size:10px; font-weight:900; text-transform:uppercase;">${t("creator_stat3_title", "YOUTUBE SHORTS")}</span>
            <div style="font-size:24px; font-weight:900;">${t("creator_stat3_val", "120K+")}</div>
            <span style="font-size:11px; font-weight:700; opacity:0.8;">${t("creator_stat3_sub", "Views / Tháng")}</span>
          </div>` : ""}
          ${about.customTexts?.hide_creator_stat_4 !== "true" ? `<div style="border:2px solid #000; border-radius:18px; padding:14px; background:#4ADE80; box-shadow:3px 3px 0px #000;">
            <span style="font-size:10px; font-weight:900; text-transform:uppercase;">${t("creator_stat4_title", "ENGAGEMENT RATE")}</span>
            <div style="font-size:24px; font-weight:900;">${t("creator_stat4_val", "8.4%")}</div>
            <span style="font-size:11px; font-weight:700; opacity:0.8;">${t("creator_stat4_sub", "Top Creator GenZ")}</span>
          </div>` : ""}
        </div>

        <div class="about-hero-grid" style="grid-template-columns: 1.3fr 0.7fr; gap: 24px;">
          <div style="border:3px solid #000; border-radius:24px; padding:24px; background:#fff; box-shadow:6px 6px 0px #000;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:14px;">
              <span style="font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; color:var(--primary);">${t("creator_deck_title", "CREATOR MEDIA DECK • ISSUE NO. 01")}</span>
              <span style="border:1px solid #000; background:#FDE047; padding:2px 10px; border-radius:999px; font-size:10px; font-weight:900;">${t("creator_deck_status", "OPEN FOR BOOKING ⚡")}</span>
            </div>
            <h3 class="font-editorial" style="font-size:24px; font-weight:900; margin:0 0 12px;">${t("creator_heading", "Visual Storytelling &amp; Viral Content Creation")}</h3>
            <p style="font-size:14px; line-height:1.7; font-weight:500; opacity:0.9; margin:0 0 16px;">${escapeHtml(about.biography || "Sáng tạo nội dung đa nền tảng kết hợp hình ảnh đậm tính thẩm mỹ, storytelling chân thực và thông điệp lan tỏa tích cực đến cộng đồng người trẻ.")}</p>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <span style="border:2px solid #000; border-radius:8px; padding:4px 10px; font-size:11px; font-weight:900; background:#f5f5f5;">${t("creator_tag_1", "🎬 Brand Integration")}</span>
              <span style="border:2px solid #000; border-radius:8px; padding:4px 10px; font-size:11px; font-weight:900; background:#f5f5f5;">${t("creator_tag_2", "📱 UGC &amp; Review")}</span>
              <span style="border:2px solid #000; border-radius:8px; padding:4px 10px; font-size:11px; font-weight:900; background:#f5f5f5;">${t("creator_tag_3", "🎙️ Podcast Host")}</span>
              <span style="border:2px solid #000; border-radius:8px; padding:4px 10px; font-size:11px; font-weight:900; background:#f5f5f5;">${t("creator_tag_4", "📸 Concept Shoot")}</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${about.customTexts?.hide_creator_booking !== "true" ? `<div style="border:3px solid #000; border-radius:20px; padding:18px; background:#fff; box-shadow:4px 4px 0px #000;">
              <h4 style="font-size:11px; font-weight:900; text-transform:uppercase; color:var(--primary); margin:0 0 10px;">${t("creator_booking_title", "HỢP TÁC THƯƠNG HIỆU &amp; BOOKING")}</h4>
              ${contactInfo.email ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(contactInfo.email)}" style="color:var(--primary);">${escapeHtml(contactInfo.email)}</a></p>` : ""}
              ${contactInfo.phone ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Agency Booking:</strong> ${escapeHtml(contactInfo.phone)}</p>` : ""}
              ${contactInfo.location ? `<p style="font-size:12px; margin:0;"><strong>Studio Base:</strong> ${escapeHtml(contactInfo.location)}</p>` : ""}
            </div>` : ""}
            ${about.customTexts?.hide_creator_specs !== "true" ? `<div style="border:3px solid #000; border-radius:20px; padding:18px; background:#F8FAFC; box-shadow:4px 4px 0px #000;">
              <h4 style="font-size:11px; font-weight:900; text-transform:uppercase; margin:0 0 8px;">${t("creator_specs_title", "PRODUCTION GEAR // SPECS")}</h4>
              <p style="font-size:11px; margin:0 0 4px; opacity:0.85;">${t("creator_spec_1", "• Camera: Sony Cinema FX30 &amp; G-Master Lenses")}</p>
              <p style="font-size:11px; margin:0 0 4px; opacity:0.85;">${t("creator_spec_2", "• Audio: DJI Wireless Mic 2 Studio Setup")}</p>
              <p style="font-size:11px; margin:0; opacity:0.85;">${t("creator_spec_3", "• Color Grading: DaVinci Resolve Studio 18")}</p>
            </div>` : ""}
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isEducationalTerracotta) {
    return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="academic-cv">
      <div style="position:relative; z-index:2; margin-bottom: 24px;">
        <div class="about-hero-grid" style="grid-template-columns: 1.3fr 0.7fr; gap: 24px;">
          <div style="border: 2px solid color-mix(in srgb, var(--primary) 35%, transparent); border-radius: 20px; padding: 24px; background: var(--surface);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-bottom: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); padding-bottom: 12px; margin-bottom: 14px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--primary); min-width:0; word-break:break-word;">${t("acad_badge", "HỒ SƠ HỌC THUẬT &amp; LÝ LỊCH KHOA HỌC")}</span>
              <span class="academic-vol-tag" style="background:var(--primary); color:#fff; flex-shrink:0;">${t("acad_tag", "HỒ SƠ NCKH")}</span>
            </div>
            <h3 class="font-editorial" style="font-size:22px; font-weight:700; margin:0 0 10px; word-break:break-word;">${t("acad_title", "Nghiên cứu sinh &amp; Giảng viên Sư phạm Tương lai")}</h3>
            <p style="font-size:14px; line-height:1.7; opacity:0.88; margin:0 0 16px; word-break:break-word;">${escapeHtml(about.biography || "Nghiên cứu chuyên sâu về đổi mới phương pháp giảng dạy, ứng dụng chuyển đổi số và phát triển năng lực tự học cho học sinh trong chương trình GDPT 2018.")}</p>
            <div style="border:1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius:12px; padding:12px; background:color-mix(in srgb, var(--primary) 8%, transparent); font-size:12px; font-style:italic; word-break:break-word;">
              <strong style="color:var(--primary); font-style:normal; display:block; margin-bottom:2px;">${t("acad_philo_title", "📜 Triết lý nghiên cứu giáo dục:")}</strong>
              ${t("acad_philo_text", "“Lấy người học làm trung tâm của mọi chuyển hóa, công nghệ làm đòn bẩy kích hoạt tư duy và sự thấu cảm làm nền tảng của y đức sư phạm.”")}
            </div>
            <div style="margin-top:16px; padding-top:10px; border-top:1px solid color-mix(in srgb, var(--primary) 15%, transparent); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:11px; font-weight:700; color:var(--primary); word-break:break-word;">
              <span style="min-width:0; word-break:break-word;">${t("acad_footer_left", eduSchool ? escapeHtml(eduSchool.toUpperCase()) : "TRƯỜNG ĐẠI HỌC")}</span>
              <span style="min-width:0; word-break:break-word; flex-shrink:0;">${t("acad_footer_right", "ACADEMIC VERIFIED")}</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${about.customTexts?.hide_acad_pubs !== "true" ? `<div style="border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 16px; padding: 18px; background: var(--surface);">
              <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--primary); margin:0 0 8px;">📖 ${t("acad_pub_title", "CÔNG BỐ KHOA HỌC &amp; ĐỀ TÀI")}</h4>
              <p style="font-size:12px; margin:0 0 6px;">${t("acad_pub_1", "• <strong>01 Đề tài NCKH sinh viên:</strong> Giải Xuất sắc")}</p>
              <p style="font-size:12px; margin:0 0 6px;">${t("acad_pub_2", "• <strong>03 Bài báo khoa học:</strong> Kỷ yếu Hội thảo Quốc gia")}</p>
              <p style="font-size:12px; margin:0;">${t("acad_pub_3", "• <strong>Học bổng:</strong> Sinh viên Xuất sắc / Khuyến khích học tập")}</p>
            </div>` : ""}
            ${about.customTexts?.hide_acad_contact !== "true" ? `<div style="border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 16px; padding: 18px; background: var(--surface);">
              <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--primary); margin:0 0 8px;">✉️ ${t("acad_contact_title", "LIÊN HỆ KHOA HỌC &amp; VĂN PHÒNG")}</h4>
              ${contactInfo.email ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(contactInfo.email)}" style="color:var(--primary);">${escapeHtml(contactInfo.email)}</a></p>` : ""}
              ${contactInfo.phone ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Điện thoại:</strong> ${escapeHtml(contactInfo.phone)}</p>` : ""}
              ${contactInfo.location ? `<p style="font-size:12px; margin:0;"><strong>Văn phòng:</strong> ${escapeHtml(contactInfo.location)}</p>` : ""}
            </div>` : ""}
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isPedagogicalJournal) {
    return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="pedagogical-journal">
      <div style="position:relative; z-index:2; margin-bottom: 24px;">
        <div class="about-hero-grid" style="grid-template-columns: 1.3fr 0.7fr; gap: 24px;">
          <div style="border: 2px solid color-mix(in srgb, var(--primary) 30%, transparent); border-radius: 24px; padding: 24px; background: var(--surface);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-bottom: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); padding-bottom: 12px; margin-bottom: 14px;">
              <span class="pedagogical-tag" style="min-width:0; word-break:break-word; max-width:100%;">${t("ped_badge", "🌸 CHÂN DUNG NGƯỜI GIÁO VIÊN TRẺ • NGÀNH SƯ PHẠM")}</span>
              <span style="font-size:11px; opacity:0.75; flex-shrink:0;">${t("ped_tag", "KHÓA K18 • THỰC TẬP")}</span>
            </div>
            <h3 class="font-editorial" style="font-size:22px; font-weight:700; margin:0 0 10px; word-break:break-word;">${t("ped_title", "Tâm Niệm Nghề Giáo &amp; Triết Lý Giảng Dạy")}</h3>
            <p style="font-size:14px; line-height:1.7; opacity:0.88; margin:0 0 16px; word-break:break-word;">${escapeHtml(about.biography || "Mỗi học sinh là một nốt nhạc độc bản trong dàn hợp xướng cuộc đời. Người giáo viên không chỉ truyền đạt tri thức mà còn là người thắp lên ngọn lửa đam mê và sự tự tin cho các em.")}</p>
            <div class="pedagogical-index-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
              <div class="pedagogical-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:2px;">${t("ped_card1_title", "🎼 Giáo án tương tác")}</strong>
                <span style="font-size:11px; opacity:0.85;">${t("ped_card1_desc", "Dạy học liên môn &amp; CNTT")}</span>
              </div>
              <div class="pedagogical-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:2px;">${t("ped_card2_title", "💡 Trải nghiệm sáng tạo")}</strong>
                <span style="font-size:11px; opacity:0.85;">${t("ped_card2_desc", "Ngoại khóa &amp; CLB học đường")}</span>
              </div>
              <div class="pedagogical-item" style="word-break:break-word;">
                <strong style="color:var(--primary); display:block; margin-bottom:2px;">${t("ped_card3_title", "❤️ Thấu cảm học trò")}</strong>
                <span style="font-size:11px; opacity:0.85;">${t("ped_card3_desc", "Lớp học hạnh phúc")}</span>
              </div>
            </div>
            <div style="margin-top:16px; padding-top:10px; border-top:1px solid color-mix(in srgb, var(--primary) 15%, transparent); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:11px; font-weight:700; color:var(--primary); word-break:break-word;">
              <span style="min-width:0; word-break:break-word;">${t("ped_footer_left", eduSchool ? escapeHtml(eduSchool.toUpperCase()) : "TRƯỜNG ĐẠI HỌC")}</span>
              <span style="min-width:0; word-break:break-word; flex-shrink:0;">${t("ped_footer_right", "TỐT NGHIỆP XUẤT SẮC 🌸")}</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${about.customTexts?.hide_ped_edu !== "true" ? `<div style="border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 18px; padding: 18px; background: var(--surface);">
              <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--primary); margin:0 0 8px;">🎓 ${t("ped_edu_title", "ĐƠN VỊ THỰC TẬP &amp; HỌC VẤN")}</h4>
              <p style="font-weight:700; font-size:14px; margin:0 0 4px;">${escapeHtml(eduSchool)}</p>
              <p style="font-weight:600; font-size:13px; margin:0 0 4px; color:var(--primary);">${escapeHtml(eduDegree)}</p>
              <p style="font-size:11px; opacity:0.75; margin:0;">${escapeHtml(about.educationPeriod || "Khoá K18 • Thực tập Sư phạm")}</p>
            </div>` : ""}
            ${about.customTexts?.hide_ped_contact !== "true" ? `<div style="border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 18px; padding: 18px; background: var(--surface);">
              <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--primary); margin:0 0 8px;">✉️ ${t("ped_contact_title", "LIÊN HỆ GIÁO VIÊN")}</h4>
              ${contactInfo.email ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(contactInfo.email)}" style="color:var(--primary);">${escapeHtml(contactInfo.email)}</a></p>` : ""}
              ${contactInfo.phone ? `<p style="font-size:12px; margin:0 0 6px;"><strong>Hotline:</strong> ${escapeHtml(contactInfo.phone)}</p>` : ""}
              ${contactInfo.location ? `<p style="font-size:12px; margin:0;"><strong>Địa chỉ:</strong> ${escapeHtml(contactInfo.location)}</p>` : ""}
            </div>` : ""}
          </div>
        </div>
      </div>
    </section>`;
  }

  if (isCanvaEditorial) {
    const bioParagraphs = about.biography
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const isImageLeft =
      about.mediaPosition === "left" ||
      (about.mediaPosition !== "right" && Boolean(about.layoutInverted));
    const isImageTop = about.mediaPosition === "top";
    const isImageBottom = about.mediaPosition === "bottom";

    const bioColHtml = `<div>
            <h2 class="section-heading font-editorial" style="margin:0 0 16px;">${escapeHtml(about.title || "About me")}</h2>
            ${
              bioParagraphs.length > 0
                ? bioParagraphs
                    .map(
                      (para) =>
                        `<p style="font-size:16px;line-height:1.7;margin:0 0 12px;opacity:0.92;">${escapeHtml(para)}</p>`,
                    )
                    .join("")
                : `<p style="font-size:16px;line-height:1.7;margin:0 0 12px;opacity:0.92;">${escapeHtml(about.biography)}</p>`
            }
            ${aboutHighlightsHtml}
          </div>`;

    const hasAboutAvatar =
      about.showAvatar !== false && Boolean(heroAvatarUrl?.trim());

    const isArchWindow =
      templateId === "medical-ruby" ||
      templateId === "content-creator" ||
      templateId === "educational-terracotta" ||
      templateId === "canva-editorial" ||
      templateId === "warm-editorial";
    const isPolaroid = templateId === "pedagogical-mauve";
    const avatarRadiusStyle = isArchWindow
      ? "border-radius: 160px 160px 24px 24px;"
      : isPolaroid
        ? "border-radius: 14px; padding: 10px 10px 24px 10px; background: #fff;"
        : "border-radius: 28px;";

    const avatarColHtml = hasAboutAvatar
      ? `<div style="display:flex;justify-content:center;">
            <div style="aspect-ratio:3/4;${avatarRadiusStyle}border:3px solid var(--primary);overflow:hidden;background:var(--surface);width:100%;max-width:320px;box-shadow:0 12px 24px -8px rgba(0,0,0,0.12);">
              <img src="${escapeHtml(heroAvatarUrl!)}" alt="${escapeHtml(heroFullName || "Portrait")}" style="width:100%;height:100%;object-fit:cover;display:block;" />
            </div>
          </div>`
      : "";

    const gridStyle = !hasAboutAvatar
      ? "grid-template-columns: 1fr; width: 100%;"
      : isImageTop || isImageBottom
        ? "grid-template-columns: 1fr; gap: 24px;"
        : isImageLeft
          ? "grid-template-columns: 0.7fr 1.5fr;"
          : "";

    const gridContentHtml = !hasAboutAvatar
      ? bioColHtml
      : isImageTop
        ? `${avatarColHtml}${bioColHtml}`
        : isImageBottom
          ? `${bioColHtml}${avatarColHtml}`
          : isImageLeft
            ? `${avatarColHtml}${bioColHtml}`
            : `${bioColHtml}${avatarColHtml}`;

    return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="${escapeHtml(about.variant)}">
      <div style="position:relative; z-index:2;">
        <!-- Top Grid: Bio & Student Portrait -->
        <div class="about-hero-grid"${gridStyle ? ` style="${gridStyle}"` : ""}>
          ${gridContentHtml}
        </div>

        ${aboutCardsHtml}
        ${isMusicEditorial ? svgVerticalMusicRibbon() : ""}

        <div class="editorial-rule" style="margin-top:28px;"></div>
      </div>
    </section>`;
  }

  const bioParagraphs = about.biography
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const hasAboutAvatar =
    about.showAvatar !== false && Boolean(heroAvatarUrl?.trim());

  return `<section id="about" class="about-wrap reveal-on-scroll" data-about-layout="${escapeHtml(about.variant)}">
    <div class="surface-block">
      <div class="${hasAboutAvatar ? "about-hero-grid" : ""}">
        <div style="${!hasAboutAvatar ? "width:100%;" : ""}">
          <h2 class="section-heading" style="margin-top:0;">${escapeHtml(about.title)}</h2>
          ${bioParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          ${aboutHighlightsHtml}
        </div>
        ${
          hasAboutAvatar
            ? `<div style="display:flex;justify-content:center;align-items:center;">
                <img src="${escapeHtml(heroAvatarUrl!)}" alt="${escapeHtml(heroFullName || "Portrait")}" style="width:100%;max-width:320px;aspect-ratio:3/4;object-fit:cover;border-radius:24px;" />
              </div>`
            : ""
        }
      </div>
      ${aboutCardsHtml}
    </div>
  </section>`;
}

function renderSkillsHtml(
  skills: SkillsSection,
  resolveSrc: (url: string) => string,
  isCanvaEditorial: boolean,
): string {
  const showBars =
    skills.variant === "progress-bars" ||
    skills.variant === "canva-visual-grid";

  return `<section id="skills" class="reveal-on-scroll">
    <div class="skills-header-row">
      <h2 class="section-heading" style="margin-bottom:0;">${escapeHtml(skills.title)}</h2>
    </div>
    <div class="skills-grid" style="${
      skills.cardColumns === 1 || skills.cardWidth === "100%" || skills.cardWidth === "full"
        ? "grid-template-columns: 1fr;"
        : skills.cardColumns === 2
        ? "grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));"
        : ""
    }">
      ${skills.categories
        .map(
          (cat, categoryIndex) => {
            const cardW = cat.width || skills.cardWidth;
            const cardH = cat.height || skills.cardHeight;
            let customCss = "";
            if (cardW && cardW !== "auto") {
              const resolvedW = cardW === "full" || cardW === "100%" ? "100%" :
                cardW === "3/4" || cardW === "75%" ? "75%" :
                cardW === "2/3" || cardW === "66%" ? "66.666%" :
                cardW === "1/2" || cardW === "50%" ? "50%" :
                cardW === "1/3" || cardW === "33%" ? "33.333%" : cardW;
              customCss += `width:${resolvedW};max-width:100%;`;
            }
            if (cardH && cardH !== "auto") {
              customCss += `min-height:${cardH};`;
            }
            if (skills.cardAlign === "center") {
              customCss += "margin-left:auto;margin-right:auto;justify-self:center;";
            } else if (skills.cardAlign === "right") {
              customCss += "margin-left:auto;justify-self:end;";
            }
            return `<div class="${
            isCanvaEditorial
              ? "skill-col reveal-on-scroll"
              : "surface-block reveal-on-scroll"
          }" style="${
            isCanvaEditorial
              ? `transition-delay:${categoryIndex * 100}ms;${customCss}`
              : `margin-bottom:0;transition-delay:${categoryIndex * 100}ms;${customCss}`
          }">
        <h3>${escapeHtml(cat.name)}</h3>
        ${
          showBars
            ? `<div style="display:flex; flex-direction:column; gap:12px;">
          ${cat.skills
            .map(
              (sk) => `<div class="hover-lift">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; font-weight:600; gap:8px;">
              <span style="display:inline-flex; align-items:center; gap:6px;">
                ${
                  sk.iconUrl
                    ? `<img src="${escapeHtml(resolveSrc(sk.iconUrl))}" alt="" style="width:16px; height:16px; object-fit:contain;" />`
                    : ""
                }
                ${escapeHtml(sk.name)}
              </span>
              ${typeof sk.level === "number" ? `<span style="color:var(--primary);">${sk.level}%</span>` : ""}
            </div>
            ${
              typeof sk.level === "number"
                ? `<div class="skill-bar-track"><div class="skill-bar-fill" style="width:${Math.max(
                    0,
                    Math.min(100, sk.level),
                  )}%;"></div></div>`
                : ""
            }
          </div>`,
            )
            .join("")}
        </div>`
            : `<div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${cat.skills
            .map(
              (sk) =>
                `<span class="pill hover-lift">${escapeHtml(sk.name)}</span>`,
            )
            .join("")}
        </div>`
        }
      </div>`;
          }
        )
        .join("")}
    </div>
    ${isCanvaEditorial ? '<div class="editorial-rule" style="margin-top:36px;"></div>' : ""}
  </section>`;
}

function renderExperienceHtml(
  experience: ExperienceSection,
  isCanvaEditorial: boolean,
): string {
  return `<section id="experience" class="reveal-on-scroll">
    <h2 class="section-heading">${escapeHtml(experience.title)}</h2>
    <div class="editorial-grid">
      ${experience.items
        .map(
          (
            exp,
          ) => `<div class="${isCanvaEditorial ? "editorial-entry" : "surface-block"}">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;">
          <strong style="font-size:17px;">${escapeHtml(exp.role)}</strong>
          <span class="period-pill">${escapeHtml(exp.period)}</span>
        </div>
        <p style="font-weight:600;color:var(--secondary);margin:4px 0 8px;">${escapeHtml(
          exp.organization,
        )}</p>
        <p style="margin:0 0 8px;">${escapeHtml(exp.description)}</p>
        ${
          exp.achievements.length > 0
            ? `<ul style="margin:6px 0 0; padding-left:18px;">${exp.achievements
                .map((a) => `<li>${escapeHtml(a)}</li>`)
                .join("")}</ul>`
            : ""
        }
      </div>`,
        )
        .join("")}
    </div>
    ${isCanvaEditorial ? '<div class="editorial-rule" style="margin-top:36px;"></div>' : ""}
  </section>`;
}

function renderEducationHtml(
  education: EducationSection,
  isCanvaEditorial: boolean,
): string {
  return `<section id="education" class="reveal-on-scroll">
    <h2 class="section-heading">${escapeHtml(education.title)}</h2>
    <div class="editorial-grid">
      ${education.items
        .map(
          (
            edu,
          ) => `<div class="${isCanvaEditorial ? "editorial-entry" : "surface-block"}">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;">
          <strong style="font-size:17px;">${escapeHtml(edu.school)}</strong>
          <span class="period-pill">${escapeHtml(edu.period)}</span>
        </div>
        <p style="font-weight:600;color:var(--secondary);margin:4px 0 0;">${escapeHtml(edu.degree)}</p>
        ${
          edu.gpaOrHonors
            ? `<p style="font-size:13px; font-weight:600; color:var(--primary); margin:6px 0 0;">✦ ${escapeHtml(
                edu.gpaOrHonors,
              )}</p>`
            : ""
        }
        ${edu.details ? `<p style="margin:6px 0 0;">${escapeHtml(edu.details)}</p>` : ""}
      </div>`,
        )
        .join("")}
    </div>
    ${isCanvaEditorial ? '<div class="editorial-rule" style="margin-top:36px;"></div>' : ""}
  </section>`;
}

function renderProjectsHtml(
  projects: ProjectsSection,
  resolveSrc: (url: string) => string,
  allProjectsCollected: ProjectItem[],
  isCanvaEditorial: boolean,
  isMusicEditorial = false,
  templateId = "canva-editorial",
): string {
  const defaultVariants = getArchetypeDefaultVariants(templateId as TemplateId);
  const activeProjectsVariant = projects.variant || defaultVariants.projects;

  const isMedicalRuby = activeProjectsVariant === "medical-spread";
  const isClinicalNavy = activeProjectsVariant === "clinical-dossier";
  const isContentCreator = activeProjectsVariant === "creator-filmstrip";
  const isEducationalTerracotta = activeProjectsVariant === "academic-monograph";
  const isPedagogical = activeProjectsVariant === "lesson-plan";
  const isPedagogicalRose = templateId === "pedagogical-rose" && activeProjectsVariant === "lesson-plan";
  const isMedicalFamily =
    isMedicalRuby ||
    isClinicalNavy ||
    isEducationalTerracotta ||
    isPedagogicalRose ||
    isPedagogical ||
    projects.variant === "canva-slide-showcase";

  const displayTitle = isMedicalRuby
    ? "Highlight Projects"
    : isClinicalNavy
      ? "Clinical Case Dossier"
      : isContentCreator
        ? "Creator Stories & Campaigns"
        : isEducationalTerracotta
          ? "Công trình Nghiên cứu"
          : isPedagogical || isPedagogicalRose
            ? "Kế hoạch Bài dạy & Tiến trình Sư phạm"
            : "project";

  const headerHtml = isCanvaEditorial
    ? `<div style="padding-bottom: 16px;">
        <div class="projects-cover-header">
          ${isMusicEditorial ? svgVinylSketch() : ""}
          <div>
            <h2 class="projects-display-title font-editorial">${escapeHtml(displayTitle)}</h2>
            ${
              projects.subtitle
                ? `<p style="max-width:560px;margin:12px auto 0;font-size:14px;color:var(--secondary);">${escapeHtml(
                    projects.subtitle,
                  )}</p>`
                : ""
            }
          </div>
          ${isMusicEditorial ? svgVinylSketch() : ""}
        </div>
        <div class="toc-grid">
          ${projects.projects
            .map((proj, idx) => {
              const numLabel = `${String(idx + 1).padStart(2, "0")}.`;
              const showRightStar =
                (idx + 1) % 3 !== 0 && idx < projects.projects.length - 1;
              return `<div class="toc-item">
                ${showRightStar && isMusicEditorial ? svgFourPointStar(22, "var(--primary, #735340)", "toc-star") : ""}
                <span class="toc-num font-editorial">${numLabel}</span>
                <a class="toc-pill hover-lift" data-open-project="${idx}" href="#project-item-${idx}">${escapeHtml(
                  stripLeadingIndex(proj.title),
                )}</a>
              </div>`;
            })
            .join("")}
        </div>
      </div>`
    : `<h2 class="section-heading">${escapeHtml(projects.title)}</h2>${
        projects.subtitle ? `<p>${escapeHtml(projects.subtitle)}</p>` : ""
      }`;

  return `<section id="projects" class="reveal-on-scroll">
    ${headerHtml}
    ${projects.projects
      .map((proj, idx) => {
        const modalIdx = allProjectsCollected.length;
        allProjectsCollected.push({
          ...proj,
          media: proj.media.map((m) => ({
            ...m,
            url: resolveSrc(m.url),
          })),
        });
        const chapterNum = String(idx + 1).padStart(2, "0");
        const chapterLayout = proj.chapterLayout ?? "badge";
        const showChapter = proj.showChapter !== false;
        const showExercise = proj.showExercise !== false;
        const frameRadiusClass =
          idx % 2 === 0 ? "canva-radius-even" : "canva-radius-odd";

        return `<article id="project-item-${idx}" data-project-card data-open-project="${modalIdx}" class="${
          isCanvaEditorial
            ? "chapter-article reveal-on-scroll"
            : "surface-block reveal-on-scroll"
        }" style="cursor:pointer;">
      <div class="chapter-header" data-chapter-layout="${chapterLayout}">
        ${showChapter && chapterLayout === "badge" ? `<span class="chapter-num font-editorial">${chapterNum}</span>` : ""}
        <div style="${chapterLayout === "banner" && showChapter ? "flex:1;background:var(--primary);padding:16px;border-radius:16px;color:var(--bg);" : ""}">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            ${showChapter ? `<p class="chapter-eyebrow" style="${chapterLayout === "banner" ? "color:var(--bg);" : ""}">${escapeHtml(proj.chapterTitle || `CHƯƠNG ${idx + 1} : ${proj.category}`)}</p>` : ""}
            ${showExercise ? `<span class="pill" style="margin:0;${proj.exerciseLayout === "inline" ? "border:0;background:transparent;" : ""}">${escapeHtml(proj.exerciseNumber || `Bài tập ${idx + 1}`)}</span>` : ""}
            ${
              proj.sourceDocxFileName
                ? `<span class="pill" style="margin:0;">📄 ${escapeHtml(proj.sourceDocxFileName)}</span>`
                : ""
            }
            ${renderDocxLink(proj.docxUrl, proj.docxLinkLabel)}
            ${(proj.links || [])
              .map((l) => renderDocxLink(l.url, l.label))
              .join("")}
          </div>
          <h3 class="chapter-title font-editorial" data-open-project="${modalIdx}" style="cursor:pointer;">${escapeHtml(proj.title)}</h3>
        </div>
      </div>

      <div class="project-grid ${proj.media.length > 0 ? "" : "no-media"}" data-project-media-position="${proj.mediaPosition ?? "right"}" style="${proj.media.length > 0 ? "" : "grid-template-columns: 1fr;"}">
        <div class="chapter-left-flex" style="${proj.media.length > 0 ? "" : "width: 100%; max-width: 100%;"}">
          ${
            isMusicEditorial && idx % 2 === 1
              ? `<div class="chapter-stars-col" aria-hidden="true">
                  ${svgFourPointStar(26)}
                  ${svgFourPointStar(26)}
                  ${svgFourPointStar(26)}
                </div>`
              : ""
          }
          <div style="flex:1;min-width:0;">
            ${
              proj.assignmentBrief ||
              proj.keyTakeaways.some((takeaway) => takeaway.trim())
                ? `<div style="margin-bottom:18px;">
                  <h4 class="chapter-label">${isMedicalFamily ? "MỤC TIÊU TRỌNG TÂM" : "MỤC TIÊU"}</h4>
                  ${
                    proj.assignmentBrief
                      ? `<p style="margin:0 0 10px;font-size:15px;">${escapeHtml(
                          proj.assignmentBrief,
                        )}</p>`
                      : ""
                  }
                  ${
                    proj.keyTakeaways.some((takeaway) => takeaway.trim())
                      ? `<ul class="takeaway-list">${proj.keyTakeaways
                          .filter((takeaway) => takeaway.trim())
                          .map(
                            (k) => {
                              var shape = proj.takeawayBulletShape || "none";
                              var dotHtml = shape === "none" ? ""
                                : shape === "hyphen" ? `<span style="font-weight:bold;color:var(--primary);margin-right:2px;">—</span>`
                                : shape === "square" ? `<span class="takeaway-dot" style="border-radius:0;"></span>`
                                : shape === "star" ? `<span style="color:var(--primary);font-size:12px;margin-right:2px;">★</span>`
                                : shape === "check" ? `<span style="color:var(--primary);font-weight:bold;font-size:12px;margin-right:2px;">✔</span>`
                                : shape === "diamond" ? `<span style="color:var(--primary);font-size:12px;margin-right:2px;">◆</span>`
                                : `<span class="takeaway-dot"></span>`;
                              return `<li style="${shape === "none" ? "display:block;padding-left:0;" : ""}">${dotHtml}<span>${escapeHtml(k)}</span></li>`;
                            },
                          )
                          .join("")}</ul>`
                      : ""
                  }
                </div>`
                : ""
            }
            <div style="margin-bottom:16px;">
              <h4 class="chapter-label">${isMedicalFamily ? "QUY TRÌNH THỰC HIỆN" : "QUY TRÌNH &amp; KẾT QUẢ"}</h4>
              <p style="margin:0;font-size:15px;">${escapeHtml(proj.summary)}</p>
            </div>
            ${
              proj.metrics.length > 0
                ? `<div class="metrics-row">${proj.metrics
                    .map(
                      (m) =>
                        `<div class="metric-chip hover-lift"><span style="color:var(--primary);">${escapeHtml(
                          m.label,
                        )}: </span><strong>${escapeHtml(m.value)}</strong></div>`,
                    )
                    .join("")}</div>`
                : ""
            }
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;">
              ${
                proj.tags.length > 0
                  ? `<div style="display:flex;flex-wrap:gap:8px;font-size:12px;font-weight:600;color:var(--primary);">${proj.tags
                      .map((t) => `<span>#${escapeHtml(t)}</span>`)
                      .join("")}</div>`
                  : "<span></span>"
              }
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                <button type="button" class="btn-outline hover-lift no-print" data-open-project="${modalIdx}" style="cursor:pointer;font-family:inherit;">👁️ Xem chi tiết bài làm</button>
                <a class="pill hover-lift no-print" style="margin:0;font-size:11px;" href="projects/project-${modalIdx + 1}.html">Trang riêng ↗</a>
                ${proj.links
                  .map(
                    (lnk) =>
                      `<a class="pill hover-lift" style="margin:0;" href="${escapeHtml(
                        safeHref(lnk.url),
                      )}" target="_blank" rel="noreferrer">${escapeHtml(lnk.label)}</a>`,
                  )
                  .join("")}
              </div>
            </div>
            ${
              proj.fullRawExcerpt
                ? `<details style="margin-top:12px;"><summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--secondary);">Xem nội dung trích xuất chi tiết</summary><pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;opacity:0.88;">${escapeHtml(
                    proj.fullRawExcerpt,
                  )}</pre></details>`
                : ""
            }
          </div>
        </div>

        ${
          proj.media.length > 0
            ? `<div class="project-media-stack">
          ${proj.media
            .map((m, mIdx) => {
              const sourceLabel =
                m.sourceType === "docx-extracted"
                  ? "📄 Ảnh từ DOCX"
                  : m.sourceType === "ai-generated"
                    ? "✨ Ảnh AI"
                    : "🖼️ Ảnh tải lên";
              return `<div class="project-media-item hover-lift ${frameRadiusClass}">
              <span class="media-badge">${sourceLabel}</span>
              <img class="project-img" loading="lazy" decoding="async" data-open-project="${modalIdx}" data-media-index="${mIdx}" src="${escapeHtml(
                resolveSrc(m.url),
              )}" alt="${escapeHtml(m.caption || proj.title)}" />
            </div>`;
            })
            .join("")}
        </div>`
            : ""
        }
      </div>
    </article>`;
      })
      .join("")}
  </section>`;
}

function renderConclusionHtml(
  config: ConclusionConfig,
  projects: ProjectItem[] = [],
): string {
  const headingColor = safeCssColor(config.headingColor) ?? "var(--text)";
  const textColor = safeCssColor(config.textColor) ?? "var(--text)";
  const accentColor = safeCssColor(config.accentColor) ?? "var(--primary)";
  const cardBackground =
    safeCssColor(config.cardBackgroundColor) ?? "var(--surface)";
  const cardBorder =
    safeCssColor(config.cardBorderColor) ?? "var(--primary)";
  const sectionFont = safeFontFamily(config.fontFamily) ?? "var(--font-body)";
  const titleFontSizes = {
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
  };
  const bodyFontSizes = {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
  };
  const cardsHtml = config.cards
    .map((card, index) => {
      const defaultSpan =
        config.layout === "stacked" || config.layout === "timeline"
          ? 12
          : config.layout === "editorial"
            ? index === 0
              ? 8
              : 4
            : config.layout === "spotlight"
              ? index === 0
                ? 12
                : 6
              : config.layout === "two-cards" || config.layout === "masonry"
                ? 6
                : config.layout === "compact"
                  ? 3
                  : 4;
      const span =
        config.layout === "stacked" || config.layout === "timeline"
          ? 12
          : Math.max(1, Math.min(12, card.width ?? defaultSpan));
      const isFeatured = config.layout === "spotlight" && index === 0;
      const isTimeline = config.layout === "timeline";
      const cardTitleColor = isFeatured
        ? safeCssColor(card.titleColor) ?? "var(--bg)"
        : safeCssColor(card.titleColor) ?? headingColor;
      const cardTextColor = isFeatured
        ? safeCssColor(card.textColor) ?? "var(--bg)"
        : safeCssColor(card.textColor) ?? textColor;
      const cardStyle = [
        `--card-span:${span}`,
        `background-color:${isFeatured ? accentColor : safeCssColor(card.backgroundColor) ?? cardBackground}`,
        `border-color:${isFeatured ? accentColor : cardBorder}`,
        `color:${cardTextColor}`,
        `font-family:${safeFontFamily(card.bodyFontFamily) ?? sectionFont}`,
        `text-align:${card.bodyAlign ?? "left"}`,
        `min-height:${config.layout === "compact" || config.layout === "masonry" ? 0 : (card.height ?? 3) * 64}px`,
      ].join(";");
      const titleStyle = [
        `color:${cardTitleColor}`,
        `font-family:${safeFontFamily(card.titleFontFamily) ?? sectionFont}`,
        `font-size:${card.titleFontSize ? titleFontSizes[card.titleFontSize] : "18px"}`,
        `text-align:${card.titleAlign ?? "left"}`,
      ].join(";");
      const bodyStyle = [
        `font-size:${card.bodyFontSize ? bodyFontSizes[card.bodyFontSize] : "14px"}`,
        `text-align:${card.bodyAlign ?? "left"}`,
      ].join(";");
      const numberHtml = isTimeline
        ? `<span class="conclusion-timeline-number" style="color:${accentColor};">${escapeHtml(card.number)}</span>`
        : `<p class="conclusion-card__number" style="color:${isFeatured ? "var(--bg)" : accentColor};font-family:${safeFontFamily(card.titleFontFamily) ?? sectionFont};">${escapeHtml(card.number)}</p>`;
      return `<article class="conclusion-card conclusion-card--${config.layout}" data-conclusion-card-id="${escapeHtml(card.id)}" style="${cardStyle}">
        ${numberHtml}
        <h3 style="${titleStyle}">${escapeHtml(card.title)}</h3>
        ${card.body ? `<p class="conclusion-card__body" style="${bodyStyle}">${escapeHtml(card.body)}</p>` : ""}
        ${card.bullets.length ? `<ul style="${bodyStyle};padding-left:${card.bodyAlign === "center" ? 0 : 20}px;list-style:${card.bodyAlign === "center" ? "none" : "disc"};">${card.bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
      </article>`;
    })
    .join("");
  const projectLinks = config.projectLinks.length
    ? config.projectLinks
    : projects.map((project, index) => ({
        id: project.id || `project-${index + 1}`,
        title: project.title,
        text: "",
        href: `#project-item-${index}`,
      }));
  const projectLinksHtml = projectLinks
    .map((item, index) => {
      const href = item.href ? safeHref(item.href) : "";
      const label = `${escapeHtml(item.title)}${item.text ? `: ${escapeHtml(item.text)}` : ""}`;
      return `<li><span style="color:${accentColor};font-weight:700;">${String(index + 1).padStart(2, "0")}.</span> ${href ? `<a href="${escapeHtml(href)}">${label}</a>` : label}</li>`;
    })
    .join("");
  const aiToolsHtml = config.aiTools
    .map(
      (item) =>
        `<li><strong style="color:${accentColor};">${escapeHtml(item.title)}:</strong> ${escapeHtml(item.text)}</li>`,
    )
    .join("");
  const panelsHtml =
    projectLinksHtml || aiToolsHtml || config.closingNote
      ? `<div class="conclusion-panels">
          ${projectLinksHtml ? `<section class="conclusion-panel" style="border-color:${cardBorder};color:${textColor};font-family:${sectionFont};"><h3>${escapeHtml(config.projectLinksTitle)}</h3><ol>${projectLinksHtml}</ol></section>` : ""}
          ${aiToolsHtml || config.closingNote ? `<section class="conclusion-panel" style="border-color:${cardBorder};color:${textColor};font-family:${sectionFont};"><h3>${escapeHtml(config.aiToolsTitle)}</h3><ol>${aiToolsHtml}</ol>${config.closingNote ? `<p class="conclusion-closing-note" style="border-color:${cardBorder};">${escapeHtml(config.closingNote)}</p>` : ""}</section>` : ""}
        </div>`
      : "";

  return `<section id="conclusion" class="conclusion-export" data-conclusion-layout="${config.layout}" style="background-color:${safeCssColor(config.backgroundColor) ?? "transparent"};color:${textColor};font-family:${sectionFont};">
    <header class="conclusion-export__header">
      <p class="conclusion-export__eyebrow" style="color:${accentColor};">${escapeHtml(config.eyebrow)}</p>
      <h2 class="conclusion-export__title" style="color:${headingColor};">${escapeHtml(config.title)}</h2>
    </header>
    <div class="conclusion-grid conclusion-grid--${config.layout}">${cardsHtml}</div>
    ${panelsHtml}
  </section>`;
}

function renderContactHtml(
  contact: ContactSection,
  about: AboutSection | undefined,
  hero: HeroSection | undefined,
  isCanvaEditorial: boolean,
  projects?: ProjectItem[],
  profileOwner?: { fullName?: string },
  isMusicEditorial = false,
  templateId = "canva-editorial",
): string {
  const ownerIdentity = [hero?.fullName, hero?.roleTitle]
    .filter(Boolean)
    .join(" • ");

  const courseInfo = contact.courseInfo;

  const studentName =
    courseInfo?.studentName ||
    profileOwner?.fullName ||
    hero?.fullName ||
    "Sinh viên";
  const studentNamePosition = courseInfo?.studentNamePosition || "left";
  const studentNameJustify =
    studentNamePosition === "center"
      ? "center"
      : studentNamePosition === "right"
        ? "flex-end"
        : "flex-start";
  const studentId = courseInfo?.studentId || "25010001";
  const studentClass = courseInfo?.studentClass || "K18 - INF2501";
  const courseCode = courseInfo?.courseCode ?? "INF2501";
  const courseName =
    courseInfo?.courseName ??
    "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo";
  const institution =
    courseInfo?.institution ?? "Trường Đại học";
  const footerCourseText = [courseCode, courseName]
    .filter(Boolean)
    .map((s) => escapeHtml(s))
    .join(" - ");
  const courseTextHtml = footerCourseText
    ? `<p style="margin:0;font-weight:600;color:#f5f5f4;">${footerCourseText}</p>`
    : "";
  const institutionHtml = institution
    ? `<p style="margin:2px 0 0;color:#a8a29e;font-size:11px;">${escapeHtml(institution)}</p>`
    : "";

  const courseFooterHtml = `
    <footer data-testid="rubric-course-footer" style="margin-top:32px;border-top:1px solid rgba(0,0,0,0.1);background:#1c1917;padding:16px 24px;color:#d6d3d1;font-size:12px;">
      <div style="max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
        <div style="display:flex;flex:1 1 55%;flex-wrap:wrap;align-items:center;gap:4px 12px;justify-content:${studentNameJustify};">
          <span style="font-weight:700;color:#fff;font-size:13px;">${escapeHtml(studentName)}</span>
          <span style="margin-left:12px;background:#292524;padding:2px 8px;border-radius:4px;font-family:monospace;">MSSV: ${escapeHtml(studentId)}</span>
          <span style="margin-left:12px;color:#a8a29e;">Lớp: ${escapeHtml(studentClass)}</span>
        </div>
        <div style="text-align:right;">
          ${courseTextHtml}
          ${institutionHtml}
        </div>
      </div>
    </footer>`;
  const conclusionHtml = renderConclusionHtml(
    contact.conclusion ?? DEFAULT_CONCLUSION_CONFIG,
    projects,
  );

  if (isCanvaEditorial) {
    const exerciseLinks = (projects || [])
      .map(
        (proj, pIdx) =>
          `<a href="#project-item-${pIdx}" class="pill hover-lift" style="display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid rgba(255,255,255,0.35);padding:5px 14px;font-size:12px;color:var(--bg, #FFF3E6);background:rgba(255,255,255,0.1);text-decoration:none;"><span style="font-weight:700;opacity:0.8;">0${pIdx + 1}.</span><span>${escapeHtml(stripLeadingIndex(proj.title))}</span></a>`,
      )
      .join("");

    return `${conclusionHtml}
      <section id="contact" class="reveal-on-scroll" style="padding-bottom:0;">
        <div class="mocha-box-wrap">
          ${isMusicEditorial ? svgRotaSheetSticker() : ""}
          <div class="mocha-contact-box">
            <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;opacity:0.78;">${escapeHtml(
              contact.title,
            )}</p>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.65;">${escapeHtml(
              contact.subtitle,
            )}</p>
            ${
              about?.contactInfo.email
                ? `<p style="margin:18px 0 0;font-size:14px;font-weight:600;">Liên hệ trực tiếp: <a href="mailto:${escapeHtml(
                    about.contactInfo.email,
                  )}">${escapeHtml(about.contactInfo.email)}</a></p>`
                : ""
            }
            ${
              about?.contactInfo.phone
                ? `<p style="margin:6px 0 0;font-size:14px;">Điện thoại: ${escapeHtml(
                    about.contactInfo.phone,
                  )}</p>`
                : ""
            }
            ${
              about?.contactInfo.location
                ? `<p style="margin:6px 0 0;font-size:14px;">Địa điểm: ${escapeHtml(
                    about.contactInfo.location,
                  )}</p>`
                : ""
            }
            ${
              about?.contactInfo?.socials && about.contactInfo.socials.length > 0
                ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;">${about.contactInfo.socials
                    .map(
                      (s) =>
                        `<a href="${escapeHtml(
                          safeHref(s.url),
                        )}" target="_blank" rel="noreferrer" style="border:1px solid rgba(255,255,255,0.4);color:var(--bg);background:rgba(255,255,255,0.08);padding:5px 14px;border-radius:999px;text-decoration:none;font-size:12px;font-weight:600;">${escapeHtml(
                          s.platform,
                        )}</a>`,
                    )
                    .join("")}</div>`
                : ""
            }
            ${
              exerciseLinks
                ? `<div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.2);padding-top:16px;">
              <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;opacity:0.85;margin:0 0 10px;">TỔNG HỢP CÁC ĐƯỜNG LIÊN KẾT DẪN TỚI CÁC BÀI TẬP</p>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">${exerciseLinks}</div>
            </div>`
                : ""
            }
          </div>
        </div>

      <div class="thank-you-band">
        ${isMusicEditorial ? svgHalftoneVinylLeft() : ""}
        ${isMusicEditorial ? svgThankYouVinylBurst() : ""}
        <h2 class="thank-you-title font-editorial">Thank You !</h2>
        <p style="position:relative;z-index:2;margin:18px 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;">${escapeHtml(
          ownerIdentity || contact.thankYouMessage,
        )}</p>
        <p style="position:relative;z-index:2;margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:var(--secondary);">${escapeHtml(
          contact.thankYouMessage,
        )}</p>
      </div>

      ${courseFooterHtml}

      <div class="canva-footer-strip">
        <div style="display:flex;gap:16px;">
          <span>Điều khoản và hỗ trợ</span>
          <span>Chính sách quyền riêng tư</span>
        </div>
        <span>Canva Editorial Portfolio</span>
      </div>
      </section>`;
  }

  return `${conclusionHtml}<section id="contact" class="reveal-on-scroll">
    <div class="contact-box">
      <p style="text-transform:uppercase; letter-spacing:0.18em; font-size:12px; opacity:0.85;">${escapeHtml(
        contact.thankYouMessage,
      )}</p>
      <h2 style="margin:8px 0;">${escapeHtml(contact.title)}</h2>
      <p style="opacity:0.9;">${escapeHtml(contact.subtitle)}</p>
      ${
        about?.contactInfo.email
          ? `<p>Email: <a href="mailto:${escapeHtml(
              about.contactInfo.email,
            )}">${escapeHtml(about.contactInfo.email)}</a></p>`
          : ""
      }
      ${
        about?.contactInfo.phone
          ? `<p>Điện thoại: ${escapeHtml(about.contactInfo.phone)}</p>`
          : ""
      }
      ${
        about?.contactInfo.location
          ? `<p>Địa điểm: ${escapeHtml(about.contactInfo.location)}</p>`
          : ""
      }
      ${
        about?.contactInfo?.socials && about.contactInfo.socials.length > 0
          ? `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;">${about.contactInfo.socials
              .map(
                (s) =>
                  `<a href="${escapeHtml(
                    safeHref(s.url),
                  )}" target="_blank" rel="noreferrer" style="border:1px solid rgba(255,255,255,0.45); padding:6px 14px; border-radius:999px; text-decoration:none; font-size:13px;">${escapeHtml(
                    s.platform,
                  )}</a>`,
              )
              .join("")}</div>`
          : ""
      }
    </div>
    ${courseFooterHtml}
  </section>`;
}

export function renderStandaloneHtml(
  doc: PortfolioDocument,
  assetMap: Map<string, CollectedAsset>,
  inlineCss: boolean = false,
): string {
  const resolveSrc = (url: string) => assetMap.get(url)?.bundleRelPath || url;
  const pal = resolveDocPalette(doc);
  const isCanvaEditorial = pal.isCanvaEditorial;
  const toc = {
    placement: doc.theme.tableOfContents?.placement ?? "floating",
    side: doc.theme.tableOfContents?.side ?? "left",
    style: doc.theme.tableOfContents?.style ?? "pill",
  };

  const hero = doc.sections.find((s): s is HeroSection => s.type === "hero");
  const about = doc.sections.find((s): s is AboutSection => s.type === "about");
  const education = doc.sections.find(
    (s): s is EducationSection => s.type === "education",
  );
  const projectsSec = doc.sections.find(
    (s): s is ProjectsSection => s.type === "projects",
  );

  const cssBlock = inlineCss
    ? `<style>${renderStandaloneCss(doc)}</style>`
    : `<link rel="stylesheet" href="./assets/styles.css" />`;
  const background = doc.theme.backgroundIllustration;
  let backgroundLayerHtml = "";
  if (background && background.mode !== "none") {
    const opacity = Math.max(0, Math.min(1, background.opacity ?? 0.35));
    const blur = Math.max(0, Math.min(20, background.blur ?? 0));
    const backgroundStyle = `opacity:${opacity};${blur ? `filter:blur(${blur}px);` : ""}`;
    if (background.mode === "custom" && background.customUrl?.trim()) {
      const source = escapeHtml(resolveSrc(background.customUrl));
      const position = background.position ?? "cover";
      const positionClass = `portfolio-export-background-art--${position}`;
      const art =
        position === "pattern-repeat"
          ? `<div class="portfolio-export-background-art ${positionClass}" style="background-image:url(&quot;${source}&quot;);"></div>`
          : `<img class="portfolio-export-background-art portfolio-export-background-art--custom ${positionClass}" src="${source}" alt="" />`;
      backgroundLayerHtml = `<div class="portfolio-export-background" style="${backgroundStyle}" aria-hidden="true">${art}</div>`;
    } else if (background.mode === "preset") {
      const preset = getBackgroundPreset(background.presetId);
      if (preset) {
        const position = background.position ?? "cover";
        const positionClass = `portfolio-export-background-art--${position}`;
        const art =
          position === "pattern-repeat"
            ? `<div class="portfolio-export-background-art ${positionClass}" style="background-image:url(&quot;${escapeHtml(preset.svgDataUri)}&quot;);background-size:${escapeHtml(preset.patternSize ?? "400px auto")};color:${escapeHtml(pal.primary)};"></div>`
            : `<div class="portfolio-export-background-art portfolio-export-background-art--preset ${positionClass}" style="color:${escapeHtml(pal.primary)};">${preset.rawSvg.replace("<svg ", '<svg width="100%" height="100%" ')}</div>`;
        backgroundLayerHtml = `<div class="portfolio-export-background" style="${backgroundStyle}" aria-hidden="true">${art}</div>`;
      }
    }
  }
  const effects = doc.theme.effects ?? {
    enableFloat: false,
    enableGlow: false,
    enableTilt: false,
    enableSparkles: false,
    revealVariant: "fade-up" as const,
    enableParallax: false,
  };
  const effectDecorations = [
    effects.enableFloat
      ? `<span class="effect-orb" style="top:-7%;left:-6%;background:radial-gradient(circle,${escapeHtml(pal.primary)}80,transparent 70%);opacity:.35;"></span>
         <span class="effect-orb" style="background:radial-gradient(circle,${escapeHtml(pal.secondary)}70,transparent 70%);opacity:.3;"></span>
         <span class="effect-orb" style="background:radial-gradient(circle,${escapeHtml(pal.primary)}60,transparent 70%);opacity:.25;"></span>`
      : "",
    effects.enableGlow
      ? `<span class="effect-glow" style="top:28%;left:18%;background:radial-gradient(circle,${escapeHtml(pal.primary)}55,transparent 68%);opacity:.24;"></span>
         <span class="effect-glow" style="right:8%;bottom:18%;background:radial-gradient(circle,${escapeHtml(pal.secondary)}45,transparent 68%);opacity:.2;"></span>`
      : "",
    effects.enableSparkles
      ? [
          ["12%", "8%", pal.primary],
          ["22%", "89%", pal.secondary],
          ["45%", "5%", "#F59E0B"],
          ["58%", "92%", pal.primary],
          ["78%", "12%", pal.secondary],
          ["88%", "86%", "#F59E0B"],
        ]
          .map(
            ([top, left, color], index) =>
              `<svg class="effect-sparkle" style="top:${top};left:${left};animation-delay:${index * 0.45}s;fill:${escapeHtml(color)};" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z"/></svg>`,
          )
          .join("")
      : "",
    effects.enableParallax &&
    (!doc.theme.backgroundIllustration ||
      doc.theme.backgroundIllustration.mode === "none" ||
      (doc.theme.backgroundIllustration.mode === "preset" &&
        doc.theme.backgroundIllustration.presetId === "none"))
      ? `<span class="effect-parallax-wash"></span>`
      : "",
  ].join("");
  const effectLayerHtml = effectDecorations
    ? `<div class="portfolio-export-effects" aria-hidden="true">${effectDecorations}</div>`
    : "";

  const navLinksList: Array<{ id: string; label: string }> = [];
  const seenTypes = new Set<string>();
  for (const sec of doc.sections) {
    if (seenTypes.has(sec.type)) continue;
    seenTypes.add(sec.type);
    if (sec.type === "contact") {
      navLinksList.push({ id: "conclusion", label: "Lời kết" });
    }
    navLinksList.push({ id: sec.type, label: NAV_LABELS[sec.type] || sec.type });
  }

  const navLinksHtml = navLinksList
    .map(
      (item) => `<a href="#${item.id}">${escapeHtml(item.label)}</a>`,
    )
    .join("");

  const modalProjects: ProjectItem[] = [];
  const sectionsHtml = doc.sections
    .map((sec) => {
      const sectionHtml = (() => {
        switch (sec.type) {
          case "hero":
            return renderHeroHtml(sec, resolveSrc, isCanvaEditorial, pal.primary, pal.secondary, pal.isMusicEditorial, doc.templateId);
          case "about":
            return renderAboutHtml(
              sec,
              isCanvaEditorial,
              hero?.avatar.url ? resolveSrc(hero.avatar.url) : undefined,
              hero?.fullName,
              education,
              pal.isMusicEditorial,
              doc.templateId,
            );
          case "skills":
            return renderSkillsHtml(sec, resolveSrc, isCanvaEditorial);
          case "experience":
            return renderExperienceHtml(sec, isCanvaEditorial);
          case "education":
            return renderEducationHtml(sec, isCanvaEditorial);
          case "projects":
            return renderProjectsHtml(
              sec,
              resolveSrc,
              modalProjects,
              isCanvaEditorial,
              pal.isMusicEditorial,
              doc.templateId,
            );
          case "contact":
            return renderContactHtml(
              sec,
              about,
              hero,
              isCanvaEditorial,
              projectsSec?.projects,
              doc.profileOwner,
              pal.isMusicEditorial,
              doc.templateId,
            );
        }
      })();
      return applySectionTypography(
        sectionHtml,
        sec,
        pal.headingFont,
        pal.bodyFont,
      );
    })
    .join("\n");

  const safeProjectsJson = JSON.stringify(modalProjects).replace(
    /</g,
    "\\u003c",
  );

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(doc.seo.title)}</title>
  <meta name="description" content="${escapeHtml(doc.seo.description)}" />
  ${
    doc.seo.ogImage
      ? `<meta property="og:image" content="${escapeHtml(
          resolveSrc(doc.seo.ogImage),
        )}" />`
      : ""
  }
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ${cssBlock}
</head>
<body${isCanvaEditorial ? ' class="theme-canva-editorial"' : ""}>
  <div class="portfolio-export-root"
    data-effect-tilt="${effects.enableTilt ? "enabled" : "disabled"}"
    data-effect-glow="${effects.enableGlow ? "enabled" : "disabled"}"
    data-effect-parallax="${effects.enableParallax ? "enabled" : "disabled"}"
    data-effect-float="${effects.enableFloat ? "enabled" : "disabled"}"
    data-effect-sparkles="${effects.enableSparkles ? "enabled" : "disabled"}"
    data-reveal-variant="${effects.revealVariant}">
  ${backgroundLayerHtml}
  ${effectLayerHtml}
  <nav class="nav no-print" data-toc-placement="${toc.placement}" data-toc-side="${toc.side}" data-toc-style="${toc.style}" aria-label="Điều hướng Portfolio">
    <div class="nav-inner">
      <strong class="font-editorial">${escapeHtml(hero?.fullName || doc.seo.title)}</strong>
      <div class="nav-links">
        ${navLinksHtml}
        <button type="button" class="btn-print" onclick="window.print()">Xuất PDF</button>
      </div>
    </div>
  </nav>

  <main class="container">
    ${sectionsHtml}
  </main>
  </div>

  <div id="assignment-modal" class="modal-backdrop no-print" role="dialog" aria-modal="true" aria-hidden="true">
    <button type="button" id="modal-float-prev" class="modal-edge-nav modal-edge-prev" aria-label="Bài trước" title="Bài trước (ArrowLeft)">‹</button>
    <button type="button" id="modal-float-next" class="modal-edge-nav modal-edge-next" aria-label="Bài tiếp theo" title="Bài tiếp theo (ArrowRight)">›</button>
    <div class="modal-panel glass-panel">
      <div class="modal-top-bar">
        <div class="modal-nav-group">
          <span id="modal-counter-badge" class="modal-counter-badge"></span>
          <button type="button" id="modal-prev-btn" class="modal-icon-btn" aria-label="Bài trước" title="Bài trước (ArrowLeft)">‹</button>
          <button type="button" id="modal-next-btn" class="modal-icon-btn" aria-label="Bài tiếp theo" title="Bài tiếp theo (ArrowRight)">›</button>
        </div>
        <div class="modal-actions-group">
          <button type="button" id="modal-fullscreen-btn" class="modal-icon-btn" aria-label="Mở rộng toàn màn hình" title="Mở rộng toàn màn hình (100vw/100vh)">⛶</button>
          <button type="button" id="modal-close-btn" class="modal-close" aria-label="Đóng cửa sổ chi tiết">&times;</button>
        </div>
      </div>
      <div id="modal-content"></div>
    </div>
  </div>

  <div id="modal-lightbox" class="modal-lightbox" style="display:none;" aria-hidden="true">
    <button type="button" id="lightbox-close-btn" class="lightbox-close" aria-label="Thu nhỏ ảnh">&times;</button>
    <img id="lightbox-img" class="lightbox-img" src="" alt="" />
    <div id="lightbox-caption" class="lightbox-caption"></div>
    <div id="lightbox-nav" class="lightbox-nav" style="display:none;">
      <button type="button" id="lightbox-prev-btn" class="lightbox-btn" aria-label="Ảnh trước">‹</button>
      <span id="lightbox-counter" class="lightbox-counter"></span>
      <button type="button" id="lightbox-next-btn" class="lightbox-btn" aria-label="Ảnh tiếp theo">›</button>
    </div>
  </div>

  <script id="portfolio-projects-data" type="application/json">${safeProjectsJson}</script>
  <script>
    (function () {
      var containers = document.querySelectorAll('.about-highlight-value');
      if (!containers.length) return;

      function measure(container) {
        var text = container.querySelector('.about-highlight-value__text');
        if (!text) return;
        var distance = Math.max(0, Math.ceil(text.scrollWidth - container.clientWidth));
        if (distance > 0) {
          container.tabIndex = 0;
          text.classList.add('is-overflowing');
          container.style.setProperty('--about-marquee-distance', '-' + distance + 'px');
          container.style.setProperty('--about-marquee-duration', Math.max(4, distance / 24) + 's');
        } else {
          container.removeAttribute('tabindex');
          text.classList.remove('is-overflowing');
          container.style.removeProperty('--about-marquee-distance');
          container.style.removeProperty('--about-marquee-duration');
        }
      }

      if (typeof ResizeObserver !== 'undefined') {
        for (var i = 0; i < containers.length; i++) {
          (function (container) {
            var text = container.querySelector('.about-highlight-value__text');
            var observer = new ResizeObserver(function () { measure(container); });
            observer.observe(container);
            if (text) observer.observe(text);
            measure(container);
          })(containers[i]);
        }
      } else {
        function measureAll() {
          for (var j = 0; j < containers.length; j++) measure(containers[j]);
        }
        measureAll();
        window.addEventListener('resize', measureAll);
      }
    })();
  </script>
  <script>
    (function () {
      var dataEl = document.getElementById('portfolio-projects-data');
      var modal = document.getElementById('assignment-modal');
      var content = document.getElementById('modal-content');
      var closeBtn = document.getElementById('modal-close-btn');
      var prevBtn = document.getElementById('modal-prev-btn');
      var nextBtn = document.getElementById('modal-next-btn');
      var floatPrevBtn = document.getElementById('modal-float-prev');
      var floatNextBtn = document.getElementById('modal-float-next');
      var fullscreenBtn = document.getElementById('modal-fullscreen-btn');
      var counterBadge = document.getElementById('modal-counter-badge');
      if (!dataEl || !modal || !content || !closeBtn) return;
      var panel = modal.querySelector('.modal-panel');
      var projects = [];
      try { projects = JSON.parse(dataEl.textContent || '[]'); } catch (e) { projects = []; }

      var currentProjIdx = 0;
      var currentMediaIdx = 0;

      var lightbox = document.getElementById('modal-lightbox');
      var lbImg = document.getElementById('lightbox-img');
      var lbCaption = document.getElementById('lightbox-caption');
      var lbCloseBtn = document.getElementById('lightbox-close-btn');
      var lbPrevBtn = document.getElementById('lightbox-prev-btn');
      var lbNextBtn = document.getElementById('lightbox-next-btn');
      var lbNav = document.getElementById('lightbox-nav');
      var lbCounter = document.getElementById('lightbox-counter');
      var lbActiveIdx = 0;

      function openLightbox(mediaIdx) {
        var p = projects[currentProjIdx];
        if (!p || !p.media || !p.media.length) return;
        lbActiveIdx = mediaIdx || 0;
        updateLightbox();
        if (lightbox) {
          lightbox.style.display = 'flex';
          lightbox.setAttribute('aria-hidden', 'false');
        }
      }

      function updateLightbox() {
        var p = projects[currentProjIdx];
        if (!p || !p.media || !p.media.length) return;
        if (lbActiveIdx < 0) lbActiveIdx = p.media.length - 1;
        if (lbActiveIdx >= p.media.length) lbActiveIdx = 0;
        var item = p.media[lbActiveIdx];
        if (lbImg) { lbImg.src = item.url; lbImg.alt = item.caption || p.title || ''; }
        if (lbCaption) lbCaption.textContent = item.caption || '';
        if (lbNav && p.media.length > 1) {
          lbNav.style.display = 'flex';
          if (lbCounter) lbCounter.textContent = (lbActiveIdx + 1) + ' / ' + p.media.length;
        } else if (lbNav) {
          lbNav.style.display = 'none';
        }
      }

      function closeLightbox() {
        if (lightbox) {
          lightbox.style.display = 'none';
          lightbox.setAttribute('aria-hidden', 'true');
        }
        if (currentMediaIdx !== lbActiveIdx) {
          openProject(currentProjIdx, lbActiveIdx);
        }
      }

      if (lbCloseBtn) lbCloseBtn.addEventListener('click', closeLightbox);
      if (lightbox) {
        lightbox.addEventListener('click', function(ev) {
          if (ev.target === lightbox) closeLightbox();
        });
      }
      if (lbPrevBtn) {
        lbPrevBtn.addEventListener('click', function(ev) {
          ev.stopPropagation();
          lbActiveIdx--;
          updateLightbox();
        });
      }
      if (lbNextBtn) {
        lbNextBtn.addEventListener('click', function(ev) {
          ev.stopPropagation();
          lbActiveIdx++;
          updateLightbox();
        });
      }

      function updateCounter() {
        if (counterBadge && projects.length > 0) {
          var cur = String(currentProjIdx + 1).padStart(2, '0');
          var tot = String(projects.length).padStart(2, '0');
          counterBadge.textContent = cur + ' / ' + tot + ' — BÀI TẬP ' + (currentProjIdx + 1);
        }
      }

      function makeEl(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
      }

      function openProject(projIdx, mediaIdx) {
        if (projects.length === 0) return;
        if (projIdx < 0) projIdx = projects.length - 1;
        if (projIdx >= projects.length) projIdx = 0;
        currentProjIdx = projIdx;
        currentMediaIdx = mediaIdx || 0;

        try {
          var currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('project', String(projIdx + 1));
          window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
        } catch (e) {}

        updateCounter();

        var prevP = projects[(currentProjIdx - 1 + projects.length) % projects.length];
        var nextP = projects[(currentProjIdx + 1) % projects.length];
        var prevTitle = '‹ Bài trước: ' + (prevP ? prevP.title : '');
        var nextTitle = 'Bài tiếp theo: ' + (nextP ? nextP.title : '') + ' ›';
        if (prevBtn) {
          prevBtn.title = prevTitle;
          prevBtn.style.display = projects.length > 1 ? 'inline-flex' : 'none';
        }
        if (nextBtn) {
          nextBtn.title = nextTitle;
          nextBtn.style.display = projects.length > 1 ? 'inline-flex' : 'none';
        }
        if (floatPrevBtn) {
          floatPrevBtn.title = prevTitle;
          floatPrevBtn.style.display = projects.length > 1 ? 'flex' : 'none';
        }
        if (floatNextBtn) {
          floatNextBtn.title = nextTitle;
          floatNextBtn.style.display = projects.length > 1 ? 'flex' : 'none';
        }

        var proj = projects[projIdx];
        if (!proj) return;
        var media = Array.isArray(proj.media) ? proj.media : [];
        if (currentMediaIdx >= media.length) currentMediaIdx = 0;
        var active = media[currentMediaIdx] || media[0];
        content.textContent = '';

        var headerRow = makeEl('div', 'modal-header-row');
        headerRow.style.display = 'flex';
        headerRow.style.alignItems = 'center';
        headerRow.style.flexWrap = 'wrap';
        headerRow.style.gap = '8px';
        headerRow.style.marginBottom = '8px';

        if (proj.showChapter !== false) {
          var chapterLayout = proj.chapterLayout || 'badge';
          var catPill = makeEl('span', 'pill', (proj.chapterTitle || ('Chương ' + (projIdx + 1) + ': ' + (proj.category || ''))));
          if (chapterLayout === 'banner') {
            catPill.style.display = 'block';
            catPill.style.width = '100%';
            catPill.style.backgroundColor = 'var(--primary)';
            catPill.style.color = 'var(--bg)';
            catPill.style.fontWeight = 'bold';
          } else if (chapterLayout === 'minimal') {
            catPill.style.backgroundColor = 'transparent';
            catPill.style.border = '1px solid currentColor';
          }
          headerRow.appendChild(catPill);
        }

        if (proj.showExercise !== false) {
          var exPill = makeEl('span', 'pill', (proj.exerciseNumber || ('Bài tập ' + (projIdx + 1))));
          if (proj.exerciseLayout === 'inline') {
            exPill.style.backgroundColor = 'transparent';
            exPill.style.border = '0';
            exPill.style.fontWeight = 'bold';
          }
          headerRow.appendChild(exPill);
        }

        if (proj.sourceDocxFileName) {
          var docxNamePill = makeEl('span', 'pill', '📄 ' + proj.sourceDocxFileName);
          headerRow.appendChild(docxNamePill);
        }

        var docxHref = typeof proj.docxUrl === 'string' &&
          (/^https?:\\/\\//i.test(proj.docxUrl) || proj.docxUrl.startsWith('/'))
          ? proj.docxUrl
          : '';
        if (docxHref) {
          var docxLink = makeEl('a', 'pill', '🔗 ' + (proj.docxLinkLabel || 'Mở file DOCX'));
          docxLink.href = docxHref;
          docxLink.target = '_blank';
          docxLink.rel = 'noopener noreferrer';
          docxLink.style.textDecoration = 'none';
          headerRow.appendChild(docxLink);
        }


        var linkStandalone = makeEl('a', 'pill', 'Mở trang chi tiết ↗');
        linkStandalone.href = 'projects/project-' + (projIdx + 1) + '.html';
        linkStandalone.target = '_top';
        linkStandalone.style.textDecoration = 'none';
        linkStandalone.style.marginLeft = 'auto';
        headerRow.appendChild(linkStandalone);

        content.appendChild(headerRow);

        var heading = makeEl('h2', 'font-editorial', proj.title || '');
        heading.style.margin = '8px 0 16px';
        content.appendChild(heading);

        var grid = makeEl('div', 'modal-body-grid');
        grid.setAttribute('data-detail-layout', proj.detailLayout || 'standard');
        var mediaSlot = makeEl('div');
        mediaSlot.id = 'modal-media-slot';

        if (active && active.url) {
          var mediaBox = makeEl('div', 'modal-media-box');
          var srcLabel = active.sourceType === 'docx-extracted' ? '📄 Ảnh trích xuất DOCX'
            : active.sourceType === 'ai-generated' ? '✨ Ảnh minh họa AI'
            : '🖼️ Ảnh tải lên';
          var badge = makeEl('div', 'modal-media-badge', srcLabel);
          mediaBox.appendChild(badge);

          var zoomBtn = makeEl('button', 'modal-zoom-btn', '⛶');
          zoomBtn.type = 'button';
          zoomBtn.title = 'Phóng to ảnh';
          zoomBtn.setAttribute('aria-label', 'Phóng to ảnh');
          zoomBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openLightbox(currentMediaIdx);
          });
          mediaBox.appendChild(zoomBtn);

          if (media.length > 1) {
            var prevImgBtn = makeEl('button', 'modal-img-arrow prev', '‹');
            prevImgBtn.type = 'button';
            prevImgBtn.title = 'Ảnh trước';
            prevImgBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              openProject(currentProjIdx, (currentMediaIdx - 1 + media.length) % media.length);
            });
            mediaBox.appendChild(prevImgBtn);

            var nextImgBtn = makeEl('button', 'modal-img-arrow next', '›');
            nextImgBtn.type = 'button';
            nextImgBtn.title = 'Ảnh tiếp theo';
            nextImgBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              openProject(currentProjIdx, (currentMediaIdx + 1) % media.length);
            });
            mediaBox.appendChild(nextImgBtn);
          }

          var modalImg = document.createElement('img');
          modalImg.className = 'modal-img';
          modalImg.src = active.url;
          modalImg.alt = active.caption || proj.title || '';
          modalImg.addEventListener('click', function() { openLightbox(currentMediaIdx); });
          mediaBox.appendChild(modalImg);
          mediaSlot.appendChild(mediaBox);
        } else {
          var emptyBox = makeEl('div', 'modal-media-box');
          emptyBox.style.borderStyle = 'dashed';
          emptyBox.style.opacity = '0.65';
          emptyBox.style.fontSize = '14px';
          emptyBox.style.display = 'flex';
          emptyBox.style.alignItems = 'center';
          emptyBox.style.justifyContent = 'center';
          emptyBox.style.minHeight = '220px';
          emptyBox.style.textAlign = 'center';
          emptyBox.style.padding = '20px';
          emptyBox.textContent = 'Chưa có hình ảnh đính kèm cho bài tập này';
          mediaSlot.appendChild(emptyBox);
        }

        if (active && active.caption) {
          var cap = makeEl('p', '', active.caption);
          cap.style.fontSize = '12px';
          cap.style.fontStyle = 'italic';
          cap.style.opacity = '0.75';
          cap.style.marginTop = '6px';
          mediaSlot.appendChild(cap);
        }

        if (active && active.aiPromptUsed) {
          var promptBox = makeEl('div', 'brief-box');
          promptBox.style.marginTop = '8px';
          promptBox.style.fontSize = '12px';
          promptBox.appendChild(makeEl('strong', '', '✨ Prompt AI đã dùng: '));
          promptBox.appendChild(document.createTextNode(active.aiPromptUsed));
          mediaSlot.appendChild(promptBox);
        }

        if (media.length > 1) {
          var thumbStrip = makeEl('div', 'modal-thumb-strip');
          for (var tIdx = 0; tIdx < media.length; tIdx++) {
            (function(idx) {
              var tBtn = makeEl('button', 'modal-thumb-btn' + (idx === currentMediaIdx ? ' active' : ''));
              tBtn.type = 'button';
              tBtn.title = media[idx].caption || ('Ảnh ' + (idx + 1));
              var tImg = document.createElement('img');
              tImg.src = media[idx].url;
              tImg.alt = media[idx].caption || '';
              tBtn.appendChild(tImg);
              tBtn.addEventListener('click', function() { openProject(currentProjIdx, idx); });
              thumbStrip.appendChild(tBtn);
            })(tIdx);
          }
          mediaSlot.appendChild(thumbStrip);
        }

        if (proj.promptComparison && (proj.showPromptComparison ?? true)) {
          var compBox = makeEl('div', 'brief-box');
          compBox.style.marginTop = '10px';
          compBox.appendChild(makeEl('strong', '', '⚖️ So sánh Prompt ban đầu vs Prompt cải tiến: '));
          var initialDiv = makeEl('div');
          initialDiv.style.padding = '8px';
          initialDiv.style.margin = '6px 0';
          initialDiv.style.borderRadius = '8px';
          initialDiv.style.background = 'rgba(239, 68, 68, 0.1)';
          initialDiv.style.border = '1px solid rgba(239, 68, 68, 0.2)';
          initialDiv.appendChild(makeEl('strong', '', '1. Prompt ban đầu (Initial Prompt): '));
          initialDiv.appendChild(document.createTextNode(proj.promptComparison.initialPrompt));
          compBox.appendChild(initialDiv);

          var improvedDiv = makeEl('div');
          improvedDiv.style.padding = '8px';
          improvedDiv.style.margin = '6px 0';
          improvedDiv.style.borderRadius = '8px';
          improvedDiv.style.background = 'rgba(16, 185, 129, 0.1)';
          improvedDiv.style.border = '1px solid rgba(16, 185, 129, 0.2)';
          improvedDiv.appendChild(makeEl('strong', '', '2. Prompt cải tiến (Improved Prompt): '));
          improvedDiv.appendChild(document.createTextNode(proj.promptComparison.improvedPrompt));
          compBox.appendChild(improvedDiv);

          if (proj.promptComparison.aiOutput) {
            var outputDiv = makeEl('div');
            outputDiv.style.padding = '8px';
            outputDiv.style.margin = '6px 0';
            outputDiv.style.borderRadius = '8px';
            outputDiv.style.background = 'rgba(0, 0, 0, 0.04)';
            outputDiv.appendChild(makeEl('strong', '', '3. Kết quả AI đạt được: '));
            outputDiv.appendChild(document.createTextNode(proj.promptComparison.aiOutput));
            compBox.appendChild(outputDiv);
          }
          mediaSlot.appendChild(compBox);
        }

        if (Array.isArray(proj.metrics) && proj.metrics.length > 0) {
          var mGrid = makeEl('div', 'modal-metrics-grid');
          for (var mi = 0; mi < proj.metrics.length; mi++) {
            var mItem = proj.metrics[mi];
            var mChip = makeEl('div', 'modal-metric-chip');
            mChip.appendChild(makeEl('small', '', mItem.label));
            mChip.appendChild(makeEl('strong', '', mItem.value));
            mGrid.appendChild(mChip);
          }
          mediaSlot.appendChild(mGrid);
        }

        grid.appendChild(mediaSlot);

        var infoCol = makeEl('div');
        if (proj.assignmentBrief && proj.assignmentBrief.trim() !== proj.summary?.trim()) {
          var brief = makeEl('div', 'brief-box');
          brief.appendChild(makeEl('strong', '', '🎯 Đề bài & Mục tiêu bài tập: '));
          var briefP = makeEl('p', '', proj.assignmentBrief);
          briefP.style.margin = '6px 0 0';
          brief.appendChild(briefP);
          infoCol.appendChild(brief);
        }

        if (proj.summary) {
          var sumBox = makeEl('div', 'brief-box');
          sumBox.appendChild(makeEl('strong', '', '💡 Quá trình thực hiện & Giải pháp: '));
          var sumP = makeEl('p', '', proj.summary);
          sumP.style.margin = '6px 0 0';
          sumBox.appendChild(sumP);
          infoCol.appendChild(sumBox);
        }

        if (Array.isArray(proj.processSteps) && proj.processSteps.length > 0) {
          var stepsBox = makeEl('div', 'brief-box');
          stepsBox.appendChild(makeEl('strong', '', '📋 Các bước thực hiện: '));
          var stepOl = makeEl('ol');
          for (var sIdx = 0; sIdx < proj.processSteps.length; sIdx++) {
            stepOl.appendChild(makeEl('li', '', proj.processSteps[sIdx]));
          }
          stepsBox.appendChild(stepOl);
          infoCol.appendChild(stepsBox);
        }

        if (proj.obstaclesAndSolutions) {
          var obsBox = makeEl('div', 'brief-box');
          obsBox.appendChild(makeEl('strong', '', '⚠️ Khó khăn & Giải pháp: '));
          var obsP = makeEl('p', '', proj.obstaclesAndSolutions);
          obsP.style.margin = '6px 0 0';
          obsBox.appendChild(obsP);
          infoCol.appendChild(obsBox);
        }

        var takeaways = Array.isArray(proj.keyTakeaways)
          ? proj.keyTakeaways.filter(function (item) { return item && item.trim(); })
          : [];
        if (takeaways.length > 0) {
          var takeBox = makeEl('div', 'brief-box');
          takeBox.appendChild(makeEl('strong', '', '✅ Kỹ năng cốt lõi & Kết quả kỳ vọng: '));
          var bulletShape = proj.takeawayBulletShape || 'none';
          var bulletChar = bulletShape === 'none' ? ''
            : bulletShape === 'hyphen' ? '— '
            : bulletShape === 'square' ? '■ '
            : bulletShape === 'star' ? '★ '
            : bulletShape === 'check' ? '✔ '
            : bulletShape === 'diamond' ? '◆ '
            : '• ';
          var ul = makeEl('ul');
          ul.style.listStyle = 'none';
          ul.style.paddingLeft = '0';
          ul.style.margin = '6px 0 0';
          for (var k = 0; k < takeaways.length; k++) {
            var li = makeEl('li');
            if (bulletShape !== 'none') {
              li.style.display = 'flex';
              li.style.alignItems = 'flex-start';
              li.style.gap = '6px';
            } else {
              li.style.display = 'block';
            }
            li.style.marginBottom = '4px';
            if (bulletShape !== 'none') {
              var bSpan = makeEl('span', '', bulletChar);
              bSpan.style.color = 'var(--primary)';
              bSpan.style.fontWeight = 'bold';
              li.appendChild(bSpan);
            }
            li.appendChild(document.createTextNode(takeaways[k]));
            ul.appendChild(li);
          }
          takeBox.appendChild(ul);
          infoCol.appendChild(takeBox);
        }

        if (Array.isArray(proj.links) && proj.links.length > 0) {
          var linksRow = makeEl('div');
          linksRow.style.display = 'flex';
          linksRow.style.flexWrap = 'wrap';
          linksRow.style.gap = '8px';
          linksRow.style.marginTop = '8px';
          for (var lIdx = 0; lIdx < proj.links.length; lIdx++) {
            var lnk = proj.links[lIdx];
            var safeUrl = '#';
            if (typeof lnk.url === 'string') {
              var tr = lnk.url.trim();
              if (
                tr.startsWith('http://') ||
                tr.startsWith('https://') ||
                tr.startsWith('mailto:') ||
                tr.startsWith('tel:') ||
                tr.startsWith('/') ||
                tr.startsWith('./') ||
                tr.startsWith('../') ||
                tr.startsWith('#')
              ) {
                safeUrl = tr;
              }
            }
            var linkEl = makeEl('a', 'pill', '🔗 ' + lnk.label);
            linkEl.href = safeUrl;
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            linksRow.appendChild(linkEl);
          }
          infoCol.appendChild(linksRow);
        }

        if (proj.fullRawExcerpt) {
          var det = makeEl('details', 'brief-box');
          det.style.marginTop = '10px';
          var sum = makeEl('summary', '', '📄 Nội dung trích xuất chi tiết từ bài làm');
          sum.style.cursor = 'pointer';
          sum.style.fontWeight = '600';
          var pre = makeEl('pre', '', proj.fullRawExcerpt);
          pre.style.whiteSpace = 'pre-wrap';
          pre.style.fontFamily = 'inherit';
          pre.style.fontSize = '12px';
          pre.style.marginTop = '8px';
          pre.style.maxHeight = '200px';
          pre.style.overflowY = 'auto';
          det.appendChild(sum);
          det.appendChild(pre);
          infoCol.appendChild(det);
        }

        if (Array.isArray(proj.tags) && proj.tags.length > 0) {
          var tagsRow = makeEl('div');
          tagsRow.style.display = 'flex';
          tagsRow.style.flexWrap = 'wrap';
          tagsRow.style.alignItems = 'center';
          tagsRow.style.gap = '6px';
          tagsRow.style.marginTop = '12px';
          tagsRow.appendChild(makeEl('span', '', '🏷️'));
          for (var tgIdx = 0; tgIdx < proj.tags.length; tgIdx++) {
            tagsRow.appendChild(makeEl('span', 'pill', '#' + proj.tags[tgIdx]));
          }
          infoCol.appendChild(tagsRow);
        }

        grid.appendChild(infoCol);
        content.appendChild(grid);

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      }

      function closeModal() {
        modal.classList.remove('open');
        modal.classList.remove('is-fullscreen');
        modal.setAttribute('aria-hidden', 'true');
        if (panel) panel.classList.remove('is-fullscreen');
        closeLightbox();
        try {
          var curUrl = new URL(window.location.href);
          if (curUrl.searchParams.has('project')) {
            curUrl.searchParams.delete('project');
            window.history.replaceState(null, '', curUrl.pathname + (curUrl.search || '') + curUrl.hash);
          }
        } catch (e) {}
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openProject(currentProjIdx - 1, 0);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openProject(currentProjIdx + 1, 0);
        });
      }
      if (floatPrevBtn) {
        floatPrevBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openProject(currentProjIdx - 1, 0);
        });
      }
      if (floatNextBtn) {
        floatNextBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openProject(currentProjIdx + 1, 0);
        });
      }
      if (fullscreenBtn && panel) {
        fullscreenBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var isFull = panel.classList.toggle('is-fullscreen');
          if (modal) {
            if (isFull) modal.classList.add('is-fullscreen');
            else modal.classList.remove('is-fullscreen');
          }
        });
      }
      closeBtn.addEventListener('click', closeModal);

      document.addEventListener('click', function (ev) {
        var interactive = ev.target && ev.target.closest ? ev.target.closest('a, details, summary, input') : null;
        if (interactive && !interactive.hasAttribute('data-open-project')) {
          return;
        }
        var target = ev.target && ev.target.closest ? ev.target.closest('[data-open-project]') : null;
        if (target) {
          var pIdx = Number(target.getAttribute('data-open-project'));
          var mIdx = Number(target.getAttribute('data-media-index') || '0');
          openProject(pIdx, mIdx);
        } else if (ev.target === modal) {
          closeModal();
        }
      });

      document.addEventListener('keydown', function (ev) {
        if (lightbox && lightbox.style.display !== 'none') {
          if (ev.key === 'Escape') {
            closeLightbox();
          } else if (ev.key === 'ArrowLeft') {
            lbActiveIdx--;
            updateLightbox();
          } else if (ev.key === 'ArrowRight') {
            lbActiveIdx++;
            updateLightbox();
          }
          return;
        }
        if (!modal.classList.contains('open')) return;
        if (ev.key === 'Escape') {
          if (panel && panel.classList.contains('is-fullscreen')) {
            panel.classList.remove('is-fullscreen');
            if (modal) modal.classList.remove('is-fullscreen');
          } else {
            closeModal();
          }
        } else if (ev.key === 'ArrowLeft') {
          if (projects.length > 1) openProject(currentProjIdx - 1, 0);
        } else if (ev.key === 'ArrowRight') {
          if (projects.length > 1) openProject(currentProjIdx + 1, 0);
        }
      });

      var requestedProject = Number(new URLSearchParams(window.location.search).get('project'));
      if (Number.isInteger(requestedProject) && requestedProject > 0 && requestedProject <= projects.length) {
        openProject(requestedProject - 1, 0);
      }
    })();
  </script>
  <script>
    (function () {
      var root = document.querySelector('.portfolio-export-root[data-effect-parallax="enabled"]');
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var frame = 0;
      function updateParallax() {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(function () {
          var offset = Math.min(window.scrollY * 0.12, 120);
          root.style.setProperty('--portfolio-parallax-offset', offset + 'px');
        });
      }
      updateParallax();
      window.addEventListener('scroll', updateParallax, { passive: true });
      window.addEventListener('resize', updateParallax);
    })();
  </script>
  <script>
    (function () {
      var root = document.querySelector('.portfolio-export-root');
      var els = root ? root.querySelectorAll('.reveal-on-scroll') : [];
      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        for (var i = 0; i < els.length; i++) {
          els[i].classList.add('is-revealed');
        }
        return;
      }
      var observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              entries[i].target.classList.add('is-revealed');
            }
          }
        },
        { threshold: 0.01, rootMargin: '0px 0px -20px 0px' }
      );
      for (var j = 0; j < els.length; j++) {
        if (els[j].getBoundingClientRect().top < window.innerHeight) {
          els[j].classList.add('is-revealed');
        }
        observer.observe(els[j]);
      }
    })();
  </script>
  <noscript>
    <style>
      .reveal-on-scroll {
        opacity: 1 !important;
        transform: none !important;
      }
    </style>
  </noscript>
  <script>
    (function () {
      var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
      if (!navLinks.length) return;
      var sections = [];
      for (var i = 0; i < navLinks.length; i++) {
        var id = navLinks[i].getAttribute('href').slice(1);
        var sec = document.getElementById(id);
        if (sec) sections.push({ link: navLinks[i], sec: sec });
      }

      function updateActiveNav() {
        var scrollPos = window.scrollY + 200;
        var docHeight = document.documentElement.scrollHeight;
        var winHeight = window.innerHeight;
        var isBottom = (window.scrollY + winHeight >= docHeight - 120);

        var current = null;
        if (isBottom && sections.length) {
          current = sections[sections.length - 1];
        } else {
          for (var i = 0; i < sections.length; i++) {
            var top = sections[i].sec.getBoundingClientRect().top + window.scrollY;
            if (scrollPos >= top) {
              current = sections[i];
            }
          }
        }
        if (!current && sections.length) current = sections[0];
        for (var j = 0; j < sections.length; j++) {
          if (sections[j] === current) {
            sections[j].link.classList.add('active');
          } else {
            sections[j].link.classList.remove('active');
          }
        }
      }

      window.addEventListener('scroll', updateActiveNav, { passive: true });
      window.addEventListener('resize', updateActiveNav, { passive: true });
      updateActiveNav();
    })();
  </script>
</body>
</html>`;
}

export function renderStandaloneProjectPageHtml(
  doc: PortfolioDocument,
  project: ProjectItem,
  projectIndex: number,
  allProjects: ProjectItem[],
  assetMap: Map<string, CollectedAsset>,
): string {
  const projectNumber = projectIndex + 1;
  const projectImage = project.media?.[0];
  const imageAsset = projectImage ? assetMap.get(projectImage.url) : undefined;
  const imageUrl = imageAsset ? `../${imageAsset.zipPath}` : projectImage?.url;
  const projectSection = doc.sections.find(
    (section): section is ProjectsSection => section.type === "projects",
  );
  const navigationLoop = projectSection?.navigationLoop ?? true;
  const previousProject =
    projectIndex > 0
      ? projectIndex - 1
      : navigationLoop
        ? allProjects.length - 1
        : -1;
  const nextProject =
    projectIndex < allProjects.length - 1
      ? projectIndex + 1
      : navigationLoop
        ? 0
        : -1;
  const resolveAssetUrl = (url: string) => {
    const asset = assetMap.get(url);
    return asset ? `../${asset.zipPath}` : url;
  };
  const projectMediaHtml = project.media
    .map((media, index) => {
      const sourceLabel =
        media.sourceType === "docx-extracted"
          ? "Ảnh trích xuất DOCX"
          : media.sourceType === "ai-generated"
            ? "Ảnh minh họa AI"
            : "Ảnh tải lên";
      return `<figure class="detail-media">
        <img src="${escapeHtml(resolveAssetUrl(media.url))}" alt="${escapeHtml(media.caption || project.title)}" loading="${index === 0 ? "eager" : "lazy"}" />
        <figcaption><span class="media-source">${sourceLabel}</span>${media.caption ? `<span>${escapeHtml(media.caption)}</span>` : ""}</figcaption>
      </figure>`;
    })
    .join("");
  const docxHref = safeDocxHref(project.docxUrl);
  const navLink = (index: number, label: string) =>
    index < 0
      ? `<span class="detail-nav is-disabled" aria-disabled="true">${label}</span>`
      : `<a class="detail-nav" href="project-${index + 1}.html">${label}</a>`;
  const chapterText =
    project.chapterTitle || `Chương ${project.category}`;
  const exerciseText = project.exerciseNumber || `Bài tập ${projectNumber}`;
  const projectLinksHtml = project.links
    .map((link) => {
      const href = safeHref(link.url);
      return href === "#"
        ? ""
        : `<a class="detail-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
    })
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.title)} | ${escapeHtml(doc.seo.title)}</title>
  <meta name="description" content="${escapeHtml(project.summary || doc.seo.description)}" />
  <link rel="stylesheet" href="../assets/styles.css" />
  ${
    imageUrl
      ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`
      : ""
  }
  <style>
    .project-page { width: min(1120px, 100% - 32px); margin: 0 auto; padding: 28px 0 56px; }
    .portfolio-mark, .detail-hero, .detail-nav, .detail-panel { background: var(--surface); border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent); }
    .portfolio-mark { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 18px; border-radius: 18px; margin-bottom: 20px; }
    .portfolio-mark strong { color: var(--primary); }
    .detail-hero { padding: clamp(22px, 5vw, 48px); border-radius: 28px; }
    .detail-eyebrow { color: var(--primary); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .detail-title { margin: 12px 0 0; font-size: clamp(28px, 5vw, 48px); line-height: 1.12; }
    .detail-badges { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .detail-badge { border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent); border-radius: 999px; padding: 5px 11px; color: var(--primary); font-size: 12px; font-weight: 700; }
    .detail-actions, .detail-navigation { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 20px; }
    .detail-navigation { margin: 18px 0; }
    .detail-nav, .detail-link { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 9px 14px; color: var(--primary); font-size: 13px; font-weight: 700; text-decoration: none; }
    .detail-nav:hover, .detail-link:hover { background: var(--bg); }
    .detail-nav.is-disabled { opacity: .45; }
    .detail-grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 20px; margin-top: 20px; }
    .detail-panel { min-width: 0; border-radius: 24px; padding: clamp(18px, 3vw, 28px); }
    .detail-panel h2 { margin: 0 0 14px; color: var(--primary); font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }
    .detail-panel p, .detail-panel li { line-height: 1.75; }
    .detail-panel + .detail-panel { margin-top: 18px; }
    .detail-media-grid { display: grid; gap: 14px; }
    .detail-media { margin: 0; overflow: hidden; border-radius: 18px; background: var(--bg); }
    .detail-media img { display: block; width: 100%; max-height: 560px; object-fit: contain; }
    .detail-media figcaption { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 12px; font-size: 12px; opacity: .8; }
    .media-source { color: var(--primary); font-weight: 700; }
    .detail-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 16px; }
    .detail-metric { border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); border-radius: 14px; padding: 12px; }
    .detail-metric strong { display: block; color: var(--primary); font-size: 18px; }
    .detail-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .detail-raw { margin-top: 18px; }
    .detail-raw pre { max-height: 420px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: 13px; }
    @media (max-width: 760px) { .detail-grid { grid-template-columns: 1fr; } .detail-media img { max-height: 420px; } }
  </style>
</head>
<body data-project-detail="${projectNumber}" data-project-count="${allProjects.length}">
  <main class="project-page">
    <header class="portfolio-mark">
      <strong>${escapeHtml(doc.seo.title)}</strong>
      <a class="detail-link" href="../index.html#projects">← Về portfolio</a>
    </header>
    <nav class="detail-navigation" aria-label="Điều hướng bài làm">
      ${navLink(previousProject, "← Bài trước")}
      <span class="detail-badge">${String(projectNumber).padStart(2, "0")} / ${String(allProjects.length).padStart(2, "0")}</span>
      ${navLink(nextProject, "Bài tiếp theo →")}
    </nav>
    <article class="detail-hero">
      <div class="detail-badges">
        ${project.showChapter !== false ? `<span class="detail-badge">${escapeHtml(chapterText)}</span>` : ""}
        ${project.showExercise !== false ? `<span class="detail-badge">${escapeHtml(exerciseText)}</span>` : ""}
        <span class="detail-badge">${escapeHtml(project.category)}</span>
        ${project.sourceDocxFileName ? `<span class="detail-badge">DOCX · ${escapeHtml(project.sourceDocxFileName)}</span>` : ""}
      </div>
      <h1 class="detail-title">${escapeHtml(project.title)}</h1>
      <div class="detail-actions">
        <a class="detail-link" href="../index.html#projects">← Xem các bài làm</a>
        ${docxHref ? `<a class="detail-link" href="${escapeHtml(docxHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.docxLinkLabel || "Mở file DOCX")} ↗</a>` : ""}
        ${(project.links || [])
          .map((l) => {
            const lHref = safeDocxHref(l.url);
            return lHref ? `<a class="detail-link" href="${escapeHtml(lHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || "Mở file")} ↗</a>` : "";
          })
          .join("")}
      </div>
    </article>
    <div class="detail-grid">
      <div>
        <section class="detail-panel">
          <h2>Hình ảnh bài làm</h2>
          <div class="detail-media-grid">
            ${projectMediaHtml || "<p>Chưa có hình ảnh đính kèm cho bài làm này.</p>"}
          </div>
        </section>
        ${project.metrics.length ? `<section class="detail-panel"><h2>Kết quả nổi bật</h2><div class="detail-metrics">${project.metrics.map((metric) => `<div class="detail-metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></div>`).join("")}</div></section>` : ""}
      </div>
      <div>
        ${project.assignmentBrief && project.assignmentBrief.trim() !== project.summary?.trim() ? `<section class="detail-panel"><h2>Đề bài &amp; Mục tiêu bài tập</h2><p>${escapeHtml(project.assignmentBrief)}</p></section>` : ""}
        <section class="detail-panel"><h2>Quá trình thực hiện &amp; Giải pháp</h2><p>${escapeHtml(project.summary)}</p></section>
        ${project.processSteps?.length ? `<section class="detail-panel"><h2>Các bước thực hiện</h2><ol>${project.processSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>` : ""}
        ${project.obstaclesAndSolutions ? `<section class="detail-panel"><h2>Khó khăn &amp; Giải pháp</h2><p>${escapeHtml(project.obstaclesAndSolutions)}</p></section>` : ""}
        ${project.keyTakeaways.some((item) => item.trim()) ? `<section class="detail-panel"><h2>Kỹ năng cốt lõi &amp; Kết quả kỳ vọng</h2><ul style="${(project.takeawayBulletShape || "none") === "none" ? "list-style:none;padding-left:0;" : ""}">${project.keyTakeaways.filter((item) => item.trim()).map((item) => `<li style="${(project.takeawayBulletShape || "none") === "none" ? "margin-bottom:8px;" : ""}">${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
        ${project.promptComparison && project.showPromptComparison === true ? `<section class="detail-panel"><h2>So sánh Prompt</h2><p><strong>Ban đầu:</strong> ${escapeHtml(project.promptComparison.initialPrompt)}</p><p><strong>Cải tiến:</strong> ${escapeHtml(project.promptComparison.improvedPrompt)}</p><p><strong>Kết quả AI:</strong> ${escapeHtml(project.promptComparison.aiOutput)}</p></section>` : ""}
        ${projectLinksHtml ? `<div class="detail-links">${projectLinksHtml}</div>` : ""}
        ${project.fullRawExcerpt ? `<details class="detail-panel detail-raw"><summary>Nội dung trích xuất chi tiết từ bài làm</summary><pre>${escapeHtml(project.fullRawExcerpt)}</pre></details>` : ""}
        ${project.tags.length ? `<div class="detail-links">${project.tags.map((tag) => `<span class="detail-badge">#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      </div>
    </div>
    <nav class="detail-navigation" aria-label="Điều hướng bài làm cuối trang">
      ${navLink(previousProject, "← Bài trước")}
      <a class="detail-link" href="../index.html#projects">Về danh sách bài làm</a>
      ${navLink(nextProject, "Bài tiếp theo →")}
    </nav>
  </main>
  <script>
    (function () {
      var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
      if (!navLinks.length) return;
      var sections = [];
      for (var i = 0; i < navLinks.length; i++) {
        var id = navLinks[i].getAttribute('href').slice(1);
        var sec = document.getElementById(id);
        if (sec) sections.push({ link: navLinks[i], sec: sec });
      }

      function updateActiveNav() {
        var scrollPos = window.scrollY + 200;
        var docHeight = document.documentElement.scrollHeight;
        var winHeight = window.innerHeight;
        var isBottom = (window.scrollY + winHeight >= docHeight - 120);

        var current = null;
        if (isBottom && sections.length) {
          current = sections[sections.length - 1];
        } else {
          for (var i = 0; i < sections.length; i++) {
            var top = sections[i].sec.getBoundingClientRect().top + window.scrollY;
            if (scrollPos >= top) {
              current = sections[i];
            }
          }
        }
        if (!current && sections.length) current = sections[0];
        for (var j = 0; j < sections.length; j++) {
          if (sections[j] === current) {
            sections[j].link.classList.add('active');
          } else {
            sections[j].link.classList.remove('active');
          }
        }
      }

      window.addEventListener('scroll', updateActiveNav, { passive: true });
      window.addEventListener('resize', updateActiveNav, { passive: true });
      updateActiveNav();
    })();
  </script>
</body>
</html>`;
}

function writePortfolioFolderIntoZip(zipFolder: JSZip, doc: PortfolioDocument) {
  const assetMap = collectAndMapAssets(doc);
  const html = renderStandaloneHtml(doc, assetMap, false);
  const css = renderStandaloneCss(doc);

  const mapAssetReferences = (value: unknown): unknown => {
    if (typeof value === "string") {
      const asset = assetMap.get(value);
      return asset ? `portfolio-asset:${asset.zipPath}` : value;
    }
    if (Array.isArray(value)) return value.map(mapAssetReferences);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          mapAssetReferences(nestedValue),
        ]),
      );
    }
    return value;
  };

  const manifest: PortfolioSourceManifest = {
    format: PORTFOLIO_SOURCE_FORMAT,
    version: PORTFOLIO_SOURCE_VERSION,
    exportedAt: new Date().toISOString(),
    document: mapAssetReferences(doc) as PortfolioDocument,
  };

  zipFolder.file("index.html", html);
  zipFolder.file("assets/styles.css", css);
  zipFolder.file(
    PORTFOLIO_SOURCE_MANIFEST_FILENAME,
    JSON.stringify(manifest),
  );
  assetMap.forEach((asset) => {
    zipFolder.file(asset.zipPath, asset.buffer, { compression: "STORE" });
  });

  // Bundle standalone projects/project-X.html pages for every project inside the ZIP file
  const projectsSec = doc.sections.find(
    (s): s is ProjectsSection => s.type === "projects",
  );
  if (projectsSec && projectsSec.projects.length > 0) {
    const projects = projectsSec.projects;
    projects.forEach((proj, idx) => {
      const projHtml = renderStandaloneProjectPageHtml(
        doc,
        proj,
        idx,
        projects,
        assetMap,
      );
      // Bundle primary 1-based index page
      zipFolder.file(`projects/project-${idx + 1}.html`, projHtml);

      // Also bundle slug or id aliases if distinct
      if (proj.slug) {
        const safeSlug = sanitizeSlug(proj.slug);
        if (safeSlug && safeSlug !== `project-${idx + 1}`) {
          zipFolder.file(`projects/${safeSlug}.html`, projHtml);
        }
      }
      if (proj.id) {
        const safeId = sanitizeSlug(proj.id);
        if (safeId && safeId !== `project-${idx + 1}`) {
          zipFolder.file(`projects/${safeId}.html`, projHtml);
        }
      }
    });
  }
}

/**
 * Exports a self-contained, interactive HTML/CSS/JavaScript website and its assets as a ZIP buffer.
 */
export async function exportSinglePortfolioZip(
  doc: PortfolioDocument,
): Promise<Buffer> {
  const zip = new JSZip();
  writePortfolioFolderIntoZip(zip, doc);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Exports multiple PortfolioDocuments into one bulk ZIP with deduplicated subfolders per slug.
 */
export async function exportBulkPortfoliosZip(
  docs: PortfolioDocument[],
): Promise<Buffer> {
  const zip = new JSZip();
  const usedFolders = new Set<string>();

  for (const doc of docs) {
    const baseSlug = sanitizeSlug(doc.slug);
    let folderName = baseSlug;
    let suffix = 2;
    while (usedFolders.has(folderName)) {
      folderName = `${baseSlug}-${suffix++}`;
    }
    usedFolders.add(folderName);

    const folder = zip.folder(folderName);
    if (folder) {
      writePortfolioFolderIntoZip(folder, doc);
    }
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
