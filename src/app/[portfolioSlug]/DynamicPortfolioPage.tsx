'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import type { PortfolioDocument } from '@/schema/portfolio.schema';
import { PublicPortfolioClient } from './PublicPortfolioClient';
import { listPortfolioDrafts, readPortfolioDraft } from '@/services/browser/portfolio-draft';
import { Loader2 } from 'lucide-react';

export default function DynamicPortfolioPage({
  serverDoc,
  slug,
}: {
  serverDoc: PortfolioDocument | null;
  slug: string;
}) {
  const [doc, setDoc] = useState<PortfolioDocument | null>(serverDoc);
  const [loading, setLoading] = useState(!serverDoc);

  useEffect(() => {
    if (serverDoc) return;

    let active = true;

    // 1. Thử tìm theo ID hoặc slug trực tiếp trong IndexedDB
    readPortfolioDraft(slug)
      .then(async (draft) => {
        if (!active) return;
        if (draft?.document && draft.document.slug === slug) {
          setDoc(draft.document);
          return;
        }

        // 2. Quét toàn bộ danh sách bản nháp trong máy để tìm slug khớp
        const allDrafts = await listPortfolioDrafts().catch(() => []);
        if (!active) return;
        const matched = allDrafts.find((d) => d.document.slug === slug);
        if (matched?.document) {
          setDoc(matched.document);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serverDoc, slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF3E6]">
        <Loader2 className="h-8 w-8 animate-spin text-[#A96B54]" />
      </div>
    );
  }

  if (!doc) {
    notFound();
  }

  return <PublicPortfolioClient document={doc} />;
}
