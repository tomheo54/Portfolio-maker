import fs from 'fs';
import path from 'path';
import completedPortfolioSample from '@/data/presets/portfolio-mau-hoan-chinh.json';
import {
  PortfolioDocumentSchema,
  type PortfolioDocument,
} from '@/schema/portfolio.schema';
import {
  getCanvaCreativePresetBySlug,
  ALL_CANVA_CREATIVE_DOCUMENTS,
} from '@/data/presets/canva-creative-presets';

const PORTFOLIOS_DATA_DIR = path.resolve(process.cwd(), 'data/portfolios');

import { sanitizeSlug } from '@/utils/slug';
export { sanitizeSlug } from '@/utils/slug';

export function savePortfolioDocument(doc: PortfolioDocument): PortfolioDocument {
  const parsed = PortfolioDocumentSchema.parse(doc);
  const safeSlug = sanitizeSlug(parsed.slug);
  const finalDoc: PortfolioDocument = { ...parsed, slug: safeSlug };

  fs.mkdirSync(PORTFOLIOS_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PORTFOLIOS_DATA_DIR, `${safeSlug}.json`),
    JSON.stringify(finalDoc, null, 2),
    'utf-8'
  );
  return finalDoc;
}

export function getPortfolioBySlug(slug: string): PortfolioDocument | null {
  const safeSlug = sanitizeSlug(slug);
  const filePath = path.join(PORTFOLIOS_DATA_DIR, `${safeSlug}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return PortfolioDocumentSchema.parse(raw);
    } catch {
      return null;
    }
  }

  if (safeSlug === 'portfolio-mau-hoan-chinh') {
    return PortfolioDocumentSchema.parse(completedPortfolioSample);
  }

  const canvaPreset = getCanvaCreativePresetBySlug(safeSlug);
  if (canvaPreset) {
    return PortfolioDocumentSchema.parse(canvaPreset);
  }

  return null;
}

export function listSavedPortfolios(): PortfolioDocument[] {
  const map = new Map<string, PortfolioDocument>();
  const sample = PortfolioDocumentSchema.parse(completedPortfolioSample);
  map.set(sample.slug, sample);

  for (const presetDoc of ALL_CANVA_CREATIVE_DOCUMENTS) {
    if (!map.has(presetDoc.slug)) {
      map.set(presetDoc.slug, presetDoc);
    }
  }

  if (fs.existsSync(PORTFOLIOS_DATA_DIR)) {
    const files = fs.readdirSync(PORTFOLIOS_DATA_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = JSON.parse(
          fs.readFileSync(path.join(PORTFOLIOS_DATA_DIR, file), 'utf-8')
        );
        const doc = PortfolioDocumentSchema.parse(raw);
        map.set(doc.slug, doc);
      } catch {
        // Ignore malformed files
      }
    }
  }

  return Array.from(map.values());
}
