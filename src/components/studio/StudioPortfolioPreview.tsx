'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PortfolioDocument } from '@/schema/portfolio.schema';
import type { ViewportMode } from '@/store/usePortfolioStore';

const PREVIEW_VIEWPORTS: Record<
  ViewportMode,
  { label: string; width: number; height: number }
> = {
  desktop: { label: 'PC', width: 1440, height: 900 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  mobile: { label: 'Điện thoại', width: 390, height: 844 },
};

interface StudioPortfolioPreviewProps {
  document: PortfolioDocument;
  viewportMode: ViewportMode;
  activeSectionIndex: number | null;
  onSelectSection: (index: number) => void;
  editableCanvas: ReactNode;
}

export function StudioPortfolioPreview({
  document,
  viewportMode,
  activeSectionIndex,
  onSelectSection,
  editableCanvas,
}: StudioPortfolioPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const latestStateRef = useRef({ document, activeSectionIndex });
  const [hostWidth, setHostWidth] = useState(0);
  const [fullPage, setFullPage] = useState(false);
  const viewport = fullPage
    ? PREVIEW_VIEWPORTS.desktop
    : PREVIEW_VIEWPORTS[viewportMode];
  const scale = Math.min(1, hostWidth / viewport.width || 1);
  const scaledWidth = viewport.width * scale;
  const scaledHeight = viewport.height * scale;

  latestStateRef.current = { document, activeSectionIndex };

  const sendPreviewState = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'portfolio-studio-preview:update', ...latestStateRef.current },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateWidth = () => setHostWidth(host.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return;
      }

      if (event.data?.type === 'portfolio-studio-preview:ready') {
        sendPreviewState();
        return;
      }

      const index = event.data?.index;
      if (
        event.data?.type === 'portfolio-studio-preview:select-section' &&
        Number.isInteger(index) &&
        index >= 0 &&
        index < latestStateRef.current.document.sections.length
      ) {
        onSelectSection(index);
        return;
      }

    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelectSection, sendPreviewState]);

  useEffect(() => {
    sendPreviewState();
  }, [document, activeSectionIndex, fullPage, sendPreviewState]);

  return (
    <div ref={hostRef} className="min-w-0 w-full">
      <div className="mx-auto mb-2 flex max-w-[1440px] items-center justify-between text-[11px] font-medium text-stone-500">
        <span>
          {fullPage
            ? `Toàn cảnh Portfolio · PC ${viewport.width} px`
            : `Xem trước ${viewport.label} · ${viewport.width} × ${viewport.height}`}
        </span>
        <div className="flex items-center gap-2">
          <span>{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setFullPage((current) => !current)}
            aria-label={
              fullPage
                ? 'Quay lại xem trước theo thiết bị'
                : 'Xem toàn cảnh Portfolio'
            }
            className="rounded-full border border-stone-300 bg-white px-2.5 py-1 font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            {fullPage ? 'Theo thiết bị' : 'Toàn cảnh'}
          </button>
        </div>
      </div>
      {fullPage ? (
        <div
          data-testid="studio-editable-canvas"
          className="mx-auto max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        >
          {editableCanvas}
        </div>
      ) : (
        <div
          data-testid="studio-preview-frame"
          className="mx-auto overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/10"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <iframe
            key={viewportMode}
            ref={frameRef}
            title={`Xem trước Portfolio trên ${viewport.label}`}
            src="/studio/preview"
            className="block origin-top-left border-0"
            scrolling="yes"
            style={{
              width: viewport.width,
              height: viewport.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      )}
    </div>
  );
}
