import React from 'react';
import type { Metadata } from 'next';
import { getPortfolioBySlug } from '@/services/export/portfolio-repository';
import { getPortfolioFromCloud } from '@/services/storage/cloud-storage';
import DynamicPortfolioPage from './DynamicPortfolioPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { portfolioSlug: string };
}): Promise<Metadata> {
  let doc = getPortfolioBySlug(params.portfolioSlug);
  if (!doc) {
    doc = await getPortfolioFromCloud(params.portfolioSlug);
  }
  if (!doc) {
    return { title: 'Portfolio Viewer' };
  }
  return {
    title: doc.seo.title,
    description: doc.seo.description,
    openGraph: {
      title: doc.seo.title,
      description: doc.seo.description,
      images: doc.seo.ogImage ? [doc.seo.ogImage] : undefined,
    },
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: { portfolioSlug: string };
}) {
  let doc = getPortfolioBySlug(params.portfolioSlug);
  if (!doc) {
    doc = await getPortfolioFromCloud(params.portfolioSlug);
  }

  return <DynamicPortfolioPage serverDoc={doc} slug={params.portfolioSlug} />;
}
