'use client';

import React from 'react';
import { TemplateShell, ArchetypeTemplateProps } from './TemplateShell';

/**
 * Pedagogical Mauve Template (Lường Thị Nguyệt Ánh & Thùy Linh - Pedagogical Journal)
 * Distinct visual identity:
 * - Pedagogical Journal header with bookmark ribbon & teacher subtitle
 * - Soft pastel journal cards in mauve & warm rose
 * - "GIÁO ÁN / HOẠT ĐỘNG 01" 4-phase teaching flow (Khởi động, Khám phá, Luyện tập, Vận dụng)
 * - Teacher reflective journal with pedagogical philosophy & student feedback
 */
export function PedagogicalMauveTemplate(props: ArchetypeTemplateProps) {
  return (
    <TemplateShell
      {...props}
      archetypeId="pedagogical-mauve"
      frameVariant="rounded-card"
      wrapperClassName="theme-pedagogical-mauve"
      showSlideNumbers={false}
      navVariant="canva-pills"
    />
  );
}
