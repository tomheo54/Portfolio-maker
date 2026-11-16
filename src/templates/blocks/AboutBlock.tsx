"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  GraduationCap,
  Target,
  Compass,
  GripVertical,
  RefreshCw,
  LayoutTemplate,
  CheckCircle2,
  Link2,
  Award,
  BookOpen,
  Activity,
  Trash2,
  Plus,
  X,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  AboutContactItem,
  AboutSection,
  ProfileOwner,
  TemplateId,
  ThemeConfig,
} from "@/schema/portfolio.schema";
import { AvatarFrame } from "@/components/visual-primitives/AvatarFrame";
import {
  formatSectionEyebrow,
  getArchetypeDefaultVariants,
  getCardDecoration,
  getThemeTokens,
} from "@/templates/archetypes/archetypeStyles";
import { CanvaFourPointStar, CanvaVerticalMusicRibbon } from "./CanvaOrnaments";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { InlineEditableText } from "@/components/studio/InlineEditableText";

const CONTACT_ITEM_ICONS: Record<AboutContactItem["icon"], LucideIcon> = {
  mail: Mail,
  phone: Phone,
  pin: MapPin,
  globe: Globe,
  link: Link2,
};

function safeContactHref(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^(mailto:|tel:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return undefined;
  return `https://${trimmed}`;
}

export interface AboutBlockProps {
  section: AboutSection;
  theme: ThemeConfig;
  archetypeId?: TemplateId;
  avatarUrl?: string;
  avatarAlt?: string;
  educationInfo?: { school: string; degree: string };
  profileOwner?: ProfileOwner;
  learningGoals?: string;
  portfolioObjective?: string;
  editable?: boolean;
  sectionIndex?: number;
}

// Reusable Sortable Card Wrapper for Canvas Drag-and-Drop
function SortableAboutCardItem({
  id,
  children,
  editable,
  onResize,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  editable: boolean;
  onResize: (id: string, dimension: "width" | "height", delta: number) => void;
  className?: string;
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
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`about-card-${id}`}
      className={`relative group ${className} ${
        isDragging ? "ring-2 ring-amber-500 shadow-2xl rounded-2xl" : ""
      }`}
    >
      {editable && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white/95 p-0.5 shadow-sm">
          <button
            type="button"
            {...attributes}
            {...listeners}
            data-testid={`drag-handle-about-${id}`}
            aria-label={`Kéo ô ${id} đến vị trí khác`}
            className="inline-flex cursor-grab touch-none items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-amber-50 active:cursor-grabbing"
            title="Kéo thả đổi vị trí ô này"
          >
            <GripVertical className="h-3 w-3" />
            Kéo
          </button>
          <AboutCardResizeControls id={id} onResize={onResize} />
        </div>
      )}
      {children}
    </div>
  );
}

type AboutCardPosition = {
  column: number;
  row: number;
  width: number;
  height: number;
};

const ABOUT_CARD_FRAME_PRESETS = {
  soft: "rounded-2xl border p-5 shadow-sm transition hover:shadow-md",
  glass:
    "rounded-3xl border p-5 shadow-lg backdrop-blur-md transition hover:shadow-xl",
  outline: "rounded-2xl border-2 p-5 shadow-none transition",
  editorial:
    "rounded-none border-y-0 border-r-0 border-l-4 p-5 shadow-none transition",
  elevated: "rounded-3xl border p-6 shadow-xl transition hover:-translate-y-1",
  dashed: "rounded-2xl border-2 border-dashed p-5 shadow-none transition",
} as const;

const DEFAULT_ABOUT_CARD_POSITIONS: Record<string, AboutCardPosition> = {
  contact: { column: 0, row: 0, width: 7, height: 7 },
  education: { column: 7, row: 0, width: 5, height: 3 },
  learningGoals: { column: 7, row: 3, width: 5, height: 4 },
};

function AboutCardResizeControls({
  id,
  onResize,
}: {
  id: string;
  onResize: (id: string, dimension: "width" | "height", delta: number) => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label={`Thu hẹp ô ${id}`}
        onClick={() => onResize(id, "width", -1)}
        className="rounded px-1 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100"
      >
        W−
      </button>
      <button
        type="button"
        aria-label={`Mở rộng ô ${id}`}
        onClick={() => onResize(id, "width", 1)}
        className="rounded px-1 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100"
      >
        W+
      </button>
      <button
        type="button"
        aria-label={`Rút ngắn ô ${id}`}
        onClick={() => onResize(id, "height", -1)}
        className="rounded px-1 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100"
      >
        H−
      </button>
      <button
        type="button"
        aria-label={`Kéo dài ô ${id}`}
        onClick={() => onResize(id, "height", 1)}
        className="rounded px-1 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-100"
      >
        H+
      </button>
    </>
  );
}

function FreePositionAboutCardItem({
  id,
  position,
  children,
  onResize,
  editable,
}: {
  id: string;
  position: AboutCardPosition;
  children: React.ReactNode;
  onResize: (id: string, dimension: "width" | "height", delta: number) => void;
  editable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, disabled: !editable });

  const style: React.CSSProperties = {
    gridColumn: `${position.column + 1} / span ${position.width}`,
    gridRow: `${position.row + 1} / span ${position.height}`,
    minHeight: `${position.height * 48 + (position.height - 1) * 16}px`,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`about-card-${id}`}
      data-about-card={id}
      className={`group relative ${isDragging ? "rounded-2xl ring-2 ring-amber-500 shadow-2xl" : ""}`}
    >
      {editable && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white/95 p-0.5 shadow-sm">
          <button
            type="button"
            {...attributes}
            {...listeners}
            data-testid={`drag-handle-about-${id}`}
            aria-label={`Kéo ô ${id} đến vị trí khác`}
            className="inline-flex cursor-grab touch-none items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-amber-50 active:cursor-grabbing"
          >
            <GripVertical className="h-3 w-3" />
            Kéo
          </button>
          <AboutCardResizeControls id={id} onResize={onResize} />
        </div>
      )}
      {children}
    </div>
  );
}

function InlineAboutText({
  value,
  editable,
  ariaLabel,
  className = "",
  multiline = false,
  placeholder,
  onSave,
}: {
  value: string;
  editable: boolean;
  ariaLabel: string;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  return (
    <InlineEditableText
      value={value}
      editable={editable}
      ariaLabel={ariaLabel}
      className={className}
      multiline={multiline}
      placeholder={placeholder}
      onSave={onSave}
    />
  );
}

function AboutHighlightValue({
  value,
  color,
  editable,
  ariaLabel,
  onSave,
}: {
  value: string;
  color: string;
  editable: boolean;
  ariaLabel: string;
  onSave: (value: string) => void;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    const measureOverflow = () => {
      const distance = Math.max(
        0,
        Math.ceil(text.scrollWidth - container.clientWidth),
      );
      setOverflowDistance((current) =>
        current === distance ? current : distance,
      );
    };

    measureOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOverflow);
      return () => window.removeEventListener("resize", measureOverflow);
    }

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(container);
    observer.observe(text);
    return () => observer.disconnect();
  }, [value]);

  const style: React.CSSProperties & {
    "--about-marquee-distance"?: string;
    "--about-marquee-duration"?: string;
  } = {
    color,
    ...(overflowDistance > 0
      ? {
          "--about-marquee-distance": `-${overflowDistance}px`,
          "--about-marquee-duration": `${Math.max(4, overflowDistance / 24)}s`,
        }
      : {}),
  };

  return (
    <span
      ref={containerRef}
      className="about-highlight-value mt-1 block w-full text-lg font-bold font-editorial focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={style}
      tabIndex={overflowDistance > 0 ? 0 : undefined}
    >
      <span
        ref={textRef}
        contentEditable={editable}
        suppressContentEditableWarning
        role={editable ? "textbox" : undefined}
        aria-label={editable ? ariaLabel : undefined}
        onBlur={(event) => {
          if (!editable) return;
          const nextValue = event.currentTarget.textContent?.trim() ?? "";
          if (nextValue !== value) onSave(nextValue);
        }}
        className={`about-highlight-value__text${overflowDistance > 0 ? " is-overflowing" : ""}`}
      >
        {value}
      </span>
    </span>
  );
}

export function AboutBlock({
  section,
  theme,
  archetypeId = "canva-editorial",
  avatarUrl,
  avatarAlt,
  educationInfo,
  profileOwner,
  learningGoals,
  portfolioObjective,
  editable = false,
  sectionIndex,
}: AboutBlockProps) {
  const swapAboutLayout = usePortfolioStore((s) => s.swapAboutLayout);
  const reorderAboutCards = usePortfolioStore((s) => s.reorderAboutCards);
  const updateSection = usePortfolioStore((s) => s.updateSection);
  const freeGridRef = useRef<HTMLDivElement | null>(null);
  const { setNodeRef: setFreeGridDropRef } = useDroppable({
    id: "about-free-grid",
  });

  const updateAbout = (patch: Partial<AboutSection>) => {
    if (sectionIndex === undefined) return;
    updateSection(sectionIndex, { ...section, ...patch });
  };

  const updateCustomText = (key: string, value: string) => {
    updateAbout({
      customTexts: {
        ...section.customTexts,
        [key]: value,
      },
    });
  };

  const getCardPosition = (cardId: string): AboutCardPosition =>
    section.cardPositions?.[cardId] ??
    DEFAULT_ABOUT_CARD_POSITIONS[cardId] ?? {
      column: 0,
      row: 0,
      width: 4,
      height: 3,
    };

  const resizeAboutCard = (
    cardId: string,
    dimension: "width" | "height",
    delta: number,
  ) => {
    const positions = {
      ...DEFAULT_ABOUT_CARD_POSITIONS,
      ...section.cardPositions,
    };
    const current = positions[cardId] ?? getCardPosition(cardId);
    const nextSize = Math.max(
      1,
      Math.min(dimension === "width" ? 12 : 12, current[dimension] + delta),
    );
    const nextPosition = {
      ...current,
      [dimension]: nextSize,
    };
    if (dimension === "width") {
      nextPosition.column = Math.min(
        nextPosition.column,
        12 - nextPosition.width,
      );
    }

    const resolvedPositions = { ...positions, [cardId]: nextPosition };
    const placedPositions: Record<string, AboutCardPosition> = {
      [cardId]: nextPosition,
    };
    for (const otherId of cardOrder.filter((id) => id !== cardId)) {
      const candidate = { ...resolvedPositions[otherId] };
      let attempts = 0;
      while (
        Object.values(placedPositions).some(
          (placed) =>
            candidate.column < placed.column + placed.width &&
            candidate.column + candidate.width > placed.column &&
            candidate.row < placed.row + placed.height &&
            candidate.row + candidate.height > placed.row,
        ) &&
        attempts < 100
      ) {
        candidate.row += 1;
        attempts += 1;
      }
      placedPositions[otherId] = candidate;
    }

    updateAbout({ cardPositions: placedPositions });
  };

  const [activeTab, setActiveTab] = useState<
    "bio" | "contact" | "education" | "goals"
  >("bio");

  const cardDec = getCardDecoration(archetypeId, theme);
  const tokens = getThemeTokens(theme);
  const isMinimal =
    archetypeId === "framer-minimal" || archetypeId === "minimal-chic";
  const isTerminal = archetypeId === "tech-developer";
  const isGrowth = archetypeId === "growth-marketer";
  const isCreative =
    archetypeId === "creative-showcase" || archetypeId === "creative-bold";
  const isWarmEditorial = archetypeId === "warm-editorial";
  const isOrganic =
    archetypeId === "artistic-organic" || section.variant === "organic";
  const isAcademic =
    archetypeId === "academic-presentation" || section.variant === "timeline";
  const isMedicalRuby =
    archetypeId === "medical-ruby" || section.variant === "medical-license";
  const isClinicalNavy =
    archetypeId === "clinical-navy" || section.variant === "clinical-dossier";
  const isPedagogical =
    archetypeId === "pedagogical-mauve" ||
    archetypeId === "pedagogical-rose" ||
    section.variant === "pedagogical-journal";
  const isContentCreator =
    archetypeId === "content-creator" || section.variant === "creator-profile";
  const isOceanicTeal = archetypeId === "oceanic-teal";
  const isEducationalTerracotta =
    archetypeId === "educational-terracotta" ||
    section.variant === "academic-cv";
  const isPedagogicalRose = archetypeId === "pedagogical-rose";

  // Resolved Profile Values
  const effectiveAvatarUrl = profileOwner?.avatarUrl || avatarUrl;
  const showAboutAvatar =
    section.showAvatar !== false && Boolean(effectiveAvatarUrl?.trim());
  const effectiveAvatarName =
    profileOwner?.fullName || avatarAlt || section.title || "Student Portrait";
  const effectiveFrameStyle =
    profileOwner?.frameStyle ||
    (archetypeId === "canva-editorial" ||
    archetypeId === "medical-ruby" ||
    archetypeId === "content-creator" ||
    archetypeId === "educational-terracotta" ||
    archetypeId === "warm-editorial"
      ? "arch-window"
      : archetypeId === "pedagogical-mauve"
        ? "polaroid"
        : archetypeId === "artistic-organic"
          ? "cutout-blob"
          : "rounded-rect");
  const effectiveAspectRatio = profileOwner?.aspectRatio || "3/4";


  // Resolved Profile Values
  // INF2501 Rubric Content Resolution
  const resolvedLearningGoals =
    learningGoals || section.learningGoals || profileOwner?.learningGoals;
  const resolvedPortfolioObjective =
    portfolioObjective ||
    section.portfolioObjective ||
    profileOwner?.portfolioObjective;

  const eduSchool =
    section.educationSchool ||
    educationInfo?.school ||
    section.highlights.find((h) =>
      /trường|đại học|học viện|education|school/i.test(h.label),
    )?.value ||
    "Trường Đại học";
  const eduDegree =
    section.educationDegree ||
    educationInfo?.degree ||
    section.highlights.find((h) =>
      /ngành|khoa|chuyên ngành|degree|major/i.test(h.label),
    )?.value ||
    "Chuyên ngành Đào tạo";
  const updateContactInfo = (
    field: "email" | "phone" | "location" | "website",
    value: string,
  ) => {
    updateAbout({
      contactInfo: {
        ...section.contactInfo,
        [field]: value || undefined,
      },
    });
  };
  const hiddenContactFields = section.contactInfo.hiddenFields ?? [];
  const updateEducationInfo = (
    field: "educationSchool" | "educationDegree" | "educationPeriod",
    value: string,
  ) => updateAbout({ [field]: value });
  const updateHighlight = (
    index: number,
    patch: Partial<AboutSection["highlights"][number]>,
  ) => {
    const highlights = [...section.highlights];
    const current = highlights[index];
    if (!current) return;
    highlights[index] = { ...current, ...patch };
    updateAbout({ highlights });
  };
  const cardTitle = (
    id: "contact" | "education" | "learningGoals" | "portfolioObjective",
    fallback: string,
  ) => section.cardTitles?.[id] || fallback;
  const customCardFrame =
    section.cardFrame && section.cardFrame !== "template"
      ? section.cardFrame
      : undefined;
  const cardFrameClass = customCardFrame
    ? ABOUT_CARD_FRAME_PRESETS[customCardFrame]
    : undefined;
  const cardFrameStyle: React.CSSProperties = customCardFrame
    ? {
        backgroundColor:
          customCardFrame === "glass"
            ? `color-mix(in srgb, var(--section-surface-color, ${theme.surfaceColor}) 78%, transparent)`
            : `var(--section-surface-color, ${theme.surfaceColor})`,
        borderColor:
          customCardFrame === "outline" || customCardFrame === "dashed"
            ? theme.primaryColor
            : tokens.borderSubtle,
        borderLeftColor:
          customCardFrame === "editorial" ? theme.primaryColor : undefined,
      }
    : {};
  const cardBodyFontStyle: React.CSSProperties = section.cardBodyFont
    ? {
        fontFamily: `"${section.cardBodyFont.replaceAll('"', "")}", sans-serif`,
      }
    : {};
  const cardHeadingFontStyle: React.CSSProperties = section.cardHeadingFont
    ? {
        fontFamily: `"${section.cardHeadingFont.replaceAll('"', "")}", sans-serif`,
      }
    : {};

  // Inverted / position layout check
  const mediaPos = section.mediaPosition ?? (section.layoutInverted ? "left" : "right");
  const isInverted = mediaPos === "left";
  const isTop = mediaPos === "top";
  const isBottom = mediaPos === "bottom";

  // Card order resolution
  const visibleCardIds = new Set(["contact", "education", "learningGoals"]);
  const configuredCardOrder = (
    section.cardOrder && section.cardOrder.length > 0
      ? section.cardOrder
      : ["contact", "education", "learningGoals"]
  ).filter((cardId) => visibleCardIds.has(cardId));
  const cardOrder =
    configuredCardOrder.length > 0
      ? configuredCardOrder
      : ["contact", "education", "learningGoals"];
  const defaultVariants = getArchetypeDefaultVariants(archetypeId);
  const activeLayout = section.variant || defaultVariants.about;
  const isFreeLayout = Boolean(section.cardPositions);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cardOrder.indexOf(String(active.id));
    const newIndex = cardOrder.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderAboutCards(oldIndex, newIndex);
    }
  };

  const setFreeGridRef = (node: HTMLDivElement | null) => {
    freeGridRef.current = node;
    setFreeGridDropRef(node);
  };

  const handleFreeDragEnd = (event: DragEndEvent) => {
    const cardId = String(event.active.id);
    const initialRect = event.active.rect.current.initial;
    const gridRect = freeGridRef.current?.getBoundingClientRect();
    if (!initialRect || !gridRect) return;

    const currentPosition = getCardPosition(cardId);
    const centerX = initialRect.left + event.delta.x + initialRect.width / 2;
    const centerY = initialRect.top + event.delta.y + initialRect.height / 2;
    const columnWidth = gridRect.width / 12;
    const nextPosition: AboutCardPosition = {
      ...currentPosition,
      column: Math.max(
        0,
        Math.min(
          12 - currentPosition.width,
          Math.floor(
            (centerX - gridRect.left) / columnWidth - currentPosition.width / 2,
          ),
        ),
      ),
      row: Math.max(
        0,
        Math.min(
          100 - currentPosition.height,
          Math.floor(
            (centerY - gridRect.top) / 64 - currentPosition.height / 2,
          ),
        ),
      ),
    };

    const positions = {
      ...DEFAULT_ABOUT_CARD_POSITIONS,
      ...section.cardPositions,
    };
    let attempts = 0;
    while (
      Object.entries(positions).some(([otherId, other]) => {
        if (otherId === cardId) return false;
        return (
          nextPosition.column < other.column + other.width &&
          nextPosition.column + nextPosition.width > other.column &&
          nextPosition.row < other.row + other.height &&
          nextPosition.row + nextPosition.height > other.row
        );
      }) &&
      attempts < 100
    ) {
      nextPosition.row += 1;
      attempts += 1;
    }
    nextPosition.row = Math.min(100 - nextPosition.height, nextPosition.row);
    updateAbout({ cardPositions: { ...positions, [cardId]: nextPosition } });
  };

  // Card Renderers
  const renderCardById = (cardId: string) => {
    switch (cardId) {
      case "contact":
        return (
          <div
            data-about-frame={customCardFrame ?? "template"}
            className={`h-full ${
              cardFrameClass ??
              `rounded-2xl border p-5 transition hover:shadow-md ${
                isCreative
                  ? "border-2 border-black bg-white shadow-[4px_4px_0px_#000]"
                  : isMinimal
                    ? "border-[1px] border-[var(--primary)]/20"
                    : isOrganic
                      ? "rounded-[2rem] border-[var(--primary)]/20"
                      : ""
              }`
            }`}
            style={{
              ...cardFrameStyle,
              ...(customCardFrame
                ? cardBodyFontStyle
                : {
                    backgroundColor: isCreative
                      ? "var(--section-surface-color, #FFFFFF)"
                      : `var(--section-surface-color, ${theme.backgroundColor})`,
                    borderColor: isCreative ? undefined : tokens.borderSubtle,
                    ...cardBodyFontStyle,
                  }),
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                1
              </span>
              <h4
                className="font-editorial text-base font-bold"
                style={cardHeadingFontStyle}
              >
                <InlineAboutText
                  value={cardTitle("contact", "Thông tin liên hệ")}
                  editable={editable}
                  ariaLabel="Tiêu đề ô liên hệ"
                  onSave={(value) =>
                    updateAbout({
                      cardTitles: { ...section.cardTitles, contact: value },
                    })
                  }
                />
              </h4>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              {(section.contactInfo.email || editable) && !hiddenContactFields.includes("email") && (
                <a
                  href={
                    section.contactInfo.email
                      ? `mailto:${section.contactInfo.email}`
                      : undefined
                  }
                  onClick={(event) => {
                    if (editable) event.preventDefault();
                  }}
                  className="flex items-center gap-2 truncate opacity-85 hover:underline"
                >
                  <Mail
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: theme.primaryColor }}
                  />
                  <InlineAboutText
                    value={section.contactInfo.email ?? "Thêm email"}
                    editable={editable}
                    ariaLabel="Email trong ô liên hệ"
                    className="truncate"
                    onSave={(value) => updateContactInfo("email", value)}
                  />
                </a>
              )}
              {(section.contactInfo.phone || editable) && !hiddenContactFields.includes("phone") && (
                <div className="flex items-center gap-2 opacity-85">
                  <Phone
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: theme.primaryColor }}
                  />
                  <InlineAboutText
                    value={section.contactInfo.phone ?? "Thêm số điện thoại"}
                    editable={editable}
                    ariaLabel="Số điện thoại trong ô liên hệ"
                    onSave={(value) => updateContactInfo("phone", value)}
                  />
                </div>
              )}
              {(section.contactInfo.location || editable) && !hiddenContactFields.includes("location") && (
                <div className="flex items-center gap-2 opacity-85">
                  <MapPin
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: theme.primaryColor }}
                  />
                  <InlineAboutText
                    value={section.contactInfo.location ?? "Thêm địa điểm"}
                    editable={editable}
                    ariaLabel="Địa điểm trong ô liên hệ"
                    onSave={(value) => updateContactInfo("location", value)}
                  />
                </div>
              )}
              {(section.contactInfo.website || editable) && !hiddenContactFields.includes("website") && (
                <a
                  href={section.contactInfo.website || undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (editable) event.preventDefault();
                  }}
                  className="flex items-center gap-2 opacity-85 hover:underline"
                >
                  <Globe
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: theme.primaryColor }}
                  />
                  <InlineAboutText
                    value={section.contactInfo.website ?? "Portfolio Web"}
                    editable={editable}
                    ariaLabel="Liên kết website trong ô liên hệ"
                    onSave={(value) => updateContactInfo("website", value)}
                  />
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              )}
              {(section.contactInfo.customItems ?? []).map((item) => {
                const Icon = CONTACT_ITEM_ICONS[item.icon] ?? Link2;
                const href = safeContactHref(item.href);
                const content = (
                  <>
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: theme.primaryColor }} />
                    <span className="min-w-0 truncate">
                      {item.label ? `${item.label}: ` : ""}{item.value}
                    </span>
                    {href && <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />}
                  </>
                );
                return href ? (
                  <a
                    key={item.id}
                    href={href}
                    target={/^https?:\/\//i.test(href) ? "_blank" : undefined}
                    rel={/^https?:\/\//i.test(href) ? "noreferrer" : undefined}
                    onClick={(event) => { if (editable) event.preventDefault(); }}
                    className="flex items-center gap-2 truncate opacity-85 hover:underline"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={item.id} className="flex items-center gap-2 truncate opacity-85">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "education":
        return (
          <div
            data-about-frame={customCardFrame ?? "template"}
            className={`h-full ${
              cardFrameClass ??
              `rounded-2xl border p-5 transition hover:shadow-md ${
                isCreative
                  ? "border-2 border-black bg-white shadow-[4px_4px_0px_#000]"
                  : isMinimal
                    ? "border-[1px] border-[var(--primary)]/20"
                    : isOrganic
                      ? "rounded-[2rem] border-[var(--primary)]/20"
                      : ""
              }`
            }`}
            style={{
              ...cardFrameStyle,
              ...(customCardFrame
                ? cardBodyFontStyle
                : {
                    backgroundColor: isCreative
                      ? "var(--section-surface-color, #FFFFFF)"
                      : `var(--section-surface-color, ${theme.backgroundColor})`,
                    borderColor: isCreative ? undefined : tokens.borderSubtle,
                    ...cardBodyFontStyle,
                  }),
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                2
              </span>
              <h4
                className="font-editorial text-base font-bold"
                style={cardHeadingFontStyle}
              >
                <InlineAboutText
                  value={cardTitle("education", "Học vấn & Đào tạo")}
                  editable={editable}
                  ariaLabel="Tiêu đề ô học vấn"
                  onSave={(value) =>
                    updateAbout({
                      cardTitles: { ...section.cardTitles, education: value },
                    })
                  }
                />
              </h4>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <GraduationCap
                  className="h-4 w-4 shrink-0 mt-0.5"
                  style={{ color: theme.primaryColor }}
                />
                <div>
                  <p className="font-bold">
                    <InlineAboutText
                      value={eduSchool}
                      editable={editable}
                      ariaLabel="Tên trường trong ô học vấn"
                      onSave={(value) =>
                        updateEducationInfo("educationSchool", value)
                      }
                    />
                  </p>
                  <p className="opacity-75">
                    <InlineAboutText
                      value={eduDegree}
                      editable={editable}
                      ariaLabel="Ngành học trong ô học vấn"
                      onSave={(value) =>
                        updateEducationInfo("educationDegree", value)
                      }
                    />
                  </p>
                </div>
              </div>
              <p className="pt-1 text-[11px] font-semibold text-stone-500">
                <InlineAboutText
                  value={
                    section.educationPeriod ?? "Khoá K18 • Học phần INF2501"
                  }
                  editable={editable}
                  ariaLabel="Thông tin khóa học trong ô học vấn"
                  onSave={(value) =>
                    updateEducationInfo("educationPeriod", value)
                  }
                />
              </p>
            </div>
          </div>
        );

      case "learningGoals":
        return (
          <div
            data-about-frame={customCardFrame ?? "template"}
            className={`h-full ${
              cardFrameClass ??
              `rounded-2xl border p-5 transition hover:shadow-md ${
                isCreative
                  ? "border-2 border-black bg-white shadow-[4px_4px_0px_#000]"
                  : isMinimal
                    ? "border-[1px] border-[var(--primary)]/20"
                    : isOrganic
                      ? "rounded-[2rem] border-[var(--primary)]/20"
                      : ""
              }`
            }`}
            style={{
              ...cardFrameStyle,
              ...(customCardFrame
                ? cardBodyFontStyle
                : {
                    backgroundColor: isCreative
                      ? "var(--section-surface-color, #FFFFFF)"
                      : `var(--section-surface-color, ${theme.backgroundColor})`,
                    borderColor: isCreative ? undefined : tokens.borderSubtle,
                    ...cardBodyFontStyle,
                  }),
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target
                  className="h-4 w-4"
                  style={{ color: theme.primaryColor }}
                />
                <h4
                  className="font-editorial text-base font-bold"
                  style={cardHeadingFontStyle}
                >
                  <InlineAboutText
                    value={cardTitle(
                      "learningGoals",
                      "Mục tiêu học tập & phát triển (INF2501)",
                    )}
                    editable={editable}
                    ariaLabel="Tiêu đề mục tiêu học tập"
                    onSave={(value) =>
                      updateAbout({
                        cardTitles: {
                          ...section.cardTitles,
                          learningGoals: value,
                        },
                      })
                    }
                  />
                </h4>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Rubric
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed opacity-85">
              <InlineAboutText
                value={
                  resolvedLearningGoals ||
                  "Vận dụng thành thạo AI tạo sinh và thiết kế số vào giảng dạy thực tiễn."
                }
                editable={editable}
                ariaLabel="Mục tiêu học tập"
                onSave={(value) => updateAbout({ learningGoals: value })}
              />
            </p>
            <div
              className="mt-4 border-t pt-3"
              style={{ borderColor: tokens.borderSubtle }}
            >
              <h5
                className="font-editorial text-xs font-bold text-amber-800"
                style={cardHeadingFontStyle}
              >
                <InlineAboutText
                  value={cardTitle(
                    "portfolioObjective",
                    "Mục tiêu của Portfolio",
                  )}
                  editable={editable}
                  ariaLabel="Tiêu đề mục tiêu Portfolio"
                  onSave={(value) =>
                    updateAbout({
                      cardTitles: {
                        ...section.cardTitles,
                        portfolioObjective: value,
                      },
                    })
                  }
                />
              </h5>
              <p className="mt-1 text-xs opacity-85">
                <InlineAboutText
                  value={
                    resolvedPortfolioObjective ||
                    "Tổng hợp toàn bộ học liệu, bài tập và minh chứng năng lực ứng dụng AI."
                  }
                  editable={editable}
                  ariaLabel="Mục tiêu Portfolio"
                  onSave={(value) => updateAbout({ portfolioObjective: value })}
                />
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderCardLayout = (layout: Exclude<typeof activeLayout, "tabs">) => {
    if (layout === "medical-license") {
      return (
        <div data-testid="about-layout-content" data-layout="medical-license" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div
              className="lg:col-span-7 rounded-3xl border-2 p-6 sm:p-8 bg-white/95 shadow-md flex flex-col justify-between"
              style={{
                borderColor: `${theme.primaryColor}55`,
                boxShadow: `0 10px 30px -10px ${theme.primaryColor}25`,
              }}
            >
              <div className="space-y-4">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold text-white shadow-xs"
                    style={{
                      backgroundColor: theme.primaryColor,
                      borderColor: `${theme.primaryColor}80`,
                    }}
                  >
                    <Award className="h-3.5 w-3.5 text-amber-300" />
                    <InlineEditableText
                      value={section.customTexts?.med_badge || "HỒ SƠ HÀNH NGHỀ DƯỢC • CHUẨN GMP/GSP"}
                      editable={editable}
                      ariaLabel="Huy hiệu hành nghề dược"
                      onSave={(val) => updateCustomText("med_badge", val)}
                    />
                  </span>
                  <span
                    className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md border"
                    style={{
                      color: theme.primaryColor,
                      backgroundColor: `${theme.primaryColor}12`,
                      borderColor: `${theme.primaryColor}30`,
                    }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.med_license || "LICENSE: #VN-PHARM-8892"}
                      editable={editable}
                      ariaLabel="Mã số chứng chỉ hành nghề"
                      onSave={(val) => updateCustomText("med_license", val)}
                    />
                  </span>
                </div>

                <div>
                  <h3 className="font-editorial text-2xl font-bold" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={section.customTexts?.med_title || "Dược sĩ Chuyên khoa & Nghiên cứu Phát triển (R&D)"}
                      editable={editable}
                      ariaLabel="Tiêu đề chuyên khoa dược"
                      onSave={(val) => updateCustomText("med_title", val)}
                    />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed opacity-85" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={
                        section.biography ||
                        "Dược sĩ phụ trách kiểm soát chất lượng, nghiên cứu tối ưu hóa công thức bào chế theo tiêu chuẩn GMP-WHO và Dược điển Việt Nam V."
                      }
                      editable={editable}
                      multiline
                      ariaLabel="Tiểu sử dược sĩ"
                      onSave={(val) => updateAbout({ biography: val })}
                    />
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      borderColor: `${theme.primaryColor}30`,
                      backgroundColor: `${theme.primaryColor}0a`,
                    }}
                  >
                    <span className="font-bold block mb-1" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.med_feat1_title || "🔬 Bào chế & Độc học"}
                        editable={editable}
                        ariaLabel="Tiêu đề chuyên môn 1"
                        onSave={(val) => updateCustomText("med_feat1_title", val)}
                      />
                    </span>
                    <span className="text-stone-700">
                      <InlineEditableText
                        value={section.customTexts?.med_feat1_desc || "Công nghệ nano sinh học, viên nén giải phóng biến đổi"}
                        editable={editable}
                        ariaLabel="Mô tả chuyên môn 1"
                        onSave={(val) => updateCustomText("med_feat1_desc", val)}
                      />
                    </span>
                  </div>
                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      borderColor: `${theme.primaryColor}30`,
                      backgroundColor: `${theme.primaryColor}0a`,
                    }}
                  >
                    <span className="font-bold block mb-1" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.med_feat2_title || "📋 Tiêu chuẩn GMP-WHO"}
                        editable={editable}
                        ariaLabel="Tiêu đề chuyên môn 2"
                        onSave={(val) => updateCustomText("med_feat2_title", val)}
                      />
                    </span>
                    <span className="text-stone-700">
                      <InlineEditableText
                        value={section.customTexts?.med_feat2_desc || "Thẩm định quy trình sản xuất, HACCP & GLP phòng LAB"}
                        editable={editable}
                        ariaLabel="Mô tả chuyên môn 2"
                        onSave={(val) => updateCustomText("med_feat2_desc", val)}
                      />
                    </span>
                  </div>
                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      borderColor: `${theme.primaryColor}30`,
                      backgroundColor: `${theme.primaryColor}0a`,
                    }}
                  >
                    <span className="font-bold block mb-1" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.med_feat3_title || "💊 Dược lâm sàng"}
                        editable={editable}
                        ariaLabel="Tiêu đề chuyên môn 3"
                        onSave={(val) => updateCustomText("med_feat3_title", val)}
                      />
                    </span>
                    <span className="text-stone-700">
                      <InlineEditableText
                        value={section.customTexts?.med_feat3_desc || "Tương tác thuốc & Cảnh giác dược an toàn người bệnh"}
                        editable={editable}
                        ariaLabel="Mô tả chuyên môn 3"
                        onSave={(val) => updateCustomText("med_feat3_desc", val)}
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="mt-5 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-semibold"
                style={{ borderColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
              >
                <span>
                  <InlineEditableText
                    value={section.customTexts?.med_footer_left || "⚖️ CAM KẾT Y ĐỨC & AN TOÀN SỬ DỤNG THUỐC"}
                    editable={editable}
                    ariaLabel="Cam kết y đức"
                    onSave={(val) => updateCustomText("med_footer_left", val)}
                  />
                </span>
                <span>
                  <InlineEditableText
                    value={section.customTexts?.med_footer_right || "BỘ Y TẾ VIỆT NAM VERIFIED"}
                    editable={editable}
                    ariaLabel="Xác nhận Bộ Y Tế"
                    onSave={(val) => updateCustomText("med_footer_right", val)}
                  />
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              {section.customTexts?.hide_med_edu !== "true" ? (
                <div
                  className="relative group rounded-2xl border p-5 bg-white/90 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}35` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_med_edu", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Học vấn này"
                      aria-label="Xóa ô Học vấn này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                    style={{ color: theme.primaryColor }}
                  >
                    <GraduationCap className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <InlineEditableText
                      value={section.customTexts?.med_edu_title || "HỌC VẤN & ĐÀO TẠO CHUYÊN MÔN"}
                      editable={editable}
                      ariaLabel="Tiêu đề học vấn"
                      onSave={(val) => updateCustomText("med_edu_title", val)}
                    />
                  </h4>
                  <div className="text-xs space-y-1.5 text-stone-800">
                    <p className="font-bold text-sm" style={{ color: theme.textColor }}>
                      <InlineEditableText
                        value={eduSchool}
                        editable={editable}
                        ariaLabel="Tên trường học"
                        onSave={(val) => updateEducationInfo("educationSchool", val)}
                      />
                    </p>
                    <p className="font-medium" style={{ color: theme.secondaryColor }}>
                      <InlineEditableText
                        value={eduDegree}
                        editable={editable}
                        ariaLabel="Ngành đào tạo"
                        onSave={(val) => updateEducationInfo("educationDegree", val)}
                      />
                    </p>
                    <p className="text-stone-500">
                      <InlineEditableText
                        value={section.educationPeriod || "Khoá K18 • Hệ Chính quy Dược khoa"}
                        editable={editable}
                        ariaLabel="Niên khóa đào tạo"
                        onSave={(val) => updateEducationInfo("educationPeriod", val)}
                      />
                    </p>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_med_edu", "false")}
                  className="w-full rounded-2xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Học vấn &amp; Đào tạo
                </button>
              ) : null}

              {section.customTexts?.hide_med_contact !== "true" ? (
                <div
                  className="relative group rounded-2xl border p-5 bg-white/90 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}35` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_med_contact", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Liên hệ này"
                      aria-label="Xóa ô Liên hệ này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                    style={{ color: theme.primaryColor }}
                  >
                    <Mail className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <InlineEditableText
                      value={section.customTexts?.med_contact_title || "THÔNG TIN LIÊN HỆ & HỢP TÁC"}
                      editable={editable}
                      ariaLabel="Tiêu đề liên hệ"
                      onSave={(val) => updateCustomText("med_contact_title", val)}
                    />
                  </h4>
                  <div className="space-y-2 text-xs text-stone-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: theme.primaryColor }}>Email:</span>
                      <InlineEditableText
                        value={section.contactInfo.email || "nguyenvana@example.com"}
                        editable={editable}
                        ariaLabel="Email liên hệ"
                        onSave={(val) => updateContactInfo("email", val)}
                        className="text-stone-800 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: theme.primaryColor }}>Hotline:</span>
                      <InlineEditableText
                        value={section.contactInfo.phone || "0912 345 678"}
                        editable={editable}
                        ariaLabel="Số điện thoại"
                        onSave={(val) => updateContactInfo("phone", val)}
                        className="text-stone-800 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: theme.primaryColor }}>Địa bàn:</span>
                      <InlineEditableText
                        value={section.contactInfo.location || "Việt Nam"}
                        editable={editable}
                        ariaLabel="Địa bàn"
                        onSave={(val) => updateContactInfo("location", val)}
                        className="text-stone-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_med_contact", "false")}
                  className="w-full rounded-2xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Thông tin liên hệ
                </button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (layout === "clinical-dossier") {
      return (
        <div data-testid="about-layout-content" data-layout="clinical-dossier" className="space-y-6 font-mono">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div
              className="lg:col-span-7 rounded-2xl border-2 p-6 bg-white shadow-md flex flex-col justify-between"
              style={{
                borderColor: theme.primaryColor,
                boxShadow: `0 10px 25px -5px ${theme.primaryColor}20`,
              }}
            >
              <div className="space-y-4">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs"
                  style={{ borderColor: `${theme.primaryColor}25` }}
                >
                  <span className="font-bold flex items-center gap-2" style={{ color: theme.primaryColor }}>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <InlineEditableText
                      value={section.customTexts?.clin_badge || "[PHYSICIAN CLINICAL DOSSIER // MD. REGISTRATION]"}
                      editable={editable}
                      ariaLabel="Mã số hồ sơ lâm sàng"
                      onSave={(val) => updateCustomText("clin_badge", val)}
                    />
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-[10px] text-white font-bold"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.clin_tag || "MD-HN-2024"}
                      editable={editable}
                      ariaLabel="Mã bác sĩ"
                      onSave={(val) => updateCustomText("clin_tag", val)}
                    />
                  </span>
                </div>
                <div>
                  <h3 className="font-sans text-2xl font-bold" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={section.customTexts?.clin_title || "Bác sĩ Nội trú / Điều trị Lâm sàng"}
                      editable={editable}
                      ariaLabel="Chức danh điều trị lâm sàng"
                      onSave={(val) => updateCustomText("clin_title", val)}
                    />
                  </h3>
                  <p
                    className="mt-1 text-xs font-semibold font-mono"
                    style={{ color: theme.primaryColor }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.clin_sub || "BỆNH VIỆN BẠCH MAI • BỘ MÔN NỘI - ĐH Y HÀ NỘI"}
                      editable={editable}
                      ariaLabel="Đơn vị công tác lâm sàng"
                      onSave={(val) => updateCustomText("clin_sub", val)}
                    />
                  </p>
                  <p className="mt-3 font-sans text-sm leading-relaxed" style={{ color: `${theme.textColor}df` }}>
                    <InlineEditableText
                      value={
                        section.biography ||
                        "Bác sĩ lâm sàng trực tiếp điều trị tại khoa Cấp cứu & Can thiệp hồi sức tim mạch, ứng dụng y học chứng cứ trong chẩn đoán và theo dõi phác đồ."
                      }
                      editable={editable}
                      multiline
                      ariaLabel="Tiểu sử bác sĩ"
                      onSave={(val) => updateAbout({ biography: val })}
                    />
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-sans">
                  <div
                    className="p-2.5 rounded-lg border"
                    style={{
                      borderColor: `${theme.primaryColor}20`,
                      backgroundColor: `${theme.primaryColor}08`,
                    }}
                  >
                    <strong className="block" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.clin_feat1_title || "🩺 Cấp cứu Hồi sức"}
                        editable={editable}
                        ariaLabel="Tiêu đề chuyên môn lâm sàng 1"
                        onSave={(val) => updateCustomText("clin_feat1_title", val)}
                      />
                    </strong>
                    <span className="text-slate-600">
                      <InlineEditableText
                        value={section.customTexts?.clin_feat1_desc || "ACLS nâng cao, can thiệp sốc tuần hoàn"}
                        editable={editable}
                        ariaLabel="Mô tả chuyên môn lâm sàng 1"
                        onSave={(val) => updateCustomText("clin_feat1_desc", val)}
                      />
                    </span>
                  </div>
                  <div
                    className="p-2.5 rounded-lg border"
                    style={{
                      borderColor: `${theme.primaryColor}20`,
                      backgroundColor: `${theme.primaryColor}08`,
                    }}
                  >
                    <strong className="block" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.clin_feat2_title || "📊 Y học chứng cứ"}
                        editable={editable}
                        ariaLabel="Tiêu đề chuyên môn lâm sàng 2"
                        onSave={(val) => updateCustomText("clin_feat2_title", val)}
                      />
                    </strong>
                    <span className="text-slate-600">
                      <InlineEditableText
                        value={section.customTexts?.clin_feat2_desc || "Phác đồ Bộ Y tế & Guideline AHA/ESC"}
                        editable={editable}
                        ariaLabel="Mô tả chuyên môn lâm sàng 2"
                        onSave={(val) => updateCustomText("clin_feat2_desc", val)}
                      />
                    </span>
                  </div>
                  <div
                    className="p-2.5 rounded-lg border"
                    style={{
                      borderColor: `${theme.primaryColor}20`,
                      backgroundColor: `${theme.primaryColor}08`,
                    }}
                  >
                    <strong className="block" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.clin_feat3_title || "🧬 Cận lâm sàng"}
                        editable={editable}
                        ariaLabel="Tiêu đề chuyên môn lâm sàng 3"
                        onSave={(val) => updateCustomText("clin_feat3_title", val)}
                      />
                    </strong>
                    <span className="text-slate-600">
                      <InlineEditableText
                        value={section.customTexts?.clin_feat3_desc || "Chẩn đoán hình ảnh CT/MRI & Xét nghiệm"}
                        editable={editable}
                        ariaLabel="Mô tả chuyên môn lâm sàng 3"
                        onSave={(val) => updateCustomText("clin_feat3_desc", val)}
                      />
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="mt-5 pt-3 border-t flex items-center justify-between text-[11px] font-bold"
                style={{ borderColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
              >
                <span>
                  <InlineEditableText
                    value={section.customTexts?.clin_footer_left || "STATUS: PRACTICING PHYSICIAN"}
                    editable={editable}
                    ariaLabel="Trạng thái hành nghề"
                    onSave={(val) => updateCustomText("clin_footer_left", val)}
                  />
                </span>
                <span>
                  <InlineEditableText
                    value={section.customTexts?.clin_footer_right || "HIPPOCRATIC OATH VERIFIED"}
                    editable={editable}
                    ariaLabel="Lời thề Hippocrates"
                    onSave={(val) => updateCustomText("clin_footer_right", val)}
                  />
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              {section.customTexts?.hide_clin_edu !== "true" ? (
                <div
                  className="relative group rounded-xl border bg-white p-5 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_clin_edu", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Học vấn này"
                      aria-label="Xóa ô Học vấn này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div
                    className="flex items-center justify-between border-b pb-2 mb-3 text-xs font-bold"
                    style={{ borderColor: `${theme.primaryColor}18`, color: theme.primaryColor }}
                  >
                    <span>
                      <InlineEditableText
                        value={section.customTexts?.clin_edu_title || "[HOSPITAL AFFILIATIONS & DEGREE]"}
                        editable={editable}
                        ariaLabel="Tiêu đề học vấn lâm sàng"
                        onSave={(val) => updateCustomText("clin_edu_title", val)}
                      />
                    </span>
                    <span className="text-[10px] text-slate-400">
                      <InlineEditableText
                        value={section.customTexts?.clin_edu_tag || "ICD-10"}
                        editable={editable}
                        ariaLabel="Thẻ học vấn"
                        onSave={(val) => updateCustomText("clin_edu_tag", val)}
                      />
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700 font-sans">
                    <p className="font-bold" style={{ color: theme.textColor }}>
                      <InlineEditableText
                        value={eduSchool}
                        editable={editable}
                        ariaLabel="Tên bệnh viện / trường"
                        onSave={(val) => updateEducationInfo("educationSchool", val)}
                      />
                    </p>
                    <p className="font-medium" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={eduDegree}
                        editable={editable}
                        ariaLabel="Chuyên khoa / bằng cấp"
                        onSave={(val) => updateEducationInfo("educationDegree", val)}
                      />
                    </p>
                    <p className="text-slate-500 font-mono text-[11px]">
                      <InlineEditableText
                        value={section.educationPeriod || "Bác sĩ Nội trú Khóa K47"}
                        editable={editable}
                        ariaLabel="Khóa đào tạo nội trú"
                        onSave={(val) => updateAbout({ educationPeriod: val })}
                      />
                    </p>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_clin_edu", "false")}
                  className="w-full rounded-xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Hospital Affiliations
                </button>
              ) : null}

              {section.customTexts?.hide_clin_contact !== "true" ? (
                <div
                  className="relative group rounded-xl border bg-white p-5 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_clin_contact", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Liên hệ này"
                      aria-label="Xóa ô Liên hệ này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div
                    className="flex items-center justify-between border-b pb-2 mb-3 text-xs font-bold"
                    style={{ borderColor: `${theme.primaryColor}18`, color: theme.primaryColor }}
                  >
                    <span>
                      <InlineEditableText
                        value={section.customTexts?.clin_contact_title || "[CLINICAL CONTACT & PAGER]"}
                        editable={editable}
                        ariaLabel="Tiêu đề liên hệ lâm sàng"
                        onSave={(val) => updateCustomText("clin_contact_title", val)}
                      />
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      <InlineEditableText
                        value={section.customTexts?.clin_contact_tag || "ON CALL"}
                        editable={editable}
                        ariaLabel="Trạng thái trực"
                        onSave={(val) => updateCustomText("clin_contact_tag", val)}
                      />
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700 font-sans">
                    <div className="flex items-center gap-2">
                      <strong className="shrink-0" style={{ color: theme.primaryColor }}>Email BV:</strong>
                      <InlineEditableText
                        value={section.contactInfo.email || "bs.thutrang@hospital.vn"}
                        editable={editable}
                        ariaLabel="Email bệnh viện"
                        onSave={(val) => updateContactInfo("email", val)}
                        className="underline"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="shrink-0" style={{ color: theme.primaryColor }}>Pager / Hotline:</strong>
                      <InlineEditableText
                        value={section.contactInfo.phone || "0988 115 115"}
                        editable={editable}
                        ariaLabel="Số Pager / Hotline"
                        onSave={(val) => updateContactInfo("phone", val)}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="shrink-0" style={{ color: theme.primaryColor }}>Khoa / Phòng:</strong>
                      <InlineEditableText
                        value={section.contactInfo.location || "Khoa Hồi sức Tích cực & Cấp cứu"}
                        editable={editable}
                        ariaLabel="Khoa phòng công tác"
                        onSave={(val) => updateContactInfo("location", val)}
                      />
                    </div>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_clin_contact", "false")}
                  className="w-full rounded-xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Clinical Contact & Pager
                </button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (layout === "creator-profile") {
      const anyStatHidden =
        section.customTexts?.hide_creator_stat_1 === "true" ||
        section.customTexts?.hide_creator_stat_2 === "true" ||
        section.customTexts?.hide_creator_stat_3 === "true" ||
        section.customTexts?.hide_creator_stat_4 === "true";

      return (
        <div data-testid="about-layout-content" data-layout="creator-profile" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {section.customTexts?.hide_creator_stat_1 !== "true" && (
              <div
                className="relative group rounded-2xl border-2 p-4 rotate-[-1deg] transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: `${theme.primaryColor}18`,
                  borderColor: theme.primaryColor,
                  boxShadow: `4px 4px 0px ${theme.primaryColor}`,
                }}
              >
                {editable && (
                  <button
                    type="button"
                    onClick={() => updateCustomText("hide_creator_stat_1", "true")}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-black/10 hover:bg-black/20 text-current transition"
                    title="Xóa ô này"
                    aria-label="Xóa ô này"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span
                  className="text-[10px] font-black uppercase tracking-wider block"
                  style={{ color: theme.primaryColor }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_stat1_title || "TIKTOK REACH"}
                    editable={editable}
                    ariaLabel="Tiêu đề thống kê 1"
                    onSave={(val) => updateCustomText("creator_stat1_title", val)}
                  />
                </span>
                <span className="font-editorial text-2xl font-black" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat1_val || "250K+"}
                    editable={editable}
                    ariaLabel="Số liệu thống kê 1"
                    onSave={(val) => updateCustomText("creator_stat1_val", val)}
                  />
                </span>
                <span className="text-[11px] font-bold block opacity-80" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat1_sub || "3.2M Lượt Thích"}
                    editable={editable}
                    ariaLabel="Phụ đề thống kê 1"
                    onSave={(val) => updateCustomText("creator_stat1_sub", val)}
                  />
                </span>
              </div>
            )}
            {section.customTexts?.hide_creator_stat_2 !== "true" && (
              <div
                className="relative group rounded-2xl border-2 p-4 rotate-[1deg] transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: `${theme.secondaryColor}20`,
                  borderColor: theme.secondaryColor,
                  boxShadow: `4px 4px 0px ${theme.secondaryColor}`,
                }}
              >
                {editable && (
                  <button
                    type="button"
                    onClick={() => updateCustomText("hide_creator_stat_2", "true")}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-black/10 hover:bg-black/20 text-current transition"
                    title="Xóa ô này"
                    aria-label="Xóa ô này"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span
                  className="text-[10px] font-black uppercase tracking-wider block"
                  style={{ color: theme.secondaryColor }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_stat2_title || "INSTAGRAM / REELS"}
                    editable={editable}
                    ariaLabel="Tiêu đề thống kê 2"
                    onSave={(val) => updateCustomText("creator_stat2_title", val)}
                  />
                </span>
                <span className="font-editorial text-2xl font-black" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat2_val || "85K+"}
                    editable={editable}
                    ariaLabel="Số liệu thống kê 2"
                    onSave={(val) => updateCustomText("creator_stat2_val", val)}
                  />
                </span>
                <span className="text-[11px] font-bold block opacity-80" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat2_sub || "15.2% Avg. Reach"}
                    editable={editable}
                    ariaLabel="Phụ đề thống kê 2"
                    onSave={(val) => updateCustomText("creator_stat2_sub", val)}
                  />
                </span>
              </div>
            )}
            {section.customTexts?.hide_creator_stat_3 !== "true" && (
              <div
                className="relative group rounded-2xl border-2 p-4 rotate-[-1deg] transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: `${theme.primaryColor}0e`,
                  borderColor: `${theme.primaryColor}bb`,
                  boxShadow: `4px 4px 0px ${theme.primaryColor}88`,
                }}
              >
                {editable && (
                  <button
                    type="button"
                    onClick={() => updateCustomText("hide_creator_stat_3", "true")}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-black/10 hover:bg-black/20 text-current transition"
                    title="Xóa ô này"
                    aria-label="Xóa ô này"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span
                  className="text-[10px] font-black uppercase tracking-wider block"
                  style={{ color: theme.primaryColor }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_stat3_title || "YOUTUBE SHORTS"}
                    editable={editable}
                    ariaLabel="Tiêu đề thống kê 3"
                    onSave={(val) => updateCustomText("creator_stat3_title", val)}
                  />
                </span>
                <span className="font-editorial text-2xl font-black" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat3_val || "120K+"}
                    editable={editable}
                    ariaLabel="Số liệu thống kê 3"
                    onSave={(val) => updateCustomText("creator_stat3_val", val)}
                  />
                </span>
                <span className="text-[11px] font-bold block opacity-80" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat3_sub || "Views / Tháng"}
                    editable={editable}
                    ariaLabel="Phụ đề thống kê 3"
                    onSave={(val) => updateCustomText("creator_stat3_sub", val)}
                  />
                </span>
              </div>
            )}
            {section.customTexts?.hide_creator_stat_4 !== "true" && (
              <div
                className="relative group rounded-2xl border-2 p-4 rotate-[1deg] transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: `${theme.secondaryColor}12`,
                  borderColor: `${theme.secondaryColor}bb`,
                  boxShadow: `4px 4px 0px ${theme.secondaryColor}88`,
                }}
              >
                {editable && (
                  <button
                    type="button"
                    onClick={() => updateCustomText("hide_creator_stat_4", "true")}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-black/10 hover:bg-black/20 text-current transition"
                    title="Xóa ô này"
                    aria-label="Xóa ô này"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span
                  className="text-[10px] font-black uppercase tracking-wider block"
                  style={{ color: theme.secondaryColor }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_stat4_title || "ENGAGEMENT RATE"}
                    editable={editable}
                    ariaLabel="Tiêu đề thống kê 4"
                    onSave={(val) => updateCustomText("creator_stat4_title", val)}
                  />
                </span>
                <span className="font-editorial text-2xl font-black" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat4_val || "8.4%"}
                    editable={editable}
                    ariaLabel="Số liệu thống kê 4"
                    onSave={(val) => updateCustomText("creator_stat4_val", val)}
                  />
                </span>
                <span className="text-[11px] font-bold block opacity-80" style={{ color: theme.textColor }}>
                  <InlineEditableText
                    value={section.customTexts?.creator_stat4_sub || "Top Creator GenZ"}
                    editable={editable}
                    ariaLabel="Phụ đề thống kê 4"
                    onSave={(val) => updateCustomText("creator_stat4_sub", val)}
                  />
                </span>
              </div>
            )}
            {anyStatHidden && editable && (
              <div className="col-span-2 sm:col-span-4">
                <button
                  type="button"
                  onClick={() => {
                    updateCustomText("hide_creator_stat_1", "false");
                    updateCustomText("hide_creator_stat_2", "false");
                    updateCustomText("hide_creator_stat_3", "false");
                    updateCustomText("hide_creator_stat_4", "false");
                  }}
                  className="w-full rounded-2xl border-2 border-dashed p-3 text-center text-xs font-black transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục các ô thống kê đã xóa
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div
              className="lg:col-span-7 rounded-3xl border-3 bg-white p-6 sm:p-8"
              style={{
                borderColor: `${theme.textColor}cc`,
                boxShadow: `6px 6px 0px ${theme.textColor}dd`,
              }}
            >
              <div
                className="flex items-center justify-between border-b-2 pb-3 mb-4"
                style={{ borderColor: `${theme.primaryColor}30` }}
              >
                <span
                  className="font-editorial text-sm font-black uppercase tracking-wider"
                  style={{ color: theme.primaryColor }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_deck_title || "CREATOR MEDIA DECK • ISSUE NO. 01"}
                    editable={editable}
                    ariaLabel="Tiêu đề media deck"
                    onSave={(val) => updateCustomText("creator_deck_title", val)}
                  />
                </span>
                <span
                  className="rounded-full border px-3 py-0.5 text-xs font-black"
                  style={{
                    backgroundColor: `${theme.primaryColor}18`,
                    borderColor: `${theme.primaryColor}60`,
                    color: theme.primaryColor,
                  }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_deck_status || "OPEN FOR BOOKING ⚡"}
                    editable={editable}
                    ariaLabel="Trạng thái booking"
                    onSave={(val) => updateCustomText("creator_deck_status", val)}
                  />
                </span>
              </div>
              <h3 className="font-editorial text-3xl font-black" style={{ color: theme.textColor }}>
                <InlineEditableText
                  value={section.customTexts?.creator_heading || "Visual Storytelling & Viral Content Creation"}
                  editable={editable}
                  ariaLabel="Tiêu đề chính creator"
                  onSave={(val) => updateCustomText("creator_heading", val)}
                />
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed opacity-90" style={{ color: theme.textColor }}>
                <InlineEditableText
                  value={
                    section.biography ||
                    "Sáng tạo nội dung đa nền tảng kết hợp hình ảnh đậm tính thẩm mỹ, storytelling chân thực và thông điệp lan tỏa tích cực đến cộng đồng người trẻ."
                  }
                  editable={editable}
                  multiline
                  ariaLabel="Tiểu sử creator"
                  onSave={(val) => updateAbout({ biography: val })}
                />
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                <span
                  className="rounded-lg border-2 px-3 py-1"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    backgroundColor: `${theme.primaryColor}0a`,
                    color: theme.textColor,
                  }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_tag_1 || "🎬 Brand Integration"}
                    editable={editable}
                    ariaLabel="Tag creator 1"
                    onSave={(val) => updateCustomText("creator_tag_1", val)}
                  />
                </span>
                <span
                  className="rounded-lg border-2 px-3 py-1"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    backgroundColor: `${theme.primaryColor}0a`,
                    color: theme.textColor,
                  }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_tag_2 || "📱 UGC & Review"}
                    editable={editable}
                    ariaLabel="Tag creator 2"
                    onSave={(val) => updateCustomText("creator_tag_2", val)}
                  />
                </span>
                <span
                  className="rounded-lg border-2 px-3 py-1"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    backgroundColor: `${theme.primaryColor}0a`,
                    color: theme.textColor,
                  }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_tag_3 || "🎙️ Podcast Host"}
                    editable={editable}
                    ariaLabel="Tag creator 3"
                    onSave={(val) => updateCustomText("creator_tag_3", val)}
                  />
                </span>
                <span
                  className="rounded-lg border-2 px-3 py-1"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    backgroundColor: `${theme.primaryColor}0a`,
                    color: theme.textColor,
                  }}
                >
                  <InlineEditableText
                    value={section.customTexts?.creator_tag_4 || "📸 Concept Shoot"}
                    editable={editable}
                    ariaLabel="Tag creator 4"
                    onSave={(val) => updateCustomText("creator_tag_4", val)}
                  />
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              {section.customTexts?.hide_creator_booking !== "true" ? (
                <div
                  className="relative group rounded-3xl border-3 bg-white p-5"
                  style={{
                    borderColor: `${theme.textColor}cc`,
                    boxShadow: `4px 4px 0px ${theme.textColor}dd`,
                  }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_creator_booking", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Booking này"
                      aria-label="Xóa ô Booking này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="font-editorial text-sm font-black uppercase tracking-wider mb-2"
                    style={{ color: theme.primaryColor }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.creator_booking_title || "HỢP TÁC THƯƠNG HIỆU & BOOKING"}
                      editable={editable}
                      ariaLabel="Tiêu đề booking"
                      onSave={(val) => updateCustomText("creator_booking_title", val)}
                    />
                  </h4>
                  <div className="space-y-2 text-xs font-semibold" style={{ color: theme.textColor }}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Email:</span>
                      <InlineEditableText
                        value={section.contactInfo.email || "creator@management.vn"}
                        editable={editable}
                        ariaLabel="Email creator"
                        onSave={(val) => updateContactInfo("email", val)}
                        className="underline"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Agency Booking:</span>
                      <InlineEditableText
                        value={section.contactInfo.phone || "0977 888 999"}
                        editable={editable}
                        ariaLabel="Số Agency Booking"
                        onSave={(val) => updateContactInfo("phone", val)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Studio Base:</span>
                      <InlineEditableText
                        value={section.contactInfo.location || "TP. Hồ Chí Minh & Hà Nội"}
                        editable={editable}
                        ariaLabel="Địa điểm Studio"
                        onSave={(val) => updateContactInfo("location", val)}
                      />
                    </div>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_creator_booking", "false")}
                  className="w-full rounded-3xl border-2 border-dashed p-3 text-center text-xs font-black transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Hợp tác thương hiệu & Booking
                </button>
              ) : null}

              {section.customTexts?.hide_creator_specs !== "true" ? (
                <div
                  className="relative group rounded-3xl border-3 bg-stone-50 p-5"
                  style={{
                    borderColor: `${theme.textColor}cc`,
                    boxShadow: `4px 4px 0px ${theme.textColor}dd`,
                  }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_creator_specs", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Specs này"
                      aria-label="Xóa ô Specs này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="font-editorial text-sm font-black uppercase tracking-wider mb-2"
                    style={{ color: theme.primaryColor }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.creator_specs_title || "PRODUCTION GEAR // SPECS"}
                      editable={editable}
                      ariaLabel="Tiêu đề thiết bị specs"
                      onSave={(val) => updateCustomText("creator_specs_title", val)}
                    />
                  </h4>
                  <div className="text-xs space-y-1" style={{ color: theme.textColor }}>
                    <p>
                      <InlineEditableText
                        value={section.customTexts?.creator_spec_1 || "• Camera: Sony Cinema FX30 & G-Master Lenses"}
                        editable={editable}
                        ariaLabel="Thiết bị máy quay"
                        onSave={(val) => updateCustomText("creator_spec_1", val)}
                      />
                    </p>
                    <p>
                      <InlineEditableText
                        value={section.customTexts?.creator_spec_2 || "• Audio: DJI Wireless Mic 2 Studio Setup"}
                        editable={editable}
                        ariaLabel="Thiết bị âm thanh"
                        onSave={(val) => updateCustomText("creator_spec_2", val)}
                      />
                    </p>
                    <p>
                      <InlineEditableText
                        value={section.customTexts?.creator_spec_3 || "• Color Grading: DaVinci Resolve Studio 18"}
                        editable={editable}
                        ariaLabel="Phần mềm hậu kỳ"
                        onSave={(val) => updateCustomText("creator_spec_3", val)}
                      />
                    </p>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_creator_specs", "false")}
                  className="w-full rounded-3xl border-2 border-dashed p-3 text-center text-xs font-black transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}50`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Production Gear Specs
                </button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (layout === "academic-cv") {
      return (
        <div data-testid="about-layout-content" data-layout="academic-cv" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div
              className="lg:col-span-7 rounded-2xl border-2 p-6 sm:p-8 bg-white/95 shadow-sm flex flex-col justify-between"
              style={{
                borderColor: `${theme.primaryColor}55`,
                boxShadow: `0 10px 25px -5px ${theme.primaryColor}20`,
              }}
            >
              <div className="space-y-4">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.primaryColor }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.acad_badge || "HỒ SƠ HỌC THUẬT & LÝ LỊCH KHOA HỌC"}
                      editable={editable}
                      ariaLabel="Huy hiệu hồ sơ học thuật"
                      onSave={(val) => updateCustomText("acad_badge", val)}
                    />
                  </span>
                  <span
                    className="rounded px-2.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.acad_tag || "HỒ SƠ NCKH"}
                      editable={editable}
                      ariaLabel="Mã học thuật"
                      onSave={(val) => updateCustomText("acad_tag", val)}
                    />
                  </span>
                </div>
                <div>
                  <h3 className="font-editorial text-2xl font-bold" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={section.customTexts?.acad_title || "Nghiên cứu sinh & Giảng viên Sư phạm Tương lai"}
                      editable={editable}
                      ariaLabel="Tiêu đề chức danh học thuật"
                      onSave={(val) => updateCustomText("acad_title", val)}
                    />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed opacity-85" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={
                        section.biography ||
                        "Nghiên cứu chuyên sâu về đổi mới phương pháp giảng dạy, ứng dụng chuyển đổi số và phát triển năng lực tự học cho học sinh trong chương trình GDPT 2018."
                      }
                      editable={editable}
                      multiline
                      ariaLabel="Tiểu sử học thuật"
                      onSave={(val) => updateAbout({ biography: val })}
                    />
                  </p>
                </div>
                <div
                  className="rounded-xl border p-3.5 text-xs"
                  style={{
                    borderColor: `${theme.primaryColor}30`,
                    backgroundColor: `${theme.primaryColor}0d`,
                    color: theme.textColor,
                  }}
                >
                  <strong className="block mb-1" style={{ color: theme.primaryColor }}>
                    <InlineEditableText
                      value={section.customTexts?.acad_philo_title || "📜 Triết lý nghiên cứu giáo dục:"}
                      editable={editable}
                      ariaLabel="Tiêu đề triết lý giáo dục"
                      onSave={(val) => updateCustomText("acad_philo_title", val)}
                    />
                  </strong>
                  <p className="italic leading-relaxed">
                    <InlineEditableText
                      value={
                        section.customTexts?.acad_philo_text ||
                        "“Lấy người học làm trung tâm của mọi chuyển hóa, công nghệ làm đòn bẩy kích hoạt tư duy và sự thấu cảm làm nền tảng của y đức sư phạm.”"
                      }
                      editable={editable}
                      multiline
                      ariaLabel="Nội dung triết lý giáo dục"
                      onSave={(val) => updateCustomText("acad_philo_text", val)}
                    />
                  </p>
                </div>
              </div>
              <div
                className="mt-4 pt-3 border-t flex items-center justify-between text-xs font-bold"
                style={{ borderColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
              >
                <span>
                  <InlineEditableText
                    value={section.customTexts?.acad_footer_left || (eduSchool ? eduSchool.toUpperCase() : "TRƯỜNG ĐẠI HỌC")}
                    editable={editable}
                    ariaLabel="Tên trường học thuật"
                    onSave={(val) => updateCustomText("acad_footer_left", val)}
                  />
                </span>
                <span>
                  <InlineEditableText
                    value={section.customTexts?.acad_footer_right || "ACADEMIC VERIFIED"}
                    editable={editable}
                    ariaLabel="Xác nhận học thuật"
                    onSave={(val) => updateCustomText("acad_footer_right", val)}
                  />
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              {section.customTexts?.hide_acad_pubs !== "true" ? (
                <div
                  className="relative group rounded-xl border p-5 bg-white/90 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}35` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_acad_pubs", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Công bố khoa học này"
                      aria-label="Xóa ô Công bố khoa học này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                    style={{ color: theme.primaryColor }}
                  >
                    <BookOpen className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <InlineEditableText
                      value={section.customTexts?.acad_pub_title || "CÔNG BỐ KHOA HỌC & ĐỀ TÀI"}
                      editable={editable}
                      ariaLabel="Tiêu đề công bố khoa học"
                      onSave={(val) => updateCustomText("acad_pub_title", val)}
                    />
                  </h4>
                  <div className="space-y-2 text-xs" style={{ color: theme.textColor }}>
                    <p>
                      <InlineEditableText
                        value={section.customTexts?.acad_pub_1 || "• 01 Đề tài NCKH sinh viên: Đạt giải Xuất sắc"}
                        editable={editable}
                        ariaLabel="Đề tài NCKH 1"
                        onSave={(val) => updateCustomText("acad_pub_1", val)}
                      />
                    </p>
                    <p>
                      <InlineEditableText
                        value={section.customTexts?.acad_pub_2 || "• 03 Bài báo khoa học: Đăng kỷ yếu Hội thảo Quốc gia"}
                        editable={editable}
                        ariaLabel="Bài báo khoa học 2"
                        onSave={(val) => updateCustomText("acad_pub_2", val)}
                      />
                    </p>
                    <p>
                      <InlineEditableText
                        value={section.customTexts?.acad_pub_3 || "• Học bổng: Sinh viên Xuất sắc / Khuyến khích học tập"}
                        editable={editable}
                        ariaLabel="Học bổng tài năng 3"
                        onSave={(val) => updateCustomText("acad_pub_3", val)}
                      />
                    </p>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_acad_pubs", "false")}
                  className="w-full rounded-xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Công bố khoa học
                </button>
              ) : null}

              {section.customTexts?.hide_acad_contact !== "true" ? (
                <div
                  className="relative group rounded-xl border p-5 bg-white/90 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}35` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_acad_contact", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Liên hệ này"
                      aria-label="Xóa ô Liên hệ này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                    style={{ color: theme.primaryColor }}
                  >
                    <Mail className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <InlineEditableText
                      value={section.customTexts?.acad_contact_title || "LIÊN HỆ KHOA HỌC & VĂN PHÒNG"}
                      editable={editable}
                      ariaLabel="Tiêu đề liên hệ học thuật"
                      onSave={(val) => updateCustomText("acad_contact_title", val)}
                    />
                  </h4>
                  <div className="space-y-2 text-xs" style={{ color: theme.textColor }}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Email:</span>
                      <InlineEditableText
                        value={section.contactInfo.email || "gv.nghiencuu@vnu.edu.vn"}
                        editable={editable}
                        ariaLabel="Email học thuật"
                        onSave={(val) => updateContactInfo("email", val)}
                        className="font-medium underline"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Điện thoại:</span>
                      <InlineEditableText
                        value={section.contactInfo.phone || "(024) 3754 7799"}
                        editable={editable}
                        ariaLabel="Điện thoại văn phòng"
                        onSave={(val) => updateContactInfo("phone", val)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Văn phòng:</span>
                      <InlineEditableText
                        value={section.contactInfo.location || "Phòng 302, Nhà G7, 144 Xuân Thủy, Cầu Giấy, HN"}
                        editable={editable}
                        ariaLabel="Địa chỉ văn phòng"
                        onSave={(val) => updateContactInfo("location", val)}
                      />
                    </div>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_acad_contact", "false")}
                  className="w-full rounded-xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Liên hệ khoa học & Văn phòng
                </button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (layout === "pedagogical-journal") {
      return (
        <div data-testid="about-layout-content" data-layout="pedagogical-journal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div
              className="lg:col-span-7 rounded-3xl border-2 p-6 sm:p-8 bg-white/95 shadow-sm flex flex-col justify-between"
              style={{
                borderColor: `${theme.primaryColor}55`,
                boxShadow: `0 10px 25px -5px ${theme.primaryColor}20`,
              }}
            >
              <div className="space-y-4">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
                  style={{ borderColor: `${theme.primaryColor}30` }}
                >
                  <span
                    className="rounded-full px-3.5 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: `${theme.primaryColor}18`,
                      color: theme.primaryColor,
                    }}
                  >
                    <InlineEditableText
                      value={section.customTexts?.ped_badge || "🌸 CHÂN DUNG NGƯỜI GIÁO VIÊN TRẺ • NGÀNH SƯ PHẠM"}
                      editable={editable}
                      ariaLabel="Huy hiệu chân dung giáo viên"
                      onSave={(val) => updateCustomText("ped_badge", val)}
                    />
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    <InlineEditableText
                      value={section.customTexts?.ped_tag || "KHÓA K18 • THỰC TẬP SƯ PHẠM"}
                      editable={editable}
                      ariaLabel="Mã khóa thực tập"
                      onSave={(val) => updateCustomText("ped_tag", val)}
                    />
                  </span>
                </div>
                <div>
                  <h3 className="font-editorial text-2xl font-bold" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={section.customTexts?.ped_title || "Tâm Niệm Nghề Giáo & Triết Lý Giảng Dạy"}
                      editable={editable}
                      ariaLabel="Tiêu đề tâm niệm nghề giáo"
                      onSave={(val) => updateCustomText("ped_title", val)}
                    />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed opacity-85" style={{ color: theme.textColor }}>
                    <InlineEditableText
                      value={
                        section.biography ||
                        "Mỗi học sinh là một nốt nhạc độc bản trong dàn hợp xướng cuộc đời. Người giáo viên không chỉ truyền đạt tri thức mà còn là người thắp lên ngọn lửa đam mê và sự tự tin cho các em."
                      }
                      editable={editable}
                      multiline
                      ariaLabel="Tiểu sử sư phạm"
                      onSave={(val) => updateAbout({ biography: val })}
                    />
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                  <div
                    className="p-3 rounded-2xl border"
                    style={{
                      backgroundColor: `${theme.primaryColor}0d`,
                      borderColor: `${theme.primaryColor}25`,
                    }}
                  >
                    <strong className="block mb-1" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.ped_card1_title || "🎼 Giáo án tương tác"}
                        editable={editable}
                        ariaLabel="Tiêu đề giáo án tương tác"
                        onSave={(val) => updateCustomText("ped_card1_title", val)}
                      />
                    </strong>
                    <span style={{ color: theme.textColor }}>
                      <InlineEditableText
                        value={section.customTexts?.ped_card1_desc || "Dạy học liên môn & ứng dụng CNTT sinh động"}
                        editable={editable}
                        ariaLabel="Mô tả giáo án tương tác"
                        onSave={(val) => updateCustomText("ped_card1_desc", val)}
                      />
                    </span>
                  </div>
                  <div
                    className="p-3 rounded-2xl border"
                    style={{
                      backgroundColor: `${theme.primaryColor}0d`,
                      borderColor: `${theme.primaryColor}25`,
                    }}
                  >
                    <strong className="block mb-1" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.ped_card2_title || "💡 Trải nghiệm sáng tạo"}
                        editable={editable}
                        ariaLabel="Tiêu đề trải nghiệm sáng tạo"
                        onSave={(val) => updateCustomText("ped_card2_title", val)}
                      />
                    </strong>
                    <span style={{ color: theme.textColor }}>
                      <InlineEditableText
                        value={section.customTexts?.ped_card2_desc || "Tổ chức hoạt động ngoại khóa & CLB học đường"}
                        editable={editable}
                        ariaLabel="Mô tả trải nghiệm sáng tạo"
                        onSave={(val) => updateCustomText("ped_card2_desc", val)}
                      />
                    </span>
                  </div>
                  <div
                    className="p-3 rounded-2xl border"
                    style={{
                      backgroundColor: `${theme.primaryColor}0d`,
                      borderColor: `${theme.primaryColor}25`,
                    }}
                  >
                    <strong className="block mb-1" style={{ color: theme.primaryColor }}>
                      <InlineEditableText
                        value={section.customTexts?.ped_card3_title || "❤️ Thấu cảm học trò"}
                        editable={editable}
                        ariaLabel="Tiêu đề thấu cảm học trò"
                        onSave={(val) => updateCustomText("ped_card3_title", val)}
                      />
                    </strong>
                    <span style={{ color: theme.textColor }}>
                      <InlineEditableText
                        value={section.customTexts?.ped_card3_desc || "Xây dựng môi trường lớp học hạnh phúc"}
                        editable={editable}
                        ariaLabel="Mô tả thấu cảm học trò"
                        onSave={(val) => updateCustomText("ped_card3_desc", val)}
                      />
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="mt-5 pt-3 border-t flex items-center justify-between text-xs font-semibold"
                style={{ borderColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
              >
                <span>
                  <InlineEditableText
                    value={section.customTexts?.ped_footer_left || (eduSchool ? eduSchool.toUpperCase() : "TRƯỜNG ĐẠI HỌC")}
                    editable={editable}
                    ariaLabel="Tên trường sư phạm"
                    onSave={(val) => updateCustomText("ped_footer_left", val)}
                  />
                </span>
                <span>
                  <InlineEditableText
                    value={section.customTexts?.ped_footer_right || "TỐT NGHIỆP XUẤT SẮC 🌸"}
                    editable={editable}
                    ariaLabel="Xếp loại tốt nghiệp"
                    onSave={(val) => updateCustomText("ped_footer_right", val)}
                  />
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              {section.customTexts?.hide_ped_edu !== "true" ? (
                <div
                  className="relative group rounded-2xl border p-5 bg-white/90 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}35` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_ped_edu", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Học vấn này"
                      aria-label="Xóa ô Học vấn này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                    style={{ color: theme.primaryColor }}
                  >
                    <GraduationCap className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <InlineEditableText
                      value={section.customTexts?.ped_edu_title || "ĐƠN VỊ THỰC TẬP & HỌC VẤN"}
                      editable={editable}
                      ariaLabel="Tiêu đề đơn vị thực tập & học vấn"
                      onSave={(val) => updateCustomText("ped_edu_title", val)}
                    />
                  </h4>
                  <div className="space-y-1.5 text-xs text-stone-800">
                    <p className="font-bold text-sm" style={{ color: theme.textColor }}>
                      <InlineEditableText
                        value={eduSchool}
                        editable={editable}
                        ariaLabel="Tên trường thực tập"
                        onSave={(val) => updateEducationInfo("educationSchool", val)}
                      />
                    </p>
                    <p className="font-medium" style={{ color: theme.secondaryColor }}>
                      <InlineEditableText
                        value={eduDegree}
                        editable={editable}
                        ariaLabel="Ngành đào tạo sư phạm"
                        onSave={(val) => updateEducationInfo("educationDegree", val)}
                      />
                    </p>
                    <p className="text-stone-500">
                      <InlineEditableText
                        value={section.educationPeriod || "Khoá K18 • Thực tập Sư phạm"}
                        editable={editable}
                        ariaLabel="Niên khóa thực tập sư phạm"
                        onSave={(val) => updateAbout({ educationPeriod: val })}
                      />
                    </p>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_ped_edu", "false")}
                  className="w-full rounded-2xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Đơn vị thực tập & Học vấn
                </button>
              ) : null}

              {section.customTexts?.hide_ped_contact !== "true" ? (
                <div
                  className="relative group rounded-2xl border p-5 bg-white/90 shadow-xs"
                  style={{ borderColor: `${theme.primaryColor}35` }}
                >
                  {editable && (
                    <button
                      type="button"
                      onClick={() => updateCustomText("hide_ped_contact", "true")}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa ô Liên hệ này"
                      aria-label="Xóa ô Liên hệ này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                    style={{ color: theme.primaryColor }}
                  >
                    <Mail className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <InlineEditableText
                      value={section.customTexts?.ped_contact_title || "LIÊN HỆ GIÁO VIÊN"}
                      editable={editable}
                      ariaLabel="Tiêu đề liên hệ giáo viên"
                      onSave={(val) => updateCustomText("ped_contact_title", val)}
                    />
                  </h4>
                  <div className="space-y-2 text-xs text-stone-700">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Email:</span>
                      <InlineEditableText
                        value={section.contactInfo.email || "gv.amnhac@supham.edu.vn"}
                        editable={editable}
                        ariaLabel="Email giáo viên"
                        onSave={(val) => updateContactInfo("email", val)}
                        className="font-medium underline"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Hotline:</span>
                      <InlineEditableText
                        value={section.contactInfo.phone || "0966 223 344"}
                        editable={editable}
                        ariaLabel="Số điện thoại giáo viên"
                        onSave={(val) => updateContactInfo("phone", val)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: theme.primaryColor }}>Địa chỉ:</span>
                      <InlineEditableText
                        value={section.contactInfo.location || "Trường THPT Thực nghiệm Sư phạm, Hà Nội"}
                        editable={editable}
                        ariaLabel="Địa chỉ công tác"
                        onSave={(val) => updateContactInfo("location", val)}
                      />
                    </div>
                  </div>
                </div>
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => updateCustomText("hide_ped_contact", "false")}
                  className="w-full rounded-2xl border-2 border-dashed p-3 text-center text-xs font-bold transition flex items-center justify-center gap-1.5"
                  style={{
                    borderColor: `${theme.primaryColor}40`,
                    color: theme.primaryColor,
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ô Liên hệ giáo viên
                </button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    const layoutTitle = {
      "story-card": "Tiểu sử dạng câu chuyện",
      "bento-facts": "Bento thông tin",
      "editorial-poster": "Editorial Poster",
      "profile-dashboard": "Profile Dashboard",
      spotlight: "Spotlight Profile",
      cards: "Thông tin cá nhân dạng thẻ",
      grid: "Tổng quan dạng lưới",
      organic: "Bố cục tự do",
      timeline: "Dòng thời gian hồ sơ",
      "two-column-bio": "Tiểu sử 2 cột",
      "medical-license": "Dược sĩ Lâm sàng Mộc Anh",
      "clinical-dossier": "Bệnh án Bác sĩ Thu Trang",
      "creator-profile": "Creator & Media Deck",
      "academic-cv": "Hồ sơ Học thuật",
      "pedagogical-journal": "Nhật ký Giáo viên Sư phạm",
    }[layout];

    const containerClassName = {
      "story-card": "grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_0.75fr]",
      "bento-facts": "grid grid-cols-1 gap-4 md:grid-cols-6",
      "editorial-poster": "grid grid-cols-1 gap-4 md:grid-cols-12",
      "profile-dashboard": "grid grid-cols-1 gap-4 md:grid-cols-12",
      spotlight: "grid grid-cols-1 gap-4 md:grid-cols-12",
      cards: "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
      grid: "grid grid-cols-1 gap-4 md:grid-cols-6",
      organic: "grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_0.8fr]",
      timeline: "relative space-y-5",
      "two-column-bio": "grid grid-cols-1 gap-5 md:grid-cols-2",
      "medical-license": "grid grid-cols-1 gap-5 md:grid-cols-[1.25fr_0.75fr]",
      "clinical-dossier": "grid grid-cols-1 gap-5 md:grid-cols-2",
      "creator-profile": "grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_0.8fr]",
      "academic-cv": "grid grid-cols-1 gap-5 md:grid-cols-2",
      "pedagogical-journal": "grid grid-cols-1 gap-5 md:grid-cols-[1.1fr_0.9fr]",
    }[layout];

    const getItemClassName = (index: number) => {
      if (layout === "story-card" && index === 0) {
        return "lg:row-span-2";
      }
      if (layout === "editorial-poster") {
        return index === 0
          ? "md:col-span-8 md:row-span-2"
          : index === 1
            ? "md:col-span-4"
            : "md:col-span-12";
      }
      if (layout === "profile-dashboard") {
        return index === 0
          ? "md:col-span-6"
          : index === 1
            ? "md:col-span-3"
            : "md:col-span-3";
      }
      if (layout === "spotlight") {
        return index === 0 ? "md:col-span-12" : "md:col-span-6";
      }
      if (layout === "bento-facts") {
        return index === 0
          ? "md:col-span-2"
          : index === 1
            ? "md:col-span-4"
            : "md:col-span-6";
      }
      if (layout === "grid") {
        return index === 0 ? "md:col-span-6" : "md:col-span-3";
      }
      if (layout === "organic") {
        return index === 0
          ? "md:row-span-2 md:-rotate-1"
          : index === 1
            ? "md:translate-y-6 md:rotate-1"
            : "";
      }
      if (layout === "two-column-bio" && index === 0) {
        return "md:row-span-2";
      }
      return "";
    };

    const renderItem = (cardId: string, index: number) => {
      const itemClassName = `${layout === "timeline" ? "pl-10" : ""} ${getItemClassName(index)}`;
      const content = (
        <>
          {layout === "timeline" && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 text-[10px] font-bold"
              style={{
                backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          {renderCardById(cardId)}
        </>
      );

      return editable && isFreeLayout ? (
        <FreePositionAboutCardItem
          key={cardId}
          id={cardId}
          position={getCardPosition(cardId)}
          onResize={resizeAboutCard}
          editable={editable}
        >
          {content}
        </FreePositionAboutCardItem>
      ) : editable ? (
        <SortableAboutCardItem
          key={cardId}
          id={cardId}
          editable={editable}
          onResize={resizeAboutCard}
          className={itemClassName}
        >
          {content}
        </SortableAboutCardItem>
      ) : (
        <div
          key={cardId}
          data-testid={`about-card-${cardId}`}
          className={`relative ${itemClassName}`}
        >
          {content}
        </div>
      );
    };

    const cardItems = cardOrder.map(renderItem);
    const cardGrid = (
      <div
        ref={isFreeLayout ? setFreeGridRef : undefined}
        data-testid="about-layout-content"
        data-layout={layout}
        data-layout-positioning={isFreeLayout ? "free" : "automatic"}
        className={isFreeLayout ? "about-free-grid" : containerClassName}
        style={
          isFreeLayout
            ? {
                minHeight: `${
                  Math.max(
                    ...cardOrder.map((cardId) => {
                      const position = getCardPosition(cardId);
                      return position.row + position.height;
                    }),
                  ) *
                    64 -
                  16
                }px`,
              }
            : undefined
        }
      >
        {layout === "timeline" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-[15px] top-4 w-px"
            style={{ backgroundColor: `${theme.primaryColor}45` }}
          />
        )}
        {cardItems}
      </div>
    );

    return (
      <div
        className="space-y-4 border-t pt-4"
        style={{ borderColor: tokens.borderSubtle }}
      >
        <div className="flex items-center justify-between gap-3 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider opacity-75">
            {layoutTitle}
          </span>
          {editable && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="toggle-about-free-layout"
                onClick={() =>
                  updateAbout({
                    cardPositions: isFreeLayout
                      ? undefined
                      : DEFAULT_ABOUT_CARD_POSITIONS,
                  })
                }
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
              >
                {isFreeLayout ? "Bố cục tự động" : "Bật kéo thả tự do"}
              </button>
              <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {isFreeLayout
                  ? "Kéo thả và W/H để chỉnh vị trí, kích thước"
                  : "Kéo thả để sắp xếp, W/H để chỉnh kích thước"}
              </span>
            </div>
          )}
        </div>
        {editable && isFreeLayout ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFreeDragEnd}
          >
            {cardGrid}
          </DndContext>
        ) : editable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
              {cardGrid}
            </SortableContext>
          </DndContext>
        ) : (
          cardGrid
        )}
      </div>
    );
  };

  return (
    <section
      id="about"
      className="reveal-on-scroll mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"
      style={{ color: `var(--section-text-color, ${theme.textColor})` }}
    >
      <div
        className={`surface-block p-6 sm:p-10 ${cardDec.className} space-y-8 ${
          isCreative ? "border-4 border-black shadow-[8px_8px_0px_#000]" : ""
        } ${isOrganic ? "rounded-[3rem] border border-[var(--primary)]/25" : ""}`}
        style={{
          ...cardDec.style,
          backgroundColor: `var(--section-surface-color, ${
            typeof cardDec.style.backgroundColor === "string"
              ? cardDec.style.backgroundColor
              : "transparent"
          })`,
        }}
      >
        {/* Studio Direct Canvas Toolbar */}
        {editable && showAboutAvatar && (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <LayoutTemplate className="h-4 w-4 text-amber-600" />
              <span>
                Bố cục About: {section.variant || "Mặc định"}{" "}
                {isInverted ? "(Đã đảo vị trí)" : ""}
              </span>
            </div>
            <button
              type="button"
              data-testid="swap-about-layout"
              onClick={swapAboutLayout}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 font-bold text-white shadow-sm hover:bg-amber-700 transition cursor-pointer"
              title="Kéo đổi vị trí Ảnh với Tiểu sử trên Canvas"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>⇄ Đổi vị trí Ảnh / Tiểu sử</span>
            </button>
          </div>
        )}

        {/* Academic Presentation Slide Banner */}
        {isAcademic && (
          <div className="flex items-center justify-between border-b border-stone-200 pb-2 text-xs text-stone-500 font-mono">
            <span>HỒ SƠ HỌC TẬP VÀ ĐỊNH HƯỚNG PHÁT TRIỂN NĂNG LỰC SỐ</span>
            <span className="rounded bg-stone-100 px-2 py-0.5 font-bold text-stone-700">
              Slide 02 • Tiểu sử
            </span>
          </div>
        )}

        {/* Top Section Grid: Bio & Avatar */}
        <div
          data-testid="about-intro-layout"
          data-layout={activeLayout}
          className={`grid grid-cols-1 items-center gap-10 ${
            !showAboutAvatar
              ? "grid-cols-1 w-full"
              : activeLayout === "spotlight"
                ? "mx-auto max-w-4xl text-center"
                : isTop || isBottom
                  ? "grid-cols-1"
                  : "lg:grid-cols-12"
          }`}
        >
          {/* Framed Portrait Photo */}
          {showAboutAvatar && (
            <div
              className={`flex justify-center ${
                activeLayout === "spotlight"
                  ? "order-1"
                  : isTop
                    ? "col-span-12 order-1 w-full"
                    : isBottom
                      ? "col-span-12 order-2 w-full"
                      : activeLayout === "editorial-poster"
                        ? isInverted
                          ? "lg:col-span-4 lg:order-1"
                          : "lg:col-span-4 lg:order-2"
                        : activeLayout === "profile-dashboard"
                          ? isInverted
                            ? "lg:col-span-4 lg:row-span-2 lg:order-1"
                            : "lg:col-span-4 lg:row-span-2 lg:order-2"
                          : isInverted
                            ? "lg:col-span-5 lg:order-1"
                            : "lg:col-span-5 lg:order-2"
              } ${
                activeLayout === "profile-dashboard"
                  ? "surface-block rounded-3xl border border-[var(--primary)]/20 bg-white/70 p-4 shadow-lg"
                  : ""
              }`}
            >
              <AvatarFrame
                avatar={{
                  url: effectiveAvatarUrl,
                  frameStyle: effectiveFrameStyle,
                  aspectRatio: effectiveAspectRatio,
                }}
                alt={effectiveAvatarName}
                fullName={profileOwner?.fullName || avatarAlt}
                primaryColor={theme.primaryColor}
                secondaryColor={theme.secondaryColor}
                surfaceColor={`var(--section-surface-color, ${theme.surfaceColor})`}
                enableTilt={theme.effects?.enableTilt}
                enableGlow={theme.effects?.enableGlow}
                className="w-full max-w-[320px] sm:max-w-[350px]"
              />
            </div>
          )}

          {/* Bio Column */}
          <div
            className={`space-y-5 ${
              !showAboutAvatar
                ? "col-span-12 w-full"
                : activeLayout === "spotlight"
                  ? "order-2 text-center"
                  : isTop
                    ? "col-span-12 order-2 w-full"
                    : isBottom
                      ? "col-span-12 order-1 w-full"
                      : activeLayout === "editorial-poster"
                        ? isInverted
                          ? "lg:col-span-8 lg:order-2"
                          : "lg:col-span-8 lg:order-1"
                        : activeLayout === "profile-dashboard"
                          ? isInverted
                            ? "lg:col-span-8 lg:order-2"
                            : "lg:col-span-8 lg:order-1"
                          : isInverted
                            ? "lg:col-span-7 lg:order-2"
                            : "lg:col-span-7 lg:order-1"
            } ${
              activeLayout === "editorial-poster"
                ? isInverted
                  ? "surface-block rounded-3xl border-r-4 border-[var(--primary)] bg-white/70 p-6 sm:p-8"
                  : "surface-block rounded-3xl border-l-4 border-[var(--primary)] bg-white/70 p-6 sm:p-8"
                : activeLayout === "profile-dashboard"
                  ? "surface-block rounded-3xl border border-[var(--primary)]/15 bg-white/60 p-6 shadow-sm sm:p-8"
                  : ""
            }`}
          >
            <div>
              <span
                className={`text-xs font-bold uppercase tracking-[0.2em] ${
                  isTerminal ? "font-mono" : ""
                } ${isCreative ? "rounded-md border-2 border-black bg-amber-300 px-2.5 py-1 text-black shadow-[2px_2px_0px_#000]" : ""}`}
                style={isCreative ? undefined : { color: theme.primaryColor }}
              >
                {formatSectionEyebrow(archetypeId, "01", "Profile Story")}
              </span>
              <h2 className="mt-1 font-editorial text-3xl font-bold sm:text-4xl">
                <InlineAboutText
                  value={section.title}
                  editable={editable}
                  ariaLabel="Tiêu đề About"
                  onSave={(value) => updateAbout({ title: value })}
                />
              </h2>
            </div>

            <p className="text-base leading-relaxed opacity-85">
              <InlineAboutText
                value={section.biography}
                editable={editable}
                ariaLabel="Nội dung giới thiệu bản thân"
                onSave={(value) => updateAbout({ biography: value })}
              />
            </p>

            {/* Highlights Chips */}
            {section.highlights.length > 0 && (
              <div className="grid auto-rows-[88px] grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                {section.highlights.map((item, idx) => {
                  const width = Math.max(1, Math.min(4, item.width ?? 1));
                  const height = Math.max(1, Math.min(3, item.height ?? 1));
                  const widthClass =
                    {
                      1: "col-span-1",
                      2: "col-span-2",
                      3: "col-span-2 sm:col-span-3",
                      4: "col-span-2 sm:col-span-4",
                    }[width] ?? "col-span-1";
                  return (
                    <div
                      key={idx}
                      data-testid={`about-highlight-${idx}`}
                      data-highlight-width={width}
                      style={{
                        gridRow: `span ${height}`,
                        minHeight: `${height * 88}px`,
                        ...(isCreative
                          ? {}
                          : {
                              backgroundColor: `var(--section-surface-color, ${theme.backgroundColor})`,
                              borderColor: tokens.borderSubtle,
                            }),
                      }}
                      className={`surface-block relative rounded-xl border p-3 ${widthClass} ${
                        isCreative
                          ? "border-2 border-black bg-white shadow-[3px_3px_0px_#000]"
                          : ""
                      }`}
                    >
                      {editable && (
                        <div className="mb-1 flex flex-wrap justify-end gap-0.5">
                          <button
                            type="button"
                            aria-label={`Thu hẹp điểm nổi bật ${idx + 1}`}
                            onClick={() =>
                              updateHighlight(idx, {
                                width: Math.max(1, width - 1),
                              })
                            }
                            className="rounded bg-white/90 px-1 text-[9px] font-bold text-stone-600 shadow-sm hover:bg-stone-100"
                          >
                            W−
                          </button>
                          <button
                            type="button"
                            aria-label={`Mở rộng điểm nổi bật ${idx + 1}`}
                            onClick={() =>
                              updateHighlight(idx, {
                                width: Math.min(4, width + 1),
                              })
                            }
                            className="rounded bg-white/90 px-1 text-[9px] font-bold text-stone-600 shadow-sm hover:bg-stone-100"
                          >
                            W+
                          </button>
                          <button
                            type="button"
                            aria-label={`Rút ngắn điểm nổi bật ${idx + 1}`}
                            onClick={() =>
                              updateHighlight(idx, {
                                height: Math.max(1, height - 1),
                              })
                            }
                            className="rounded bg-white/90 px-1 text-[9px] font-bold text-stone-600 shadow-sm hover:bg-stone-100"
                          >
                            H−
                          </button>
                          <button
                            type="button"
                            aria-label={`Kéo dài điểm nổi bật ${idx + 1}`}
                            onClick={() =>
                              updateHighlight(idx, {
                                height: Math.min(3, height + 1),
                              })
                            }
                            className="rounded bg-white/90 px-1 text-[9px] font-bold text-stone-600 shadow-sm hover:bg-stone-100"
                          >
                            H+
                          </button>
                        </div>
                      )}
                      <InlineAboutText
                        value={item.label}
                        editable={editable}
                        ariaLabel={`Nhãn điểm nổi bật ${idx + 1}`}
                        className="block text-[10px] font-medium uppercase tracking-wider opacity-65"
                        onSave={(value) =>
                          updateHighlight(idx, { label: value })
                        }
                      />
                      <AboutHighlightValue
                        value={item.value}
                        color={
                          idx % 2 === 0
                            ? theme.primaryColor
                            : theme.secondaryColor
                        }
                        editable={editable}
                        ariaLabel={`Giá trị điểm nổi bật ${idx + 1}`}
                        onSave={(value) => updateHighlight(idx, { value })}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Multi-Format Layout Variant Renderers */}
        {activeLayout === "tabs" ? (
          /* Tabs Layout Variant */
          <div
            data-testid="about-layout-content"
            data-layout="tabs"
            className="space-y-4 border-t pt-4"
            style={{ borderColor: tokens.borderSubtle }}
          >
            <div
              role="tablist"
              aria-label="Thông tin About"
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  { id: "bio", label: "Tổng quan" },
                  { id: "contact", label: "Liên hệ" },
                  { id: "education", label: "Học vấn" },
                  { id: "goals", label: "Mục tiêu học phần" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    activeTab === tab.id
                      ? "bg-amber-600 text-white shadow-sm"
                      : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="pt-2">
              {activeTab === "bio" && (
                <div
                  className="surface-block rounded-2xl border p-6 bg-white/50 text-sm leading-relaxed"
                  style={{
                    backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                  }}
                >
                  <h4 className="font-editorial text-lg font-bold mb-2">
                    Đôi nét về bản thân
                  </h4>
                  <p>{section.biography}</p>
                </div>
              )}
              {activeTab === "contact" && renderCardById("contact")}
              {activeTab === "education" && renderCardById("education")}
              {activeTab === "goals" && renderCardById("learningGoals")}
            </div>
          </div>
        ) : (
          renderCardLayout(activeLayout)
        )}
      </div>
    </section>
  );
}
