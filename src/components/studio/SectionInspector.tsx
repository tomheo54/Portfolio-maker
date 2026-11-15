"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Upload,
  User,
  Layers,
  Sparkles,
  ShieldCheck,
  Code2,
  Eye,
  Repeat,
  Compass,
} from "lucide-react";
import type {
  HeroSection,
  AboutSection,
  SkillsSection,
  ProjectsSection,
  ContactSection,
  AboutContactItem,
  ProjectItem,
  ConclusionCard,
  ConclusionConfig,
  ProfileOwner,
  ProjectDetailMode,
  SectionMotif,
} from "@/schema/portfolio.schema";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { ProjectImageManager } from "./ProjectImageManager";
import { DraggableUnitList } from "./DraggableUnitList";
import { VIETNAMESE_FONT_OPTIONS } from "@/schema/theme.schema";
import { DEFAULT_CONCLUSION_CONFIG } from "@/templates/blocks/conclusion-defaults";
import { isVideoUrl } from "@/utils/video";

const SECTION_MOTIF_OPTIONS: Array<{ id: SectionMotif; label: string }> = [
  { id: "none", label: "Không họa tiết" },
  { id: "geometric-dots", label: "Chấm hình học" },
  { id: "botanical-leaves", label: "Lá thực vật" },
  { id: "cyber-mesh", label: "Lưới công nghệ" },
  { id: "abstract-blobs", label: "Đường cong hữu cơ" },
  { id: "celestial-sparkles", label: "Sao và tia sáng" },
  { id: "vintage-parchment", label: "Vân giấy" },
  { id: "minimalist-contour", label: "Đường nét tối giản" },
  { id: "halftone-field", label: "Halftone editorial" },
  { id: "editorial-arcs", label: "Cung editorial" },
  { id: "soft-paper-waves", label: "Sóng giấy mềm" },
  { id: "quiet-starburst", label: "Tia sao góc" },
  { id: "canva-musical", label: "Nốt nhạc" },
];

function getConclusionCardWidth(
  layout: ConclusionConfig["layout"],
  index: number,
) {
  switch (layout) {
    case "three-cards":
      return 4;
    case "two-cards":
    case "masonry":
      return 6;
    case "compact":
      return 3;
    case "editorial":
      return index === 0 ? 8 : 4;
    case "spotlight":
      return index === 0 ? 12 : 6;
    case "stacked":
    case "timeline":
      return 12;
  }
}

export interface SectionInspectorProps {
  imageManagerFocusRequest?: {
    projectId: string;
    tab: 'docx';
    requestId: number;
  } | null;
}

export function SectionInspector({
  imageManagerFocusRequest,
}: SectionInspectorProps) {
  const {
    document,
    activeSectionIndex,
    selectedProjectId,
    setSelectedProjectId,
    updateSection,
    updateProject,
    updateProjectItem,
    setSlugAndSeo,
    reorderProjects,
    reorderSkills,
    reorderHighlights,
    updateProfileOwner,
  } = usePortfolioStore();

  const [slugDraft, setSlugDraft] = useState(document.slug);
  const [activeTab, setActiveTab] = useState<"section" | "owner">("section");
  const [docxUploadingProjectId, setDocxUploadingProjectId] = useState<string | null>(null);
  const [docxUploadError, setDocxUploadError] = useState<string | null>(null);

  useEffect(() => {
    setSlugDraft(document.slug);
  }, [document.slug]);

  const idx = activeSectionIndex ?? 0;
  const section = document.sections[idx];
  const conclusion =
    section?.type === "contact"
      ? section.conclusion ?? DEFAULT_CONCLUSION_CONFIG
      : undefined;

  const updateConclusion = (patch: Partial<ConclusionConfig>) => {
    if (section?.type !== "contact") return;
    updateSection(idx, {
      ...section,
      conclusion: {
        ...(section.conclusion ?? DEFAULT_CONCLUSION_CONFIG),
        ...patch,
      },
    });
  };

  const updateConclusionCard = (
    cardIndex: number,
    patch: Partial<ConclusionCard>,
  ) => {
    if (!conclusion) return;
    updateConclusion({
      cards: conclusion.cards.map((card, index) =>
        index === cardIndex ? { ...card, ...patch } : card,
      ),
    });
  };

  // Resolve Profile Owner state with fallback to hero section
  const heroSec = document.sections.find(
    (s): s is HeroSection => s.type === "hero",
  );
  const aboutSec = document.sections.find(
    (s): s is AboutSection => s.type === "about",
  );
  const aboutSectionIndex = document.sections.findIndex(
    (s) => s.type === "about",
  );

  const ownerProfile: ProfileOwner = document.profileOwner ?? {
    fullName: heroSec?.fullName ?? "Họ và Tên",
    roleTitle: heroSec?.roleTitle ?? "Chức danh / Ngành học",
    avatarUrl: heroSec?.avatar.url ?? "",
    avatarSourceType: heroSec?.avatar.sourceType ?? "user-uploaded",
    frameStyle:
      (heroSec?.avatar.frameStyle as ProfileOwner["frameStyle"]) ??
      "arch-window",
    aspectRatio:
      (heroSec?.avatar.aspectRatio as ProfileOwner["aspectRatio"]) ?? "3/4",
    bioSnippet: heroSec?.shortBio,
    learningGoals: aboutSec?.learningGoals,
    portfolioObjective: aboutSec?.portfolioObjective,
  };

  const handleAvatarFileUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateProfileOwner({
          avatarUrl: reader.result,
          avatarSourceType: "user-uploaded",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 p-3.5 text-stone-800 text-xs">
      {/* Top Tab Bar: Edit Section vs Edit Profile Owner */}
      <div className="flex rounded-xl bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("section")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
            activeTab === "section"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-amber-600" />
          <span>Section đang chọn</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("owner")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
            activeTab === "owner"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <User className="h-3.5 w-3.5 text-indigo-600" />
          <span>Chân dung Chủ nhân</span>
        </button>
      </div>

      {/* Profile Owner Portrait & Rubric Identity Tab */}
      {activeTab === "owner" && (
        <div className="space-y-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div>
              <h3 className="font-bold text-stone-900">
                Chủ nhân Portfolio (Portrait Manager)
              </h3>
              <p className="text-[10px] text-stone-500">
                Quản lý ảnh đại diện &amp; thông tin chuẩn hoá toàn bộ template
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              R1 &amp; Rubric
            </span>
          </div>

          {/* Portrait Image Preview & Upload */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700">
              Ảnh chân dung chính chủ
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-stone-300 bg-stone-200 shadow-inner">
                {ownerProfile.avatarUrl ? (
                  <img
                    src={ownerProfile.avatarUrl}
                    alt={ownerProfile.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-400">
                    <User className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 shadow-sm">
                  <Upload className="h-3 w-3 text-amber-600" />
                  <span>Tải ảnh từ máy</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleAvatarFileUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[10px] text-stone-400">
                  Hỗ trợ PNG, JPG, WebP. Tự động chuyển đổi base64.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={
                ownerProfile.avatarUrl.startsWith("data:")
                  ? ""
                  : ownerProfile.avatarUrl
              }
              onChange={(e) =>
                updateProfileOwner({
                  avatarUrl: e.target.value,
                  avatarSourceType: "user-uploaded",
                })
              }
              placeholder={
                ownerProfile.avatarUrl.startsWith("data:")
                  ? "Đang dùng ảnh tải từ máy (hoặc dán URL ảnh khác)"
                  : "Hoặc dán URL ảnh chân dung (https://...)"
              }
              className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono"
            />
          </div>

          {/* Frame Style & Aspect Ratio Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700">
                Kiểu khung ảnh (Frame)
              </label>
              <select
                value={ownerProfile.frameStyle}
                onChange={(e) =>
                  updateProfileOwner({
                    frameStyle: e.target.value as ProfileOwner["frameStyle"],
                  })
                }
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium"
              >
                <option value="arch-window">
                  Canva Arch Window (Khung vòm)
                </option>
                <option value="polaroid">Polaroid Tape (Thước phim)</option>
                <option value="cutout-blob">
                  Organic Blob (Đường cong lượn)
                </option>
                <option value="circle">Circle (Tròn cổ điển)</option>
                <option value="rounded-rect">Rounded Card (Bo góc mềm)</option>
                <option value="none">None (Không viền khung)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700">
                Tỷ lệ khung ảnh (Aspect Ratio)
              </label>
              <select
                value={ownerProfile.aspectRatio}
                onChange={(e) =>
                  updateProfileOwner({
                    aspectRatio: e.target.value as ProfileOwner["aspectRatio"],
                  })
                }
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium"
              >
                <option value="3/4">3:4 (Chân dung dọc Canva)</option>
                <option value="1/1">1:1 (Khung vuông)</option>
                <option value="4/5">4:5 (Tỷ lệ mạng xã hội)</option>
                <option value="none">Tự do / Tự nhiên</option>
              </select>
            </div>
          </div>

          {/* Name & Role Title */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700">
              Họ và tên chủ nhân
            </label>
            <input
              type="text"
              value={ownerProfile.fullName}
              onChange={(e) => updateProfileOwner({ fullName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700">
              Chức danh / Ngành học
            </label>
            <input
              type="text"
              value={ownerProfile.roleTitle}
              onChange={(e) =>
                updateProfileOwner({ roleTitle: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700">
              Tóm tắt giới thiệu (Bio Snippet)
            </label>
            <textarea
              rows={2}
              value={ownerProfile.bioSnippet ?? ""}
              onChange={(e) =>
                updateProfileOwner({ bioSnippet: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs"
            />
          </div>

          {/* INF2501 Rubric Identity Fields */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>Tiêu chí Rubric INF2501 (Trang Giới thiệu)</span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-stone-600">
                🎯 Mục tiêu học tập &amp; Định hướng cá nhân
              </label>
              <textarea
                rows={2}
                value={ownerProfile.learningGoals ?? ""}
                placeholder="Rèn luyện kỹ năng ứng dụng AI vào giảng dạy và sáng tạo học liệu số..."
                onChange={(e) =>
                  updateProfileOwner({ learningGoals: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-stone-600">
                📋 Mục tiêu của Portfolio
              </label>
              <textarea
                rows={2}
                value={ownerProfile.portfolioObjective ?? ""}
                placeholder="Trưng bày minh chứng và tổng hợp 6 bài tập lớn học phần INF2501..."
                onChange={(e) =>
                  updateProfileOwner({ portfolioObjective: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Section Specific Inspector Tab */}
      {activeTab === "section" && (
        <>
          {/* Public Slug Setting */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Đường dẫn Public URL
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs">
              <span className="text-stone-400">/</span>
              <input
                type="text"
                value={slugDraft}
                onChange={(e) => {
                  const sanitized = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-_]/g, "");
                  setSlugDraft(sanitized);
                  if (sanitized.length > 0) {
                    setSlugAndSeo(sanitized);
                  }
                }}
                onBlur={() => {
                  if (!slugDraft) {
                    setSlugDraft(document.slug);
                  }
                }}
                className="ml-0.5 w-full font-semibold outline-none"
              />
            </div>
          </div>

          {!section && (
            <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400">
              Chọn một Section trên Canvas để chỉnh sửa nội dung.
            </div>
          )}

          {section && (
            <div
              data-testid="section-design-controls"
              className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-2.5"
            >
              <div>
                <label
                  htmlFor={`section-motif-${idx}`}
                  className="block text-[11px] font-semibold text-stone-700"
                >
                  Họa tiết riêng cho section
                </label>
                <select
                  id={`section-motif-${idx}`}
                  value={section.motif ?? "none"}
                  onChange={(e) => {
                    const selected = SECTION_MOTIF_OPTIONS.find(
                      (option) => option.id === e.target.value,
                    );
                    if (selected) {
                      updateSection(idx, { ...section, motif: selected.id });
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                >
                  {SECTION_MOTIF_OPTIONS.map((motif) => (
                    <option key={motif.id} value={motif.id}>
                      {motif.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`section-accent-${idx}`}
                  className="text-[11px] font-semibold text-stone-700"
                >
                  Màu nhấn riêng
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`section-accent-${idx}`}
                    type="color"
                    value={section.accentColor ?? document.theme.primaryColor}
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        accentColor: e.target.value,
                      })
                    }
                    className="h-7 w-9 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateSection(idx, { ...section, accentColor: undefined })
                    }
                    className="text-[10px] font-medium text-indigo-700 hover:underline"
                  >
                    Theo theme
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "backgroundColor", label: "Màu nền section", fallback: document.theme.backgroundColor },
                  { key: "surfaceColor", label: "Màu nền thẻ", fallback: document.theme.surfaceColor },
                  { key: "headingColor", label: "Màu tiêu đề", fallback: document.theme.textColor },
                  { key: "textColor", label: "Màu nội dung", fallback: document.theme.textColor },
                ] as const).map(({ key, label, fallback }) => (
                  <div key={key} className="rounded-lg border border-stone-200 bg-white p-1.5">
                    <label htmlFor={`section-${key}-${idx}`} className="block text-[10px] font-semibold text-stone-700">
                      {label}
                    </label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        id={`section-${key}-${idx}`}
                        type="color"
                        aria-label={`${label} riêng`}
                        value={section[key] ?? fallback}
                        onChange={(event) => updateSection(idx, { ...section, [key]: event.target.value })}
                        className="h-7 w-9 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => updateSection(idx, { ...section, [key]: undefined })}
                        className="text-[9px] font-medium text-indigo-700 hover:underline"
                      >Theo theme</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor={`section-heading-font-${idx}`}
                    className="block text-[11px] font-semibold text-stone-700"
                  >
                    Font tiêu đề
                  </label>
                  <select
                    id={`section-heading-font-${idx}`}
                    value={section.headingFont ?? ""}
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        headingFont: e.target.value || undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">
                      Theo theme ({document.theme.headingFont})
                    </option>
                    {VIETNAMESE_FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`section-body-font-${idx}`}
                    className="block text-[11px] font-semibold text-stone-700"
                  >
                    Font nội dung
                  </label>
                  <select
                    id={`section-body-font-${idx}`}
                    value={section.bodyFont ?? ""}
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        bodyFont: e.target.value || undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">
                      Theo theme ({document.theme.bodyFont})
                    </option>
                    {VIETNAMESE_FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor={`section-tags-${idx}`}
                  className="block text-[11px] font-semibold text-stone-700"
                >
                  Hashtag riêng cho section
                </label>
                <input
                  id={`section-tags-${idx}`}
                  type="text"
                  value={section.tags?.join(", ") ?? ""}
                  placeholder="portfolio, sáng tạo, học tập"
                  onChange={(e) => {
                    const tags = Array.from(
                      new Set(
                        e.target.value
                          .split(/[,\n]/)
                          .map((tag) =>
                            tag.trim().replace(/^#+/, "").replace(/\s+/g, "-"),
                          )
                          .filter(Boolean),
                      ),
                    );
                    updateSection(idx, {
                      ...section,
                      tags: tags.length > 0 ? tags : undefined,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                />
                <p className="mt-1 text-[10px] text-stone-500">
                  Phân tách bằng dấu phẩy; hiển thị riêng ở cuối section.
                </p>
              </div>
            </div>
          )}

          {/* Section Type: Hero */}
          {section?.type === "hero" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <h3 className="font-bold uppercase tracking-wider text-stone-500">
                  Bìa mở đầu (Hero)
                </h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  Slide 1
                </span>
              </div>

              {/* Multi-Frame Layout Switcher for Hero */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Bố cục trình bày (Layout Variant)
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "canva-cover", label: "Canva Cover" },
                      { id: "split-modern", label: "Split Modern" },
                      { id: "bento-intro", label: "Bento Intro" },
                      { id: "minimal-center", label: "Minimal Center" },
                      { id: "editorial-magazine", label: "Editorial" },
                      { id: "editorial-asymmetric", label: "Bất đối xứng" },
                      { id: "split-left", label: "Chia đôi (Ảnh trái)" },
                      { id: "split-right", label: "Chia đôi (Ảnh phải)" },
                      { id: "centered", label: "Căn giữa" },
                      { id: "bento", label: "Bento Grid" },
                    ] as const
                  ).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        updateSection(idx, {
                          ...section,
                          variant: layout.id,
                        })
                      }
                      className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                        section.variant === layout.id
                          ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Ảnh bìa Hero (độc lập với ảnh About)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-12 w-12 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    {section.avatar.url ? <img src={section.avatar.url} alt={section.fullName} className="h-full w-full object-cover" /> : null}
                  </div>
                  <label className="cursor-pointer rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[11px] font-semibold">
                    Tải ảnh Hero
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !file.type.startsWith("image/")) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") updateSection(idx, { ...section, avatar: { ...section.avatar, url: reader.result, sourceType: "user-uploaded" as const } });
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }} />
                  </label>
                </div>
                <input type="text" value={section.avatar.url.startsWith("data:") ? "" : section.avatar.url} onChange={(e) => updateSection(idx, { ...section, avatar: { ...section.avatar, url: e.target.value, sourceType: "user-uploaded" as const } })} placeholder="Hoặc dán URL ảnh Hero" className="mt-2 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-mono" />
                <label className="mt-2 flex items-center gap-2 text-[11px] font-medium text-stone-700">
                  <input
                    type="checkbox"
                    aria-label="Hiển thị ảnh ở trang đầu"
                    checked={section.showAvatar !== false}
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        showAvatar: e.target.checked,
                      })
                    }
                    className="rounded border-stone-300"
                  />
                  Hiển thị ảnh ở trang đầu
                </label>
              </div>

              <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    aria-label="Hiển thị dòng Portfolio"
                    checked={section.showPortfolioLabel !== false}
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        showPortfolioLabel: e.target.checked,
                      })
                    }
                    className="rounded border-stone-300"
                  />
                  Hiển thị dòng Portfolio
                </label>
                {section.showPortfolioLabel !== false && (
                  <label className="block text-[11px] font-semibold text-stone-700">
                    Nhãn Portfolio
                    <input
                      type="text"
                      aria-label="Nhãn Portfolio"
                      value={section.portfolioLabel ?? "Portfolio"}
                      onChange={(e) =>
                        updateSection(idx, {
                          ...section,
                          portfolioLabel: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Tiêu đề nhãn (Headline)
                </label>
                <input
                  type="text"
                  value={section.headline || ""}
                  onChange={(e) =>
                    updateSection(idx, { ...section, headline: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={section.fullName}
                  onChange={(e) => {
                    updateSection(idx, {
                      ...section,
                      fullName: e.target.value,
                    });
                    updateProfileOwner({ fullName: e.target.value });
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Chức danh / Ngành học
                </label>
                <input
                  type="text"
                  value={section.roleTitle}
                  onChange={(e) => {
                    updateSection(idx, {
                      ...section,
                      roleTitle: e.target.value,
                    });
                    updateProfileOwner({ roleTitle: e.target.value });
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={3}
                  value={section.shortBio}
                  onChange={(e) => {
                    updateSection(idx, {
                      ...section,
                      shortBio: e.target.value,
                    });
                    updateProfileOwner({ bioSnippet: e.target.value });
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                <div>
                  <h4 className="text-[11px] font-semibold text-stone-700">
                    Tag nhỏ trên Hero
                  </h4>
                  <p className="mt-0.5 text-[10px] text-stone-500">
                    Có thể sửa, thêm hoặc xóa tag trên mọi template.
                  </p>
                </div>
                {section.quickTags.map((tag, tagIndex) => (
                  <div key={tagIndex} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label={`Tag nhỏ ${tagIndex + 1}`}
                      value={tag}
                      onChange={(e) =>
                        updateSection(idx, {
                          ...section,
                          quickTags: section.quickTags.map((currentTag, i) =>
                            i === tagIndex ? e.target.value : currentTag,
                          ),
                        })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      aria-label={`Xóa tag nhỏ số ${tagIndex + 1}`}
                      onClick={() =>
                        updateSection(idx, {
                          ...section,
                          quickTags: section.quickTags.filter(
                            (_, i) => i !== tagIndex,
                          ),
                        })
                      }
                      className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 hover:border-rose-300 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateSection(idx, {
                      ...section,
                      quickTags: [...section.quickTags, "Nhãn mới"],
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-stone-300 px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm tag nhỏ
                </button>
              </div>
            </div>
          )}

          {/* Section Type: About */}
          {section?.type === "about" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <h3 className="font-bold uppercase tracking-wider text-stone-500">
                  Giới thiệu (About Me)
                </h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  1,5đ Rubric
                </span>
              </div>

              {/* Multi-Frame Layout Switcher for About */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Bố cục trình bày (Layout Variant)
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "story-card", label: "Story Card" },
                      { id: "bento-facts", label: "Bento Facts" },
                      { id: "editorial-poster", label: "Editorial Poster" },
                      { id: "profile-dashboard", label: "Profile Dashboard" },
                      { id: "spotlight", label: "Spotlight Profile" },
                      { id: "cards", label: "Thẻ bài (Cards)" },
                      { id: "grid", label: "Lưới (Grid)" },
                      { id: "tabs", label: "Tabs" },
                      { id: "organic", label: "Uốn lượn" },
                      { id: "timeline", label: "Timeline" },
                      { id: "two-column-bio", label: "2 Cột Bio" },
                    ] as const
                  ).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        updateSection(idx, {
                          ...section,
                          variant: layout.id,
                        })
                      }
                      className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                        section.variant === layout.id
                          ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                <div>
                  <label
                    htmlFor={`about-card-frame-${idx}`}
                    className="block text-[11px] font-semibold text-stone-700"
                  >
                    Mẫu khung các ô thông tin
                  </label>
                  <select
                    id={`about-card-frame-${idx}`}
                    aria-label="Mẫu khung các ô About"
                    value={section.cardFrame ?? "template"}
                    onChange={(event) =>
                      updateSection(idx, {
                        ...section,
                        cardFrame: event.target
                          .value as AboutSection["cardFrame"],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="template">Theo phong cách template</option>
                    <option value="soft">Mềm mại</option>
                    <option value="glass">Kính mờ</option>
                    <option value="outline">Viền nổi bật</option>
                    <option value="editorial">Editorial lệch cạnh</option>
                    <option value="elevated">Nổi khối</option>
                    <option value="dashed">Viền nét đứt</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={`about-card-heading-font-${idx}`}
                      className="block text-[11px] font-semibold text-stone-700"
                    >
                      Font tiêu đề ô
                    </label>
                    <select
                      id={`about-card-heading-font-${idx}`}
                      aria-label="Font tiêu đề ô About"
                      value={section.cardHeadingFont ?? ""}
                      onChange={(event) =>
                        updateSection(idx, {
                          ...section,
                          cardHeadingFont: event.target.value || undefined,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">Theo font tiêu đề section</option>
                      {VIETNAMESE_FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`about-card-body-font-${idx}`}
                      className="block text-[11px] font-semibold text-stone-700"
                    >
                      Font nội dung ô
                    </label>
                    <select
                      id={`about-card-body-font-${idx}`}
                      aria-label="Font nội dung ô About"
                      value={section.cardBodyFont ?? ""}
                      onChange={(event) =>
                        updateSection(idx, {
                          ...section,
                          cardBodyFont: event.target.value || undefined,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">Theo font nội dung section</option>
                      {VIETNAMESE_FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-stone-500">
                  Nhấp trực tiếp vào chữ trong từng ô để sửa nội dung; W/H trên
                  thanh công cụ của ô dùng để đổi kích thước.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Tiêu đề mục
                </label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(idx, { ...section, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Tiểu sử &amp; Câu chuyện
                </label>
                <textarea
                  rows={4}
                  value={section.biography}
                  onChange={(e) =>
                    updateSection(idx, {
                      ...section,
                      biography: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs leading-relaxed"
                />
              </div>

              {/* Drag-and-Drop Highlights Reordering */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Điểm nổi bật (Highlights) — Kéo thả đổi vị trí
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...section.highlights,
                        { label: "Thông tin mới", value: "Chi tiết" },
                      ];
                      updateSection(idx, { ...section, highlights: next });
                    }}
                    className="inline-flex items-center gap-0.5 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-stone-800"
                  >
                    <Plus className="h-3 w-3" /> Thêm
                  </button>
                </div>

                <div className="mt-1.5">
                  <DraggableUnitList
                    items={section.highlights.map((h, hIdx) => ({
                      id: `highlight-${hIdx}`,
                      title: `${h.label}: ${h.value}`,
                    }))}
                    onReorder={(oldI, newI) =>
                      reorderHighlights(idx, oldI, newI)
                    }
                    onRemoveItem={(_, rIdx) => {
                      const next = section.highlights.filter(
                        (_, i) => i !== rIdx,
                      );
                      updateSection(idx, { ...section, highlights: next });
                    }}
                    renderItem={(_, hIdx) => {
                      const h = section.highlights[hIdx];
                      if (!h) return null;
                      return (
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={h.label}
                            onChange={(e) => {
                              const next = [...section.highlights];
                              next[hIdx] = { ...h, label: e.target.value };
                              updateSection(idx, {
                                ...section,
                                highlights: next,
                              });
                            }}
                            className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold"
                            placeholder="Nhãn"
                          />
                          <input
                            type="text"
                            value={h.value}
                            onChange={(e) => {
                              const next = [...section.highlights];
                              next[hIdx] = { ...h, value: e.target.value };
                              updateSection(idx, {
                                ...section,
                                highlights: next,
                              });
                            }}
                            className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px]"
                            placeholder="Giá trị"
                          />
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-stone-800">Thông tin liên hệ trong thẻ About</p>
                    <p className="text-[10px] text-stone-500">Bật/tắt các dòng có sẵn hoặc thêm mục kèm biểu tượng và liên kết.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    ["email", "Email"],
                    ["phone", "Điện thoại"],
                    ["location", "Địa điểm"],
                    ["website", "Website"],
                  ] as const).map(([key, label]) => {
                    const hidden = (section.contactInfo.hiddenFields ?? []).includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={!hidden}
                        onClick={() => {
                          const hiddenFields = section.contactInfo.hiddenFields ?? [];
                          const nextHidden = hidden
                            ? hiddenFields.filter((field) => field !== key)
                            : [...hiddenFields, key];
                          updateSection(idx, {
                            ...section,
                            contactInfo: { ...section.contactInfo, hiddenFields: nextHidden },
                          });
                        }}
                        className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${hidden ? "border-stone-200 bg-stone-50 text-stone-500" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}
                      >
                        {hidden ? "＋ Hiện" : "✓ Đang hiện"} {label}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {(section.contactInfo.customItems ?? []).map((item, itemIndex) => {
                    const customItems = section.contactInfo.customItems ?? [];
                    const updateItem = (patch: Partial<AboutContactItem>) => {
                      const next = [...customItems];
                      next[itemIndex] = { ...item, ...patch };
                      updateSection(idx, { ...section, contactInfo: { ...section.contactInfo, customItems: next } });
                    };
                    return (
                      <div key={item.id} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-stone-600">Mục liên hệ {itemIndex + 1}</span>
                          <button
                            type="button"
                            aria-label={`Xóa mục liên hệ ${itemIndex + 1}`}
                            onClick={() => updateSection(idx, {
                              ...section,
                              contactInfo: { ...section.contactInfo, customItems: customItems.filter((_, i) => i !== itemIndex) },
                            })}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50"
                          ><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            aria-label={`Tên mục liên hệ ${itemIndex + 1}`}
                            value={item.label}
                            onChange={(event) => updateItem({ label: event.target.value })}
                            placeholder="Tên mục"
                            className="rounded border border-stone-200 bg-white px-2 py-1.5 text-[10px]"
                          />
                          <select
                            aria-label={`Biểu tượng mục liên hệ ${itemIndex + 1}`}
                            value={item.icon}
                            onChange={(event) => updateItem({ icon: event.target.value as AboutContactItem["icon"] })}
                            className="rounded border border-stone-200 bg-white px-2 py-1.5 text-[10px]"
                          >
                            <option value="link">Liên kết</option>
                            <option value="mail">Email</option>
                            <option value="phone">Điện thoại</option>
                            <option value="pin">Địa điểm</option>
                            <option value="globe">Website</option>
                          </select>
                          <input
                            type="text"
                            aria-label={`Nội dung mục liên hệ ${itemIndex + 1}`}
                            value={item.value}
                            onChange={(event) => updateItem({ value: event.target.value })}
                            placeholder="Nội dung hiển thị"
                            className="rounded border border-stone-200 bg-white px-2 py-1.5 text-[10px]"
                          />
                          <input
                            type="url"
                            aria-label={`Đường dẫn mục liên hệ ${itemIndex + 1}`}
                            value={item.href ?? ""}
                            onChange={(event) => updateItem({ href: event.target.value || undefined })}
                            placeholder="Link (không bắt buộc)"
                            className="rounded border border-stone-200 bg-white px-2 py-1.5 text-[10px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => updateSection(idx, {
                    ...section,
                    contactInfo: {
                      ...section.contactInfo,
                      customItems: [...(section.contactInfo.customItems ?? []), {
                        id: crypto.randomUUID(), label: "Liên hệ mới", value: "", icon: "link" as const,
                      }],
                    },
                  })}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-stone-300 px-2.5 py-1.5 text-[10px] font-semibold text-stone-700 hover:border-indigo-300 hover:bg-indigo-50"
                ><Plus className="h-3 w-3" /> Thêm mục có icon</button>
              </div>

              {/* Rubric Criteria for About */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>INF2501 Tiêu chuẩn Xuất sắc</span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600">
                    Mục tiêu học tập &amp; Định hướng cá nhân
                  </label>
                  <textarea
                    rows={2}
                    value={section.learningGoals ?? ""}
                    placeholder="Mục tiêu học tập..."
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        learningGoals: e.target.value,
                      })
                    }
                    className="mt-0.5 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600">
                    Mục tiêu của Portfolio
                  </label>
                  <textarea
                    rows={2}
                    value={section.portfolioObjective ?? ""}
                    placeholder="Mục tiêu của Portfolio..."
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        portfolioObjective: e.target.value,
                      })
                    }
                    className="mt-0.5 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section Type: Skills */}
          {section?.type === "skills" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <h3 className="font-bold uppercase tracking-wider text-stone-500">
                  Kỹ năng &amp; Công cụ
                </h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  {section.categories.length} danh mục
                </span>
              </div>

              {/* Multi-Frame Layout Switcher for Skills */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Bố cục trình bày (Skills Frame)
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "canva-visual-grid", label: "Canva Visual Grid" },
                      { id: "category-cards", label: "Thẻ danh mục" },
                      { id: "icon-badges", label: "Icon Badges" },
                      { id: "progress-bars", label: "Thanh tiến độ" },
                    ] as const
                  ).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        updateSection(idx, {
                          ...section,
                          variant: layout.id,
                        })
                      }
                      className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                        section.variant === layout.id
                          ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(idx, { ...section, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              {/* Drag-and-Drop Categories Reordering */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Thứ tự nhóm kỹ năng (Kéo-thả sắp xếp)
                </label>
                <div className="mt-1.5">
                  <DraggableUnitList
                    items={section.categories.map((c, cIdx) => ({
                      id: `cat-${cIdx}`,
                      title: c.name,
                      subtitle: `${c.skills.length} kỹ năng`,
                    }))}
                    onReorder={(oldI, newI) => reorderSkills(idx, oldI, newI)}
                    onRemoveItem={(_, removedIndex) => {
                      const categories = section.categories.filter(
                        (_, categoryIndex) => categoryIndex !== removedIndex,
                      );
                      updateSection(idx, { ...section, categories });
                    }}
                    renderItem={(item, cIdx) => {
                      const cat = section.categories[cIdx];
                      if (!cat) return null;
                      return (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => {
                              const next = [...section.categories];
                              next[cIdx] = { ...cat, name: e.target.value };
                              updateSection(idx, {
                                ...section,
                                categories: next,
                              });
                            }}
                            className="w-full rounded border border-stone-200 px-2 py-0.5 text-xs font-bold"
                          />
                          <p className="text-[10px] text-stone-500 truncate">
                            {cat.skills.map((s) => s.name).join(", ")}
                          </p>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-semibold text-stone-700">
                  Công cụ &amp; kỹ năng trong từng nhóm (kéo-thả để sắp xếp, xóa
                  để gỡ)
                </label>
                {section.categories.map((category, categoryIndex) => (
                  <div key={`category-skills-${categoryIndex}`}>
                    <p className="mb-1 text-[10px] font-semibold text-stone-500">
                      {category.name}
                    </p>
                    <DraggableUnitList
                      items={category.skills.map((skill, skillIndex) => ({
                        id: `skill-${categoryIndex}-${skillIndex}`,
                        title: skill.name,
                      }))}
                      onReorder={(oldIndex, newIndex) =>
                        reorderSkills(idx, oldIndex, newIndex, categoryIndex)
                      }
                      onRemoveItem={(_, removedSkillIndex) => {
                        const categories = [...section.categories];
                        categories[categoryIndex] = {
                          ...category,
                          skills: category.skills.filter(
                            (_, skillIndex) => skillIndex !== removedSkillIndex,
                          ),
                        };
                        updateSection(idx, { ...section, categories });
                      }}
                      renderItem={(skillItem, skillIndex) => {
                        const skill = category.skills[skillIndex];
                        if (!skill) return null;

                        const updateSkill = (patch: Partial<typeof skill>) => {
                          const categories = [...section.categories];
                          categories[categoryIndex] = {
                            ...category,
                            skills: category.skills.map((item, index) =>
                              index === skillIndex
                                ? { ...item, ...patch }
                                : item,
                            ),
                          };
                          updateSection(idx, { ...section, categories });
                        };

                        return (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={skill.name}
                              aria-label={`Tên kỹ năng ${skillIndex + 1} - ${category.name}`}
                              onChange={(e) =>
                                updateSkill({ name: e.target.value })
                              }
                              className="w-full rounded border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700"
                            />
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`skill-level-${categoryIndex}-${skillIndex}`}
                                className="shrink-0 text-[10px] font-semibold text-stone-500"
                              >
                                Mức độ
                              </label>
                              <input
                                id={`skill-level-${categoryIndex}-${skillIndex}`}
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={skill.level ?? 85}
                                aria-label={`Mức độ kỹ năng ${skill.name}`}
                                onChange={(e) =>
                                  updateSkill({ level: Number(e.target.value) })
                                }
                                className="min-w-0 flex-1 accent-amber-600"
                              />
                              <output className="w-9 text-right text-[10px] font-semibold text-stone-600">
                                {skill.level ?? 85}%
                              </output>
                            </div>
                          </div>
                        );
                      }}
                      emptyMessage="Chưa có công cụ hoặc kỹ năng trong nhóm này."
                      ariaLabel={`Công cụ và kỹ năng trong nhóm ${category.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const categories = [...section.categories];
                        categories[categoryIndex] = {
                          ...category,
                          skills: [
                            ...category.skills,
                            { name: "Kỹ năng mới", level: 85 },
                          ],
                        };
                        updateSection(idx, { ...section, categories });
                      }}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      <Plus className="h-3 w-3" />
                      Thêm kỹ năng
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Type: Projects */}
          {section?.type === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-stone-700">
                    Bài tập &amp; Dự án ({section.projects.length})
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    Chuẩn 6 chương bài tập môn INF2501 (4,0đ Rubric)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newProj: ProjectItem = {
                      id: `proj-${Date.now()}`,
                      slug: `bai-tap-${section.projects.length + 1}`,
                      title: `Bài tập ${section.projects.length + 1}`,
                      category: "Thực hành số",
                      chapterTitle: `Chương ${section.projects.length + 1}`,
                      exerciseNumber: `Bài tập ${section.projects.length + 1}`,
                      assignmentBrief: "Mục tiêu và yêu cầu bài tập.",
                      summary: "Quá trình thực hiện và công cụ AI sử dụng.",
                      keyTakeaways: ["Hoàn thành yêu cầu Rubric"],
                      metrics: [],
                      media: [],
                      suggestedAiImagePrompt:
                        "Modern pastel editorial illustration of digital assignment showcase",
                      preferredImageStyle: "canva-pastel-graphic",
                      links: [],
                      tags: ["INF2501", "Portfolio"],
                    };
                    updateSection(idx, {
                      ...section,
                      projects: [...section.projects, newProj],
                    });
                    setSelectedProjectId(newProj.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-stone-800 shadow-sm"
                >
                  <Plus className="h-3 w-3" /> Thêm bài
                </button>
              </div>

              <div>
                <label
                  htmlFor="projects-section-title"
                  className="block text-[11px] font-semibold text-stone-700"
                >
                  Tiêu đề mục
                </label>
                <input
                  id="projects-section-title"
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(idx, { ...section, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              {/* Multi-Frame Layout Switcher */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Bố cục trưng bày bài tập (Layout Variant)
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "grid", label: "Lưới (Grid)" },
                      { id: "staggered-cards", label: "Cards so le" },
                      { id: "carousel", label: "Carousel trượt" },
                      { id: "list", label: "Danh sách (List)" },
                      { id: "bento-projects", label: "Bento Grid" },
                      { id: "canva-slide-showcase", label: "Canva 50/50" },
                      { id: "masonry-gallery", label: "Masonry gallery" },
                      { id: "case-study-cards", label: "Case study cards" },
                    ] as const
                  ).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        updateSection(idx, {
                          ...section,
                          variant: layout.id,
                        })
                      }
                      className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                        section.variant === layout.id
                          ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail View Mode Switcher (R4 requirement) */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-amber-600" />
                    <span>Chế độ xem chi tiết dự án (R4)</span>
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                    Bắt buộc Rubric
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateSection(idx, {
                        ...section,
                        detailViewMode: "fullscreen-overlay" as const,
                      })
                    }
                    className={`rounded-lg border p-1.5 text-left text-[11px] transition ${
                      (section.detailViewMode ?? "fullscreen-overlay") ===
                      "fullscreen-overlay"
                        ? "border-amber-600 bg-white text-amber-900 shadow-sm font-semibold"
                        : "border-stone-200 bg-stone-100 text-stone-600 hover:bg-white"
                    }`}
                  >
                    <p className="font-semibold">Toàn màn hình ★</p>
                    <p className="text-[10px] text-stone-500">
                      Modal nổi ngay trên trang (khuyên dùng)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateSection(idx, {
                        ...section,
                        detailViewMode: "dedicated-route" as const,
                      })
                    }
                    className={`rounded-lg border p-1.5 text-left text-[11px] transition ${
                      (section.detailViewMode ?? "fullscreen-overlay") ===
                      "dedicated-route"
                        ? "border-amber-600 bg-white text-amber-900 shadow-sm font-semibold"
                        : "border-stone-200 bg-stone-100 text-stone-600 hover:bg-white"
                    }`}
                  >
                    <p className="font-semibold">Trang riêng</p>
                    <p className="text-[10px] text-stone-500">
                      Trang độc lập /projects/[slug]
                    </p>
                  </button>
                </div>

                {/* Navigation Loop Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <label
                    htmlFor="navigation-loop-toggle"
                    className="flex items-center gap-1.5 text-[11px] font-medium text-stone-700 cursor-pointer"
                  >
                    <Repeat className="h-3 w-3 text-stone-500" />
                    <span>Lặp vòng Next/Prev qua bài đầu/cuối</span>
                  </label>
                  <input
                    id="navigation-loop-toggle"
                    type="checkbox"
                    checked={section.navigationLoop !== false}
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        navigationLoop: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Drag-and-Drop Projects Reordering List */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Thứ tự bài tập (Kéo-thả để đổi vị trí)
                </label>
                <div className="mt-1.5">
                  <DraggableUnitList
                    items={section.projects.map((p, pIdx) => ({
                      id: p.id,
                      title: `#${pIdx + 1} — ${p.title}`,
                      subtitle: p.chapterTitle ?? p.category,
                      badge: p.exerciseNumber,
                    }))}
                    selectedId={selectedProjectId}
                    onSelectItem={(item) => setSelectedProjectId(item.id)}
                    onReorder={(oldI, newI) => reorderProjects(idx, oldI, newI)}
                  />
                </div>
              </div>

              {/* Active Project Editor */}
              {(() => {
                const currentProject =
                  section.projects.find((p) => p.id === selectedProjectId) ??
                  section.projects[0];
                if (!currentProject) return null;
                const projectIndex = section.projects.findIndex(
                  (p) => p.id === currentProject.id,
                );

                return (
                  <div className="space-y-3.5 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div>
                        <span className="font-bold text-stone-800">
                          Chi tiết Bài #{projectIndex + 1}
                        </span>
                        <p className="text-[10px] text-stone-400">
                          ID: {currentProject.id}
                        </p>
                      </div>
                      {section.projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = section.projects.filter(
                              (p) => p.id !== currentProject.id,
                            );
                            updateSection(idx, {
                              ...section,
                              projects: remaining,
                            });
                            setSelectedProjectId(remaining[0]?.id ?? null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:underline"
                        >
                          <Trash2 className="h-3 w-3" /> Xóa bài
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Tên bài tập
                        </label>
                        <input
                          type="text"
                          value={currentProject.title}
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              title: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Đường dẫn slug
                        </label>
                        <input
                          type="text"
                          value={currentProject.slug ?? ""}
                          placeholder={`bai-tap-${projectIndex + 1}`}
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              slug: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-_]/g, ""),
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Chương tương ứng
                        </label>
                        <input
                          type="text"
                          value={currentProject.chapterTitle ?? ""}
                          placeholder="Chương 3: Tổng quan về AI"
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              chapterTitle: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Mã mục bài tập
                        </label>
                        <input
                          type="text"
                          value={currentProject.exerciseNumber ?? ""}
                          placeholder="Bài tập 2 (mục 3.4)"
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              exerciseNumber: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                      <p className="text-[11px] font-bold text-stone-800">Hiển thị chương &amp; mục</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="inline-flex items-center gap-2 text-[10px] font-medium text-stone-700">
                          <input
                            type="checkbox"
                            checked={currentProject.showChapter !== false}
                            onChange={(event) => updateProject(currentProject.id, { showChapter: event.target.checked })}
                            aria-label="Hiển thị chương"
                            className="accent-amber-600"
                          />
                          Hiện chương
                        </label>
                        <label className="inline-flex items-center gap-2 text-[10px] font-medium text-stone-700">
                          <input
                            type="checkbox"
                            checked={currentProject.showExercise !== false}
                            onChange={(event) => updateProject(currentProject.id, { showExercise: event.target.checked })}
                            aria-label="Hiển thị mã bài tập"
                            className="accent-amber-600"
                          />
                          Hiện mã bài tập
                        </label>
                        <label className="text-[10px] font-semibold text-stone-700">
                          Bố cục chương
                          <select
                            aria-label="Bố cục chương"
                            value={currentProject.chapterLayout ?? "badge"}
                            onChange={(event) => updateProject(currentProject.id, { chapterLayout: event.target.value as ProjectItem["chapterLayout"] })}
                            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="badge">Nhãn</option>
                            <option value="banner">Dải nổi bật</option>
                            <option value="minimal">Chữ tối giản</option>
                          </select>
                        </label>
                        <label className="text-[10px] font-semibold text-stone-700">
                          Bố cục bài tập
                          <select
                            aria-label="Bố cục bài tập"
                            value={currentProject.exerciseLayout ?? "badge"}
                            onChange={(event) => updateProject(currentProject.id, { exerciseLayout: event.target.value as ProjectItem["exerciseLayout"] })}
                            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="badge">Nhãn</option>
                            <option value="inline">Chữ cùng dòng</option>
                          </select>
                        </label>
                      </div>
                      <label className="block text-[10px] font-semibold text-stone-700">
                        Bố cục chi tiết bài
                        <select
                          aria-label="Bố cục chi tiết bài"
                          value={currentProject.detailLayout ?? "standard"}
                          onChange={(event) => updateProject(currentProject.id, { detailLayout: event.target.value as ProjectItem["detailLayout"] })}
                          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                        >
                          <option value="standard">Tiêu chuẩn</option>
                          <option value="compact">Gọn</option>
                          <option value="two-column">Hai cột</option>
                        </select>
                      </label>
                    </div>
                    {/* Tùy chọn Loại Media: Ảnh hoặc Video nhúng */}
                    <div className="rounded-xl border border-stone-200 bg-amber-50/50 p-3">
                      <span className="block text-[11px] font-bold text-amber-900">
                        Hình thức hiển thị nội dung:
                      </span>
                      <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-stone-800">
                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                          <input
                            type="radio"
                            name={`mediaType-${currentProject.id}`}
                            value="image"
                            checked={currentProject.mediaType !== "video" && currentProject.productType !== "video"}
                            onChange={() =>
                              updateProject(currentProject.id, {
                                mediaType: "image",
                                productType: "image",
                              })
                            }
                            className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                          />
                          <span>Ảnh minh họa (DOCX / AI)</span>
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                          <input
                            type="radio"
                            name={`mediaType-${currentProject.id}`}
                            value="video"
                            checked={currentProject.mediaType === "video" || currentProject.productType === "video"}
                            onChange={() =>
                              updateProject(currentProject.id, {
                                mediaType: "video",
                                productType: "video",
                              })
                            }
                            className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                          />
                          <span>🎬 Nhúng Video</span>
                        </label>
                      </div>

                      {(currentProject.mediaType === "video" || currentProject.productType === "video" || Boolean(currentProject.videoUrl)) && (
                        <div className="mt-2.5">
                          <label
                            htmlFor={`project-video-url-${currentProject.id}`}
                            className="block text-[11px] font-semibold text-stone-700"
                          >
                            Link Video (YouTube, YouTube Shorts, Google Drive, Vimeo):
                          </label>
                          <input
                            id={`project-video-url-${currentProject.id}`}
                            type="url"
                            value={currentProject.videoUrl ?? ""}
                            placeholder="https://www.youtube.com/watch?v=... hoặc Shorts, Drive"
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              updateProject(currentProject.id, {
                                videoUrl: val || undefined,
                                mediaType: "video",
                                productType: "video",
                              });
                            }}
                            className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <p className="mt-1 text-[10px] text-stone-500">
                            Video sẽ được nhúng trực tiếp và phát ngay trong khung bài tập trên mọi thiết bị (Mobile, Tablet, PC) thay cho ảnh.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`project-docx-url-${currentProject.id}`}
                        className="block text-[11px] font-semibold text-stone-700"
                      >
                        Liên kết tới file DOCX
                      </label>
                      <input
                        id={`project-docx-url-${currentProject.id}`}
                        type="url"
                        value={currentProject.docxUrl ?? ""}
                        placeholder="https://.../Bai-tap.docx"
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          const isVid = isVideoUrl(val);
                          updateProject(currentProject.id, {
                            docxUrl: val || undefined,
                            ...(isVid && !currentProject.videoUrl
                              ? { videoUrl: val, mediaType: "video", productType: "video" }
                              : {}),
                          });
                        }}
                        className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                      />
                      <label
                        htmlFor={`project-docx-label-${currentProject.id}`}
                        className="mt-2 block text-[11px] font-semibold text-stone-700"
                      >
                        Tên nút mở bài tập
                      </label>
                      <input
                        id={`project-docx-label-${currentProject.id}`}
                        type="text"
                        value={currentProject.docxLinkLabel ?? ""}
                        placeholder="Mở file DOCX"
                        onChange={(e) =>
                          updateProject(currentProject.id, {
                            docxLinkLabel: e.target.value || undefined,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                      />
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50">
                        <Upload className="h-3 w-3" />
                        {docxUploadingProjectId === currentProject.id ? "Đang tải file…" : "Tải DOCX lên"}
                        <input
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          disabled={docxUploadingProjectId === currentProject.id}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setDocxUploadError(null);
                            setDocxUploadingProjectId(currentProject.id);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);
                              const response = await fetch("/api/docx-files", { method: "POST", body: formData });
                              const result = await response.json();
                              if (!response.ok) throw new Error(result.error || "Tải DOCX thất bại.");
                              updateProject(currentProject.id, { docxUrl: result.url, sourceDocxFileName: file.name });
                            } catch (error) {
                              setDocxUploadError(error instanceof Error ? error.message : "Tải DOCX thất bại.");
                            } finally {
                              setDocxUploadingProjectId(null);
                            }
                          }}
                        />
                      </label>
                      {docxUploadError && <p role="alert" className="mt-1 text-[10px] text-rose-600">{docxUploadError}</p>}
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                        <div>
                          <span className="block text-[11px] font-bold text-stone-800">
                            Hiển thị nội dung trích xuất từ bài làm
                          </span>
                          <span className="block text-[10px] text-stone-500">
                            (Mặc định tắt để trang gọn gàng, bật khi muốn mở rộng chi tiết văn bản gốc)
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentProject.showRawExcerpt ?? false}
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              showRawExcerpt: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                      <label
                        htmlFor={`project-media-position-${currentProject.id}`}
                        className="block text-[11px] font-semibold text-stone-700"
                      >
                        Vị trí ảnh trong bài tập
                      </label>
                      <select
                        id={`project-media-position-${currentProject.id}`}
                        value={
                          currentProject.mediaPosition ??
                          (currentProject.layoutInverted ? "right" : "left")
                        }
                        onChange={(e) => {
                          const mediaPosition = e.target.value as
                            "left" | "right" | "top" | "bottom";
                          updateProject(currentProject.id, {
                            mediaPosition,
                            layoutInverted: undefined,
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="left">
                          Ảnh bên trái, nội dung bên phải
                        </option>
                        <option value="right">
                          Ảnh bên phải, nội dung bên trái
                        </option>
                        <option value="top">
                          Ảnh bên trên, nội dung bên dưới
                        </option>
                        <option value="bottom">
                          Ảnh bên dưới, nội dung bên trên
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Tags của bài tập
                        </label>
                        <button
                          type="button"
                          aria-label="Thêm tag bài tập"
                          onClick={() =>
                            updateProject(currentProject.id, {
                              tags: [...currentProject.tags, "Tag mới"],
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <Plus className="h-3 w-3" />
                          Thêm tag
                        </button>
                      </div>
                      {currentProject.tags.map((tag, tagIndex) => (
                        <div
                          key={`${currentProject.id}-tag-${tagIndex}`}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            aria-label={`Tag bài tập ${tagIndex + 1}`}
                            value={tag}
                            onChange={(e) =>
                              updateProject(currentProject.id, {
                                tags: currentProject.tags.map(
                                  (currentTag, currentIndex) =>
                                    currentIndex === tagIndex
                                      ? e.target.value
                                      : currentTag,
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            aria-label={`Xóa tag bài tập ${tagIndex + 1}`}
                            onClick={() =>
                              updateProject(currentProject.id, {
                                tags: currentProject.tags.filter(
                                  (_, currentIndex) =>
                                    currentIndex !== tagIndex,
                                ),
                              })
                            }
                            className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* INF2501 Rubric 3-Part Fields */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 space-y-2.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                        <Sparkles className="h-3 w-3 text-amber-600" />
                        <span>
                          3 Thành phần nội dung bắt buộc Rubric INF2501
                        </span>
                      </div>

                      {/* (a) Goals */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700">
                          (a) Mục tiêu bài tập (Yêu cầu &amp; Kỹ năng rèn luyện)
                        </label>
                        <textarea
                          rows={2}
                          value={currentProject.assignmentBrief ?? ""}
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              assignmentBrief: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      {/* (b) Process Summary */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700">
                          (b) Tóm tắt quá trình thực hiện
                        </label>
                        <textarea
                          rows={3}
                          value={currentProject.summary}
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              summary: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="rounded-xl border border-stone-200 bg-white p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-800">
                              Nội dung trích xuất từ bài làm
                            </label>
                            <p className="text-[9px] text-stone-500">
                              (Mặc định tắt. Bật lên nếu muốn hiển thị mục này trên trang bài tập)
                            </p>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={currentProject.showRawExcerpt ?? false}
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  showRawExcerpt: e.target.checked,
                                })
                              }
                              className="peer sr-only"
                            />
                            <div className="peer h-5 w-9 rounded-full bg-stone-200 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                          </label>
                        </div>
                        <p className="mt-1 text-[9px] leading-relaxed text-stone-500">
                          Chỉnh trực tiếp văn bản nhận diện từ tệp DOCX trước khi hiển thị trong trang chi tiết.
                        </p>
                        <textarea
                          rows={5}
                          aria-label="Nội dung trích xuất chi tiết"
                          value={currentProject.fullRawExcerpt ?? ""}
                          onChange={(e) =>
                            updateProject(currentProject.id, {
                              fullRawExcerpt: e.target.value || undefined,
                            })
                          }
                          className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs leading-relaxed outline-none focus:border-amber-500 focus:bg-white"
                          placeholder="Nội dung trích xuất từ bài làm sẽ hiển thị ở đây..."
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-700">
                              Kết quả &amp; điểm nhấn
                            </label>
                            <p className="text-[9px] text-stone-500">
                              Nhập vào 1 ô, mỗi ý bắt đầu bằng dấu gạch ngang (-) ở đầu dòng.
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-medium text-stone-600">
                              Hình dáng:
                            </label>
                            <select
                              aria-label="Hình dáng gạch đầu dòng"
                              value={currentProject.takeawayBulletShape ?? "circle"}
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  takeawayBulletShape: e.target.value as
                                    | "circle"
                                    | "square"
                                    | "hyphen"
                                    | "star"
                                    | "check"
                                    | "diamond",
                                })
                              }
                              className="rounded border border-stone-200 bg-white px-2 py-0.5 text-[10px] text-stone-700"
                            >
                              <option value="circle">● Tròn (Mặc định)</option>
                              <option value="square">■ Vuông</option>
                              <option value="hyphen">- Dấu gạch</option>
                              <option value="star">★ Ngôi sao</option>
                              <option value="check">✔ Dấu tích</option>
                              <option value="diamond">◆ Kim cương</option>
                            </select>
                          </div>
                        </div>

                        <textarea
                          rows={4}
                          aria-label="Kết quả & điểm nhấn"
                          value={
                            (currentProject.keyTakeaways ?? []).length > 0
                              ? currentProject.keyTakeaways
                                  .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
                                  .join("\n")
                              : ""
                          }
                          placeholder="- Kết quả đạt được thứ nhất...&#10;- Vận dụng thành thạo kỹ năng...&#10;- Hoàn thành mục tiêu đề ra..."
                          onChange={(e) => {
                            const raw = e.target.value;
                            const lines = raw
                              .split("\n")
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((l) => (l.startsWith("-") ? l.replace(/^-\s*/, "") : l));
                            updateProject(currentProject.id, {
                              keyTakeaways: lines,
                            });
                          }}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-xs leading-relaxed"
                        />
                      </div>

                      <div className="space-y-2 border-t border-amber-100 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[10px] font-semibold text-stone-700">
                            Thẻ thông tin (ví dụ: Quy trình, Công cụ)
                          </label>
                          <button
                            type="button"
                            aria-label="Thêm thẻ thông tin bài tập"
                            onClick={() =>
                              updateProject(currentProject.id, {
                                metrics: [
                                  ...currentProject.metrics,
                                  {
                                    label: "Thông tin mới",
                                    value: "Giá trị mới",
                                  },
                                ],
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            <Plus className="h-3 w-3" />
                            Thêm thẻ
                          </button>
                        </div>
                        {currentProject.metrics.map((metric, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5"
                          >
                            <input
                              type="text"
                              aria-label={`Tên thẻ thông tin ${index + 1}`}
                              value={metric.label}
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  metrics: currentProject.metrics.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, label: e.target.value }
                                        : item,
                                  ),
                                })
                              }
                              className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              aria-label={`Giá trị thẻ thông tin ${index + 1}`}
                              value={metric.value}
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  metrics: currentProject.metrics.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, value: e.target.value }
                                        : item,
                                  ),
                                })
                              }
                              className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                            />
                            <button
                              type="button"
                              aria-label={`Xóa thẻ thông tin ${index + 1}`}
                              onClick={() =>
                                updateProject(currentProject.id, {
                                  metrics: currentProject.metrics.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                })
                              }
                              className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* (c) Final Product Type */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700">
                          (c) Dạng sản phẩm cuối cùng
                        </label>
                        <select
                          value={currentProject.productType ?? "image"}
                          onChange={(e) => {
                            const val = e.target.value as ProjectItem["productType"];
                            updateProject(currentProject.id, {
                              productType: val,
                              ...(val === "video" ? { mediaType: "video" } : {}),
                            });
                          }}
                          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium"
                        >
                          <option value="image">
                            Hình ảnh / Poster trực quan
                          </option>
                          <option value="video">Video học liệu / Demo</option>
                          <option value="pdf">
                            Tệp tài liệu / Bài báo cáo PDF
                          </option>
                          <option value="prompt-comparison">
                            So sánh Prompt &amp; AI Output
                          </option>
                          <option value="responsible-ai-rules">
                            Bộ nguyên tắc AI có trách nhiệm
                          </option>
                          <option value="folder-tree">
                            Cấu trúc thư mục học tập số
                          </option>
                          <option value="source-matrix">
                            Bảng thẩm định nguồn tin
                          </option>
                          <option value="group-work">
                            Minh chứng hợp tác nhóm
                          </option>
                          <option value="mixed">Sản phẩm kết hợp</option>
                        </select>
                      </div>

                      {/* Prompt Comparison Inputs for Rubric Ch.3 */}
                      <div className="rounded-lg border border-stone-200 bg-white p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[10px] text-stone-700">
                            Bảng So sánh Prompt (Rubric Chương 3)
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <span className="text-[10px] text-stone-500 font-medium">
                              {(currentProject.showPromptComparison ?? false) ? "Bật" : "Tắt"}
                            </span>
                            <input
                              type="checkbox"
                              checked={currentProject.showPromptComparison ?? false}
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  showPromptComparison: e.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                            />
                          </label>
                        </div>
                        {(currentProject.showPromptComparison ?? false) ? (
                          <>
                            <input
                              type="text"
                              value={
                                currentProject.promptComparison?.initialPrompt ?? ""
                              }
                              placeholder="Prompt ban đầu (sơ sài)..."
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  promptComparison: {
                                    initialPrompt: e.target.value,
                                    improvedPrompt:
                                      currentProject.promptComparison
                                        ?.improvedPrompt ?? "",
                                    aiOutput:
                                      currentProject.promptComparison?.aiOutput ??
                                      "",
                                  },
                                })
                              }
                              className="w-full rounded border border-stone-200 px-2 py-0.5 text-xs"
                            />
                            <input
                              type="text"
                              value={
                                currentProject.promptComparison?.improvedPrompt ??
                                ""
                              }
                              placeholder="Prompt cải tiến (kỹ thuật RTF / Chain-of-Thought)..."
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  promptComparison: {
                                    initialPrompt:
                                      currentProject.promptComparison
                                        ?.initialPrompt ?? "",
                                    improvedPrompt: e.target.value,
                                    aiOutput:
                                      currentProject.promptComparison?.aiOutput ??
                                      "",
                                  },
                                })
                              }
                              className="w-full rounded border border-stone-200 px-2 py-0.5 text-xs"
                            />
                            <textarea
                              rows={2}
                              value={
                                currentProject.promptComparison?.aiOutput ?? ""
                              }
                              placeholder="Kết quả AI phản hồi sau cải tiến..."
                              onChange={(e) =>
                                updateProject(currentProject.id, {
                                  promptComparison: {
                                    initialPrompt:
                                      currentProject.promptComparison
                                        ?.initialPrompt ?? "",
                                    improvedPrompt:
                                      currentProject.promptComparison
                                        ?.improvedPrompt ?? "",
                                    aiOutput: e.target.value,
                                  },
                                })
                              }
                              className="w-full rounded border border-stone-200 px-2 py-0.5 text-xs"
                            />
                          </>
                        ) : (
                          <p className="text-[10px] italic text-stone-400 py-0.5">
                            Đã tắt hiển thị bảng so sánh prompt cho bài tập này.
                          </p>
                        )}
                      </div>
                    </div>

                    <ProjectImageManager
                      project={currentProject}
                      focusTab={
                        imageManagerFocusRequest?.projectId === currentProject.id
                          ? imageManagerFocusRequest.tab
                          : undefined
                      }
                      focusRequestId={
                        imageManagerFocusRequest?.projectId === currentProject.id
                          ? imageManagerFocusRequest.requestId
                          : undefined
                      }
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {/* Section Type: Contact */}
          {section?.type === "contact" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <h3 className="font-bold uppercase tracking-wider text-stone-500">
                  Phần Kết &amp; Chân trang (Footer)
                </h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  Rubric Footer
                </span>
              </div>

              {/* Layout Variant Switcher for Contact */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Bố cục chân trang (Layout Variant)
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "full-banner", label: "Banner toàn cảnh" },
                      { id: "split-form", label: "Chia đôi (Form)" },
                      { id: "minimal-card", label: "Thẻ tối giản" },
                      { id: "footer-widget", label: "Footer Widget" },
                    ] as const
                  ).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        updateSection(idx, {
                          ...section,
                          variant: layout.id,
                        })
                      }
                      className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                        (section.variant || "full-banner") === layout.id
                          ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {layout.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Khối tri ân "Thank You !" (Mẫu Canva Editorial) */}
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-2.5">
                <span className="block text-[11px] font-bold text-amber-900">
                  🌟 Khối tri ân &amp; Lời cảm ơn (Canva Thank You)
                </span>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-700">
                    Tiêu đề cảm ơn lớn
                  </label>
                  <input
                    type="text"
                    value={section.thankYouTitle ?? "Thank You !"}
                    placeholder="Thank You !"
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        thankYouTitle: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-700">
                    Dòng thông tin phụ (Tên • Chuyên ngành • Trường)
                  </label>
                  <input
                    type="text"
                    value={section.thankYouSubtitle ?? ""}
                    placeholder="HOÀNG KHÁNH LY • SINH VIÊN SƯ PHẠM ÂM NHẠC • ĐH SPNTTW"
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        thankYouSubtitle: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs font-medium"
                  />
                  <p className="mt-0.5 text-[9px] text-stone-500">
                    Để trống sẽ tự động hiển thị Họ tên và Chức danh/Chuyên ngành của bạn.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-700">
                    Thông điệp cảm ơn dưới cùng
                  </label>
                  <input
                    type="text"
                    value={section.thankYouMessage ?? "THANK YOU FOR WATCHING!"}
                    placeholder="THANK YOU FOR WATCHING!"
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        thankYouMessage: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(idx, { ...section, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-subtitle"
                  className="block text-[11px] font-semibold text-stone-700"
                >
                  Mô tả Contact
                </label>
                <textarea
                  id="contact-subtitle"
                  rows={3}
                  value={section.subtitle}
                  onChange={(e) =>
                    updateSection(idx, {
                      ...section,
                      subtitle: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              {conclusion && (
                <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-2.5">
                  <div className="border-b border-violet-100 pb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-violet-900">
                      Nội dung Conclusion
                    </h4>
                    <p className="mt-1 text-[10px] leading-relaxed text-stone-600">
                      Chỉnh phần tổng kết độc lập với thông tin liên hệ bên dưới.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="text-[10px] font-semibold text-stone-700">
                      Tiêu đề
                      <input
                        aria-label="Tiêu đề Conclusion"
                        value={conclusion.title}
                        onChange={(event) =>
                          updateConclusion({ title: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                      />
                    </label>
                    <label className="text-[10px] font-semibold text-stone-700">
                      Dòng nhãn
                      <input
                        aria-label="Dòng nhãn Conclusion"
                        value={conclusion.eyebrow}
                        onChange={(event) =>
                          updateConclusion({ eyebrow: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-stone-700">
                      Bố cục Conclusion
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {([
                        ["three-cards", "3 cột"],
                        ["two-cards", "2 cột"],
                        ["stacked", "Xếp dọc"],
                        ["editorial", "Editorial lệch"],
                        ["masonry", "Masonry"],
                        ["compact", "Lưới gọn"],
                        ["timeline", "Dòng thời gian"],
                        ["spotlight", "Tiêu điểm"],
                      ] as const).map(([layout, label]) => (
                        <button
                          key={layout}
                          type="button"
                          aria-pressed={conclusion.layout === layout}
                          onClick={() =>
                            updateConclusion({
                              layout,
                              cards: conclusion.cards.map((card, cardIndex) => ({
                                ...card,
                                width: getConclusionCardWidth(layout, cardIndex),
                              })),
                            })
                          }
                          className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${
                            conclusion.layout === layout
                              ? "border-violet-500 bg-violet-100 text-violet-900"
                              : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ["backgroundColor", "Nền Conclusion", document.theme.backgroundColor],
                      ["headingColor", "Màu tiêu đề", document.theme.textColor],
                      ["textColor", "Màu nội dung", document.theme.textColor],
                      ["accentColor", "Màu nhấn", document.theme.primaryColor],
                      ["cardBackgroundColor", "Nền thẻ", document.theme.surfaceColor],
                      ["cardBorderColor", "Viền thẻ", document.theme.primaryColor],
                    ] as const).map(([key, label, fallback]) => (
                      <label
                        key={key}
                        className="rounded-lg border border-stone-200 bg-white p-1.5 text-[10px] font-semibold text-stone-700"
                      >
                        {label}
                        <span className="mt-1 flex items-center gap-1.5">
                          <input
                            type="color"
                            aria-label={label}
                            value={conclusion[key] || fallback}
                            onChange={(event) =>
                              updateConclusion({ [key]: event.target.value })
                            }
                            className="h-7 w-9 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateConclusion({ [key]: undefined })
                            }
                            className="text-[9px] font-medium text-indigo-700 hover:underline"
                          >
                            Theo theme
                          </button>
                        </span>
                      </label>
                    ))}
                  </div>

                  <label className="block text-[10px] font-semibold text-stone-700">
                    Font chữ Conclusion
                    <select
                      aria-label="Font chữ Conclusion"
                      value={conclusion.fontFamily ?? ""}
                      onChange={(event) =>
                        updateConclusion({
                          fontFamily: event.target.value || undefined,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">Theo theme</option>
                      {VIETNAMESE_FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2 border-t border-violet-100 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold text-stone-700">
                        Thẻ nội dung — kéo để đổi thứ tự
                      </p>
                      <button
                        type="button"
                        aria-label="Thêm thẻ Conclusion"
                        onClick={() =>
                          updateConclusion({
                            cards: [
                              ...conclusion.cards,
                              {
                                id: crypto.randomUUID(),
                                number: String(conclusion.cards.length + 1).padStart(2, "0"),
                                title: `Thẻ tổng kết ${conclusion.cards.length + 1}`,
                                body: "",
                                bullets: [],
                                width: getConclusionCardWidth(
                                  conclusion.layout,
                                  conclusion.cards.length,
                                ),
                                height: 4,
                              },
                            ],
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2 py-1 text-[10px] font-semibold text-violet-900 hover:bg-violet-100"
                      >
                        <Plus className="h-3 w-3" />
                        Thêm thẻ
                      </button>
                    </div>
                    <DraggableUnitList
                      items={conclusion.cards.map((card) => ({
                        id: card.id,
                        title: card.title || "Thẻ Conclusion",
                      }))}
                      ariaLabel="Thứ tự thẻ Conclusion"
                      onReorder={(oldIndex, newIndex) => {
                        const cards = [...conclusion.cards];
                        const [movedCard] = cards.splice(oldIndex, 1);
                        cards.splice(newIndex, 0, movedCard);
                        updateConclusion({ cards });
                      }}
                      onRemoveItem={(_, cardIndex) =>
                        updateConclusion({
                          cards: conclusion.cards.filter(
                            (_, index) => index !== cardIndex,
                          ),
                        })
                      }
                      renderItem={(_, cardIndex) => {
                        const card = conclusion.cards[cardIndex];
                        if (!card) return null;
                        const updateCard = (patch: Partial<ConclusionCard>) =>
                          updateConclusionCard(cardIndex, patch);
                        return (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[64px_1fr] gap-1">
                              <input
                                aria-label={`Số thẻ Conclusion ${cardIndex + 1}`}
                                value={card.number}
                                onChange={(event) =>
                                  updateCard({ number: event.target.value })
                                }
                                className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                placeholder="01"
                              />
                              <input
                                aria-label={`Tiêu đề thẻ Conclusion ${cardIndex + 1}`}
                                value={card.title}
                                onChange={(event) =>
                                  updateCard({ title: event.target.value })
                                }
                                className="min-w-0 rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                placeholder="Tiêu đề thẻ"
                              />
                            </div>
                            <textarea
                              aria-label={`Nội dung thẻ Conclusion ${cardIndex + 1}`}
                              rows={2}
                              value={card.body}
                              onChange={(event) =>
                                updateCard({ body: event.target.value })
                              }
                              className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                              placeholder="Mô tả"
                            />
                            <div className="grid grid-cols-2 gap-1">
                              <label className="text-[9px] font-semibold text-stone-600">
                                Rộng (cột)
                                <select
                                  aria-label={`Độ rộng thẻ Conclusion ${cardIndex + 1}`}
                                  value={card.width ?? 4}
                                  onChange={(event) =>
                                    updateCard({
                                      width: Number(event.target.value),
                                    })
                                  }
                                  className="mt-0.5 w-full rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px]"
                                >
                                  {Array.from({ length: 12 }, (_, index) => index + 1).map((width) => (
                                    <option key={width} value={width}>
                                      {width}/12
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-[9px] font-semibold text-stone-600">
                                Cao (bậc)
                                <select
                                  aria-label={`Độ cao thẻ Conclusion ${cardIndex + 1}`}
                                  value={card.height ?? 3}
                                  onChange={(event) =>
                                    updateCard({
                                      height: Number(event.target.value),
                                    })
                                  }
                                  className="mt-0.5 w-full rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px]"
                                >
                                  {Array.from({ length: 6 }, (_, index) => index + 1).map((height) => (
                                    <option key={height} value={height}>
                                      {height}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {([
                                ["backgroundColor", "Nền thẻ", document.theme.surfaceColor],
                                ["titleColor", "Tiêu đề", document.theme.textColor],
                                ["textColor", "Nội dung", document.theme.textColor],
                              ] as const).map(([key, label, fallback]) => (
                                <label
                                  key={key}
                                  className="text-[9px] font-semibold text-stone-600"
                                >
                                  {label}
                                  <input
                                    type="color"
                                    aria-label={`Màu ${label} thẻ Conclusion ${cardIndex + 1}`}
                                    value={card[key] || fallback}
                                    onChange={(event) =>
                                      updateCard({ [key]: event.target.value })
                                    }
                                    className="mt-0.5 h-7 w-full cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                                  />
                                </label>
                              ))}
                            </div>
                            <div className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-1.5">
                              <p className="text-[9px] font-bold text-stone-700">
                                Định dạng tiêu đề
                              </p>
                              <select
                                aria-label={`Font tiêu đề thẻ Conclusion ${cardIndex + 1}`}
                                value={card.titleFontFamily ?? ""}
                                onChange={(event) =>
                                  updateCard({
                                    titleFontFamily: event.target.value || undefined,
                                  })
                                }
                                className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                              >
                                <option value="">Theo font Conclusion</option>
                                {VIETNAMESE_FONT_OPTIONS.map((font) => (
                                  <option key={font} value={font}>
                                    {font}
                                  </option>
                                ))}
                              </select>
                              <div className="grid grid-cols-2 gap-1">
                                <select
                                  aria-label={`Cỡ tiêu đề thẻ Conclusion ${cardIndex + 1}`}
                                  value={card.titleFontSize ?? "lg"}
                                  onChange={(event) =>
                                    updateCard({
                                      titleFontSize: event.target.value as ConclusionCard["titleFontSize"],
                                    })
                                  }
                                  className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                >
                                  <option value="sm">Cỡ nhỏ</option>
                                  <option value="base">Cỡ vừa</option>
                                  <option value="lg">Cỡ lớn</option>
                                  <option value="xl">Cỡ rất lớn</option>
                                  <option value="2xl">Cỡ tiêu điểm</option>
                                </select>
                                <select
                                  aria-label={`Căn tiêu đề thẻ Conclusion ${cardIndex + 1}`}
                                  value={card.titleAlign ?? "left"}
                                  onChange={(event) =>
                                    updateCard({
                                      titleAlign: event.target.value as ConclusionCard["titleAlign"],
                                    })
                                  }
                                  className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                >
                                  <option value="left">Lề trái</option>
                                  <option value="center">Căn giữa</option>
                                  <option value="right">Lề phải</option>
                                </select>
                              </div>
                              <p className="pt-1 text-[9px] font-bold text-stone-700">
                                Định dạng nội dung
                              </p>
                              <select
                                aria-label={`Font nội dung thẻ Conclusion ${cardIndex + 1}`}
                                value={card.bodyFontFamily ?? ""}
                                onChange={(event) =>
                                  updateCard({
                                    bodyFontFamily: event.target.value || undefined,
                                  })
                                }
                                className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                              >
                                <option value="">Theo font Conclusion</option>
                                {VIETNAMESE_FONT_OPTIONS.map((font) => (
                                  <option key={font} value={font}>
                                    {font}
                                  </option>
                                ))}
                              </select>
                              <div className="grid grid-cols-2 gap-1">
                                <select
                                  aria-label={`Cỡ nội dung thẻ Conclusion ${cardIndex + 1}`}
                                  value={card.bodyFontSize ?? "sm"}
                                  onChange={(event) =>
                                    updateCard({
                                      bodyFontSize: event.target.value as ConclusionCard["bodyFontSize"],
                                    })
                                  }
                                  className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                >
                                  <option value="xs">Cỡ rất nhỏ</option>
                                  <option value="sm">Cỡ nhỏ</option>
                                  <option value="base">Cỡ vừa</option>
                                  <option value="lg">Cỡ lớn</option>
                                </select>
                                <select
                                  aria-label={`Căn nội dung thẻ Conclusion ${cardIndex + 1}`}
                                  value={card.bodyAlign ?? "left"}
                                  onChange={(event) =>
                                    updateCard({
                                      bodyAlign: event.target.value as ConclusionCard["bodyAlign"],
                                    })
                                  }
                                  className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                >
                                  <option value="left">Lề trái</option>
                                  <option value="center">Căn giữa</option>
                                  <option value="right">Lề phải</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {card.bullets.map((bullet, bulletIndex) => (
                                <div
                                  key={`${card.id}-bullet-${bulletIndex}`}
                                  className="flex gap-1"
                                >
                                  <input
                                    aria-label={`Ý thẻ Conclusion ${cardIndex + 1}.${bulletIndex + 1}`}
                                    value={bullet}
                                    onChange={(event) =>
                                      updateCard({
                                        bullets: card.bullets.map(
                                          (line, index) =>
                                            index === bulletIndex
                                              ? event.target.value
                                              : line,
                                        ),
                                      })
                                    }
                                    className="min-w-0 flex-1 rounded border border-stone-200 bg-white px-2 py-1 text-[10px]"
                                  />
                                  <button
                                    type="button"
                                    aria-label={`Xóa ý thẻ Conclusion ${cardIndex + 1}.${bulletIndex + 1}`}
                                    onClick={() =>
                                      updateCard({
                                        bullets: card.bullets.filter(
                                          (_, index) =>
                                            index !== bulletIndex,
                                        ),
                                      })
                                    }
                                    className="rounded px-1 text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                aria-label={`Thêm ý thẻ Conclusion ${cardIndex + 1}`}
                                onClick={() =>
                                  updateCard({
                                    bullets: [...card.bullets, ""],
                                  })
                                }
                                className="text-[9px] font-semibold text-violet-800 hover:underline"
                              >
                                + Thêm ý
                              </button>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>

                  <div className="space-y-1.5 border-t border-violet-100 pt-2">
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Tiêu đề danh sách bài tập
                      <input
                        value={conclusion.projectLinksTitle}
                        onChange={(event) =>
                          updateConclusion({
                            projectLinksTitle: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                      />
                    </label>
                    {conclusion.projectLinks.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className="space-y-1 rounded-lg border border-stone-200 bg-white p-1.5"
                      >
                        <div className="flex gap-1">
                          <input
                            aria-label={`Tên liên kết Conclusion ${itemIndex + 1}`}
                            value={item.title}
                            onChange={(event) =>
                              updateConclusion({
                                projectLinks: conclusion.projectLinks.map(
                                  (entry, index) =>
                                    index === itemIndex
                                      ? { ...entry, title: event.target.value }
                                      : entry,
                                ),
                              })
                            }
                            className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-[10px]"
                            placeholder="Tên"
                          />
                          <button
                            type="button"
                            aria-label={`Xóa liên kết Conclusion ${itemIndex + 1}`}
                            onClick={() =>
                              updateConclusion({
                                projectLinks: conclusion.projectLinks.filter(
                                  (_, index) => index !== itemIndex,
                                ),
                              })
                            }
                            className="rounded px-1 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <input
                          aria-label={`Mô tả liên kết Conclusion ${itemIndex + 1}`}
                          value={item.text}
                          onChange={(event) =>
                            updateConclusion({
                              projectLinks: conclusion.projectLinks.map(
                                (entry, index) =>
                                  index === itemIndex
                                    ? { ...entry, text: event.target.value }
                                    : entry,
                              ),
                            })
                          }
                          className="w-full rounded border border-stone-200 px-2 py-1 text-[10px]"
                          placeholder="Mô tả"
                        />
                        <input
                          aria-label={`URL liên kết Conclusion ${itemIndex + 1}`}
                          value={item.href ?? ""}
                          onChange={(event) =>
                            updateConclusion({
                              projectLinks: conclusion.projectLinks.map(
                                (entry, index) =>
                                  index === itemIndex
                                    ? {
                                        ...entry,
                                        href: event.target.value || undefined,
                                      }
                                    : entry,
                              ),
                            })
                          }
                          className="w-full rounded border border-stone-200 px-2 py-1 text-[10px]"
                          placeholder="URL hoặc #mục"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      aria-label="Thêm liên kết Conclusion"
                      onClick={() =>
                        updateConclusion({
                          projectLinks: [
                            ...conclusion.projectLinks,
                            {
                              id: crypto.randomUUID(),
                              title: "Liên kết mới",
                              text: "",
                              href: "",
                            },
                          ],
                        })
                      }
                      className="text-[10px] font-semibold text-violet-800 hover:underline"
                    >
                      + Thêm liên kết
                    </button>
                  </div>

                  <div className="space-y-1.5 border-t border-violet-100 pt-2">
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Tiêu đề công cụ AI
                      <input
                        value={conclusion.aiToolsTitle}
                        onChange={(event) =>
                          updateConclusion({ aiToolsTitle: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                      />
                    </label>
                    {conclusion.aiTools.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className="space-y-1 rounded-lg border border-stone-200 bg-white p-1.5"
                      >
                        <div className="flex gap-1">
                          <input
                            aria-label={`Tên công cụ Conclusion ${itemIndex + 1}`}
                            value={item.title}
                            onChange={(event) =>
                              updateConclusion({
                                aiTools: conclusion.aiTools.map((entry, index) =>
                                  index === itemIndex
                                    ? { ...entry, title: event.target.value }
                                    : entry,
                                ),
                              })
                            }
                            className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-[10px]"
                          />
                          <button
                            type="button"
                            aria-label={`Xóa công cụ Conclusion ${itemIndex + 1}`}
                            onClick={() =>
                              updateConclusion({
                                aiTools: conclusion.aiTools.filter(
                                  (_, index) => index !== itemIndex,
                                ),
                              })
                            }
                            className="rounded px-1 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <textarea
                          aria-label={`Mô tả công cụ Conclusion ${itemIndex + 1}`}
                          rows={2}
                          value={item.text}
                          onChange={(event) =>
                            updateConclusion({
                              aiTools: conclusion.aiTools.map((entry, index) =>
                                index === itemIndex
                                  ? { ...entry, text: event.target.value }
                                  : entry,
                              ),
                            })
                          }
                          className="w-full rounded border border-stone-200 px-2 py-1 text-[10px]"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      aria-label="Thêm công cụ Conclusion"
                      onClick={() =>
                        updateConclusion({
                          aiTools: [
                            ...conclusion.aiTools,
                            {
                              id: crypto.randomUUID(),
                              title: "Công cụ mới",
                              text: "",
                            },
                          ],
                        })
                      }
                      className="text-[10px] font-semibold text-violet-800 hover:underline"
                    >
                      + Thêm công cụ
                    </button>
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Lời kết
                      <textarea
                        aria-label="Lời kết Conclusion"
                        rows={3}
                        value={conclusion.closingNote}
                        onChange={(event) =>
                          updateConclusion({ closingNote: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-[11px] font-semibold text-stone-700"
                >
                  Email liên hệ
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={aboutSec?.contactInfo.email ?? ""}
                  placeholder="email@example.com"
                  onChange={(e) => {
                    const aboutSection = document.sections[aboutSectionIndex];
                    if (aboutSection?.type !== "about") return;
                    updateSection(aboutSectionIndex, {
                      ...aboutSection,
                      contactInfo: {
                        ...aboutSection.contactInfo,
                        email: e.target.value,
                      },
                    });
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              {/* Rubric Footer Required Fields */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Chân trang bắt buộc INF2501 (1,0đ Hình thức)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Tên hiển thị ở chân trang
                    </label>
                    <input
                      type="text"
                      aria-label="Tên hiển thị ở chân trang"
                      value={
                        section.courseInfo?.studentName ??
                        ownerProfile.fullName ??
                        ""
                      }
                      placeholder="Nhập tên muốn hiển thị"
                      onChange={(e) => {
                        updateSection(idx, {
                          ...section,
                          courseInfo: {
                            ...section.courseInfo,
                            courseCode: "INF2501",
                            courseName:
                              "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo",
                            institution:
                              section.courseInfo?.institution ??
                              "Trường ĐH Sư phạm Nghệ thuật TW",
                            studentName: e.target.value,
                          },
                        });
                        updateProfileOwner({ fullName: e.target.value });
                      }}
                      className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Vị trí tên ở chân trang
                    </label>
                    <select
                      aria-label="Vị trí tên ở chân trang"
                      value={section.courseInfo?.studentNamePosition ?? "left"}
                      onChange={(e) =>
                        updateSection(idx, {
                          ...section,
                          courseInfo: {
                            ...section.courseInfo,
                            courseCode: "INF2501",
                            courseName:
                              "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo",
                            institution:
                              section.courseInfo?.institution ??
                              "Trường ĐH Sư phạm Nghệ thuật TW",
                            studentNamePosition: e.target.value as
                              "left" | "center" | "right",
                          },
                        })
                      }
                      className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                    >
                      <option value="left">Bên trái</option>
                      <option value="center">Ở giữa</option>
                      <option value="right">Bên phải</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-700">
                    Ngành / chức danh hiển thị
                  </label>
                  <input
                    type="text"
                    aria-label="Ngành / chức danh hiển thị"
                    value={ownerProfile.roleTitle}
                    placeholder="Ví dụ: Sinh viên ngành Sư phạm Âm nhạc"
                    onChange={(e) =>
                      updateProfileOwner({ roleTitle: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-700">
                    Tên trường hiển thị
                  </label>
                  <input
                    type="text"
                    aria-label="Tên trường hiển thị"
                    value={
                      section.courseInfo?.institution ??
                      "Trường ĐH Sư phạm Nghệ thuật TW"
                    }
                    placeholder="Nhập tên trường"
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        courseInfo: {
                          ...section.courseInfo,
                          courseCode: "INF2501",
                          courseName:
                            "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo",
                          institution: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Mã sinh viên (MSSV)
                    </label>
                    <input
                      type="text"
                      value={section.courseInfo?.studentId ?? ""}
                      placeholder="2552210402"
                      onChange={(e) =>
                        updateSection(idx, {
                          ...section,
                          courseInfo: {
                            ...section.courseInfo,
                            courseCode: "INF2501",
                            courseName:
                              "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo",
                            institution:
                              section.courseInfo?.institution ??
                              "Trường ĐH Sư phạm Nghệ thuật TW",
                            studentClass: section.courseInfo?.studentClass,
                            instructorName: section.courseInfo?.instructorName,
                            studentName:
                              section.courseInfo?.studentName ??
                              ownerProfile.fullName,
                            studentId: e.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Giảng viên hướng dẫn
                    </label>
                    <input
                      type="text"
                      value={
                        section.courseInfo?.instructorName ??
                        ownerProfile.instructorName ??
                        ""
                      }
                      placeholder="ThS. Nguyễn Văn A"
                      onChange={(e) => {
                        updateSection(idx, {
                          ...section,
                          courseInfo: {
                            ...section.courseInfo,
                            courseCode: "INF2501",
                            courseName:
                              "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo",
                            institution:
                              section.courseInfo?.institution ??
                              "Trường ĐH Sư phạm Nghệ thuật TW",
                            studentId: section.courseInfo?.studentId,
                            studentClass: section.courseInfo?.studentClass,
                            studentName:
                              section.courseInfo?.studentName ??
                              ownerProfile.fullName,
                            instructorName: e.target.value,
                          },
                        });
                        updateProfileOwner({ instructorName: e.target.value });
                      }}
                      className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700">
                      Lớp sinh viên
                    </label>
                    <input
                      type="text"
                      value={section.courseInfo?.studentClass ?? ""}
                      placeholder="Lớp: 01"
                      onChange={(e) =>
                        updateSection(idx, {
                          ...section,
                          courseInfo: {
                            ...section.courseInfo,
                            courseCode: "INF2501",
                            courseName:
                              "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo",
                            institution:
                              section.courseInfo?.institution ??
                              "Trường ĐH Sư phạm Nghệ thuật TW",
                            studentId: section.courseInfo?.studentId,
                            instructorName: section.courseInfo?.instructorName,
                            studentName:
                              section.courseInfo?.studentName ??
                              ownerProfile.fullName,
                            studentClass: e.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-700">
                    Tên học phần
                  </label>
                  <input
                    type="text"
                    aria-label="Tên học phần"
                    value={
                      section.courseInfo?.courseName ??
                      "Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo"
                    }
                    placeholder="Nhập tên học phần..."
                    onChange={(e) =>
                      updateSection(idx, {
                        ...section,
                        courseInfo: {
                          ...section.courseInfo,
                          courseCode: section.courseInfo?.courseCode ?? "INF2501",
                          courseName: e.target.value,
                          institution:
                            section.courseInfo?.institution ??
                            "Trường ĐH Sư phạm Nghệ thuật TW",
                          studentId: section.courseInfo?.studentId,
                          studentName:
                            section.courseInfo?.studentName ??
                            ownerProfile.fullName,
                          studentClass: section.courseInfo?.studentClass,
                        },
                      })
                    }
                    className="mt-1 w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section Type: Experience or Education */}
          {(section?.type === "experience" ||
            section?.type === "education") && (
            <div className="space-y-3">
              <h3 className="font-bold uppercase tracking-wider text-stone-500">
                {section.type === "experience" ? "Kinh nghiệm" : "Học vấn"}
              </h3>
              <div>
                <label className="block text-[11px] font-semibold">
                  Tiêu đề mục
                </label>
                <input
                  type="text"
                  aria-label="Tiêu đề mục"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(idx, { ...section, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs"
                />
              </div>
              {section.type === "education" && (
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="space-y-2 rounded-xl border border-stone-200 bg-white p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-stone-700">Học vấn {itemIndex + 1}</span>
                        <button type="button" onClick={() => updateSection(idx, { ...section, items: section.items.filter((_, i) => i !== itemIndex) })} className="rounded-lg p-1 text-rose-600 hover:bg-rose-50" aria-label={`Xóa học vấn ${itemIndex + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      <input aria-label={`Trường học ${itemIndex + 1}`} value={item.school} onChange={(e) => updateSection(idx, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, school: e.target.value } : entry) })} placeholder="Tên trường" className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs" />
                      <input aria-label={`Ngành học ${itemIndex + 1}`} value={item.degree} onChange={(e) => updateSection(idx, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, degree: e.target.value } : entry) })} placeholder="Ngành học / Bằng cấp" className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs" />
                      <input aria-label={`Thời gian học ${itemIndex + 1}`} value={item.period} onChange={(e) => updateSection(idx, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, period: e.target.value } : entry) })} placeholder="2023 - 2027" className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs" />
                      <input aria-label={`Thành tích ${itemIndex + 1}`} value={item.gpaOrHonors ?? ""} onChange={(e) => updateSection(idx, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, gpaOrHonors: e.target.value || undefined } : entry) })} placeholder="Thành tích / Mã SV / Lớp (không bắt buộc)" className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs" />
                      <textarea aria-label={`Mô tả học vấn ${itemIndex + 1}`} rows={2} value={item.details ?? ""} onChange={(e) => updateSection(idx, { ...section, items: section.items.map((entry, i) => i === itemIndex ? { ...entry, details: e.target.value || undefined } : entry) })} placeholder="Mô tả thêm (không bắt buộc)" className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs" />
                    </div>
                  ))}
                  <button type="button" onClick={() => updateSection(idx, { ...section, items: [...section.items, { school: "", degree: "", period: "", gpaOrHonors: "", details: "" }] })} className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"><Plus className="h-3.5 w-3.5" />Thêm học vấn</button>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700">
                  Bố cục riêng cho mục này
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(section.type === "experience"
                    ? [
                        { id: "vertical-timeline", label: "Timeline dọc" },
                        { id: "canva-cards", label: "Thẻ Canva" },
                        { id: "compact-list", label: "Danh sách gọn" },
                      ]
                    : [
                        { id: "academic-grid", label: "Lưới học vấn" },
                        { id: "timeline", label: "Timeline" },
                        { id: "compact-list", label: "Danh sách gọn" },
                        { id: "bento", label: "Bento" },
                      ]
                  ).map((layout) => {
                    const selected =
                      section.type === "experience"
                        ? section.variant === layout.id
                        : (section.variant ?? "academic-grid") === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => {
                          if (section.type === "experience") {
                            updateSection(idx, {
                              ...section,
                              variant: layout.id as
                                | "vertical-timeline"
                                | "canva-cards"
                                | "compact-list",
                            });
                          } else {
                            updateSection(idx, {
                              ...section,
                              variant: layout.id as
                                | "academic-grid"
                                | "timeline"
                                | "compact-list"
                                | "bento",
                            });
                          }
                        }}
                        className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                          selected
                            ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        {layout.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Hiện có {section.items.length} mục trong phần này.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
