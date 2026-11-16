"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Target,
  Lightbulb,
  CheckCircle2,
  FileText,
  Eye,
  Video,
  ExternalLink,
  Wand2,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutGrid,
  GalleryHorizontalEnd,
  GripVertical,
  RefreshCw,
  LayoutTemplate,
  Award,
  BookOpen,
  Activity,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type {
  ProjectItem,
  ProjectsSection,
  TemplateId,
  ThemeConfig,
} from "@/schema/portfolio.schema";
import {
  ImageSourceBadge,
  MediaFrame,
  type MediaFrameVariant,
} from "@/components/visual-primitives";
import {
  formatSectionEyebrow,
  getArchetypeDefaultVariants,
  getArchetypeProfile,
  getCardDecoration,
  getRadiusClass,
  getThemeTokens,
} from "@/templates/archetypes/archetypeStyles";
import { AssignmentDetailModal } from "./AssignmentDetailModal";
import { CanvaFourPointStar, CanvaVinylSketchSvg } from "./CanvaOrnaments";
import { parseVideoEmbedUrl, isVideoUrl } from "@/utils/video";

export function getEffectiveProjectVideoUrl(project: ProjectItem): string | undefined {
  if (project.videoUrl && project.videoUrl.trim()) return project.videoUrl.trim();
  if (project.docxUrl && isVideoUrl(project.docxUrl)) return project.docxUrl.trim();
  return undefined;
}

export function isProjectVideoMode(project: ProjectItem): boolean {
  if (project.mediaType === "video" || project.productType === "video") return true;
  if (project.videoUrl && project.videoUrl.trim()) return true;
  if (project.docxUrl && isVideoUrl(project.docxUrl)) return true;
  return false;
}

function getSafeDocxHref(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return null;
}

function DocxFileLink({
  url,
  label,
}: {
  url: string | undefined;
  label?: string;
}) {
  const href = getSafeDocxHref(url);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label || "Mở file DOCX đính kèm"}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition hover:opacity-80"
      style={{
        borderColor: "var(--primary, #735340)",
        color: "var(--primary, #735340)",
        backgroundColor: "var(--surface, #FFF8F0)",
      }}
    >
      <FileText className="h-3 w-3" />
      {label || "Mở file DOCX"}
    </a>
  );
}

export interface BulletShapeIconProps {
  shape?: "circle" | "square" | "hyphen" | "star" | "check" | "diamond" | "none";
  color?: string;
  className?: string;
}

function BulletShapeIcon({ shape = "circle", color = "currentColor", className = "" }: BulletShapeIconProps) {
  if (shape === "none") {
    return null;
  }
  if (shape === "hyphen") {
    return (
      <span
        className={`inline-block font-bold leading-none select-none ${className}`}
        style={{ color }}
        aria-hidden="true"
      >
        —
      </span>
    );
  }
  if (shape === "square") {
    return (
      <span
        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-none select-none ${className}`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
    );
  }
  if (shape === "star") {
    return (
      <span
        className={`text-xs leading-none select-none ${className}`}
        style={{ color }}
        aria-hidden="true"
      >
        ★
      </span>
    );
  }
  if (shape === "check") {
    return (
      <span
        className={`text-xs font-bold leading-none select-none ${className}`}
        style={{ color }}
        aria-hidden="true"
      >
        ✔
      </span>
    );
  }
  if (shape === "diamond") {
    return (
      <span
        className={`text-xs leading-none select-none ${className}`}
        style={{ color }}
        aria-hidden="true"
      >
        ◆
      </span>
    );
  }
  return (
    <span
      className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full select-none ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

interface ProjectsShowcaseBlockProps {
  section: ProjectsSection;
  theme: ThemeConfig;
  archetypeId?: TemplateId;
  editable?: boolean;
  sectionIndex?: number;
  frameVariant?: MediaFrameVariant;
  generatingProjectId?: string | null;
  onRegenerateProjectImage?: (
    projectId: string,
    customPrompt?: string,
  ) => Promise<void>;
  onSwitchProjectImageSource?: (projectId: string, mode: "docx" | "ai") => void;
  portfolioSlug?: string;
}

function stripLeadingIndex(title: string): string {
  return title.replace(/^\d{1,2}\s*[.\-:]\s*/, "").trim() || title;
}

function getProjectSlug(project: ProjectItem, index: number): string {
  if (project.slug && project.slug.trim()) return project.slug.trim();
  if (project.id && project.id.trim()) return project.id.trim();
  return `proj-${index + 1}`;
}

type ProjectMediaPosition = "left" | "right" | "top" | "bottom";

function getProjectMediaPosition(
  project: ProjectItem,
  fallback: ProjectMediaPosition = "left",
): ProjectMediaPosition {
  if (project.mediaPosition) return project.mediaPosition;
  if (project.layoutInverted) return "right";
  return fallback;
}

function getProjectMediaOrder(position: ProjectMediaPosition) {
  const mediaFirst = position === "left" || position === "top";
  return {
    media: mediaFirst ? "order-1" : "order-2",
    details: mediaFirst ? "order-2" : "order-1",
    vertical: position === "top" || position === "bottom",
  };
}

function SortableProjectCardWrapper({
  id,
  children,
  editable,
  className = "",
  style,
  mediaPosition,
}: {
  id: string;
  children: React.ReactNode;
  editable: boolean;
  className?: string;
  style?: React.CSSProperties;
  mediaPosition?: ProjectMediaPosition;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editable });

  const combinedStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <article
      ref={setNodeRef}
      style={combinedStyle}
      data-project-card="true"
      data-testid={`canvas-project-card-${id}`}
      data-project-media-position={mediaPosition}
      className={`relative group ${className} ${
        isDragging ? "ring-2 ring-amber-500 shadow-2xl rounded-2xl" : ""
      }`}
    >
      {editable && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
          <button
            type="button"
            {...attributes}
            {...listeners}
            data-testid={`drag-handle-project-${id}`}
            className="inline-flex items-center gap-1 rounded-md bg-stone-900/80 px-2 py-1 text-[11px] font-bold text-white shadow-md hover:bg-amber-600 transition cursor-grab active:cursor-grabbing"
            title="Kéo để đổi thứ tự bài tập trên Canvas"
          >
            <GripVertical className="h-3.5 w-3.5" />
            <span>⠿ Kéo đổi thứ tự</span>
          </button>
        </div>
      )}
      {children}
    </article>
  );
}

function SortableProjectThumbItem({
  id,
  children,
  editable,
  onClick,
  isActive,
  borderColor,
}: {
  id: string;
  children: React.ReactNode;
  editable: boolean;
  onClick: (e: React.MouseEvent) => void;
  isActive: boolean;
  borderColor: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: isActive ? borderColor : "transparent",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(editable ? attributes : {})}
      {...(editable ? listeners : {})}
      onClick={onClick}
      className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition cursor-pointer ${
        isActive ? "opacity-100 shadow-md" : "opacity-65 hover:opacity-100"
      } ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {children}
    </div>
  );
}

export function ProjectsShowcaseBlock({
  section,
  theme,
  archetypeId = "canva-editorial",
  editable = false,
  sectionIndex,
  frameVariant,
  generatingProjectId = null,
  onRegenerateProjectImage,
  onSwitchProjectImageSource,
  portfolioSlug,
}: ProjectsShowcaseBlockProps) {
  const router = useRouter();
  const params = useParams();
  const routePortfolioSlug =
    portfolioSlug ||
    (params?.portfolioSlug as string) ||
    "portfolio-mau-hoan-chinh";

  const reorderProjects = usePortfolioStore((s) => s.reorderProjects);
  const reorderProjectMedia = usePortfolioStore((s) => s.reorderProjectMedia);
  const swapProjectLayout = usePortfolioStore((s) => s.swapProjectLayout);

  const [activeCarouselSlide, setActiveCarouselSlide] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = section.projects.findIndex((p) => p.id === active.id);
    const newIndex = section.projects.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderProjects(sectionIndex ?? 0, oldIndex, newIndex);
    }
  };

  const [modalProject, setModalProject] = useState<ProjectItem | null>(null);
  const [modalProjectIndex, setModalProjectIndex] = useState(0);
  const [modalImgIdx, setModalImgIdx] = useState(0);
  const [carouselIndices, setCarouselIndices] = useState<
    Record<string, number>
  >({});
  const [collageModes, setCollageModes] = useState<Record<string, boolean>>({});

  const profile = getArchetypeProfile(archetypeId);
  const tokens = getThemeTokens(theme);
  const cardDec = getCardDecoration(archetypeId, theme);
  const mediaRadius = getRadiusClass(theme.borderRadius, archetypeId);
  const resolvedFrameVariant: MediaFrameVariant =
    frameVariant ?? profile.frameVariant;

  const defaults = getArchetypeDefaultVariants(archetypeId);
  const activeProjectsVariant = section.variant || defaults.projects;

  const isCanvaEditorial = activeProjectsVariant === "canva-slide-showcase" || (archetypeId === "canva-editorial" && !section.variant);
  const isStaggered = activeProjectsVariant === "staggered-cards";
  const isCarousel = activeProjectsVariant === "carousel";
  const isList = activeProjectsVariant === "list";
  const isGrid = activeProjectsVariant === "grid";
  const isBento = activeProjectsVariant === "bento-projects";
  const isCanvaSlideShowcase = activeProjectsVariant === "canva-slide-showcase";
  const isCaseStudyCards = activeProjectsVariant === "case-study-cards";
  const isMinimal =
    activeProjectsVariant === "grid" && (archetypeId === "framer-minimal" || archetypeId === "minimal-chic");
  const isCreative =
    activeProjectsVariant === "staggered-cards" && (archetypeId === "creative-showcase" || archetypeId === "creative-bold");
  const isGrowth = activeProjectsVariant === "case-study-cards" && archetypeId === "growth-marketer";
  const isTerminal = activeProjectsVariant === "grid" && archetypeId === "tech-developer";
  const isOrganic = archetypeId === "artistic-organic";
  const isAcademic = activeProjectsVariant === "case-study-cards" && archetypeId === "academic-presentation";
  const isMedicalRuby = activeProjectsVariant === "medical-spread";
  const isClinicalNavy = activeProjectsVariant === "clinical-dossier";
  const isPedagogical = activeProjectsVariant === "lesson-plan";
  const isContentCreator = activeProjectsVariant === "creator-filmstrip";
  const isOceanicTeal = archetypeId === "oceanic-teal";
  const isEducationalTerracotta = activeProjectsVariant === "academic-monograph";
  const isPedagogicalRose = archetypeId === "pedagogical-rose";
  const isRubric3Tier =
    isMedicalRuby ||
    isClinicalNavy ||
    isEducationalTerracotta ||
    isPedagogicalRose ||
    isPedagogical ||
    activeProjectsVariant === "canva-slide-showcase";

  const openModal = (
    project: ProjectItem,
    projectIndex: number,
    imgIndex = 0,
  ) => {
    const detailMode = section.detailViewMode || "fullscreen-overlay";
    if (detailMode === "dedicated-route" && !editable) {
      const slug = getProjectSlug(project, projectIndex);
      router.push(`/${routePortfolioSlug}/projects/${slug}`);
      return;
    }
    setModalProject(project);
    setModalProjectIndex(projectIndex);
    setModalImgIdx(imgIndex);
  };

  const triggerRegenerate = (projectId: string) => {
    if (!onRegenerateProjectImage) return;
    setCarouselIndices((prev) => ({ ...prev, [projectId]: 0 }));
    void onRegenerateProjectImage(projectId);
  };

  const renderAdaptiveMedia = (project: ProjectItem, index: number) => {
    const media = project.media ?? [];
    const isGen = generatingProjectId === project.id;
    const masonryAspectClass =
      section.variant === "masonry-gallery"
        ? ["aspect-[5/4]", "aspect-[4/5]", "aspect-[5/4]", "aspect-[3/2]"][
            index % 4
          ]
        : undefined;

    const canvaMediaClass = isCanvaEditorial
      ? index % 2 === 0
        ? "rounded-[40px] border-[3px] !border-[var(--primary)] shadow-none"
        : "rounded-[24px] border-[3px] !border-[var(--primary)] shadow-none"
      : mediaRadius;
    const effectiveVariant: MediaFrameVariant = isCanvaEditorial
      ? "rounded-card"
      : resolvedFrameVariant;
    const effectivePrimary = theme.primaryColor || "#735340";
    const effectiveSecondary = theme.secondaryColor || "#5D4037";
    const effectiveSurface = theme.surfaceColor || "#FFF8F0";

    // Video Mode: Nếu người dùng chọn nhúng video thay vì ảnh, hoặc có link video hợp lệ
    const isVideoMode = isProjectVideoMode(project);
    const effectiveVideoUrl = getEffectiveProjectVideoUrl(project);

    if (isVideoMode) {
      if (effectiveVideoUrl) {
        const embedUrl = parseVideoEmbedUrl(effectiveVideoUrl);
        if (embedUrl) {
          const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(embedUrl);
          return (
            <div className="space-y-3">
              <div
                className={`relative overflow-hidden aspect-video w-full shadow-md bg-stone-950 ${
                  isCanvaEditorial
                    ? "rounded-2xl sm:rounded-[24px] border-[3px] !border-[var(--primary)]"
                    : mediaRadius
                }`}
              >
                {isDirectVideo ? (
                  <video
                    src={embedUrl}
                    controls
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <iframe
                    src={embedUrl}
                    title={`Video minh họa: ${project.title}`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold text-[11px]"
                  style={{
                    backgroundColor: `${effectivePrimary}15`,
                    color: effectivePrimary,
                  }}
                >
                  <Video className="h-3 w-3" />
                  <span>Video học liệu / Demo</span>
                </span>
                <a
                  href={effectiveVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold transition hover:underline"
                  style={{ color: effectivePrimary }}
                >
                  <span>Mở xem toàn màn hình</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        }
      }

      // Nếu đã bật Video mode nhưng chưa nhập link hợp lệ (hoặc đang trong Studio Canvas)
      if (editable) {
        return (
          <div
            className={`flex aspect-video w-full flex-col items-center justify-center gap-2.5 border-2 border-dashed p-6 text-center ${
              isCanvaEditorial ? "rounded-[24px]" : mediaRadius
            }`}
            style={{
              borderColor: `${effectivePrimary}50`,
              backgroundColor: isCanvaEditorial
                ? effectiveSurface
                : `${effectivePrimary}08`,
            }}
          >
            <Video
              className="h-8 w-8 opacity-70"
              style={{ color: effectivePrimary }}
            />
            <p
              className="text-sm font-bold"
              style={{ color: "var(--text, #3E2723)" }}
            >
              Đã bật chế độ nhúng Video
            </p>
            <p className="max-w-xs text-xs opacity-75">
              Chưa có liên kết video. Nhấn vào bài tập để dán link YouTube, Google Drive hoặc Vimeo ở bảng cài đặt bên phải.
            </p>
          </div>
        );
      }
    }

    if (media.length === 0) {
      return (
        <div
          className={`flex aspect-[4/3] flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center ${
            isCanvaEditorial ? "rounded-[32px]" : mediaRadius
          }`}
          style={{
            borderColor: `${effectivePrimary}45`,
            backgroundColor: isCanvaEditorial
              ? effectiveSurface
              : `${effectivePrimary}08`,
          }}
        >
          <ImagePlus
            className="h-8 w-8 opacity-60"
            style={{ color: effectivePrimary }}
          />
          <p className="text-sm font-medium opacity-75">
            Bài tập chưa có ảnh minh họa
          </p>
          {editable && onRegenerateProjectImage && (
            <button
              type="button"
              disabled={isGen}
              onClick={(e) => {
                e.stopPropagation();
                triggerRegenerate(project.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: effectivePrimary }}
            >
              {isGen ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              <span>🎨 Tạo ảnh AI mới theo chủ đề</span>
            </button>
          )}
        </div>
      );
    }

    // 1 Image: Clean single showcase frame (no distortion)
    if (media.length === 1) {
      return (
        <MediaFrame
          media={media[0]}
          variant={effectiveVariant}
          aspectClass={masonryAspectClass}
          radiusClass={canvaMediaClass}
          primaryColor={effectivePrimary}
          secondaryColor={effectiveSecondary}
          surfaceColor={effectiveSurface}
          editable={editable}
          isGenerating={isGen}
          onClick={() => openModal(project, index, 0)}
          onRegenerateAiImage={
            onRegenerateProjectImage
              ? () => triggerRegenerate(project.id)
              : undefined
          }
          onSwitchToDocx={
            onSwitchProjectImageSource
              ? () => onSwitchProjectImageSource(project.id, "docx")
              : undefined
          }
        />
      );
    }

    // 2 - 4+ Images: Interactive Carousel + Adaptive Thumbnail Strip OR 2-4+ Collage Grid
    const rawIdx = carouselIndices[project.id] ?? 0;
    const activeIdx = rawIdx >= 0 && rawIdx < media.length ? rawIdx : 0;
    const currentMedia = media[activeIdx] ?? media[0];
    const isCollage = collageModes[project.id] ?? false;

    const thumbGridCols =
      media.length === 2
        ? "grid-cols-2"
        : media.length === 3
          ? "grid-cols-3"
          : "grid-cols-4";

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <span
            className={`rounded-full border px-2.5 py-0.5 ${
              isTerminal ? "font-mono" : ""
            }`}
            style={{
              borderColor: isCanvaEditorial
                ? `${effectivePrimary}73`
                : tokens.borderSubtle,
              backgroundColor: isCanvaEditorial
                ? effectiveSurface
                : theme.backgroundColor,
            }}
          >
            {isCollage
              ? `${media.length} hình ảnh đính kèm`
              : `Ảnh ${activeIdx + 1} / ${media.length}`}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollageModes((prev) => ({
                ...prev,
                [project.id]: !isCollage,
              }));
            }}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition hover:opacity-85"
            style={{
              borderColor: `${effectivePrimary}55`,
              color: effectivePrimary,
              backgroundColor: `${effectivePrimary}12`,
            }}
          >
            {isCollage ? (
              <>
                <GalleryHorizontalEnd className="h-3 w-3" />
                <span>Slide</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-3 w-3" />
                <span>Lưới ảnh</span>
              </>
            )}
          </button>
        </div>

        {isCollage ? (
          <div className="grid grid-cols-2 gap-2.5">
            {media.slice(0, 4).map((m, idx) => {
              const isHeroThree = media.length === 3 && idx === 0;
              const extraCount = media.length - 4;
              const showOverflow = idx === 3 && extraCount > 0;

              return (
                <div
                  key={m.id}
                  onClick={() => openModal(project, index, idx)}
                  className={`group relative cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md ${
                    isHeroThree ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"
                  } ${isCanvaEditorial ? "!border-2" : ""}`}
                  style={{
                    borderColor: isCanvaEditorial
                      ? effectivePrimary
                      : tokens.borderSubtle,
                    backgroundColor: theme.backgroundColor,
                  }}
                >
                  {idx === 0 && editable && (
                    <div className="pointer-events-auto absolute left-2.5 top-2.5 z-20">
                      <ImageSourceBadge
                        sourceType={m.sourceType}
                        editable={editable}
                        isGenerating={isGen}
                        onRegenerateAiImage={
                          onRegenerateProjectImage
                            ? () => triggerRegenerate(project.id)
                            : undefined
                        }
                        onSwitchToDocx={
                          onSwitchProjectImageSource
                            ? () =>
                                onSwitchProjectImageSource(project.id, "docx")
                            : undefined
                        }
                      />
                    </div>
                  )}

                  {idx === 0 && isGen && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-stone-900/60 text-white backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
                    </div>
                  )}

                  <img
                    src={m.url}
                    alt={m.caption || `${project.title} - ${idx + 1}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />

                  {showOverflow && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white backdrop-blur-[1px]">
                      +{extraCount} ảnh
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="relative">
              <MediaFrame
                media={currentMedia}
                variant={effectiveVariant}
                aspectClass={masonryAspectClass}
                radiusClass={canvaMediaClass}
                primaryColor={effectivePrimary}
                secondaryColor={effectiveSecondary}
                surfaceColor={effectiveSurface}
                editable={editable}
                isGenerating={isGen}
                onClick={() => openModal(project, activeIdx)}
                onRegenerateAiImage={
                  onRegenerateProjectImage
                    ? () => triggerRegenerate(project.id)
                    : undefined
                }
                onSwitchToDocx={
                  onSwitchProjectImageSource
                    ? () => onSwitchProjectImageSource(project.id, "docx")
                    : undefined
                }
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIndices((prev) => ({
                    ...prev,
                    [project.id]: (activeIdx - 1 + media.length) % media.length,
                  }));
                }}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-stone-900 shadow-md transition hover:bg-white"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIndices((prev) => ({
                    ...prev,
                    [project.id]: (activeIdx + 1) % media.length,
                  }));
                }}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-stone-900 shadow-md transition hover:bg-white"
                aria-label="Ảnh sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className={`grid gap-2 ${thumbGridCols}`}>
              {editable ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    const oldIdx = media.findIndex((m) => m.id === active.id);
                    const newIdx = media.findIndex((m) => m.id === over.id);
                    if (oldIdx !== -1 && newIdx !== -1) {
                      reorderProjectMedia(project.id, oldIdx, newIdx);
                    }
                  }}
                >
                  <SortableContext
                    items={media.slice(0, 4).map((m) => m.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {media.slice(0, 4).map((m, idx) => {
                      const extraCount = media.length - 4;
                      const showOverflow = idx === 3 && extraCount > 0;
                      return (
                        <SortableProjectThumbItem
                          key={m.id}
                          id={m.id}
                          editable={editable}
                          isActive={idx === activeIdx}
                          borderColor={effectivePrimary}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (showOverflow) {
                              openModal(project, index, idx);
                            } else {
                              setCarouselIndices((prev) => ({
                                ...prev,
                                [project.id]: idx,
                              }));
                            }
                          }}
                        >
                          <img
                            src={m.url}
                            alt={m.caption || `Media ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 rounded bg-amber-500 px-1 py-0.2 text-[8px] font-bold text-white shadow-xs">
                              ★ Chính
                            </span>
                          )}
                          {showOverflow && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-bold text-white">
                              +{extraCount}
                            </div>
                          )}
                        </SortableProjectThumbItem>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              ) : (
                media.slice(0, 4).map((m, idx) => {
                  const extraCount = media.length - 4;
                  const showOverflow = idx === 3 && extraCount > 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (showOverflow) {
                          openModal(project, index, idx);
                        } else {
                          setCarouselIndices((prev) => ({
                            ...prev,
                            [project.id]: idx,
                          }));
                        }
                      }}
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition ${
                        idx === activeIdx
                          ? "opacity-100 shadow-md"
                          : "opacity-65 hover:opacity-100"
                      }`}
                      style={{
                        borderColor:
                          idx === activeIdx ? effectivePrimary : "transparent",
                      }}
                    >
                      <img
                        src={m.url}
                        alt={m.caption || `Media ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {showOverflow && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-bold text-white">
                          +{extraCount}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (
    isCanvaEditorial &&
    section.variant === "canva-slide-showcase" &&
    !editable
  ) {
    return (
      <section
        id="projects"
        className="reveal-on-scroll mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28"
        style={{ color: `var(--section-text-color, ${theme.textColor})` }}
      >
        {/* Slide 3: Centered serif "project" flanked by 2 vinyl sketches + TOC Index Grid */}
        <div className="reveal-on-scroll pb-14">
          <div className="flex items-center justify-center gap-6 sm:gap-14">
            <CanvaVinylSketchSvg
              className="hidden h-24 w-24 shrink-0 opacity-85 sm:block md:h-28 md:w-28"
              stroke="var(--text, #3E2723)"
              strokeSecondary="var(--primary, #5D4037)"
            />
            <div className="text-center">
              <h2
                className="font-editorial text-6xl font-normal leading-none tracking-tight sm:text-8xl"
                style={{ color: "var(--text, #3E2723)" }}
              >
                project
              </h2>
              {section.subtitle && (
                <p
                  className="mx-auto mt-3 max-w-xl text-xs leading-relaxed sm:text-sm"
                  style={{ color: "var(--secondary, #5D4037)" }}
                >
                  {section.subtitle}
                </p>
              )}
            </div>
            <CanvaVinylSketchSvg
              className="hidden h-24 w-24 shrink-0 opacity-85 sm:block md:h-28 md:w-28"
              stroke="var(--text, #3E2723)"
              strokeSecondary="var(--primary, #5D4037)"
            />
          </div>

          {/* 3-Column Index Grid matching Slide 3 */}
          <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {section.projects.map((proj, idx) => {
              const numLabel = `${String(idx + 1).padStart(2, "0")}.`;
              const showRightStar =
                (idx + 1) % 3 !== 0 && idx < section.projects.length - 1;
              return (
                <div
                  key={proj.id}
                  className="relative flex flex-col items-center text-center"
                >
                  {showRightStar && (
                    <CanvaFourPointStar
                      className="pointer-events-none absolute -right-7 top-6 hidden h-6 w-6 lg:block"
                      color="var(--primary, #735340)"
                    />
                  )}
                  <span
                    className="font-editorial text-2xl font-normal sm:text-3xl"
                    style={{ color: "var(--text, #3E2723)" }}
                  >
                    {numLabel}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.document
                        .getElementById(`project-item-${idx}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                    className="mt-2.5 w-full max-w-[270px] rounded-full border px-5 py-2 text-xs font-medium leading-snug underline underline-offset-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl"
                    style={{
                      borderColor: "var(--primary, #735340)",
                      color: "var(--text, #3E2723)",
                      backgroundColor: "var(--surface, #FFF8F0)",
                    }}
                  >
                    {stripLeadingIndex(proj.title)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slides 4 - 7: Assignment Chapters directly on canvas paper */}
        <div className="space-y-16">
          {section.projects.map((project, index) => {
            const chapterNum = String(index + 1).padStart(2, "0");
            const chapterLayout = project.chapterLayout ?? "badge";
            const hasChapterBanner = project.showChapter !== false && chapterLayout === "banner";
            const mediaPosition = getProjectMediaPosition(project, "right");
            const mediaOrder = getProjectMediaOrder(mediaPosition);
            const isVideo = isProjectVideoMode(project);
            const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
            const mediaSpan = !hasMedia
              ? "lg:col-span-12"
              : mediaOrder.vertical
              ? "lg:col-span-12"
              : "lg:col-span-6";
            return (
              <article
                key={project.id}
                id={`project-item-${index}`}
                data-project-card="true"
                data-project-media-position={mediaPosition}
                data-chapter-layout={chapterLayout}
                className={`reveal-on-scroll relative scroll-mt-20 border-t pt-12 transition-all duration-300 ease-out ${
                  hasChapterBanner ? "rounded-2xl px-5 pb-6" : ""
                }`}
                style={{
                  borderColor: "var(--primary, #735340)",
                  backgroundColor: hasChapterBanner ? "var(--surface, #FFF8F0)" : undefined,
                  opacity: 0.95,
                }}
              >
                {/* Chapter Header: Giant serif numeral 01-06 + Title Stack */}
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
                  {project.showChapter !== false && chapterLayout === "badge" && (
                    <span
                      className="font-editorial text-8xl sm:text-9xl leading-none font-normal tracking-tight"
                      style={{ color: "var(--text, #3E2723)" }}
                    >
                      {chapterNum}
                    </span>
                  )}
                  <div className={`min-w-0 flex-1 pt-2 ${hasChapterBanner ? "rounded-xl px-4 py-3" : ""}`} style={hasChapterBanner ? { backgroundColor: "var(--primary, #735340)", color: "var(--bg, #FFF8F0)" } : undefined}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {project.showChapter !== false && (
                        <p
                          data-testid="project-chapter-label"
                          className={`text-sm font-bold uppercase tracking-[0.14em] sm:text-base ${hasChapterBanner ? "text-white" : chapterLayout === "minimal" ? "border-b pb-1" : ""}`}
                          style={{
                            color: hasChapterBanner ? "var(--bg, #FFF8F0)" : "var(--secondary, #5D4037)",
                            borderColor: chapterLayout === "minimal" ? "var(--primary, #735340)" : undefined,
                          }}
                        >
                          {project.chapterTitle || `CHƯƠNG ${index + 1} : ${project.category}`}
                        </p>
                      )}
                      {project.showExercise !== false && (
                        <span
                          data-testid="project-exercise-label"
                          className={`text-[11px] font-bold uppercase tracking-wider ${project.exerciseLayout === "inline" ? "px-1" : "rounded-full border px-2.5 py-1"}`}
                          style={{
                            borderColor: project.exerciseLayout === "inline" ? undefined : "var(--primary, #735340)",
                            color: hasChapterBanner ? "var(--bg, #FFF8F0)" : "var(--primary, #735340)",
                          }}
                        >
                          {project.exerciseNumber || `Bài tập ${index + 1}`}
                        </span>
                      )}
                      {project.sourceDocxFileName && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px]"
                          style={{
                            borderColor: "var(--primary, #735340)",
                            color: "var(--secondary, #5D4037)",
                            backgroundColor: "var(--surface, #FFF8F0)",
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          {project.sourceDocxFileName}
                        </span>
                      )}
                      <DocxFileLink
                        url={project.docxUrl}
                        label={project.docxLinkLabel}
                      />
                      {project.links?.map((link, lIdx) => (
                        <DocxFileLink
                          key={`extra-link-${lIdx}`}
                          url={link.url}
                          label={link.label}
                        />
                      ))}
                    </div>
                    <h3
                      className="mt-2 font-editorial text-2xl font-bold uppercase leading-snug tracking-tight sm:text-3xl lg:text-4xl"
                      style={{ color: "var(--text, #3E2723)" }}
                    >
                      {project.title}
                    </h3>
                  </div>
                </div>

                {/* Two-Column Editorial Chapter Body */}
                <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
                  {/* Left (col-span-6): MỤC TIÊU + bullets, QUY TRÌNH & KẾT QUẢ, metric badges, modal trigger */}
                  <div
                    className={`flex gap-4 ${mediaSpan} ${mediaOrder.details}`}
                    data-project-content="details"
                  >
                    {index % 2 === 1 && (
                      <div
                        className="hidden shrink-0 flex-col items-center gap-4 pt-2 sm:flex"
                        aria-hidden="true"
                      >
                        <CanvaFourPointStar
                          className="h-7 w-7"
                          color="var(--primary, #735340)"
                        />
                        <CanvaFourPointStar
                          className="h-7 w-7"
                          color="var(--primary, #735340)"
                        />
                        <CanvaFourPointStar
                          className="h-7 w-7"
                          color="var(--primary, #735340)"
                        />
                      </div>
                    )}

                    <div className="flex-1 space-y-6">
                      {(project.assignmentBrief ||
                        project.keyTakeaways.some((item) => item.trim())) && (
                        <div className="space-y-3">
                          <h4
                            className="text-lg font-extrabold uppercase tracking-wide"
                            style={{ color: "var(--text, #3E2723)" }}
                          >
                            MỤC TIÊU
                          </h4>
                          {project.assignmentBrief && (
                            <p
                              className="text-sm leading-relaxed sm:text-[15px]"
                              style={{
                                color: "var(--text, #3E2723)",
                                opacity: 0.92,
                              }}
                            >
                              {project.assignmentBrief}
                            </p>
                          )}
                          {project.keyTakeaways.some((item) => item.trim()) && (
                            <ul className="space-y-2 pt-1">
                              {project.keyTakeaways
                                .filter((takeaway) => takeaway.trim())
                                .map((takeaway, tIdx) => (
                                  <li
                                    key={tIdx}
                                    className={
                                      (project.takeawayBulletShape ?? "none") === "none"
                                        ? "text-sm leading-relaxed"
                                        : "flex items-start gap-2.5 text-sm leading-relaxed"
                                    }
                                    style={{
                                      color: "var(--text, #3E2723)",
                                      opacity: 0.9,
                                    }}
                                  >
                                    {(project.takeawayBulletShape ?? "none") !== "none" && (
                                      <BulletShapeIcon
                                        shape={project.takeawayBulletShape}
                                        color="var(--primary, #735340)"
                                        className="shrink-0"
                                      />
                                    )}
                                    <span>{takeaway}</span>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4
                          className="text-lg font-extrabold uppercase tracking-wide"
                          style={{ color: "var(--text, #3E2723)" }}
                        >
                          QUY TRÌNH & KẾT QUẢ
                        </h4>
                        <p
                          className="text-sm leading-relaxed sm:text-[15px]"
                          style={{
                            color: "var(--text, #3E2723)",
                            opacity: 0.92,
                          }}
                        >
                          {project.summary}
                        </p>
                      </div>
                      {project.metrics.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {project.metrics.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="rounded-full border px-3.5 py-1 text-xs shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                              style={{
                                borderColor: "var(--primary, #735340)",
                                backgroundColor: "var(--surface, #FFF8F0)",
                                color: "var(--text, #3E2723)",
                              }}
                            >
                              <span
                                style={{ color: "var(--primary, #735340)" }}
                              >
                                {m.label}:{" "}
                              </span>
                              <span className="font-bold">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <div className="flex flex-wrap gap-2">
                          {project.tags.slice(0, 4).map((tag, tagIdx) => (
                            <span
                              key={tagIdx}
                              className="text-xs font-semibold"
                              style={{ color: "var(--primary, #735340)" }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(project, index, 0);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-bold transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg"
                          style={{
                            borderColor: "var(--primary, #735340)",
                            color: "var(--text, #3E2723)",
                            backgroundColor: "var(--surface, #FFF8F0)",
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span>
                            Xem chi tiết bài làm
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right (col-span-6): Canva Framed Media + peeking vinyl disc accent */}
                  {hasMedia && (
                    <div
                      className={`group relative ${mediaSpan} ${mediaOrder.media}`}
                      data-project-content="media"
                    >
                      <div className="transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl">
                        {renderAdaptiveMedia(project, index)}
                      </div>
                      {index === 0 && (
                        <CanvaVinylSketchSvg
                          className="pointer-events-none -bottom-10 -right-4 hidden h-28 w-28 opacity-60 lg:absolute lg:block"
                          stroke="var(--text, #3E2723)"
                          strokeSecondary="var(--primary, #5D4037)"
                        />
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <AssignmentDetailModal
          project={modalProject}
          theme={theme}
          initialImageIndex={modalImgIdx}
          onClose={() => setModalProject(null)}
          allProjects={section.projects}
          currentIndex={modalProjectIndex}
          onNavigateProject={(proj, idx) => {
            setModalProject(proj);
            setModalProjectIndex(idx);
            setModalImgIdx(0);
          }}
          navigationLoop={section.navigationLoop ?? true}
        />
      </section>
    );
  }

  const renderProjectDetails = (project: ProjectItem, index: number) => {
    const idxStr = String(index + 1).padStart(2, "0");
    return (
      <div className="flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Terminal IDE strip for Tech Developer */}
          {isTerminal && (
            <div
              className="flex items-center justify-between border-b pb-2 font-mono text-[11px] opacity-75"
              style={{ borderColor: tokens.borderSubtle }}
            >
              <span>{`case-${idxStr}.md`}</span>
              <span>{project.category}</span>
            </div>
          )}

          {/* Header badges */}
          <div className="flex flex-wrap items-center gap-2">
            {project.showChapter !== false && (
              <>
                {isMedicalRuby || isEducationalTerracotta || section.variant === "canva-slide-showcase" ? (
                  <span
                    className="font-editorial text-3xl font-bold tracking-tight sm:text-4xl"
                    style={{ color: theme.primaryColor }}
                  >
                    {idxStr}
                  </span>
                ) : isMinimal ? (
                  <span
                    className="font-mono text-xs font-bold tracking-wider"
                    style={{ color: theme.primaryColor }}
                  >
                    {idxStr} —
                  </span>
                ) : (
                  <span
                    className={`inline-flex h-7 items-center justify-center px-2.5 text-xs font-bold text-white ${
                      isTerminal ? "rounded-md font-mono" : "rounded-full"
                    }`}
                    style={{ backgroundColor: theme.secondaryColor }}
                  >
                    {isCreative
                      ? `Exhibit ${idxStr}`
                      : isTerminal
                        ? `[${idxStr}]`
                        : idxStr}
                  </span>
                )}
                <span
                  className={`px-3 py-1 text-xs font-semibold ${
                    isTerminal ? "rounded-md font-mono" : isMinimal ? "rounded-md" : "rounded-full"
                  }`}
                  style={{
                    backgroundColor: `${theme.primaryColor}18`,
                    color: theme.primaryColor,
                  }}
                  data-testid="project-chapter-label"
                >
                  {project.chapterTitle || project.category}
                </span>
              </>
            )}
            {project.showExercise !== false && (
              <span
                data-testid="project-exercise-label"
                className={project.exerciseLayout === "inline" ? "px-1 text-xs font-bold" : "rounded-full border px-2.5 py-1 text-xs font-bold"}
                style={{
                  borderColor: project.exerciseLayout === "inline" ? undefined : `${theme.primaryColor}55`,
                  color: theme.primaryColor,
                }}
              >
                {project.exerciseNumber || `Bài tập ${index + 1}`}
              </span>
            )}

            {project.sourceDocxFileName && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] opacity-75 ${
                  isTerminal ? "font-mono" : ""
                }`}
                style={{ borderColor: tokens.borderSubtle }}
              >
                <FileText className="h-3 w-3" />
                {project.sourceDocxFileName}
              </span>
            )}
            <DocxFileLink
              url={project.docxUrl}
              label={project.docxLinkLabel}
            />
            {project.links?.map((link, lIdx) => (
              <DocxFileLink
                key={`extra-link-alt-${lIdx}`}
                url={link.url}
                label={link.label}
              />
            ))}
          </div>

          <h3 className="font-editorial text-2xl font-bold leading-snug sm:text-[26px]">
            {project.title}
          </h3>

          {/* Layer 1: Assignment Brief */}
          {project.assignmentBrief && (
            <div
              className={
                isMinimal
                  ? "border-l-2 py-1 pl-3.5 text-sm leading-relaxed"
                  : isBento
                    ? "rounded-2xl border p-3.5 text-sm leading-relaxed"
                    : "rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed"
              }
              style={{
                backgroundColor: isMinimal
                  ? "transparent"
                  : `${theme.primaryColor}0F`,
                borderColor: isMinimal
                  ? theme.primaryColor
                  : `${theme.primaryColor}30`,
              }}
            >
              <div
                className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isTerminal ? "font-mono" : ""
                }`}
                style={{ color: theme.primaryColor }}
              >
                <Target className="h-3.5 w-3.5" /> {isRubric3Tier ? "Mục tiêu trọng tâm" : "Đề bài / Mục tiêu"}
              </div>
              <p className="opacity-90">{project.assignmentBrief}</p>
            </div>
          )}

          {/* Layer 2: Summary */}
          <div
            className={isBento ? "rounded-2xl border p-3.5" : ""}
            style={
              isBento
                ? {
                    backgroundColor: theme.backgroundColor,
                    borderColor: tokens.borderSubtle,
                  }
                : undefined
            }
          >
            <div
              className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                isTerminal ? "font-mono" : ""
              }`}
              style={{
                color: tokens.isDarkSurface
                  ? theme.primaryColor
                  : theme.secondaryColor,
              }}
            >
              <Lightbulb className="h-3.5 w-3.5" /> {isRubric3Tier ? "Quy trình thực hiện" : "Giải pháp & Thực hiện"}
            </div>
            <p className="text-sm leading-relaxed opacity-85">
              {project.summary}
            </p>
          </div>

          {/* Layer 3: Key Takeaways & Metrics */}
          {project.keyTakeaways.some((item) => item.trim()) && (
            <div className="space-y-1.5">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isTerminal ? "font-mono" : ""
                }`}
                style={{ color: tokens.positiveAccent }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {isRubric3Tier ? "Sản phẩm & Minh chứng" : "Kết quả & Điểm nhấn"}
              </div>
              <ul className="space-y-1">
                {project.keyTakeaways
                  .filter((takeaway) => takeaway.trim())
                  .map((takeaway, idx) => (
                    <li
                      key={idx}
                      className={
                        (project.takeawayBulletShape ?? "none") === "none"
                          ? "text-sm opacity-90 leading-relaxed"
                          : "flex items-start gap-2 text-sm opacity-90"
                      }
                    >
                      {(project.takeawayBulletShape ?? "none") !== "none" && (
                        <BulletShapeIcon
                          shape={project.takeawayBulletShape}
                          color={theme.primaryColor}
                          className="shrink-0"
                        />
                      )}
                      <span>{takeaway}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {project.metrics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {project.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className={`border px-3 py-1.5 text-xs ${
                    isGrowth
                      ? "rounded-lg border-l-2 shadow-sm"
                      : isTerminal
                        ? "rounded-md font-mono"
                        : "rounded-xl"
                  }`}
                  style={{
                    backgroundColor: theme.backgroundColor,
                    borderColor: tokens.borderSubtle,
                    borderLeftColor: isGrowth ? theme.primaryColor : undefined,
                  }}
                >
                  <span className="opacity-65">{m.label}: </span>
                  <span
                    className="font-bold"
                    style={{ color: theme.primaryColor }}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-2 ${
            isMinimal ? "border-t pt-3" : ""
          }`}
          style={isMinimal ? { borderColor: tokens.borderSubtle } : undefined}
        >
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className={`border px-2.5 py-0.5 text-[11px] font-medium opacity-80 ${
                  isTerminal ? "rounded-md font-mono" : "rounded-full"
                }`}
                style={{ borderColor: tokens.borderSubtle }}
              >
                {isTerminal ? `#${tag}` : tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {editable && (
              <button
                type="button"
                data-testid={`swap-project-layout-${project.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const curPos = getProjectMediaPosition(
                    project,
                    isCanvaEditorial ? "right" : "left",
                  );
                  swapProjectLayout(project.id, curPos);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 shadow-xs hover:bg-amber-100 transition cursor-pointer"
                title="Đổi vị trí Ảnh và Nội dung bài tập này"
              >
                <RefreshCw className="h-3 w-3" />
                <span>⇄ Đổi ảnh/chữ</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openModal(project, index, 0);
              }}
              className={`inline-flex items-center gap-1.5 border px-4 py-2 text-xs font-semibold transition hover:shadow-md ${
                isTerminal
                  ? "rounded-lg font-mono"
                  : isMinimal
                    ? "rounded-lg"
                    : "rounded-full"
              }`}
              style={{
                borderColor: tokens.isDarkSurface
                  ? theme.primaryColor
                  : theme.secondaryColor,
                color: tokens.isDarkSurface
                  ? theme.primaryColor
                  : theme.secondaryColor,
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>
                Xem chi tiết bài làm
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isMasonry = !isBento && section.variant === "masonry-gallery";

  return (
    <section
      id="projects"
      className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28"
      style={{ color: `var(--section-text-color, ${theme.textColor})` }}
    >
      {/* Section Heading */}
      <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span
            className={`text-xs font-bold uppercase tracking-[0.2em] ${
              isTerminal ? "font-mono" : ""
            }`}
            style={{ color: theme.primaryColor }}
          >
            {formatSectionEyebrow(
              archetypeId,
              "04",
              "Case Studies & Assignments",
            )}
          </span>
          <h2 className="mt-1 font-editorial text-3xl font-bold sm:text-4xl">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-75">
              {section.subtitle}
            </p>
          )}
        </div>
        <div
          className={`text-xs font-semibold opacity-70 ${
            isTerminal ? "font-mono" : ""
          }`}
        >
          {section.projects.length} bài tập trưng bày
        </div>
      </div>

      {/* Layout based on archetype & section variant */}
      {(() => {
        const renderLayoutContent = () => {
          if (isMedicalRuby || section.variant === "medical-spread") {
            return (
              <div className="space-y-12 pb-8">
                {section.projects.map((project, index) => {
                  const mediaPosition = getProjectMediaPosition(project, index % 2 === 1 ? "right" : "left");
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  const idxStr = String(index + 1).padStart(2, "0");
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className="rounded-3xl border-2 p-6 sm:p-8 transition-all hover:shadow-xl bg-white/90"
                      style={{
                        borderColor: "rgba(123, 17, 19, 0.3)",
                        boxShadow: "0 10px 30px -10px rgba(123, 17, 19, 0.15)",
                      }}
                    >
                      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                        {hasMedia && (
                          <div
                            className={`lg:col-span-5 ${mediaOrder.media}`}
                            data-project-content="media"
                          >
                            <div className="relative group">
                              <div
                                className="overflow-hidden p-1.5 bg-white shadow-md"
                                style={{
                                  borderRadius: "140px 140px 20px 20px",
                                  border: "3px solid #7B1113",
                                }}
                              >
                                {renderAdaptiveMedia(project, index)}
                              </div>
                              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border border-amber-300 bg-[#7B1113] px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow whitespace-nowrap">
                                CHUẨN GMP / GSP
                              </span>
                            </div>
                          </div>
                        )}
                        <div
                          className={`space-y-5 ${!hasMedia ? "lg:col-span-12" : "lg:col-span-7"} ${mediaOrder.details}`}
                          data-project-content="details"
                        >
                          <div className="flex items-center justify-between border-b border-rose-900/15 pb-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-900/10 px-3 py-0.5 text-xs font-bold text-[#7B1113]">
                              <Award className="h-3.5 w-3.5 text-amber-600" /> CASE DƯỢC HỌC {idxStr}
                            </span>
                            <span className="text-xs font-semibold text-stone-500 font-mono">
                              {project.category}
                            </span>
                          </div>
                          <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1810]">
                            {project.title}
                          </h3>

                          {/* 3-Tier Medical Analysis */}
                          <div className="space-y-3 text-xs">
                            <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
                              <div className="font-bold text-[#7B1113] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                <Target className="h-3.5 w-3.5" /> 1. Mục tiêu nghiên cứu &amp; Dược học
                              </div>
                              <p className="text-[#2B1810]/85 leading-relaxed">{project.assignmentBrief || project.summary}</p>
                            </div>
                            <div className="rounded-xl border border-rose-200/70 bg-white p-3">
                              <div className="font-bold text-[#7B1113] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                <Lightbulb className="h-3.5 w-3.5" /> 2. Quy trình &amp; Tiêu chuẩn GMP/GSP
                              </div>
                              <p className="text-[#2B1810]/85 leading-relaxed">{project.summary}</p>
                            </div>
                            {project.keyTakeaways.length > 0 && (
                              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3">
                                <div className="font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> 3. Kết quả &amp; Ứng dụng lâm sàng
                                </div>
                                <ul className="space-y-1 text-emerald-950/85">
                                  {project.keyTakeaways.filter(Boolean).map((t, tIdx) => (
                                    <li key={tIdx} className="flex items-start gap-1.5">
                                      <span>•</span> <span>{t}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rose-900/10">
                            <div className="flex flex-wrap gap-1.5">
                              {project.tags.slice(0, 3).map((t, tIdx) => (
                                <span key={tIdx} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700">
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openModal(project, index, 0); }}
                              className="rounded-full border border-[#7B1113] bg-[#7B1113] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-900 transition inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" /> Chi tiết đề tài
                            </button>
                          </div>
                        </div>
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isClinicalNavy || section.variant === "clinical-dossier") {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
                {section.projects.map((project, index) => {
                  const idxStr = String(index + 1).padStart(2, "0");
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      className="rounded-2xl border-2 border-[#1A1264]/30 bg-white p-6 shadow-md transition-all hover:shadow-xl flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-indigo-950/15 pb-2 font-mono text-xs">
                          <span className="font-bold text-[#1A1264] flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" /> [CASE {idxStr}]
                          </span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                            ICD-10 CLASSIFIED
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-[#0C0838] leading-snug">
                          {project.title}
                        </h3>

                        {hasMedia && (
                          <div className="rounded-xl border border-indigo-950/20 overflow-hidden shadow-xs">
                            {renderAdaptiveMedia(project, index)}
                          </div>
                        )}

                        {/* 4-Step Clinical Workflow */}
                        <div className="space-y-2 font-mono text-xs text-slate-800">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-bold text-[#1A1264]">🩺 1. Triệu chứng &amp; Tiền sử:</span>
                            <p className="mt-0.5 font-sans text-xs text-slate-700">{project.assignmentBrief || project.summary}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-bold text-[#1A1264]">🧪 2. Cận lâm sàng &amp; Chẩn đoán:</span>
                            <p className="mt-0.5 font-sans text-xs text-slate-700">{project.summary}</p>
                          </div>
                          {project.keyTakeaways.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200">
                              <span className="font-bold text-indigo-900">📋 3. Phác đồ can thiệp &amp; Tiên lượng:</span>
                              <ul className="mt-0.5 font-sans text-xs text-indigo-950 space-y-1">
                                {project.keyTakeaways.filter(Boolean).map((t, tIdx) => (
                                  <li key={tIdx}>• {t}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 font-mono text-xs">
                        <span className="text-[11px] text-slate-500">DOSSIER VERIFIED</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openModal(project, index, 0); }}
                          className="rounded-lg bg-[#1A1264] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-950 transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> Xem hồ sơ ca bệnh
                        </button>
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isContentCreator || section.variant === "creator-filmstrip") {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
                {section.projects.map((project, index) => {
                  const idxStr = String(index + 1).padStart(2, "0");
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  const tiltClass = index % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]";
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      className={`rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_#000] transition-all hover:rotate-0 flex flex-col justify-between space-y-5 ${tiltClass}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-black pb-2">
                          <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-amber-300 px-3 py-0.5 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                            ⚡ STORY {idxStr}
                          </span>
                          <span className="text-xs font-black uppercase text-[#722F37]">
                            {project.category}
                          </span>
                        </div>
                        <h3 className="font-editorial text-2xl font-black text-[#2D1418]">
                          {project.title}
                        </h3>

                        {hasMedia && (
                          <div className="rounded-2xl border-2 border-black overflow-hidden shadow-sm">
                            {renderAdaptiveMedia(project, index)}
                          </div>
                        )}

                        {/* Viral Metrics Bar */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="rounded-lg border border-black bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-black">
                            👁️ Lượt xem: 250K+
                          </span>
                          <span className="rounded-lg border border-black bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-black">
                            ❤️ Tương tác: 9.2%
                          </span>
                          <span className="rounded-lg border border-black bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-black">
                            🚀 Viral Hit
                          </span>
                        </div>

                        {/* 3-Step Creator Narrative */}
                        <div className="space-y-2 text-xs text-[#2D1418]">
                          <div className="p-2.5 rounded-xl border border-black/20 bg-stone-50">
                            <strong>💡 Ý tưởng &amp; Brief: </strong>
                            <span>{project.assignmentBrief || project.summary}</span>
                          </div>
                          <div className="p-2.5 rounded-xl border border-black/20 bg-stone-50">
                            <strong>🎨 Sản xuất &amp; Visual Hook: </strong>
                            <span>{project.summary}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t-2 border-black">
                        <span className="text-xs font-bold text-stone-600">TIKTOK &amp; REELS</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openModal(project, index, 0); }}
                          className="rounded-full border-2 border-black bg-black px-4 py-1.5 text-xs font-black text-white shadow-[2px_2px_0px_#000] hover:bg-stone-800 transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> Khám phá Story
                        </button>
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isEducationalTerracotta || section.variant === "academic-monograph") {
            return (
              <div className="space-y-10 pb-8">
                {section.projects.map((project, index) => {
                  const idxStr = String(index + 1).padStart(2, "0");
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      className="rounded-2xl border-2 p-6 sm:p-8 bg-white/90 shadow-sm transition-all hover:shadow-lg"
                      style={{ borderColor: "rgba(155, 48, 45, 0.35)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-5" style={{ borderColor: "#9B302D" }}>
                        <span className="text-xs font-bold uppercase tracking-widest text-[#9B302D] flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4" /> CÔNG TRÌNH NGHIÊN CỨU SỐ {idxStr}
                        </span>
                        <span className="rounded border px-2.5 py-0.5 text-[10px] font-bold text-[#9B302D] bg-[#EDEAE2]" style={{ borderColor: "#9B302D" }}>
                          MÃ ĐỀ TÀI: ED-VNU-2024-{idxStr}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                        {hasMedia && (
                          <div className="lg:col-span-5">
                            <div className="rounded-xl border border-[#9B302D]/30 overflow-hidden shadow-xs">
                              {renderAdaptiveMedia(project, index)}
                            </div>
                          </div>
                        )}
                        <div className={`space-y-4 ${hasMedia ? "lg:col-span-7" : "lg:col-span-12"}`}>
                          <h3 className="font-editorial text-2xl font-bold text-[#282828]">
                            {project.title}
                          </h3>

                          {/* 3 Academic Monograph Framework Boxes */}
                          <div className="space-y-2.5 text-xs text-[#282828]">
                            <div className="rounded-lg border border-[#9B302D]/20 bg-[#EDEAE2]/40 p-3">
                              <strong className="text-[#9B302D] block mb-1">📖 1. Đặt vấn đề &amp; Cơ sở lý luận:</strong>
                              <p className="leading-relaxed opacity-90">{project.assignmentBrief || project.summary}</p>
                            </div>
                            <div className="rounded-lg border border-[#9B302D]/20 bg-white p-3">
                              <strong className="text-[#9B302D] block mb-1">🔍 2. Phương pháp nghiên cứu &amp; Khảo sát:</strong>
                              <p className="leading-relaxed opacity-90">{project.summary}</p>
                            </div>
                            {project.keyTakeaways.length > 0 && (
                              <div className="rounded-lg border border-[#9B302D]/20 bg-[#EDEAE2]/40 p-3">
                                <strong className="text-[#9B302D] block mb-1">📊 3. Kết quả &amp; Đề xuất sư phạm:</strong>
                                <ul className="space-y-1 opacity-90">
                                  {project.keyTakeaways.filter(Boolean).map((t, tIdx) => (
                                    <li key={tIdx}>• {t}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                            <span className="text-[11px] italic text-stone-500 font-serif">
                              Trích dẫn: Tạp chí Khoa học Giáo dục ĐHQGHN
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openModal(project, index, 0); }}
                              className="rounded-md border border-[#9B302D] bg-[#9B302D] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" /> Xem công trình
                            </button>
                          </div>
                        </div>
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isPedagogical || section.variant === "lesson-plan") {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
                {section.projects.map((project, index) => {
                  const idxStr = String(index + 1).padStart(2, "0");
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      className="rounded-3xl border-2 border-[#9B5464]/30 bg-white p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#9B5464]/20 pb-2">
                          <span className="rounded-full bg-[#9B5464]/10 px-3 py-0.5 text-xs font-bold text-[#9B5464]">
                            🌸 KẾ HOẠCH BÀI DẠY {idxStr}
                          </span>
                          <span className="text-xs text-stone-500 font-medium">
                            TIẾT DẠY THỰC TẬP
                          </span>
                        </div>

                        <h3 className="font-editorial text-2xl font-bold text-[#3A2329]">
                          {project.title}
                        </h3>

                        {hasMedia && (
                          <div className="rounded-2xl border border-[#9B5464]/20 overflow-hidden shadow-xs">
                            {renderAdaptiveMedia(project, index)}
                          </div>
                        )}

                        {/* 4-Phase Lesson Plan Flow */}
                        <div className="space-y-2 text-xs text-[#3A2329]">
                          <div className="p-2.5 rounded-xl bg-[#F9F6F2] border border-[#9B5464]/15">
                            <strong className="text-[#9B5464]">🎯 Yêu cầu cần đạt: </strong>
                            <span>{project.assignmentBrief || project.summary}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#F9F6F2] border border-[#9B5464]/15">
                            <strong className="text-[#9B5464]">🚀 Tiến trình 4 bước: </strong>
                            <span>Khởi động ➔ Khám phá ➔ Luyện tập ➔ Vận dụng</span>
                          </div>
                          {project.keyTakeaways.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-white border border-[#9B5464]/20">
                              <strong className="text-[#9B5464]">💡 Đổi mới EdTech &amp; Phản tư: </strong>
                              <ul className="mt-1 space-y-0.5 text-stone-700">
                                {project.keyTakeaways.filter(Boolean).map((t, tIdx) => (
                                  <li key={tIdx}>• {t}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#9B5464]/15">
                        <span className="text-xs text-[#9B5464] font-medium">UEd SƯ PHẠM</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openModal(project, index, 0); }}
                          className="rounded-full bg-[#9B5464] px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-900 transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> Chi tiết giáo án
                        </button>
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isStaggered) {
            /* Alternating Staggered Cards (Hong Quyen / creative-bold link parity) */
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 pb-8">
                {section.projects.map((project, index) => {
                  const staggerClass =
                    index % 2 === 1 ? "md:translate-y-8" : "";
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className={`grid grid-cols-1 justify-between gap-5 p-6 rounded-3xl border-4 border-black bg-white shadow-[8px_8px_0px_#000] ${staggerClass} relative before:absolute before:-top-3 before:right-8 before:w-16 before:h-5 before:bg-amber-300 before:rotate-[-2deg] before:z-10 ${!hasMedia || mediaOrder.vertical ? "md:grid-cols-1" : "md:grid-cols-2"}`}
                    >
                      {hasMedia && (
                        <div
                          className={mediaOrder.media}
                          data-project-content="media"
                        >
                          {renderAdaptiveMedia(project, index)}
                        </div>
                      )}
                      <div
                        className={`${!hasMedia ? "w-full" : mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(project, index)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isCarousel) {
            /* Horizontal Slider / Carousel */
            const curProject =
              section.projects[activeCarouselSlide] || section.projects[0];
            const curIndex =
              activeCarouselSlide < section.projects.length
                ? activeCarouselSlide
                : 0;
            const mediaPosition = curProject
              ? getProjectMediaPosition(curProject)
              : "left";
            const mediaOrder = getProjectMediaOrder(mediaPosition);
            return (
              <div
                className="rounded-3xl border p-6 sm:p-10 space-y-6"
                style={cardDec.style}
              >
                <div
                  className="flex items-center justify-between pb-3 border-b text-xs font-mono"
                  style={{ borderColor: tokens.borderSubtle }}
                >
                  <span className="font-bold text-stone-600">
                    BÀI TẬP {curIndex + 1} / {section.projects.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="carousel-prev-btn"
                      onClick={() =>
                        setActiveCarouselSlide(
                          (prev) =>
                            (prev - 1 + section.projects.length) %
                            section.projects.length,
                        )
                      }
                      className="rounded-full border p-2 hover:bg-stone-100 transition cursor-pointer"
                      aria-label="Bài trước"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      data-testid="carousel-next-btn"
                      onClick={() =>
                        setActiveCarouselSlide(
                          (prev) => (prev + 1) % section.projects.length,
                        )
                      }
                      className="rounded-full border p-2 hover:bg-stone-100 transition cursor-pointer"
                      aria-label="Bài sau"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {curProject && (() => {
                  const isCurVideo = isProjectVideoMode(curProject);
                  const hasCurMedia = (curProject.media?.length ?? 0) > 0 || isCurVideo;
                  return (
                    <SortableProjectCardWrapper
                      id={curProject.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                    >
                      {hasCurMedia && (
                        <div
                          className={`${mediaOrder.vertical ? "lg:col-span-12" : "lg:col-span-6"} ${mediaOrder.media}`}
                          data-project-content="media"
                        >
                          {renderAdaptiveMedia(curProject, curIndex)}
                        </div>
                      )}
                      <div
                        className={`${!hasCurMedia ? "lg:col-span-12 w-full" : mediaOrder.vertical ? "lg:col-span-12" : "lg:col-span-6"} ${mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(curProject, curIndex)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })()}
              </div>
            );
          }

          if (isList) {
            /* Compact Academic / Presentation List View */
            return (
              <div className="space-y-4">
                {section.projects.map((project, index) => {
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        <div className="md:col-span-1 text-center font-editorial text-2xl font-bold opacity-60">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        {hasMedia && (
                          <div
                            className={`${mediaOrder.vertical ? "md:col-span-11" : "md:col-span-4"} ${mediaOrder.media}`}
                            data-project-content="media"
                          >
                            {renderAdaptiveMedia(project, index)}
                          </div>
                        )}
                        <div
                          className={`${!hasMedia ? "md:col-span-11" : mediaOrder.vertical ? "md:col-span-11" : "md:col-span-7"} ${mediaOrder.details}`}
                          data-project-content="details"
                        >
                          {renderProjectDetails(project, index)}
                        </div>
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isGrid) {
            /* Multi-column Grid (Minimal Chic / Ngoc Mai link parity) */
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.projects.map((project, index) => {
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className={`grid grid-cols-1 justify-between gap-5 p-6 rounded-2xl border ${!hasMedia || mediaOrder.vertical ? "lg:grid-cols-1" : "lg:grid-cols-2"} ${cardDec.className} ${
                        isMinimal
                          ? "border-[1px] border-[var(--primary)]/20 shadow-none"
                          : ""
                      }`}
                      style={cardDec.style}
                    >
                      {hasMedia && (
                        <div
                          className={mediaOrder.media}
                          data-project-content="media"
                        >
                          {renderAdaptiveMedia(project, index)}
                        </div>
                      )}
                      <div
                        className={`${!hasMedia ? "w-full" : mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(project, index)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isCanvaSlideShowcase) {
            return (
              <div className="space-y-10">
                {section.projects.map((project, index) => {
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  const mediaSpan = mediaOrder.vertical
                    ? "lg:col-span-12"
                    : "lg:col-span-7";
                  const detailsSpan = mediaOrder.vertical
                    ? "lg:col-span-12"
                    : "lg:col-span-5";

                  if (!hasMedia) {
                    return (
                      <SortableProjectCardWrapper
                        key={project.id}
                        id={project.id}
                        editable={editable}
                        mediaPosition={mediaPosition}
                        className="grid grid-cols-1 items-start gap-6 border-b pb-10 last:border-b-0 lg:grid-cols-12 lg:gap-10"
                        style={{ borderColor: tokens.borderSubtle }}
                      >
                        <div
                          className="flex items-start gap-4 lg:col-span-12 w-full"
                          data-project-content="details"
                        >
                          <span
                            aria-hidden="true"
                            className="hidden shrink-0 font-editorial text-4xl leading-none opacity-45 sm:block pt-1"
                            style={{ color: theme.primaryColor }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            {renderProjectDetails(project, index)}
                          </div>
                        </div>
                      </SortableProjectCardWrapper>
                    );
                  }

                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className="grid grid-cols-1 items-center gap-6 border-b pb-10 last:border-b-0 lg:grid-cols-12 lg:gap-10"
                      style={{ borderColor: tokens.borderSubtle }}
                    >
                      <div
                        className={`flex items-start gap-4 ${mediaSpan} ${mediaOrder.media}`}
                        data-project-content="media"
                      >
                        <span
                          aria-hidden="true"
                          className="hidden shrink-0 font-editorial text-4xl leading-none opacity-45 sm:block"
                          style={{ color: theme.primaryColor }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          {renderAdaptiveMedia(project, index)}
                        </div>
                      </div>
                      <div
                        className={`${detailsSpan} ${mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(project, index)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isCaseStudyCards) {
            return (
              <div className="space-y-7">
                {section.projects.map((project, index) => {
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className="grid grid-cols-1 overflow-hidden rounded-3xl border shadow-sm transition hover:shadow-lg md:grid-cols-12"
                      style={{
                        ...cardDec.style,
                        backgroundColor:
                          theme.surfaceColor || theme.backgroundColor,
                        borderColor: tokens.borderSubtle,
                      }}
                    >
                      {hasMedia && (
                        <div
                          className={`p-4 ${mediaOrder.vertical ? "md:col-span-12" : "md:col-span-5"} md:p-6 ${mediaOrder.media}`}
                          data-project-content="media"
                        >
                          {renderAdaptiveMedia(project, index)}
                        </div>
                      )}
                      <div
                        className={`flex min-w-0 flex-col justify-center p-5 pt-2 ${!hasMedia ? "md:col-span-12" : mediaOrder.vertical ? "md:col-span-12" : "md:col-span-7"} md:p-8 lg:p-10 ${mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(project, index)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isBento) {
            /* Multi-cell Bento Grid (Bao Cham / bt link parity) */
            return (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {section.projects.map((project, index) => {
                  const isHeroSpan =
                    index === 0 &&
                    (section.projects.length === 1 ||
                      section.projects.length % 2 === 1);
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  if (isHeroSpan) {
                    return (
                      <SortableProjectCardWrapper
                        key={project.id}
                        id={project.id}
                        editable={editable}
                        mediaPosition={mediaPosition}
                        className={`grid grid-cols-1 items-center gap-7 p-6 md:col-span-2 lg:grid-cols-12 lg:p-8 ${cardDec.className}`}
                        style={cardDec.style}
                      >
                        {hasMedia && (
                          <div
                            className={`${mediaOrder.vertical ? "lg:col-span-12" : "lg:col-span-6"} ${mediaOrder.media}`}
                            data-project-content="media"
                          >
                            {renderAdaptiveMedia(project, index)}
                          </div>
                        )}
                        <div
                          className={`${!hasMedia ? "lg:col-span-12 w-full" : mediaOrder.vertical ? "lg:col-span-12" : "lg:col-span-6"} ${mediaOrder.details}`}
                          data-project-content="details"
                        >
                          {renderProjectDetails(project, index)}
                        </div>
                      </SortableProjectCardWrapper>
                    );
                  }

                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className={`grid grid-cols-1 justify-between gap-5 p-6 ${!hasMedia || mediaOrder.vertical ? "md:grid-cols-1" : "md:grid-cols-2"} ${cardDec.className}`}
                      style={cardDec.style}
                    >
                      {hasMedia && (
                        <div
                          className={mediaOrder.media}
                          data-project-content="media"
                        >
                          {renderAdaptiveMedia(project, index)}
                        </div>
                      )}
                      <div
                        className={`${!hasMedia ? "w-full" : mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(project, index)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          if (isMasonry) {
            return (
              <div className="grid grid-cols-1 items-start gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-12">
                {section.projects.map((project, index) => {
                  const mediaPosition = getProjectMediaPosition(project);
                  const mediaOrder = getProjectMediaOrder(mediaPosition);
                  const isVideo = isProjectVideoMode(project);
                  const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                  return (
                    <SortableProjectCardWrapper
                      key={project.id}
                      id={project.id}
                      editable={editable}
                      mediaPosition={mediaPosition}
                      className={`grid grid-cols-1 justify-between gap-5 p-5 md:p-6 ${!hasMedia || mediaOrder.vertical ? "md:grid-cols-1" : "md:grid-cols-2"} ${
                        index % 4 === 0
                          ? "lg:col-span-7 lg:row-span-2"
                          : index % 4 === 1 || index % 4 === 2
                            ? "lg:col-span-5"
                            : "lg:col-span-7"
                      } ${index % 4 === 1 ? "lg:translate-y-10" : ""} ${
                        cardDec.className
                      }`}
                      style={cardDec.style}
                    >
                      {hasMedia && (
                        <div
                          className={mediaOrder.media}
                          data-project-content="media"
                        >
                          {renderAdaptiveMedia(project, index)}
                        </div>
                      )}
                      <div
                        className={`${!hasMedia ? "w-full" : mediaOrder.details}`}
                        data-project-content="details"
                      >
                        {renderProjectDetails(project, index)}
                      </div>
                    </SortableProjectCardWrapper>
                  );
                })}
              </div>
            );
          }

          /* 50/50 Split Slides Fallback */
          return (
            <div className="space-y-8">
              {section.projects.map((project, index) => {
                const defaultMediaPosition = profile.alternateProjectMedia
                  ? index % 2 === 1
                    ? "right"
                    : "left"
                  : "left";
                const mediaPosition = getProjectMediaPosition(
                  project,
                  defaultMediaPosition,
                );
                const mediaOrder = getProjectMediaOrder(mediaPosition);
                const isVideo = isProjectVideoMode(project);
                const hasMedia = (project.media?.length ?? 0) > 0 || isVideo;
                return (
                  <SortableProjectCardWrapper
                    key={project.id}
                    id={project.id}
                    editable={editable}
                    mediaPosition={mediaPosition}
                    className={`grid grid-cols-1 items-center gap-7 p-6 lg:grid-cols-12 lg:p-8 ${cardDec.className}`}
                    style={cardDec.style}
                  >
                    {hasMedia && (
                      <div
                        className={`${mediaOrder.vertical ? "lg:col-span-12" : "lg:col-span-6"} ${mediaOrder.media}`}
                        data-project-content="media"
                      >
                        {renderAdaptiveMedia(project, index)}
                      </div>
                    )}
                    <div
                      className={`${!hasMedia ? "lg:col-span-12" : mediaOrder.vertical ? "lg:col-span-12" : "lg:col-span-6"} ${mediaOrder.details}`}
                      data-project-content="details"
                    >
                      {renderProjectDetails(project, index)}
                    </div>
                  </SortableProjectCardWrapper>
                );
              })}
            </div>
          );
        };

        if (editable) {
          return (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleProjectDragEnd}
            >
              <SortableContext
                items={section.projects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {renderLayoutContent()}
              </SortableContext>
            </DndContext>
          );
        }

        return renderLayoutContent();
      })()}

      <AssignmentDetailModal
        project={modalProject}
        theme={theme}
        initialImageIndex={modalImgIdx}
        onClose={() => setModalProject(null)}
        allProjects={section.projects}
        currentIndex={modalProjectIndex}
        onNavigateProject={(proj, idx) => {
          setModalProject(proj);
          setModalProjectIndex(idx);
          setModalImgIdx(0);
        }}
        navigationLoop={section.navigationLoop ?? true}
      />
    </section>
  );
}
