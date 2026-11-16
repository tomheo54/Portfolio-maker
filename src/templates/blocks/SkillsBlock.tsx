'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import type { SkillsSection, TemplateId, ThemeConfig } from '@/schema/portfolio.schema';
import {
  formatSectionEyebrow,
  getCardDecoration,
  getThemeTokens,
} from '@/templates/archetypes/archetypeStyles';
import { CanvaFourPointStar } from './CanvaOrnaments';
import { InlineEditableText } from '@/components/studio/InlineEditableText';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export interface SkillsBlockProps {
  section: SkillsSection;
  theme: ThemeConfig;
  archetypeId?: TemplateId;
  editable?: boolean;
  sectionIndex?: number;
}

export function SkillsBlock({
  section,
  theme,
  archetypeId = 'canva-editorial',
  editable = false,
  sectionIndex,
}: SkillsBlockProps) {
  const updateSection = usePortfolioStore((s) => s.updateSection);

  const updateTitle = (newTitle: string) => {
    if (sectionIndex === undefined) return;
    updateSection(sectionIndex, { ...section, title: newTitle });
  };

  const updateCategoryName = (catIndex: number, newName: string) => {
    if (sectionIndex === undefined) return;
    const nextCategories = section.categories.map((c, i) =>
      i === catIndex ? { ...c, name: newName } : c
    );
    updateSection(sectionIndex, { ...section, categories: nextCategories });
  };

  const updateSkillName = (catIndex: number, skillIndex: number, newName: string) => {
    if (sectionIndex === undefined) return;
    const nextCategories = section.categories.map((c, i) => {
      if (i !== catIndex) return c;
      return {
        ...c,
        skills: c.skills.map((s, si) => (si === skillIndex ? { ...s, name: newName } : s)),
      };
    });
    updateSection(sectionIndex, { ...section, categories: nextCategories });
  };
  const isCanvaEditorial = archetypeId === 'canva-editorial';
  const cardDec = getCardDecoration(archetypeId, theme);
  const tokens = getThemeTokens(theme);
  const isMinimal = archetypeId === 'framer-minimal';
  const isTerminal = archetypeId === 'tech-developer';

  const showBars =
    section.variant === 'progress-bars' || section.variant === 'canva-visual-grid';

  const resolveCardWidth = (catWidth?: string) => {
    const w = catWidth || section.cardWidth;
    if (!w || w === 'auto') return undefined;
    if (w === 'full' || w === '100%') return '100%';
    if (w === '3/4' || w === '75%') return '75%';
    if (w === '2/3' || w === '66%') return '66.666%';
    if (w === '1/2' || w === '50%') return '50%';
    if (w === '1/3' || w === '33%') return '33.333%';
    return w;
  };

  const resolveCardHeight = (catHeight?: string) => {
    const h = catHeight || section.cardHeight;
    if (!h || h === 'auto') return undefined;
    return h;
  };

  let gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  if (section.cardColumns === 1 || section.cardWidth === 'full' || section.cardWidth === '100%') {
    gridColsClass = 'grid-cols-1';
  } else if (section.cardColumns === 2) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2';
  } else if (section.cardColumns === 4) {
    gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  } else if (section.cardColumns === 3) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  } else if (section.categories.length === 1 && (section.cardWidth || section.cardHeight)) {
    gridColsClass = 'grid-cols-1';
  }

  const justifySelf =
    section.cardAlign === 'center' ? 'center' :
    section.cardAlign === 'right' ? 'end' :
    section.cardWidth && section.cardWidth !== 'auto' ? 'start' : undefined;

  const cardMargin =
    section.cardAlign === 'center' ? '0 auto' :
    section.cardAlign === 'right' ? '0 0 0 auto' :
    undefined;

  const renderIconBadges = (
    skills: SkillsSection['categories'][number]['skills'],
    catIdx: number
  ) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {skills.map((skill, idx) => (
        <div
          key={idx}
          className="surface-block flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium"
          style={{
            borderColor: tokens.borderSubtle,
            backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
          }}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white"
            style={{ backgroundColor: idx % 2 === 0 ? theme.primaryColor : theme.secondaryColor }}
          >
            {skill.iconUrl ? (
              <img src={skill.iconUrl} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 break-words">
            <InlineEditableText
              value={skill.name}
              editable={editable}
              ariaLabel={`Tên kỹ năng ${idx + 1}`}
              onSave={(val) => updateSkillName(catIdx, idx, val)}
            />
          </span>
        </div>
      ))}
    </div>
  );

  if (isCanvaEditorial) {
    return (
      <section
        id="skills"
        className="reveal-on-scroll mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28"
        style={{ color: `var(--section-text-color, ${theme.textColor})` }}
      >
        <div className="space-y-7">
          {/* Decorative stars remain separate from user-managed skill items. */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="font-editorial text-4xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: 'var(--text, #3E2723)' }}
              >
                <InlineEditableText
                  value={section.title}
                  editable={editable}
                  ariaLabel="Tiêu đề Kỹ năng & Công cụ"
                  onSave={updateTitle}
                />
              </h2>
            </div>

            <div className="ml-2 hidden items-center gap-3 sm:flex">
              <CanvaFourPointStar className="h-5 w-5" color="var(--primary, #735340)" />
              <CanvaFourPointStar className="h-6 w-6" color="var(--primary, #735340)" />
              <CanvaFourPointStar className="h-5 w-5" color="var(--primary, #735340)" />
            </div>
          </div>

          {/* Unboxed editorial columns directly on paper */}
          <div className={`grid ${gridColsClass} gap-8`}>
            {section.categories.map((cat, idx) => {
              const cardW = resolveCardWidth(cat.width);
              const cardH = resolveCardHeight(cat.height);
              return (
              <div
                key={idx}
                className="surface-block reveal-on-scroll space-y-4 border-t pt-4"
                style={{
                  borderColor: 'var(--primary, #735340)',
                  transitionDelay: `${idx * 100}ms`,
                  ...(cardW ? { width: cardW, maxWidth: '100%' } : {}),
                  ...(cardH ? { minHeight: cardH } : {}),
                  ...(justifySelf ? { justifySelf } : {}),
                  ...(cardMargin ? { margin: cardMargin } : {}),
                }}
              >
                <h3
                  className="font-editorial text-lg font-bold"
                  style={{ color: 'var(--text, #3E2723)' }}
                >
                  <InlineEditableText
                    value={cat.name}
                    editable={editable}
                    ariaLabel={`Nhóm kỹ năng ${idx + 1}`}
                    onSave={(val) => updateCategoryName(idx, val)}
                  />
                </h3>

                {section.variant === 'icon-badges' ? (
                  renderIconBadges(cat.skills, idx)
                ) : showBars ? (
                  <div className="space-y-3">
                    {cat.skills.map((skill, sIdx) => {
                      const pct = skill.level ?? 85;
                      return (
                        <div key={sIdx} className="hover-lift rounded-lg px-1 py-1">
                          <div
                            className="mb-1 flex items-center justify-between text-xs font-medium"
                            style={{ color: 'var(--text, #3E2723)' }}
                          >
                            <span>
                              <InlineEditableText
                                value={skill.name}
                                editable={editable}
                                ariaLabel={`Tên kỹ năng ${sIdx + 1}`}
                                onSave={(val) => updateSkillName(idx, sIdx, val)}
                              />
                            </span>
                            <span style={{ color: 'var(--primary, #735340)' }}>{pct}%</span>
                          </div>
                          <div
                            className="h-[2px] w-full"
                            style={{ backgroundColor: 'var(--primary, #735340)', opacity: 0.2 }}
                          >
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: 'var(--primary, #735340)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="hover-lift rounded-full border px-3 py-1 text-xs font-medium"
                        style={{
                          borderColor: 'var(--primary, #735340)',
                          color: 'var(--text, #3E2723)',
                          backgroundColor: `var(--section-surface-color, ${theme.surfaceColor})`,
                        }}
                      >
                        <InlineEditableText
                          value={skill.name}
                          editable={editable}
                          ariaLabel={`Tên kỹ năng ${sIdx + 1}`}
                          onSave={(val) => updateSkillName(idx, sIdx, val)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>

          <div
            className="border-b pt-4"
            style={{ borderColor: 'var(--primary, #735340)', opacity: 0.3 }}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      id="skills"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28"
      style={{ color: `var(--section-text-color, ${theme.textColor})` }}
    >
      <div className="mb-8">
        <span
          className={`text-xs font-bold uppercase tracking-[0.2em] ${
            isTerminal ? 'font-mono' : ''
          }`}
          style={{ color: theme.primaryColor }}
        >
          {formatSectionEyebrow(archetypeId, '02', 'Capabilities & Tools')}
        </span>
        <h2 className="mt-1 font-editorial text-3xl font-bold">
          <InlineEditableText
            value={section.title}
            editable={editable}
            ariaLabel="Tiêu đề Kỹ năng & Công cụ"
            onSave={updateTitle}
          />
        </h2>
      </div>

      <div className={`grid ${gridColsClass} gap-6`}>
        {section.categories.map((cat, idx) => {
          const cardW = resolveCardWidth(cat.width);
          const cardH = resolveCardHeight(cat.height);
          return (
          <div
            key={idx}
            className={`surface-block reveal-on-scroll p-6 ${cardDec.className}`}
            style={{
              ...cardDec.style,
              transitionDelay: `${idx * 100}ms`,
              ...(cardW ? { width: cardW, maxWidth: '100%' } : {}),
              ...(cardH ? { minHeight: cardH } : {}),
              ...(justifySelf ? { justifySelf } : {}),
              ...(cardMargin ? { margin: cardMargin } : {}),
            }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center text-white ${
                  isTerminal || isMinimal ? 'rounded-lg' : 'rounded-xl'
                }`}
                style={{
                  backgroundColor:
                    idx % 2 === 0 ? theme.primaryColor : theme.secondaryColor,
                }}
              >
                <Layers className="h-4 w-4" />
              </div>
              <h3 className={`text-base font-bold ${isTerminal ? 'font-mono text-sm' : ''}`}>
                <InlineEditableText
                  value={cat.name}
                  editable={editable}
                  ariaLabel={`Nhóm kỹ năng ${idx + 1}`}
                  onSave={(val) => updateCategoryName(idx, val)}
                />
              </h3>
            </div>

            {section.variant === 'icon-badges' ? (
              renderIconBadges(cat.skills, idx)
            ) : showBars ? (
              <div className="space-y-3.5">
                {cat.skills.map((skill, sIdx) => {
                  const pct = skill.level ?? 85;
                  return (
                    <div key={sIdx} className="hover-lift rounded-lg px-1 py-1">
                      <div className="mb-1 flex items-center justify-between text-xs font-medium">
                        <span>
                          <InlineEditableText
                            value={skill.name}
                            editable={editable}
                            ariaLabel={`Tên kỹ năng ${sIdx + 1}`}
                            onSave={(val) => updateSkillName(idx, sIdx, val)}
                          />
                        </span>
                        <span className={`opacity-65 ${isTerminal ? 'font-mono' : ''}`}>
                          {pct}%
                        </span>
                      </div>
                      <div
                        className={`w-full overflow-hidden rounded-full ${
                          isMinimal ? 'h-1' : 'h-2'
                        }`}
                        style={{ backgroundColor: `${theme.textColor}15` }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              idx % 2 === 0 ? theme.primaryColor : theme.secondaryColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className={`hover-lift border px-3 py-1.5 text-xs font-medium ${
                      isTerminal ? 'rounded-md font-mono' : isMinimal ? 'rounded-md' : 'rounded-full'
                    }`}
                    style={{
                      backgroundColor: theme.backgroundColor,
                      borderColor: tokens.borderSubtle,
                    }}
                  >
                    <InlineEditableText
                      value={skill.name}
                      editable={editable}
                      ariaLabel={`Tên kỹ năng ${sIdx + 1}`}
                      onSave={(val) => updateSkillName(idx, sIdx, val)}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </section>
  );
}
