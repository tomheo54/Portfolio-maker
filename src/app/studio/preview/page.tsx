'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { PortfolioDocumentSchema, type PortfolioDocument } from '@/schema/portfolio.schema';
import { PublicPortfolioClient } from '@/app/[portfolioSlug]/PublicPortfolioClient';

interface PreviewState {
  document: PortfolioDocument;
  activeSectionIndex: number | null;
  fullPage: boolean;
}

export default function StudioPreviewPage() {
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setIsEmbedded(window.parent !== window);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) {
        return;
      }

      if (event.data?.type !== 'portfolio-studio-preview:update') return;

      const parsedDocument = PortfolioDocumentSchema.safeParse(event.data.document);
      if (!parsedDocument.success) return;

      const activeSectionIndex = event.data.activeSectionIndex;
      setPreviewState({
        document: parsedDocument.data,
        activeSectionIndex:
          Number.isInteger(activeSectionIndex) &&
          activeSectionIndex >= 0 &&
          activeSectionIndex < parsedDocument.data.sections.length
            ? activeSectionIndex
            : null,
        fullPage: event.data.fullPage === true,
      });
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage(
      { type: 'portfolio-studio-preview:ready' },
      window.location.origin,
    );

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!isEmbedded || !previewState?.fullPage) return;

    const notifyHeight = () => {
      const height = Math.max(
        window.document.documentElement.scrollHeight,
        window.document.body.scrollHeight,
      );
      window.parent.postMessage(
        { type: 'portfolio-studio-preview:height', height },
        window.location.origin,
      );
    };

    const observer = new ResizeObserver(notifyHeight);
    observer.observe(window.document.documentElement);
    observer.observe(window.document.body);
    notifyHeight();

    return () => observer.disconnect();
  }, [isEmbedded, previewState?.document, previewState?.fullPage]);

  const handleSelectSection = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!previewState || !isEmbedded || !(event.target instanceof Element)) {
        return;
      }

      const sectionElement = event.target.closest('[data-section-type]');
      if (!sectionElement) return;

      const sectionElements = Array.from(
        event.currentTarget.querySelectorAll('[data-section-type]'),
      );
      const index = sectionElements.indexOf(sectionElement);
      if (index < 0 || index >= previewState.document.sections.length) return;

      window.parent.postMessage(
        { type: 'portfolio-studio-preview:select-section', index },
        window.location.origin,
      );
    },
    [isEmbedded, previewState],
  );

  const activeSectionType =
    previewState?.activeSectionIndex == null
      ? null
      : previewState.document.sections[previewState.activeSectionIndex]?.type ?? null;

  useEffect(() => {
    if (!isEmbedded || !activeSectionType) return;
    window.document
      .getElementById(activeSectionType)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeSectionType, isEmbedded]);

  if (!previewState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 p-6 text-center text-sm text-stone-500">
        {isEmbedded
          ? 'Đang tải bản xem trước Portfolio…'
          : 'Bản xem trước này được mở từ Portfolio Studio.'}
      </main>
    );
  }

  return (
    <div onClickCapture={handleSelectSection}>
      <PublicPortfolioClient
        document={previewState.document}
      />
    </div>
  );
}
