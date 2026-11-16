'use client';

import React from 'react';
import { TemplateShell, ArchetypeTemplateProps } from './TemplateShell';

/**
 * Educational Terracotta Template (Võ Thị Hoài - Academic Monograph)
 * Distinct visual identity:
 * - Monograph Title Header with University credentials (ĐHQGHN - Trường ĐH Giáo dục)
 * - Academic seal & monogram crest in rich terracotta & warm parchment
 * - "CÔNG TRÌNH / ĐỀ TÀI 01" research framework boxes (Đặt vấn đề, Phương pháp, Đề xuất sư phạm)
 * - Formal academic citation blocks & educational reflection cards
 */
export function EducationalTerracottaTemplate(props: ArchetypeTemplateProps) {
  return (
    <TemplateShell
      {...props}
      archetypeId="educational-terracotta"
      frameVariant="arch-window"
      wrapperClassName="theme-educational-terracotta"
      showSlideNumbers={false}
      navVariant="canva-pills"
    />
  );
}
