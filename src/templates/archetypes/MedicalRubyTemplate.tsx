'use client';

import React from 'react';
import { TemplateShell, ArchetypeTemplateProps } from './TemplateShell';

/**
 * Medical Ruby Template (Ngô Mộc Anh - Luxury Medical / Pharmacy Magazine)
 * Distinct visual identity:
 * - Asymmetrical arch-window hero with gold-trimmed ruby double border
 * - 2-column syllabus / dossier index right on the hero
 * - "HIGHLIGHT PROJECTS" magazine spread layout with 3-tier analysis (Mục tiêu, Quy trình GMP, Kết quả)
 * - Deep ruby summary ribbons and pharmacist executive bio
 */
export function MedicalRubyTemplate(props: ArchetypeTemplateProps) {
  return (
    <TemplateShell
      {...props}
      archetypeId="medical-ruby"
      frameVariant="arch-window"
      wrapperClassName="theme-medical-ruby"
      showSlideNumbers={false}
      navVariant="canva-pills"
    />
  );
}
