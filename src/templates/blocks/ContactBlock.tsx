"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, Sparkles, Terminal, Mail } from "lucide-react";
import type {
  ContactSection,
  ConclusionCard,
  ProfileOwner,
  TemplateId,
  ThemeConfig,
} from "@/schema/portfolio.schema";
import {
  getRadiusClass,
  getThemeTokens,
} from "@/templates/archetypes/archetypeStyles";
import {
  CanvaFourPointStar,
  CanvaHalftoneVinylLeft,
  CanvaRotaSheetSticker,
  CanvaSpiralMusicStaff,
  CanvaThankYouVinylBurst,
} from "./CanvaOrnaments";
import { DEFAULT_CONCLUSION_CONFIG } from "./conclusion-defaults";
import { BulletShapeIcon } from "./ProjectsShowcaseBlock";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { InlineEditableText } from "@/components/studio/InlineEditableText";

const CONCLUSION_CARD_SPAN_CLASSES = [
  "",
  "col-span-12 md:col-span-1",
  "col-span-12 md:col-span-2",
  "col-span-12 md:col-span-3",
  "col-span-12 md:col-span-4",
  "col-span-12 md:col-span-5",
  "col-span-12 md:col-span-6",
  "col-span-12 md:col-span-7",
  "col-span-12 md:col-span-8",
  "col-span-12 md:col-span-9",
  "col-span-12 md:col-span-10",
  "col-span-12 md:col-span-11",
  "col-span-12 md:col-span-12",
];

function ConclusionBlock({ section, theme, projects = [], archetypeId }: {
  section: ContactSection;
  theme: ThemeConfig;
  projects?: Array<{ id: string; title: string; category?: string; docxUrl?: string }>;
  archetypeId: TemplateId;
}) {
  const config = section.conclusion ?? DEFAULT_CONCLUSION_CONFIG;
  const projectLinks = config.projectLinks.length > 0
    ? config.projectLinks
    : projects.map((project, index) => ({ id: project.id || `project-${index + 1}`, title: project.title, text: "", href: project.docxUrl }));
  const defaultSpan = config.layout === "three-cards" ? 4
    : config.layout === "two-cards" ? 6
      : config.layout === "compact" ? 3
        : config.layout === "masonry" ? 6
          : config.layout === "editorial" ? 8
            : config.layout === "spotlight" ? 6
            : 12;
  const headingColor = config.headingColor || theme.textColor;
  const textColor = config.textColor || theme.textColor;
  const accentColor = config.accentColor || theme.primaryColor;
  const family = config.fontFamily || undefined;
  const cardGridClass = config.layout === "compact"
    ? "grid grid-cols-12 items-start gap-3"
    : config.layout === "masonry"
      ? "columns-1 gap-5 md:columns-2"
      : config.layout === "timeline"
        ? "grid grid-cols-12 gap-0"
        : "grid grid-cols-12 gap-5";
  const panelsClass = config.layout === "stacked" || config.layout === "editorial"
    ? "mt-10 grid grid-cols-1 gap-6"
    : "mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]";
  const card = (item: ConclusionCard, index: number) => {
    const isMasonry = config.layout === "masonry";
    const isTimeline = config.layout === "timeline";
    const isEditorial = config.layout === "editorial";
    const isFeatured = config.layout === "spotlight" && index === 0;
    const isStacked = config.layout === "stacked";
    const defaultCardSpan =
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
            : defaultSpan;
    const span = Math.max(1, Math.min(12, item.width ?? defaultCardSpan));
    const spanClass = isMasonry
      ? "mb-5 inline-block w-full break-inside-avoid"
      : isTimeline
        ? "col-span-12 ml-4 w-[calc(100%-1rem)]"
        : CONCLUSION_CARD_SPAN_CLASSES[span];
    const titleFontSizes = {
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
    };
    const bodyFontSizes = {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
    };
    return (
      <article
        key={item.id}
        data-conclusion-card-id={item.id}
        className={`${spanClass} relative overflow-hidden border ${
          isTimeline
            ? "border-y-0 border-r-0 border-l-2 pl-7 shadow-none"
            : isEditorial
              ? "rounded-2xl border-x-0 border-t-0 border-b-2 shadow-none"
              : isStacked
                ? "rounded-2xl"
                : "rounded-3xl shadow-sm"
        } ${config.layout === "compact" ? "p-4" : "p-5 sm:p-6"} ${
          isFeatured ? "p-7 sm:p-9" : ""
        }`}
        style={{
          minHeight:
            config.layout === "compact" || isMasonry
              ? undefined
              : `${(item.height ?? 3) * 4}rem`,
          backgroundColor: isFeatured
            ? accentColor
            : isEditorial || isTimeline
              ? item.backgroundColor || "transparent"
              : item.backgroundColor || config.cardBackgroundColor || theme.surfaceColor,
          borderColor: isFeatured
            ? accentColor
            : isTimeline
              ? `${accentColor}70`
              : config.cardBorderColor || `${theme.primaryColor}35`,
          color: isFeatured ? theme.backgroundColor : item.textColor || textColor,
          fontFamily: item.bodyFontFamily || family,
          textAlign: item.bodyAlign,
        }}
      >
        {isTimeline && (
          <span
            className="absolute -left-[1.05rem] top-5 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold"
            style={{
              backgroundColor: config.backgroundColor || theme.backgroundColor,
              borderColor: accentColor,
              color: accentColor,
            }}
          >
            {item.number}
          </span>
        )}
        {!isTimeline && (
          <p
            className={`font-editorial font-extrabold ${
              isFeatured ? "text-4xl sm:text-5xl" : "text-2xl"
            }`}
            style={{
              color: isFeatured
                ? theme.backgroundColor
                : accentColor,
              fontFamily: item.titleFontFamily || family,
              textAlign: item.titleAlign,
            }}
          >
            {item.number}
          </p>
        )}
        <h3
          className={`${isFeatured ? "mt-3 text-2xl sm:text-3xl" : "mt-2 text-lg"} font-bold`}
          style={{
            color: isFeatured
              ? theme.backgroundColor
              : item.titleColor || headingColor,
            fontFamily: item.titleFontFamily || family,
            fontSize: item.titleFontSize
              ? titleFontSizes[item.titleFontSize]
              : undefined,
            textAlign: item.titleAlign,
          }}
        >
          {item.title}
        </h3>
        {item.body && (
          <p
            className="mt-3 whitespace-pre-line leading-relaxed"
            style={{
              fontSize: item.bodyFontSize
                ? bodyFontSizes[item.bodyFontSize]
                : "0.875rem",
              textAlign: item.bodyAlign,
            }}
          >
            {item.body}
          </p>
        )}
        {item.bullets.length > 0 && (
          <div
            className={`mt-3 space-y-2 leading-relaxed ${
              item.bodyAlign === "center"
                ? "text-center"
                : item.bodyAlign === "right"
                  ? "text-right"
                  : "text-left"
            }`}
            style={{
              fontSize: item.bodyFontSize
                ? bodyFontSizes[item.bodyFontSize]
                : "0.875rem",
              textAlign: item.bodyAlign,
            }}
          >
            {item.bullets.map((line, bulletIndex) => {
              const shape = item.bulletShape ?? "none";
              if (shape === "none") {
                return (
                  <p key={`${item.id}-bullet-${bulletIndex}`} className="leading-relaxed">
                    {line}
                  </p>
                );
              }
              return (
                <div
                  key={`${item.id}-bullet-${bulletIndex}`}
                  className={`flex items-start gap-2 ${
                    item.bodyAlign === "center"
                      ? "justify-center"
                      : item.bodyAlign === "right"
                        ? "justify-end"
                        : "justify-start"
                  }`}
                >
                  <BulletShapeIcon
                    shape={shape}
                    color={isFeatured ? theme.backgroundColor : accentColor}
                    className="shrink-0 mt-1"
                  />
                  <span>{line}</span>
                </div>
              );
            })}
          </div>
        )}
      </article>
    );
  };
  return (
    <section id="conclusion" data-conclusion-layout={config.layout} className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8" style={{ backgroundColor: config.backgroundColor || undefined, color: textColor, fontFamily: family }}>
      {archetypeId === "canva-editorial" && <CanvaSpiralMusicStaff className="pointer-events-none -left-16 -top-8 hidden h-64 w-72 opacity-85 md:absolute md:block" stroke={textColor} noteFill={textColor} />}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{config.eyebrow}</p><h2 className="mt-2 font-editorial text-4xl font-bold sm:text-5xl" style={{ color: headingColor }}>{config.title}</h2></div>
        <ContactStar className="mb-2 h-8 w-8 shrink-0" style={{ color: accentColor } as React.CSSProperties} />
      </div>
      <div className={cardGridClass}>
        {config.cards.map(card)}
      </div>
      <div className={panelsClass}>
        <div className="rounded-3xl border p-6 shadow-sm sm:p-8" style={{ backgroundColor: config.cardBackgroundColor || theme.surfaceColor, borderColor: config.cardBorderColor || `${theme.primaryColor}35`, color: textColor, fontFamily: family }}>
          <h3 className="font-editorial text-xl font-bold sm:text-2xl" style={{ color: headingColor }}>{config.projectLinksTitle}</h3>
          <ol className="mt-5 space-y-3">{projectLinks.map((item, index) => <li key={item.id} className="flex items-start gap-3 text-sm leading-relaxed"><span className="font-bold" style={{ color: accentColor }}>{String(index + 1).padStart(2, "0")}.</span>{item.href ? <a href={item.href} target={item.href.startsWith("#") ? undefined : "_blank"} rel={item.href.startsWith("#") ? undefined : "noreferrer"} className="underline decoration-current/30 underline-offset-4">{item.title}{item.text ? `: ${item.text}` : ""}</a> : <span>{item.title}{item.text ? `: ${item.text}` : ""}</span>}</li>)}</ol>
        </div>
        <div className="rounded-3xl border p-6 shadow-sm sm:p-8" style={{ backgroundColor: config.cardBackgroundColor || theme.surfaceColor, borderColor: config.cardBorderColor || `${theme.primaryColor}35`, color: textColor, fontFamily: family }}>
          <h3 className="font-editorial text-xl font-bold sm:text-2xl" style={{ color: headingColor }}>{config.aiToolsTitle}</h3>
          <ol className="mt-5 space-y-4 text-sm leading-relaxed">{config.aiTools.map((item) => <li key={item.id}><strong style={{ color: accentColor }}>{item.title}: </strong>{item.text}</li>)}</ol>
          {config.closingNote && <p className="mt-5 border-t pt-4 text-xs leading-relaxed opacity-80" style={{ borderColor: config.cardBorderColor || `${theme.primaryColor}35` }}>{config.closingNote}</p>}
        </div>
      </div>
    </section>
  );
}

export interface ContactBlockProps {
  section: ContactSection;
  theme: ThemeConfig;
  archetypeId?: TemplateId;
  editable?: boolean;
  sectionIndex?: number;
  ownerEmail?: string;
  ownerName?: string;
  ownerRole?: string;
  projects?: Array<{ id: string; title: string; category?: string; docxUrl?: string }>;
  profileOwner?: ProfileOwner;
}

const CONCLUSION_PILLS = [
  {
    num: "(01)",
    label: "TRẢI NGHIỆM & CẢM NHẬN VỀ DỰ ÁN",
  },
  {
    num: "(02)",
    label: "KIẾN THỨC & KỸ NĂNG CỐT LÕI ĐẠT ĐƯỢC",
  },
  {
    num: "(03)",
    label: "TÂM ĐẮC & THÁCH THỨC KHI XÂY DỰNG PORTFOLIO",
  },
];

function ContactStar({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M20 0c2.4 11.2 6.8 15.6 20 20-13.2 4.4-17.6 8.8-20 20C17.6 28.8 13.2 24.4 0 20 13.2 15.6 17.6 11.2 20 0Z" />
    </svg>
  );
}

function ContactDotCircle({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none rounded-full ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle, currentColor 1.35px, transparent 1.55px)",
        backgroundSize: "9px 9px",
        maskImage: "radial-gradient(circle, #000 56%, transparent 72%)",
        WebkitMaskImage: "radial-gradient(circle, #000 56%, transparent 72%)",
      }}
    />
  );
}

export function ContactBlock({
  section,
  theme,
  archetypeId = "canva-editorial",
  editable = false,
  sectionIndex,
  ownerEmail,
  ownerName,
  ownerRole,
  projects = [],
  profileOwner,
}: ContactBlockProps) {
  const [sent, setSent] = useState(false);
  const updateSection = usePortfolioStore((s) => s.updateSection);
  const updateContact = (partial: Partial<ContactSection>) => {
    if (sectionIndex === undefined) return;
    updateSection(sectionIndex, { ...section, ...partial });
  };
  const tokens = getThemeTokens(theme);
  const isCanvaEditorial = archetypeId === "canva-editorial";
  const isTerminal = archetypeId === "tech-developer";
  const isMinimal =
    archetypeId === "framer-minimal" || archetypeId === "minimal-chic";
  const isCreative =
    archetypeId === "creative-showcase" || archetypeId === "creative-bold";
  const isGrowth = archetypeId === "growth-marketer";
  const isAcademic = archetypeId === "academic-presentation";
  const isOrganic = archetypeId === "artistic-organic";
  const isMedicalRuby = archetypeId === "medical-ruby";
  const isClinicalNavy = archetypeId === "clinical-navy";
  const isPedagogical = archetypeId === "pedagogical-mauve";
  const isContentCreator = archetypeId === "content-creator";
  const isOceanicTeal = archetypeId === "oceanic-teal";
  const isEducationalTerracotta = archetypeId === "educational-terracotta";
  const isPedagogicalRose = archetypeId === "pedagogical-rose";

  const contactVariant = section.variant || "full-banner";

  const courseInfo = section.courseInfo;

  const reflection = section.personalReflection;
  const studentName =
    courseInfo?.studentName ||
    profileOwner?.fullName ||
    ownerName ||
    "Sinh viên";
  const studentNamePosition = courseInfo?.studentNamePosition || "left";
  const studentId = courseInfo?.studentId || "";
  const studentClass = courseInfo?.studentClass || "";
  const instructorName =
    courseInfo?.instructorName ||
    profileOwner?.instructorName ||
    "";
  const courseCode = courseInfo?.courseCode ?? "INF2501";
  const courseName =
    courseInfo?.courseName ??
    "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo";
  const institution = courseInfo?.institution ?? "";
  const footerCourseText = [courseCode, courseName].filter(Boolean).join(" - ");

  const renderCourseFooter = () => (
    <footer
      data-testid="rubric-course-footer"
      className="mt-8 border-t border-stone-200 bg-stone-900 px-6 py-4 text-xs text-stone-300"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <div
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1"
          style={{
            justifyContent:
              studentNamePosition === "center"
                ? "center"
                : studentNamePosition === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          <span className="font-bold text-white text-sm">{studentName}</span>
          {studentId && (
            <span className="rounded bg-stone-800 px-2 py-0.5 font-mono text-stone-300">
              MSSV: {studentId}
            </span>
          )}
          {instructorName && (
            <span className="rounded bg-stone-800/80 px-2 py-0.5 text-stone-300">
              GVHD: {instructorName}
            </span>
          )}
          {studentClass && (
            <span className="text-stone-400">Lớp: {studentClass}</span>
          )}
        </div>

        <div className="text-right text-[11px] text-stone-400 sm:text-xs">
          {footerCourseText && (
            <p className="font-semibold text-stone-200">
              {footerCourseText}
            </p>
          )}
          {institution && <p className="opacity-80">{institution}</p>}
        </div>
      </div>
    </footer>
  );

  if (isCanvaEditorial && contactVariant === "full-banner") {
    return (
      <section
        className="reveal-on-scroll relative overflow-hidden pt-10"
      >
        <ConclusionBlock section={section} theme={theme} projects={projects} archetypeId={archetypeId} />

          {/* Slide 9: Large rounded Mocha block with floating Rota sheet music & exercise links */}
          <p className="mx-auto mt-8 max-w-5xl px-4 text-xs font-bold uppercase tracking-[0.18em] opacity-65 sm:px-6 lg:px-8" style={{ color: "var(--primary, #735340)" }}>
            06 // Contact
          </p>
          <section id="contact" className="reveal-on-scroll relative mx-auto mt-14 max-w-5xl px-4 sm:px-6 lg:px-8">
            <CanvaRotaSheetSticker
              className="pointer-events-none -left-14 -top-12 z-20 hidden h-56 w-56 sm:absolute sm:block"
              paperBg="var(--surface, #FFFDF8)"
              stroke="var(--text, #2E1D18)"
              noteFill="var(--text, #2E1D18)"
            />

            <div
              className="relative z-10 rounded-[44px] px-7 py-10 shadow-xl sm:rounded-[64px] sm:px-14 sm:py-12 sm:pl-48"
              style={{
                backgroundColor: "var(--primary, #735340)",
                color: "var(--bg, #FFF3E6)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
                <InlineEditableText
                  value={section.title || "Tổng kết & Định hướng"}
                  editable={editable}
                  ariaLabel="Tiêu đề khối Tổng kết"
                  onSave={(val) => updateContact({ title: val })}
                />
              </p>
              <p className="mt-3 text-sm leading-relaxed opacity-95 sm:text-base">
                <InlineEditableText
                  value={
                    section.subtitle ||
                    "Dưới đây là liên kết nhanh đến từng bài tập và báo cáo chi tiết trong hồ sơ năng lực."
                  }
                  editable={editable}
                  multiline
                  ariaLabel="Mô tả khối Tổng kết"
                  onSave={(val) => updateContact({ subtitle: val })}
                />
              </p>

              {/* TỔNG HỢP CÁC ĐƯỜNG LIÊN KẾT DẪN TỚI CÁC BÀI TẬP */}
              <div className="mt-6 border-t border-white/20 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-85">
                  TỔNG HỢP CÁC ĐƯỜNG LIÊN KẾT DẪN TỚI CÁC BÀI TẬP
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {projects.length > 0
                    ? projects.map((proj, idx) => (
                        <a
                          key={proj.id || idx}
                          href={`#project-item-${idx}`}
                          className="flex items-center gap-2 rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-medium transition hover:bg-white hover:text-stone-900"
                        >
                          <span className="font-bold opacity-75">
                            0{idx + 1}.
                          </span>
                          <span className="truncate">{proj.title}</span>
                        </a>
                      ))
                    : [
                        "Bài tập 01: Nghiên cứu & Định vị",
                        "Bài tập 02: Kịch bản & Prompt AI",
                        "Bài tập 03: Thiết kế Bộ nhận diện",
                        "Bài tập 04: Sản xuất Nội dung Đa kênh",
                        "Bài tập 05: Tối ưu Hóa Chuyển đổi",
                        "Bài tập 06: Báo cáo & Đánh giá Kết quả",
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-medium"
                        >
                          <span className="font-bold opacity-75">
                            0{idx + 1}.
                          </span>
                          <span className="truncate">{item}</span>
                        </div>
                      ))}
                </div>
              </div>

              {ownerEmail && (
                <p className="mt-5 text-sm font-medium">
                  Liên hệ trực tiếp:{" "}
                  <a
                    href={`mailto:${ownerEmail}`}
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    {ownerEmail}
                  </a>
                </p>
              )}
            </div>
          </section>

          {/* Clean paper Contact Form */}
          {section.showContactForm && (
            <div
              className="reveal-on-scroll mx-auto mt-12 max-w-2xl rounded-3xl border p-6 shadow-md"
              style={{
                borderColor: "var(--primary, #735340)",
                backgroundColor: "var(--surface, #FFF8F0)",
                color: "var(--text, #3E2723)",
              }}
            >
              {sent ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2
                    className="h-10 w-10"
                    style={{ color: "var(--primary, #735340)" }}
                  />
                  <h3 className="mt-2 text-base font-bold">
                    Đã ghi nhận lời nhắn!
                  </h3>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--secondary, #5D4037)" }}
                  >
                    Cảm ơn bạn đã liên hệ qua Portfolio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-3 rounded-full border px-4 py-1.5 text-xs font-semibold transition"
                    style={{
                      borderColor: "var(--primary, #735340)",
                      color: "var(--text, #3E2723)",
                    }}
                  >
                    Gửi lời nhắn khác
                  </button>
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--primary, #735340)" }}
                  >
                    Gửi lời nhắn kết nối
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      placeholder="Họ tên của bạn"
                      className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                      style={{
                        borderColor: "var(--primary, #735340)",
                        backgroundColor: "var(--bg, #FFF3E6)",
                        color: "var(--text, #3E2723)",
                      }}
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email liên hệ"
                      className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                      style={{
                        borderColor: "var(--primary, #735340)",
                        backgroundColor: "var(--bg, #FFF3E6)",
                        color: "var(--text, #3E2723)",
                      }}
                    />
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder="Nội dung trao đổi hoặc lời mời hợp tác..."
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                    style={{
                      borderColor: "var(--primary, #735340)",
                      backgroundColor: "var(--bg, #FFF3E6)",
                      color: "var(--text, #3E2723)",
                    }}
                  />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      backgroundColor: "var(--primary, #735340)",
                      color: "var(--bg, #FFF3E6)",
                    }}
                  >
                    <Send className="h-4 w-4" />
                    <span>Gửi tin nhắn ngay</span>
                  </button>
                </form>
              )}
            </div>
          )}

        {/* Slide 10: Thank You ! + Halftone Vinyls + Yellow Starburst */}
        <section className="reveal-on-scroll relative mt-12 overflow-hidden py-16 sm:py-24">
          <CanvaHalftoneVinylLeft
            className="pointer-events-none absolute -left-2 bottom-2 top-2 h-full w-28 opacity-90 sm:w-44 md:w-52"
            ringColor="var(--bg, #FFF3E6)"
            centerColor="var(--bg, #FFF3E6)"
          />
          <CanvaThankYouVinylBurst className="pointer-events-none absolute right-0 top-0 h-36 w-48 opacity-95 sm:h-52 sm:w-64 md:h-64 md:w-80" />

          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <h2
              className="font-editorial text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl"
              style={{ color: "var(--text, #3E2723)" }}
            >
              {section.thankYouTitle || "Thank You !"}
            </h2>
            <p
              className="mt-5 text-xs font-bold uppercase tracking-[0.2em] sm:text-sm"
              style={{ color: "var(--text, #3E2723)" }}
            >
              {section.thankYouSubtitle !== undefined && section.thankYouSubtitle !== ""
                ? section.thankYouSubtitle
                : [ownerName, ownerRole].filter(Boolean).join(" • ") ||
                  section.thankYouMessage}
            </p>
            <p
              className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--secondary, #5D4037)" }}
            >
              {section.thankYouMessage || "THANK YOU FOR WATCHING!"}
            </p>
          </div>
        </section>

        {/* Mandatory INF2501 Course Footer Strip */}
        {renderCourseFooter()}

        {/* Bottom black Canva footer strip matching Slide 10 reference */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B0908] px-6 py-2.5 text-[11px] text-white/85">
          <div className="flex items-center gap-4">
            <span>Điều khoản và hỗ trợ</span>
            <span>Chính sách quyền riêng tư</span>
          </div>
          <span>Được thiết kế bằng Canva</span>
        </div>
      </section>
    );
  }

  const containerRadius = getRadiusClass(theme.borderRadius, archetypeId);

  const containerStyle: React.CSSProperties = isTerminal
    ? {
        backgroundColor: theme.surfaceColor,
        borderColor: `${theme.primaryColor}45`,
        color: theme.textColor,
      }
    : isMinimal
      ? {
          backgroundColor: theme.surfaceColor,
          borderColor: tokens.borderSubtle,
          color: theme.textColor,
        }
      : isCreative
        ? {
            backgroundColor: theme.secondaryColor,
            borderColor: theme.textColor,
            color: "#FFFFFF",
            boxShadow: `8px 8px 0px ${theme.primaryColor}`,
          }
      : isMedicalRuby
        ? {
            backgroundColor: theme.primaryColor,
            borderColor: theme.primaryColor,
            color: "#FFFFFF",
            boxShadow: `0 12px 36px -8px ${theme.primaryColor}55`,
          }
      : isClinicalNavy
        ? {
            backgroundColor: theme.primaryColor,
            borderColor: theme.secondaryColor,
            color: "#FFFFFF",
            borderTopWidth: "4px",
            borderTopColor: theme.secondaryColor,
          }
      : isPedagogical
        ? {
            backgroundColor: theme.surfaceColor,
            borderColor: `${theme.primaryColor}35`,
            color: theme.textColor,
            boxShadow: `0 8px 28px -6px ${theme.primaryColor}20`,
          }
      : isContentCreator
        ? {
            backgroundColor: theme.primaryColor,
            borderColor: theme.secondaryColor,
            color: "#FFFFFF",
            boxShadow: `6px 6px 0px ${theme.secondaryColor}40`,
          }
      : isOceanicTeal
        ? {
            backgroundColor: theme.surfaceColor,
            borderColor: `${theme.primaryColor}30`,
            color: theme.textColor,
            borderLeftWidth: "6px",
            borderLeftColor: theme.primaryColor,
            boxShadow: `0 8px 24px -6px ${theme.primaryColor}20`,
          }
      : isEducationalTerracotta
        ? {
            backgroundColor: theme.primaryColor,
            borderColor: theme.primaryColor,
            color: "#FFFFFF",
            boxShadow: `0 12px 32px -8px ${theme.primaryColor}50`,
          }
      : isPedagogicalRose
        ? {
            backgroundColor: theme.surfaceColor,
            borderColor: `${theme.primaryColor}35`,
            color: theme.textColor,
            boxShadow: `0 8px 24px -6px ${theme.primaryColor}18`,
          }
        : {
            backgroundColor: theme.secondaryColor,
            borderColor: theme.secondaryColor,
            color: "#FFFFFF",
            borderTopWidth: isGrowth ? "5px" : undefined,
            borderTopColor: isGrowth ? theme.primaryColor : undefined,
          };

  const usesDarkOrColoredContainer = !isTerminal && !isMinimal && !isPedagogical && !isOceanicTeal && !isPedagogicalRose;

  const renderContactFormElement = () => (
    <div className="rounded-3xl bg-white p-6 text-stone-900 shadow-xl border border-stone-200">
      {sent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h3 className="mt-3 text-lg font-bold">Đã ghi nhận lời nhắn!</h3>
          <p className="mt-1 text-xs text-stone-500">
            Cảm ơn bạn đã liên hệ qua Portfolio.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 rounded-full border border-stone-200 px-4 py-1.5 text-xs font-semibold hover:bg-stone-50"
          >
            Gửi lời nhắn khác
          </button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              placeholder="Họ tên của bạn"
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none focus:border-stone-400"
            />
            <input
              type="email"
              required
              placeholder="Email liên hệ"
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <textarea
            rows={3}
            required
            placeholder="Nội dung trao đổi hoặc lời mời hợp tác..."
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none focus:border-stone-400"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Send className="h-4 w-4" />
            <span>Gửi tin nhắn ngay</span>
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
    <ConclusionBlock section={section} theme={theme} projects={projects} archetypeId={archetypeId} />
    <section id="contact" className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: theme.primaryColor }}>06 // Contact</p>
      {contactVariant === "minimal-card" ? (
        <div
          className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border p-8 text-center shadow-sm sm:p-14"
          style={{
            backgroundColor: theme.surfaceColor,
            borderColor: `${theme.primaryColor}35`,
            color: theme.textColor,
          }}
        >
          <ContactDotCircle className="absolute -right-10 -top-14 h-44 w-44 text-[var(--primary)] opacity-25 sm:-right-4 sm:-top-16 sm:h-56 sm:w-56" />
          <ContactStar className="absolute left-7 top-8 h-5 w-5 text-[var(--primary)] sm:left-12 sm:top-12 sm:h-7 sm:w-7" />
          <div className="relative mx-auto max-w-xl">
            <p
              className="text-xs font-bold uppercase tracking-[0.24em]"
              style={{ color: theme.primaryColor }}
            >
              <InlineEditableText
                value={section.thankYouMessage || "THANK YOU"}
                editable={editable}
                ariaLabel="Thông điệp cảm ơn"
                onSave={(val) => updateContact({ thankYouMessage: val })}
              />
            </p>
            <h2 className="mt-4 font-editorial text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
              <InlineEditableText
                value={section.title}
                editable={editable}
                ariaLabel="Tiêu đề liên hệ"
                onSave={(val) => updateContact({ title: val })}
              />
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed opacity-75 sm:text-base">
              <InlineEditableText
                value={section.subtitle}
                editable={editable}
                multiline
                ariaLabel="Phụ đề liên hệ"
                onSave={(val) => updateContact({ subtitle: val })}
              />
            </p>
            {ownerEmail && (
              <a
                href={`mailto:${ownerEmail}`}
                className="mt-7 inline-flex max-w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="break-all">{ownerEmail}</span>
              </a>
            )}
            {section.showContactForm && (
              <div className="mt-8 text-left">{renderContactFormElement()}</div>
            )}
          </div>
        </div>
      ) : contactVariant === "footer-widget" ? (
        <div
          className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl sm:p-10"
          style={{
            backgroundColor: theme.textColor,
            color: theme.surfaceColor,
          }}
        >
          <ContactDotCircle className="absolute -right-12 -top-16 h-56 w-56 opacity-15 sm:h-72 sm:w-72" />
          <div className="relative grid grid-cols-1 items-start gap-8 md:grid-cols-12 md:gap-10">
            <div className="space-y-4 md:col-span-5">
              <div className="flex items-center gap-3">
                <ContactStar className="h-5 w-5 shrink-0 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
                  <InlineEditableText
                    value={section.thankYouMessage || "THANK YOU"}
                    editable={editable}
                    ariaLabel="Thông điệp cảm ơn"
                    onSave={(val) => updateContact({ thankYouMessage: val })}
                  />
                </span>
              </div>
              <h2 className="font-editorial text-3xl font-medium leading-tight sm:text-4xl">
                <InlineEditableText
                  value={section.title}
                  editable={editable}
                  ariaLabel="Tiêu đề liên hệ"
                  onSave={(val) => updateContact({ title: val })}
                />
              </h2>
              <p className="max-w-md text-sm leading-relaxed opacity-75">
                <InlineEditableText
                  value={section.subtitle}
                  editable={editable}
                  multiline
                  ariaLabel="Phụ đề liên hệ"
                  onSave={(val) => updateContact({ subtitle: val })}
                />
              </p>
              {ownerEmail && (
                <a
                  href={`mailto:${ownerEmail}`}
                  className="inline-flex max-w-full items-center gap-2 break-all text-sm font-semibold underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {ownerEmail}
                </a>
              )}
            </div>
            <div className="space-y-2 border-t border-white/15 pt-5 text-xs opacity-80 md:col-span-3 md:border-l md:border-t-0 md:pl-6 md:pt-1">
              <p className="font-bold uppercase tracking-wider opacity-70">
                Học phần
              </p>
              <p className="font-semibold">
                {courseCode}
                {courseName ? ` • ${courseName}` : ""}
              </p>
              {institution && <p>{institution}</p>}
              {(studentId || studentClass) && (
                <p>
                  {[studentName, studentId, studentClass]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
            <div className="md:col-span-4">
              {section.showContactForm ? (
                renderContactFormElement()
              ) : (
                <div className="rounded-2xl border border-white/20 bg-white/5 p-5 text-sm leading-relaxed">
                  {section.thankYouMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : contactVariant === "split-form" ? (
        <div
          className="relative overflow-hidden rounded-[2rem] border shadow-lg"
          style={{
            backgroundColor: theme.surfaceColor,
            borderColor: `${theme.primaryColor}35`,
            color: theme.textColor,
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative flex min-h-[300px] flex-col justify-center overflow-hidden p-7 sm:p-11 lg:p-14">
              <ContactDotCircle className="absolute -bottom-16 -left-16 h-56 w-56 text-[var(--primary)] opacity-20 sm:h-72 sm:w-72" />
              <ContactStar className="absolute right-8 top-8 h-6 w-6 text-[var(--primary)] sm:right-12 sm:top-12 sm:h-8 sm:w-8" />
              <div className="relative max-w-lg">
                <p
                  className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.primaryColor }}
                >
                  <InlineEditableText
                    value={section.thankYouMessage || "THANK YOU"}
                    editable={editable}
                    ariaLabel="Thông điệp cảm ơn"
                    onSave={(val) => updateContact({ thankYouMessage: val })}
                  />
                </p>
                <h2 className="mt-5 font-editorial text-4xl font-medium leading-tight sm:text-5xl">
                  <InlineEditableText
                    value={section.title}
                    editable={editable}
                    ariaLabel="Tiêu đề liên hệ"
                    onSave={(val) => updateContact({ title: val })}
                  />
                </h2>
                <p className="mt-4 text-sm leading-relaxed opacity-75 sm:text-base">
                  <InlineEditableText
                    value={section.subtitle}
                    editable={editable}
                    multiline
                    ariaLabel="Phụ đề liên hệ"
                    onSave={(val) => updateContact({ subtitle: val })}
                  />
                </p>
                {ownerEmail && (
                  <a
                    href={`mailto:${ownerEmail}`}
                    className="mt-7 inline-flex max-w-full items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:opacity-75"
                    style={{
                      borderColor: `${theme.primaryColor}65`,
                      color: theme.primaryColor,
                    }}
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="break-all">{ownerEmail}</span>
                  </a>
                )}
              </div>
            </div>
            <div
              className="relative flex items-center border-t p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10"
              style={{
                borderColor: `${theme.primaryColor}25`,
                backgroundColor: `${theme.primaryColor}0A`,
              }}
            >
              <ContactStar className="absolute right-8 top-7 hidden h-4 w-4 opacity-50 sm:block" />
              {section.showContactForm ? (
                <div className="w-full">{renderContactFormElement()}</div>
              ) : (
                <div
                  className="w-full rounded-2xl border bg-white/70 p-6 text-center"
                  style={{ borderColor: `${theme.primaryColor}25` }}
                >
                  <Mail
                    className="mx-auto h-6 w-6"
                    style={{ color: theme.primaryColor }}
                  />
                  <p className="mt-3 text-sm font-semibold">
                    {section.thankYouMessage}
                  </p>
                  {ownerEmail && (
                    <a
                      href={`mailto:${ownerEmail}`}
                      className="mt-2 inline-block break-all text-sm underline underline-offset-4"
                      style={{ color: theme.primaryColor }}
                    >
                      {ownerEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative overflow-hidden border px-6 py-12 text-center shadow-lg sm:px-12 sm:py-16 ${containerRadius} ${
            isCreative ? "border-4 border-black shadow-[8px_8px_0px_#000]" : ""
          }`}
          style={containerStyle}
        >
          <ContactDotCircle
            className={`absolute -left-16 -top-12 h-52 w-52 opacity-20 sm:-left-10 sm:-top-16 sm:h-72 sm:w-72 ${usesDarkOrColoredContainer ? "text-white" : "text-[var(--primary)]"}`}
          />
          <ContactDotCircle
            className={`absolute -bottom-20 -right-14 h-48 w-48 opacity-15 sm:h-64 sm:w-64 ${usesDarkOrColoredContainer ? "text-white" : "text-[var(--primary)]"}`}
          />
          <ContactStar className="absolute right-8 top-8 h-6 w-6 text-amber-300 sm:right-14 sm:top-12 sm:h-8 sm:w-8" />
          <div className="relative mx-auto max-w-3xl">
            <div
              className={`mx-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                isTerminal ? "font-mono" : ""
              } ${isCreative ? "border-2 border-black bg-amber-300 text-black shadow-[2px_2px_0px_#000]" : ""}`}
              style={
                isCreative
                  ? undefined
                  : usesDarkOrColoredContainer
                    ? {
                        backgroundColor: "rgba(255,255,255,0.16)",
                        color: "#FFFFFF",
                      }
                    : {
                        backgroundColor: `${theme.primaryColor}18`,
                        color: theme.primaryColor,
                      }
              }
            >
              {isTerminal ? (
                <Terminal className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>
                <InlineEditableText
                  value={section.thankYouMessage || "THANK YOU"}
                  editable={editable}
                  ariaLabel="Thông điệp cảm ơn"
                  onSave={(val) => updateContact({ thankYouMessage: val })}
                />
              </span>
            </div>
            <h2 className="mt-5 font-editorial text-4xl font-medium leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              <InlineEditableText
                value={section.title}
                editable={editable}
                ariaLabel="Tiêu đề liên hệ"
                onSave={(val) => updateContact({ title: val })}
              />
            </h2>
            <p
              className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${usesDarkOrColoredContainer ? "text-white/85" : "opacity-75"}`}
            >
              <InlineEditableText
                value={section.subtitle}
                editable={editable}
                multiline
                ariaLabel="Phụ đề liên hệ"
                onSave={(val) => updateContact({ subtitle: val })}
              />
            </p>
            {ownerEmail && (
              <a
                href={`mailto:${ownerEmail}`}
                className="mt-7 inline-flex max-w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  backgroundColor: usesDarkOrColoredContainer
                    ? theme.surfaceColor
                    : theme.primaryColor,
                  color: usesDarkOrColoredContainer
                    ? theme.textColor
                    : "#FFFFFF",
                }}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="break-all">{ownerEmail}</span>
              </a>
            )}
            {section.showContactForm && (
              <div className="mx-auto mt-9 max-w-2xl text-left">
                {renderContactFormElement()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mandatory INF2501 Course Footer Strip */}
      {renderCourseFooter()}
    </section>
    </>
  );
}
