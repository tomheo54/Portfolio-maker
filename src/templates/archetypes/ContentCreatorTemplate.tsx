'use client';

import React from 'react';
import { TemplateShell, ArchetypeTemplateProps } from './TemplateShell';

/**
 * Content Creator Template (Hà Lê - Bold Creator Magazine)
 * Distinct visual identity:
 * - Editorial magazine cover hero with giant masthead typography & viral stickers
 * - Polaroid / filmstrip styled visual cards with tilt and sticker tape
 * - "STORY 01", "STORY 02" campaign cards with reach metrics and 3-step narrative
 * - Brand collaboration tags & social reach stats strip
 */
export function ContentCreatorTemplate(props: ArchetypeTemplateProps) {
  return (
    <TemplateShell
      {...props}
      archetypeId="content-creator"
      frameVariant="polaroid"
      wrapperClassName="theme-content-creator"
      showSlideNumbers={false}
      navVariant="canva-pills"
    />
  );
}
