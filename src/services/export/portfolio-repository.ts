import fs from 'fs';
import path from 'path';
import os from 'os';
import completedPortfolioSample from '@/data/presets/portfolio-mau-hoan-chinh.json';
import {
  PortfolioDocumentSchema,
  type PortfolioDocument,
} from '@/schema/portfolio.schema';
import {
  getCanvaCreativePresetBySlug,
  ALL_CANVA_CREATIVE_DOCUMENTS,
} from '@/data/presets/canva-creative-presets';

export { sanitizeSlug } from '@/utils/slug';
import { sanitizeSlug } from '@/utils/slug';

const PORTFOLIOS_DATA_DIR = path.resolve(process.cwd(), 'data/portfolios');
const TMP_PORTFOLIOS_DIR = path.join(os.tmpdir(), 'portfolios');

// In-memory cache for serverless runtime (survives requests within the instance)
const memoryPortfolios = new Map<string, PortfolioDocument>();

export function savePortfolioDocument(doc: PortfolioDocument): PortfolioDocument {
  const parsed = PortfolioDocumentSchema.parse(doc);
  const safeSlug = sanitizeSlug(parsed.slug);
  const finalDoc: PortfolioDocument = { ...parsed, slug: safeSlug };

  // 1. Luôn lưu vào in-memory map
  memoryPortfolios.set(safeSlug, finalDoc);

  // 2. Thử lưu vào data/portfolios (chạy mượt khi ở máy cục bộ Local)
  try {
    fs.mkdirSync(PORTFOLIOS_DATA_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(PORTFOLIOS_DATA_DIR, `${safeSlug}.json`),
      JSON.stringify(finalDoc, null, 2),
      'utf-8'
    );
  } catch {
    // 3. Nếu là Vercel / serverless (read-only filesystem), lưu dự phòng vào /tmp
    try {
      fs.mkdirSync(TMP_PORTFOLIOS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(TMP_PORTFOLIOS_DIR, `${safeSlug}.json`),
        JSON.stringify(finalDoc, null, 2),
        'utf-8'
      );
    } catch {
      // Bỏ qua lỗi ghi disk nếu tmp cũng không ghi được, in-memory vẫn giữ bản doc
    }
  }

  return finalDoc;
}

export function getPortfolioBySlug(slug: string): PortfolioDocument | null {
  const safeSlug = sanitizeSlug(slug);

  // 1. Kiểm tra memory cache trước
  if (memoryPortfolios.has(safeSlug)) {
    return memoryPortfolios.get(safeSlug)!;
  }

  // 2. Kiểm tra trong data/portfolios (các file đã commit trong git)
  const filePath = path.join(PORTFOLIOS_DATA_DIR, `${safeSlug}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const parsed = PortfolioDocumentSchema.parse(raw);
      memoryPortfolios.set(safeSlug, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  // 3. Kiểm tra trong thư mục /tmp
  const tmpPath = path.join(TMP_PORTFOLIOS_DIR, `${safeSlug}.json`);
  if (fs.existsSync(tmpPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
      const parsed = PortfolioDocumentSchema.parse(raw);
      memoryPortfolios.set(safeSlug, parsed);
      return parsed;
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

  // Bổ sung các portfolio từ memory
  memoryPortfolios.forEach((doc, s) => {
    map.set(s, doc);
  });

  return Array.from(map.values());
}
