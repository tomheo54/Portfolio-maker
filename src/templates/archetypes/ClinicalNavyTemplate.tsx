'use client';

import React from 'react';
import { TemplateShell, ArchetypeTemplateProps } from './TemplateShell';

/**
 * Clinical Navy Template (Hoàng Thu Trang - Clinical Case Dossier)
 * Distinct visual identity:
 * - Sterile clinical case dossier header with status tag, archive code & hospital stamp
 * - Crisp diagnostic grid layout in deep navy & surgical slate
 * - "CASE 01", "CASE 02" dossier cards with 4-step diagnostic workflow
 * - Clinical evidence gallery & diagnostic coordinate inspection badges
 */
export function ClinicalNavyTemplate(props: ArchetypeTemplateProps) {
  return (
    <TemplateShell
      {...props}
      archetypeId="clinical-navy"
      frameVariant="rounded-card"
      wrapperClassName="theme-clinical-navy"
      showSlideNumbers={false}
      navVariant="badge-bar"
    />
  );
}
