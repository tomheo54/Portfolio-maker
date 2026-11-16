"use client";

import React from "react";
import {
  ArrowDownRight,
  Sparkles,
  Terminal,
  TrendingUp,
  RefreshCw,
  LayoutTemplate,
  Plus,
  Trash2,
  Award,
  BookOpen,
  FileText,
  CheckCircle2,
  Activity,
  Bookmark,
  Flame,
} from "lucide-react";
import type {
  HeroSection,
  TemplateId,
  ThemeConfig,
} from "@/schema/portfolio.schema";
import { AvatarFrame, DecorationLayer } from "@/components/visual-primitives";
import {
  getArchetypeDefaultVariants,
  getArchetypeProfile,
  getCardDecoration,
  getThemeTokens,
} from "@/templates/archetypes/archetypeStyles";
import { ArchetypeDivider } from "@/templates/archetypes/ArchetypeDivider";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  CanvaCoverStaffBottomRight,
  CanvaCoverStaffTopLeft,
  CanvaFourPointStar,
  CanvaPortfolioDisplayTitle,
} from "./CanvaOrnaments";

export interface HeroBlockProps {
  section: HeroSection;
  theme: ThemeConfig;
  archetypeId?: TemplateId;
  editable?: boolean;
  sectionIndex?: number;
}

export function HeroBlock({
  section,
  theme,
  archetypeId = "canva-editorial",
  editable = false,
  sectionIndex,
}: HeroBlockProps) {
  const profile = getArchetypeProfile(archetypeId);
  const tokens = getThemeTokens(theme);
  const swapHeroLayout = usePortfolioStore((s) => s.swapHeroLayout);
  const updateSection = usePortfolioStore((s) => s.updateSection);

  const defaultVariants = getArchetypeDefaultVariants(archetypeId);
  const activeHeroVariant = section.variant || defaultVariants.hero;

  const isCanvaEditorial = activeHeroVariant === "canva-cover" || (archetypeId === "canva-editorial" && !section.variant);
  const isTerminal = (activeHeroVariant === "split-left" || !section.variant) && archetypeId === "tech-developer";
  const isMinimal =
    activeHeroVariant === "minimal-center" ||
    (!section.variant && (archetypeId === "framer-minimal" || archetypeId === "minimal-chic"));
  const isBento =
    activeHeroVariant === "bento" ||
    activeHeroVariant === "bento-intro" ||
    (!section.variant && (archetypeId === "bento-grid" || archetypeId === "vibrant-student"));
  const isCreative =
    archetypeId === "creative-showcase" || archetypeId === "creative-bold";
  const isGrowth = activeHeroVariant === "editorial-magazine" || (archetypeId === "growth-marketer" && !section.variant);
  const isWarmEditorial =
    activeHeroVariant === "editorial-asymmetric" ||
    (!section.variant && (archetypeId === "warm-editorial" || archetypeId === "artistic-organic"));
  const isOrganic = activeHeroVariant === "editorial-asymmetric" && archetypeId === "artistic-organic";
  const isAcademic = !section.variant && archetypeId === "academic-presentation";
  const isMedicalRuby = activeHeroVariant === "medical-arch";
  const isClinicalNavy = activeHeroVariant === "clinical-dossier";
  const isContentCreator = activeHeroVariant === "creator-cover";
  const isAcademicMonograph = activeHeroVariant === "academic-monograph";
  const isPedagogicalJournal = activeHeroVariant === "pedagogical-journal";
  const showHeroAvatar =
    section.showAvatar !== false && Boolean(section.avatar?.url?.trim());
  const portfolioLabel = section.portfolioLabel?.trim() || "Portfolio";
  const portfolioTitle =
    portfolioLabel.replace(/^digital\s+/i, "").trim() || "Portfolio";
  const portfolioDisplayLabel = `Digital ${portfolioTitle}`;
  const showPortfolioLabel = section.showPortfolioLabel !== false;
  const hasHeadline = Boolean(section.headline?.trim());
  const headlineIsPortfolio = hasHeadline && /portfolio/i.test(section.headline);

  const isCentered =
    section.variant === "centered" || section.variant === "minimal-center";
  const isSplitLeft = section.variant === "split-left";
  const isSplitRight =
    section.variant === "split-right" || section.variant === "split-modern";

  // Inverted layout check (Canvas swap)
  const isInverted = Boolean(
    section.layoutInverted ?? (section.mediaPosition === "left" || isSplitLeft),
  );

  const cardDec = getCardDecoration(archetypeId, theme);
  const buttonRadiusClass = isTerminal
    ? "rounded-lg font-mono"
    : isMinimal
      ? "rounded-lg"
      : isOrganic
        ? "rounded-[2rem]"
        : "rounded-full";

  if (isCanvaEditorial && !editable && section.variant === "canva-cover") {
    return (
      <section
        id="hero"
        className="reveal-on-scroll relative overflow-hidden pb-10 pt-2"
        style={{ color: `var(--section-text-color, ${theme.textColor})` }}
      >
        <div className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <CanvaCoverStaffTopLeft
            className="absolute -left-2 -top-2 h-44 w-44 opacity-95 sm:h-64 sm:w-64 lg:h-72 lg:w-72"
            stroke="var(--text, #1C1412)"
            noteFill="var(--text, #16100E)"
          />
          <CanvaCoverStaffBottomRight
            className="absolute -bottom-2 -right-2 h-40 w-44 opacity-95 sm:h-56 sm:w-64 lg:h-64 lg:w-72"
            stroke="var(--text, #1C1412)"
            noteFill="var(--text, #16100E)"
          />

          <div className="relative z-10 pt-6 sm:pt-10">
            {showPortfolioLabel && (
              <CanvaPortfolioDisplayTitle
                title={portfolioTitle}
                textColor="var(--text, #1E120E)"
                strokeColor="var(--primary, #4B3128)"
                fillColor="var(--primary, #927869)"
              />
            )}

            <div
              className={`mt-4 flex items-center justify-center gap-3 ${
                showHeroAvatar ? "" : "flex-col"
              }`}
            >
              {showHeroAvatar && (
                <img
                  src={section.avatar.url}
                  alt={section.fullName}
                  className="h-9 w-9 rounded-full border-2 object-cover shadow-sm transition hover:scale-105"
                  style={{ borderColor: "var(--primary, #735340)" }}
                />
              )}
              <div className={showHeroAvatar ? "text-center sm:text-left" : "text-center"}>
                <h1
                  className="font-editorial text-sm font-bold tracking-wide sm:text-base"
                  style={{ color: "var(--text, #3E2723)" }}
                >
                  {section.fullName}
                </h1>
                {section.roleTitle && (
                  <span
                    className={`text-xs font-medium tracking-wider opacity-75 ${
                      showHeroAvatar ? "ml-2 hidden sm:inline" : "mt-1 block"
                    }`}
                    style={{ color: "var(--primary, #735340)" }}
                  >
                    • {section.roleTitle}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-14 sm:gap-28">
              <CanvaFourPointStar
                className="h-6 w-6 sm:h-7 sm:w-7"
                color="var(--primary, #735340)"
              />
              <CanvaFourPointStar
                className="h-7 w-7 sm:h-8 sm:w-8"
                color="var(--primary, #735340)"
              />
              <CanvaFourPointStar
                className="h-6 w-6 sm:h-7 sm:w-7"
                color="var(--primary, #735340)"
              />
            </div>
            <div
              className="mt-6 border-b"
              style={{ borderColor: "var(--primary, #735340)", opacity: 0.55 }}
            />
          </div>
        </div>
      </section>
    );
  }

  const renderEyebrow = () => {
    if (!hasHeadline) return null;

    const IconComponent = isTerminal
      ? Terminal
      : isGrowth
        ? TrendingUp
        : Sparkles;

    const shouldShowSeparatePortfolioLabel =
      showPortfolioLabel && !headlineIsPortfolio;

    return (
      <div className="space-y-3">
        {shouldShowSeparatePortfolioLabel && (
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
            {portfolioDisplayLabel}
          </p>
        )}
        <div
        className={`inline-flex items-center gap-2 border px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${
          isTerminal
            ? "rounded-md font-mono tracking-[0.12em]"
            : isMinimal
              ? "rounded-md tracking-[0.18em]"
              : isOrganic
                ? "rounded-[2rem] tracking-[0.15em]"
                : isCreative
                  ? "rotate-[-1.5deg] border-2 border-black bg-amber-300 text-black shadow-[3px_3px_0px_#000]"
                  : "rounded-full"
        }`}
        style={
          isCreative
            ? undefined
            : {
                borderColor: `${theme.primaryColor}45`,
                backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                color: theme.primaryColor,
              }
        }
      >
        <IconComponent className="h-3.5 w-3.5" />
        <span>
          {isTerminal
            ? `$ whoami • ${
                showPortfolioLabel && headlineIsPortfolio
                  ? portfolioDisplayLabel
                  : section.headline
              }`
            : showPortfolioLabel && headlineIsPortfolio
              ? portfolioDisplayLabel
              : section.headline}
        </span>
        </div>
      </div>
    );
  };

  const renderCtaButtons = (centered = false) => (
    <div
      className={`flex flex-wrap gap-3 pt-1 ${centered ? "justify-center" : ""}`}
    >
      {section.ctaButtons.map((btn, idx) => (
        <a
          key={idx}
          href={btn.href}
          className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${buttonRadiusClass} ${
            isCreative
              ? "border-2 border-black font-black shadow-[4px_4px_0px_#000]"
              : ""
          }`}
          style={
            btn.style === "primary"
              ? { backgroundColor: theme.primaryColor, color: "#FFFFFF" }
              : btn.style === "secondary"
                ? { backgroundColor: theme.secondaryColor, color: "#FFFFFF" }
                : {
                    border: isCreative
                      ? undefined
                      : `1.5px solid ${
                          tokens.isDarkBg
                            ? theme.primaryColor
                            : theme.secondaryColor
                        }`,
                    color: tokens.isDarkBg
                      ? theme.primaryColor
                      : theme.secondaryColor,
                    backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                  }
          }
        >
          <span>{btn.label}</span>
          <ArrowDownRight className="h-4 w-4" />
        </a>
      ))}
    </div>
  );

  const renderQuickTags = (centered = false) => {
    if (section.quickTags.length === 0) return null;
    return (
      <div
        className={`flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}
      >
        {section.quickTags.map((tag, idx) => (
          <span
            key={idx}
            data-testid="hero-quick-tag"
            className={`border px-3.5 py-1 text-xs font-semibold ${
              isTerminal
                ? "rounded-md font-mono"
                : isMinimal
                  ? "rounded-md"
                  : isCreative
                    ? "rounded-lg border-2 border-black bg-white shadow-[2px_2px_0px_#000]"
                    : isOrganic
                      ? "rounded-[1.5rem]"
                      : "rounded-full shadow-sm"
            }`}
            style={
              isCreative
                ? undefined
                : {
                    backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                    borderColor: tokens.borderSubtle,
                  }
            }
          >
            {isTerminal ? "[" : isMinimal ? null : "✦ "}
            <span
              contentEditable={editable}
              suppressContentEditableWarning
              role={editable ? "textbox" : undefined}
              aria-label={editable ? `Sửa tag Hero ${idx + 1}` : undefined}
              onBlur={(event) => {
                if (!editable || sectionIndex === undefined) return;
                const nextTag = event.currentTarget.textContent?.trim() ?? "";
                if (nextTag === tag) return;
                updateSection(sectionIndex, {
                  ...section,
                  quickTags: section.quickTags.map((currentTag, tagIndex) =>
                    tagIndex === idx ? nextTag : currentTag,
                  ),
                });
              }}
              className={
                editable
                  ? "rounded-sm outline-none focus:ring-2 focus:ring-amber-400"
                  : ""
              }
            >
              {tag}
            </span>
            {editable && (
              <button
                type="button"
                aria-label={`Xóa tag Hero ${idx + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (sectionIndex === undefined) return;
                  updateSection(sectionIndex, {
                    ...section,
                    quickTags: section.quickTags.filter(
                      (_, tagIndex) => tagIndex !== idx,
                    ),
                  });
                }}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-rose-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {isTerminal ? "]" : null}
          </span>
        ))}
        {editable && (
          <button
            type="button"
            aria-label="Thêm tag Hero"
            onClick={(event) => {
              event.stopPropagation();
              if (sectionIndex === undefined) return;
              updateSection(sectionIndex, {
                ...section,
                quickTags: [...section.quickTags, "Tag mới"],
              });
            }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
              borderColor: tokens.borderSubtle,
            }}
          >
            <Plus className="h-3 w-3" />
            Thêm tag
          </button>
        )}
      </div>
    );
  };

  // Dedicated Renderers for Copy & Avatar
  const renderCopyBlock = (centered = false) => (
    <div className={`space-y-6 ${centered ? "text-center" : ""}`}>
      {renderEyebrow()}

      <div>
        <h1
          className={`font-editorial text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl ${
            isCreative ? "underline decoration-4 underline-offset-8" : ""
          } ${isMinimal ? "font-light tracking-wide uppercase sm:text-5xl" : ""}`}
          style={
            isCreative
              ? { textDecorationColor: `${theme.primaryColor}55` }
              : undefined
          }
        >
          {section.fullName}
        </h1>
        <p
          className={`mt-3 text-base font-semibold sm:text-xl ${
            isTerminal ? "font-mono text-sm sm:text-base" : ""
          } ${isMinimal ? "tracking-[0.15em] uppercase text-sm" : ""}`}
          style={{
            color: tokens.isDarkBg ? theme.primaryColor : theme.secondaryColor,
          }}
        >
          {isTerminal ? `> ${section.roleTitle}` : section.roleTitle}
        </p>
      </div>

      <p
        className={`max-w-xl text-base leading-relaxed opacity-85 ${
          centered ? "mx-auto" : ""
        }`}
      >
        {section.shortBio}
      </p>

      {renderQuickTags(centered)}
      {renderCtaButtons(centered)}
    </div>
  );

  const renderAvatarBlock = () => (
    <div
    className={`${
        isTerminal
        ? "surface-block rounded-2xl border p-4"
          : isCreative
            ? "surface-block relative rounded-3xl border-4 border-black bg-white p-4 shadow-[8px_8px_0px_#000] before:absolute before:-top-3.5 before:left-1/2 before:-translate-x-1/2 before:w-20 before:h-6 before:bg-amber-300 before:rotate-[-3deg] before:z-20 before:shadow-sm"
            : isMinimal
              ? "rounded-2xl border border-[var(--primary)]/20 p-4"
              : isOrganic
                ? "rounded-[3rem_1.5rem_3.5rem_1.5rem] border border-[var(--primary)]/30 p-5 shadow-lg"
                : isAcademic
                ? "surface-block rounded-xl border-2 border-stone-300 bg-white p-5 shadow-md"
                  : ""
    }`}
      style={
        isTerminal
          ? {
              backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
              borderColor: `${theme.primaryColor}40`,
            }
          : undefined
      }
    >
      <AvatarFrame
        avatar={section.avatar}
        alt={section.fullName}
        primaryColor={theme.primaryColor}
        secondaryColor={theme.secondaryColor}
        surfaceColor={`var(--section-surface-color, ${theme.surfaceColor})`}
        enableTilt={theme.effects?.enableTilt}
        enableGlow={theme.effects?.enableGlow}
      />
    </div>
  );

  return (
    <section
      id="hero"
      className={`relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 lg:px-8 ${
        isMinimal ? "lg:pb-20 lg:pt-20" : "lg:pb-16 lg:pt-16"
      }`}
    style={{ color: `var(--section-text-color, ${theme.textColor})` }}
    >
      <DecorationLayer
        decorations={section.decorations}
        primaryColor={theme.primaryColor}
        secondaryColor={theme.secondaryColor}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Studio Direct Canvas Swap Handle */}
        {editable && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <LayoutTemplate className="h-4 w-4 text-amber-600" />
              <span>
                Bố cục Hero: {section.variant || "Mặc định"}{" "}
                {isInverted ? "(Đã đảo vị trí)" : ""}
              </span>
            </div>
            <button
              type="button"
              data-testid="swap-hero-layout"
              onClick={swapHeroLayout}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 font-bold text-white shadow-sm hover:bg-amber-700 transition cursor-pointer"
              title="Kéo đổi vị trí Ảnh với Chữ trên Canvas"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>⇄ Đổi vị trí Ảnh / Chữ</span>
            </button>
          </div>
        )}

        {/* Academic Presentation Slide Banner */}
        {isAcademic && (
          <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-2 text-xs text-stone-500 font-mono">
            <span>ĐHQGHN • UEd | TRƯỜNG ĐH SƯ PHẠM NGHỆ THUẬT TW</span>
            <span className="rounded bg-stone-100 px-2 py-0.5 font-bold text-stone-700">
              Slide 01 • Bìa mở đầu
            </span>
          </div>
        )}

        {/* Layout Branches */}
        {!showHeroAvatar ? (
          <div className="mx-auto max-w-4xl py-8">
            {renderCopyBlock(true)}
          </div>
        ) : isMedicalRuby ? (
          <div className="space-y-6">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest uppercase shadow-sm"
              style={{
                backgroundColor: theme.primaryColor,
                borderColor: "#C29B38",
                color: "#FFFFFF",
              }}
            >
              <Award className="h-4 w-4 text-amber-300" />
              <span>HỒ SƠ NĂNG LỰC DƯỢC HỌC • CHUẨN GMP/GSP • CLINICAL PHARMACY</span>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className={`space-y-6 lg:col-span-7 ${isInverted ? "lg:order-2" : ""}`}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
                    DƯỢC SĨ ĐẠI HỌC • NGHIÊN CỨU &amp; BÀO CHẾ
                  </span>
                  <h1 className="mt-2 font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2B1810] leading-tight">
                    {section.fullName}
                  </h1>
                  <p className="mt-2 text-lg font-medium text-[#7B1113] italic">
                    {section.roleTitle}
                  </p>
                </div>

                <p className="max-w-xl text-base leading-relaxed text-[#2B1810]/85">
                  {section.shortBio}
                </p>

                {/* 2-Column Syllabus / Index Card */}
                <div
                  className="rounded-2xl border p-5 shadow-sm bg-white/80"
                  style={{
                    borderColor: "rgba(123, 17, 19, 0.25)",
                    boxShadow: "0 8px 24px -6px rgba(123, 17, 19, 0.12)",
                  }}
                >
                  <div
                    className="flex items-center justify-between border-b pb-2.5 mb-3.5"
                    style={{ borderColor: "rgba(123, 17, 19, 0.18)" }}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7B1113] flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-amber-600" /> MỤC LỤC HỒ SƠ CHUYÊN MÔN DƯỢC
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                      SYLLABUS 2024
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#2B1810]">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-200/60">
                      <span className="font-extrabold text-[#7B1113]">01.</span> Lý lịch Dược sĩ &amp; Y đức
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-200/60">
                      <span className="font-extrabold text-[#7B1113]">02.</span> Chuyên môn Lâm sàng &amp; Bào chế
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-200/60">
                      <span className="font-extrabold text-[#7B1113]">03.</span> Đề tài &amp; Dự án trọng điểm
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-200/60">
                      <span className="font-extrabold text-[#7B1113]">04.</span> Chứng chỉ &amp; Tiêu chuẩn GMP
                    </div>
                  </div>
                </div>

                {renderQuickTags(false)}
                {renderCtaButtons(false)}
              </div>

              <div className={`flex justify-center lg:col-span-5 ${isInverted ? "lg:order-1" : ""}`}>
                <div className="relative group">
                  <div
                    className="absolute -inset-1.5 rounded-[164px_164px_28px_28px] opacity-75 blur-sm"
                    style={{ background: "linear-gradient(135deg, #C29B38, #7B1113)" }}
                  />
                  <div
                    className="relative overflow-hidden p-2 bg-white"
                    style={{
                      borderRadius: "160px 160px 24px 24px",
                      border: "4px solid #7B1113",
                      boxShadow: "0 0 0 2px #C29B38, 0 16px 36px -10px rgba(123, 17, 19, 0.35)",
                    }}
                  >
                    <img
                      src={section.avatar.url}
                      alt={section.fullName}
                      className="w-72 h-96 sm:w-80 sm:h-[440px] object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ borderRadius: "152px 152px 18px 18px" }}
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-300 bg-[#7B1113] px-4 py-1.5 text-center text-[10px] font-bold tracking-wider text-white uppercase shadow-lg whitespace-nowrap">
                    TIÊU CHUẨN GMP/GSP • BỘ Y TẾ
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isClinicalNavy ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1A1264]/20 bg-slate-100/90 px-4 py-2.5 text-xs font-mono text-[#0C0838]">
              <span className="font-bold flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                [DOSSIER ARCHIVE: 2024-MED-CLINICAL]
              </span>
              <span className="opacity-75">BỆNH VIỆN BẠCH MAI • TRƯỜNG ĐH Y HÀ NỘI</span>
              <span className="rounded bg-[#1A1264] px-2.5 py-0.5 text-[10px] text-white font-bold tracking-wider">
                STATUS: ACTIVE RESIDENT
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className={`space-y-6 lg:col-span-7 ${isInverted ? "lg:order-2" : ""}`}>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-indigo-700">
                    [CLINICAL CASE DOSSIER // RESIDENT PROFILE]
                  </span>
                  <h1 className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0C0838]">
                    {section.fullName}
                  </h1>
                  <p className="mt-2 text-base font-semibold text-[#1A1264]">
                    {section.roleTitle}
                  </p>
                </div>

                <p className="max-w-xl text-base leading-relaxed text-[#0C0838]/85">
                  {section.shortBio}
                </p>

                {/* Clinical Diagnostic Index */}
                <div className="rounded-xl border border-indigo-900/20 bg-white p-4 shadow-sm font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-indigo-900/10 pb-2 mb-3">
                    <span className="font-bold text-[#1A1264] flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-indigo-600" /> DANH MỤC CA BỆNH &amp; CHUYÊN MÔN
                    </span>
                    <span className="text-[10px] text-slate-500">ICD-10 CLINICAL ARCHIVE</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <strong className="text-[#1A1264]">[CASE 01]</strong> Cấp cứu &amp; Can thiệp hồi sức
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <strong className="text-[#1A1264]">[CASE 02]</strong> Phác đồ điều trị nội khoa
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <strong className="text-[#1A1264]">[CASE 03]</strong> Chẩn đoán cận lâm sàng
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <strong className="text-[#1A1264]">[CASE 04]</strong> Y học chứng cứ &amp; Báo cáo
                    </div>
                  </div>
                </div>

                {renderQuickTags(false)}
                {renderCtaButtons(false)}
              </div>

              <div className={`flex justify-center lg:col-span-5 ${isInverted ? "lg:order-1" : ""}`}>
                <div className="relative group rounded-2xl border-2 border-[#1A1264] bg-white p-3 shadow-xl">
                  <div className="absolute top-1 left-3 font-mono text-[9px] font-bold text-slate-500">
                    [CASE_IMAGE // HIGH_RES]
                  </div>
                  <img
                    src={section.avatar.url}
                    alt={section.fullName}
                    className="w-72 h-96 sm:w-80 sm:h-[440px] rounded-xl object-cover"
                  />
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#1A1264]">
                    <span>RECORD: VERIFIED</span>
                    <span>HOSPITAL ID: #9821</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isContentCreator ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-[#722F37] pb-2 text-xs font-black uppercase tracking-widest text-[#722F37]">
              <span>CREATIVE DIRECTORY • ISSUE NO. 01</span>
              <span>MEDIA &amp; VIRAL STORYTELLING</span>
              <span>EST. 2024</span>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className={`space-y-6 lg:col-span-7 ${isInverted ? "lg:order-2" : ""}`}>
                <div>
                  <h1 className="font-editorial text-5xl sm:text-6xl font-black uppercase tracking-tight text-[#2D1418] leading-[0.95]">
                    {section.fullName}
                  </h1>
                  <p className="mt-3 text-lg font-bold text-[#722F37] uppercase tracking-wider">
                    {section.roleTitle}
                  </p>
                </div>

                <p className="max-w-xl text-base leading-relaxed text-[#2D1418]/90 font-medium">
                  {section.shortBio}
                </p>

                {/* Floating Viral Sticker Badges */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <span className="rotate-[-2deg] rounded-full border-2 border-black bg-amber-300 px-3.5 py-1 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                    🔥 VIRAL CAMPAIGN
                  </span>
                  <span className="rotate-[1.5deg] rounded-full border-2 border-black bg-rose-300 px-3.5 py-1 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                    🎬 TIKTOK CREATOR
                  </span>
                  <span className="rotate-[-1deg] rounded-full border-2 border-black bg-sky-300 px-3.5 py-1 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                    ✨ 500K+ REACH
                  </span>
                  <span className="rotate-[2deg] rounded-full border-2 border-black bg-emerald-300 px-3.5 py-1 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                    📸 VISUAL STORYTELLER
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-[#722F37]/80">
                  <span>• TIKTOK</span>
                  <span>• REELS</span>
                  <span>• YOUTUBE</span>
                  <span>• PODCAST</span>
                </div>

                {renderQuickTags(false)}
                {renderCtaButtons(false)}
              </div>

              <div className={`flex justify-center lg:col-span-5 ${isInverted ? "lg:order-1" : ""}`}>
                <div className="relative rotate-[2deg] rounded-3xl border-4 border-black bg-white p-4 shadow-[8px_8px_0px_#000] transition-transform hover:rotate-0">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-24 h-7 bg-amber-300/90 border border-black/40 rotate-[-2deg] shadow-sm" />
                  <img
                    src={section.avatar.url}
                    alt={section.fullName}
                    className="w-72 h-96 sm:w-80 sm:h-[430px] rounded-2xl object-cover"
                  />
                  <p className="mt-3 text-center font-editorial text-sm font-bold text-stone-800 italic">
                    Campaign On Set 2024 ⚡
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isAcademicMonograph ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 pb-3" style={{ borderColor: "#9B302D" }}>
              <span className="text-xs font-bold uppercase tracking-widest text-[#9B302D]">
                ĐẠI HỌC QUỐC GIA HÀ NỘI • TRƯỜNG ĐẠI HỌC GIÁO DỤC
              </span>
              <span
                className="rounded border px-3 py-0.5 text-[11px] font-bold text-[#9B302D] bg-[#EDEAE2]"
                style={{ borderColor: "#9B302D" }}
              >
                ACADEMIC MONOGRAPH VOL. 2024
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className={`space-y-6 lg:col-span-7 ${isInverted ? "lg:order-2" : ""}`}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9B302D]">
                    HỒ SƠ HỌC THUẬT &amp; NGHIÊN CỨU SƯ PHẠM
                  </span>
                  <h1 className="mt-2 font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#282828] leading-tight">
                    {section.fullName}
                  </h1>
                  <p className="mt-2 text-lg font-medium text-[#9B302D] italic">
                    {section.roleTitle}
                  </p>
                </div>

                <p className="max-w-xl text-base leading-relaxed text-[#282828]/85">
                  {section.shortBio}
                </p>

                {/* Research Framework Index */}
                <div className="rounded-xl border p-4 bg-white/80 shadow-sm" style={{ borderColor: "rgba(155, 48, 45, 0.3)" }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9B302D] mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" /> KHUNG NGHIÊN CỨU &amp; HỌC THUẬT SƯ PHẠM
                  </h4>
                  <div className="space-y-1.5 text-xs text-[#282828]">
                    <div className="flex items-center gap-2">
                      <strong className="text-[#9B302D]">I.</strong> Lý lịch khoa học &amp; Triết lý giáo dục
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#9B302D]">II.</strong> Năng lực sư phạm &amp; Dạy học tích cực
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#9B302D]">III.</strong> Các công trình nghiên cứu &amp; Đề tài thực nghiệm
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#9B302D]">IV.</strong> Xuất bản tạp chí &amp; Báo cáo sư phạm
                    </div>
                  </div>
                </div>

                {renderQuickTags(false)}
                {renderCtaButtons(false)}
              </div>

              <div className={`flex justify-center lg:col-span-5 ${isInverted ? "lg:order-1" : ""}`}>
                <div className="relative group">
                  <div
                    className="relative overflow-hidden p-2.5 bg-white shadow-xl"
                    style={{
                      borderRadius: "160px 160px 24px 24px",
                      border: "3px solid #9B302D",
                    }}
                  >
                    <img
                      src={section.avatar.url}
                      alt={section.fullName}
                      className="w-72 h-96 sm:w-80 sm:h-[440px] object-cover"
                      style={{ borderRadius: "152px 152px 18px 18px" }}
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#9B302D] bg-[#9B302D] px-4 py-1 text-center text-[10px] font-bold text-white uppercase shadow-md whitespace-nowrap">
                    VNU-UEd RESEARCH FELLOW
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isPedagogicalJournal ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "rgba(155, 84, 100, 0.3)" }}>
              <span className="text-xs font-bold tracking-widest uppercase text-[#9B5464]">
                NHẬT KÝ SƯ PHẠM &amp; THỰC TẬP GIẢNG DẠY
              </span>
              <span className="rounded-full bg-[#9B5464]/10 px-3 py-1 text-[11px] font-bold text-[#9B5464]">
                GIÁO VIÊN TƯƠNG LAI • KHOA SƯ PHẠM UEd
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className={`space-y-6 lg:col-span-7 ${isInverted ? "lg:order-2" : ""}`}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9B5464]">
                    NHẬT KÝ NGƯỜI GIÁO VIÊN TRẺ
                  </span>
                  <h1 className="mt-2 font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#3A2329] leading-tight">
                    {section.fullName}
                  </h1>
                  <p className="mt-2 text-base font-medium text-[#9B5464] italic">
                    {section.roleTitle}
                  </p>
                </div>

                <p className="max-w-xl text-base leading-relaxed text-[#3A2329]/85">
                  {section.shortBio}
                </p>

                {/* Pedagogical Journal Index */}
                <div className="rounded-2xl border p-4 bg-white/80 shadow-sm" style={{ borderColor: "rgba(155, 84, 100, 0.25)" }}>
                  <h4 className="text-xs font-bold text-[#9B5464] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Bookmark className="h-4 w-4" /> TIẾN TRÌNH THỰC TẬP &amp; KẾ HOẠCH BÀI DẠY
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#3A2329]">
                    <div className="p-2 rounded-lg bg-[#F9F6F2] border border-[#9B5464]/15">🌸 Bài 1: Chân dung người giáo viên</div>
                    <div className="p-2 rounded-lg bg-[#F9F6F2] border border-[#9B5464]/15">🌸 Bài 2: Kế hoạch bài dạy (Giáo án)</div>
                    <div className="p-2 rounded-lg bg-[#F9F6F2] border border-[#9B5464]/15">🌸 Bài 3: Hoạt động trải nghiệm sáng tạo</div>
                    <div className="p-2 rounded-lg bg-[#F9F6F2] border border-[#9B5464]/15">🌸 Bài 4: Phản tư &amp; Nhận xét học sinh</div>
                  </div>
                </div>

                {renderQuickTags(false)}
                {renderCtaButtons(false)}
              </div>

              <div className={`flex justify-center lg:col-span-5 ${isInverted ? "lg:order-1" : ""}`}>
                <div className="relative rounded-3xl border-2 border-[#9B5464]/40 bg-white p-3 shadow-lg">
                  <div className="absolute -top-3 right-4 rounded-md bg-[#9B5464] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    SƯ PHẠM 2024
                  </div>
                  <img
                    src={section.avatar.url}
                    alt={section.fullName}
                    className="w-72 h-96 sm:w-80 sm:h-[440px] rounded-2xl object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : isCentered ? (
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <div className="flex justify-center">
              <AvatarFrame
                avatar={section.avatar}
                alt={section.fullName}
                primaryColor={theme.primaryColor}
                secondaryColor={theme.secondaryColor}
                surfaceColor={`var(--section-surface-color, ${theme.surfaceColor})`}
                enableTilt={theme.effects?.enableTilt}
                enableGlow={theme.effects?.enableGlow}
                className="max-w-[200px]"
              />
            </div>
            <div className="flex justify-center">{renderEyebrow()}</div>
            <h1 className="font-editorial text-4xl font-bold tracking-tight sm:text-6xl">
              {section.fullName}
            </h1>
            <p className="text-base font-medium opacity-80 sm:text-lg">
              {section.roleTitle}
            </p>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed opacity-80 sm:text-base">
              {section.shortBio}
            </p>
            {renderQuickTags(true)}
            {renderCtaButtons(true)}
          </div>
        ) : isBento ? (
          /* Multi-Cell Bento Grid (Bao Cham / bt link parity) */
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            {/* Cell 1: Main Intro */}
            <div
              className={`surface-block flex flex-col justify-between p-7 sm:p-10 lg:col-span-7 ${cardDec.className}`}
              style={cardDec.style}
            >
              <div className="space-y-5">
                {renderEyebrow()}
                <div>
                  <h1 className="font-editorial text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
                    {section.fullName}
                  </h1>
                  <p
                    className="mt-3 text-base font-semibold sm:text-lg"
                    style={{ color: theme.primaryColor }}
                  >
                    {section.roleTitle}
                  </p>
                </div>
                <p className="max-w-xl text-sm leading-relaxed opacity-85 sm:text-base">
                  {section.shortBio}
                </p>
              </div>
              <div
                className="mt-6 space-y-5 border-t pt-5"
                style={{ borderColor: tokens.borderSubtle }}
              >
                {renderQuickTags(false)}
                {renderCtaButtons(false)}
              </div>
            </div>

            {/* Cell 2: Avatar Tile */}
            <div
              className={`flex flex-col items-center justify-center p-6 sm:p-8 lg:col-span-5 ${cardDec.className}`}
              style={{
                ...cardDec.style,
                backgroundColor: `${theme.primaryColor}0D`,
              }}
            >
              <AvatarFrame
                avatar={section.avatar}
                alt={section.fullName}
                primaryColor={theme.primaryColor}
                secondaryColor={theme.secondaryColor}
                surfaceColor={`var(--section-surface-color, ${theme.surfaceColor})`}
                enableTilt={theme.effects?.enableTilt}
                enableGlow={theme.effects?.enableGlow}
              />
              <span
                className="mt-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm"
                style={{
                  backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                  color: theme.secondaryColor,
                }}
              >
                {profile.badgeLabel} Portfolio
              </span>
            </div>
          </div>
        ) : isWarmEditorial ? (
          /* Asymmetric magazine editorial layout */
          <div
            className="surface-block rounded-3xl border border-[var(--primary)]/20 bg-white/70 p-6 sm:p-10 backdrop-blur-sm shadow-xl"
            style={{
              backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
            }}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[var(--primary)]/15 pb-3">
              <span className="font-editorial text-xs italic tracking-wider opacity-75">
                EDITORIAL ARCHIVE • DIGITAL PORTFOLIO 2026
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-700">
                VOL. 01 • SƯ PHẠM
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div
                className={`space-y-6 ${isInverted ? "lg:col-span-7 lg:order-2" : "lg:col-span-7 lg:order-1"}`}
              >
                {renderCopyBlock()}
              </div>
              <div
                className={`${isInverted ? "lg:col-span-5 lg:order-1" : "lg:col-span-5 lg:order-2"}`}
              >
                {renderAvatarBlock()}
              </div>
            </div>
          </div>
        ) : (
          /* Standard & Invertible Split Layout (Split-Left / Split-Right / Creative-Bold / Academic) */
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div
              className={`space-y-6 ${isInverted ? "lg:col-span-7 lg:order-2" : "lg:col-span-7 lg:order-1"}`}
            >
              {renderCopyBlock()}
            </div>
            <div
              className={`${isInverted ? "lg:col-span-5 lg:order-1" : "lg:col-span-5 lg:order-2"}`}
            >
              {renderAvatarBlock()}
            </div>
          </div>
        )}

        <ArchetypeDivider archetypeId={archetypeId} theme={theme} />
      </div>
    </section>
  );
}
