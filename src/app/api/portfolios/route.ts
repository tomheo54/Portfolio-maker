import { NextRequest, NextResponse } from 'next/server';
import { privateApiUnavailableResponse } from '@/services/deployment/private-api-guard';
import { PortfolioDocumentSchema } from '@/schema/portfolio.schema';
import {
  getPortfolioBySlug,
  listSavedPortfolios,
  savePortfolioDocument,
} from '@/services/export/portfolio-repository';
import { savePortfolioToCloud, getPortfolioFromCloud } from '@/services/storage/cloud-storage';

export async function GET(req: NextRequest) {
  const unavailable = privateApiUnavailableResponse('/api/portfolios');
  if (unavailable) return unavailable;

  const slug = req.nextUrl.searchParams.get('slug');
  if (slug) {
    let found = getPortfolioBySlug(slug);
    if (!found) {
      found = await getPortfolioFromCloud(slug);
    }
    if (!found) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    return NextResponse.json(found);
  }
  return NextResponse.json({ portfolios: listSavedPortfolios() });
}

export async function POST(req: NextRequest) {
  const unavailable = privateApiUnavailableResponse('/api/portfolios');
  if (unavailable) return unavailable;

  try {
    const body = await req.json();
    const doc = PortfolioDocumentSchema.parse(body);
    const saved = savePortfolioDocument(doc);
    // Lưu đồng bộ lên đám mây (nếu có cấu hình Vercel KV / Upstash Redis)
    await savePortfolioToCloud(saved.slug, saved).catch(() => {});
    return NextResponse.json({ ok: true, portfolio: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Invalid portfolio document',
      },
      { status: 400 }
    );
  }
}
