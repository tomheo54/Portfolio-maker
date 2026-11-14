'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FileUp,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  GripVertical,
  Rocket,
  Download,
  ExternalLink,
  Layers,
  Check,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  X,
  AlertCircle,
  User,
  Pencil,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import type { HeroSection, PortfolioSection, TemplateId } from '@/schema/portfolio.schema';
import { PortfolioRenderer } from '@/engine/PortfolioRenderer';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import {
  getActivePortfolioDraftId,
  readPortfolioDraft,
  setActivePortfolioDraftId,
  writePortfolioDraft,
  type PortfolioDraftRecord,
} from '@/services/browser/portfolio-draft';
import { DocxImportWizard } from '@/components/studio/DocxImportWizard';
import { SectionInspector } from '@/components/studio/SectionInspector';
import { ThemeCustomizer } from '@/components/studio/ThemeCustomizer';
import { StudioPortfolioPreview } from '@/components/studio/StudioPortfolioPreview';
import { InlineEditableText } from '@/components/studio/InlineEditableText';
import { DraftLibraryDialog } from '@/components/studio/DraftLibraryDialog';
import { PortfolioArchiveImporter } from '@/components/studio/PortfolioArchiveImporter';

const SECTION_TITLES: Record<PortfolioSection['type'], string> = {
  hero: 'Bìa mở đầu (Hero)',
  about: 'Giới thiệu (About)',
  skills: 'Kỹ năng (Skills)',
  experience: 'Kinh nghiệm',
  education: 'Học vấn',
  projects: 'Bài tập & Dự án',
  contact: 'Liên hệ (Contact)',
};

const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: 'canva-editorial', label: 'Canva Editorial ★ (Chuẩn mẫu gốc)' },
  { id: 'warm-editorial', label: 'Canva Warm Editorial (Mẫu 01)' },
  { id: 'creative-bold', label: 'Canva Bold Creative (Mẫu 02)' },
  { id: 'minimal-chic', label: 'Canva Minimal Chic (Mẫu 03)' },
  { id: 'vibrant-student', label: 'Canva Vibrant Student (Mẫu 04)' },
  { id: 'artistic-organic', label: 'Canva Artistic Organic (Chí Huế)' },
  { id: 'academic-presentation', label: 'Canva Academic Crimson (Võ Hoài)' },
  { id: 'bento-grid', label: 'Bento Grid Studio' },
  { id: 'framer-minimal', label: 'Framer Minimal Mono' },
  { id: 'creative-showcase', label: 'Creative Showcase' },
  { id: 'growth-marketer', label: 'Growth Marketer' },
  { id: 'tech-developer', label: 'Tech & AI Developer' },
];

function SortableSectionRow({
  id,
  index,
  section,
  active,
  onSelect,
}: {
  id: string;
  index: number;
  section: PortfolioSection;
  active: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-medium transition ${
        isDragging
          ? 'z-10 border-amber-500 bg-amber-50 opacity-85 shadow-lg ring-2 ring-amber-400/50'
          : active
          ? 'border-amber-600 bg-amber-50 text-stone-900 shadow-sm'
          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-stone-400 hover:text-stone-700 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`Kéo để sắp xếp lại ${SECTION_TITLES[section.type]}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="flex-1 truncate">
        {index + 1}. {SECTION_TITLES[section.type]}
      </span>
    </div>
  );
}

export default function StudioPage() {
  const {
    document,
    history,
    future,
    activeSectionIndex,
    viewportMode,
    generatingProjectId,
    isSaving,
    setActiveSectionIndex,
    setSelectedProjectId,
    setViewportMode,
    setTemplateId,
    restoreDraftSnapshot,
    reorderSections,
    updateProfileOwner,
    regenerateProjectAiImage,
    switchProjectImageSource,
    savePortfolioToServer,
    undo,
    redo,
    resetToPreset,
  } = usePortfolioStore();

  const heroSection = document.sections.find(
    (s): s is HeroSection => s.type === 'hero'
  );
  const currentOwnerName =
    document.profileOwner?.fullName ?? heroSection?.fullName ?? 'Nguyễn Văn A';
  const currentOwnerRole =
    document.profileOwner?.roleTitle ??
    heroSection?.roleTitle ??
    'Sinh viên Sư phạm Âm nhạc';
  const currentOwnerAvatar =
    document.profileOwner?.avatarUrl ?? heroSection?.avatar?.url ?? '';

  const [wizardOpen, setWizardOpen] = useState(false);
  const [draftLibraryOpen, setDraftLibraryOpen] = useState(false);
  const [archiveImportOpen, setArchiveImportOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportingZip, setExportingZip] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [mobilePanel, setMobilePanel] = useState<'none' | 'outline' | 'inspector'>('none');
  const [imageManagerFocusRequest, setImageManagerFocusRequest] = useState<{
    projectId: string;
    tab: 'docx';
    requestId: number;
  } | null>(null);
  const imageManagerFocusRequestId = useRef(0);

  const openProjectDocxImages = (projectId: string) => {
    const sectionIndex = document.sections.findIndex(
      (section) =>
        section.type === 'projects' &&
        section.projects.some((project) => project.id === projectId),
    );
    if (sectionIndex < 0) {
      setActionError('Không tìm thấy bài tập cần chỉnh ảnh DOCX.');
      return;
    }

    setActionError(null);
    setActiveSectionIndex(sectionIndex);
    setSelectedProjectId(projectId);
    setMobilePanel('inspector');
    setImageManagerFocusRequest({
      projectId,
      tab: 'docx',
      requestId: ++imageManagerFocusRequestId.current,
    });
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('draftLibrary') === '1') {
      setDraftLibraryOpen(true);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hydrated = false;
    let restoringDraft = false;
    let changedWhileHydrating = false;
    let active = true;
    const persist = () => {
      setAutoSaveStatus("pending");
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!active) return;
        setAutoSaveStatus("saving");
        try {
          const current = usePortfolioStore.getState();
          const savedId = await writePortfolioDraft(
            current.document,
            current.history,
            current.future,
            draftIdRef.current ?? current.document.slug,
          );
          draftIdRef.current = savedId;
        } catch {
          if (active) {
            setAutoSaveStatus("error");
            setActionError("Không lưu được bản nháp trong trình duyệt. Hãy tải bản sao lưu, giải phóng dung lượng hoặc thử lại.");
          }
          return;
        }
        if (!active) return;
        setActionError(null);
        setAutoSaveStatus("saved");
      }, 700);
    };
    const flushDraft = () => {
      if (!hydrated && !changedWhileHydrating) return;
      const current = usePortfolioStore.getState();
      void writePortfolioDraft(
        current.document,
        current.history,
        current.future,
        draftIdRef.current ?? current.document.slug,
      );
    };
    window.addEventListener('pagehide', flushDraft);
    window.addEventListener('beforeunload', flushDraft);
    const initialDocument = usePortfolioStore.getState().document;
    const targetDraftId =
      new URLSearchParams(window.location.search).get('draft') ||
      getActivePortfolioDraftId();
    const unsubscribe = usePortfolioStore.subscribe((state, previous) => {
      if (state.document === previous.document) return;
      if (restoringDraft) return;
      if (!hydrated) {
        changedWhileHydrating = true;
        return;
      }
      persist();
    });
    void readPortfolioDraft(targetDraftId).then((draft) => {
      if (!active) return;
      const nextDraftId = draft?.id ?? targetDraftId ?? `draft-${crypto.randomUUID()}`;
      draftIdRef.current = nextDraftId;
      setDraftId(nextDraftId);
      setActivePortfolioDraftId(nextDraftId);
      if (draft && usePortfolioStore.getState().document === initialDocument && !changedWhileHydrating) {
        restoringDraft = true;
        usePortfolioStore.getState().restoreDraftSnapshot({
          document: draft.document,
          history: draft.history,
          future: draft.future,
        });
        restoringDraft = false;
      }
      hydrated = true;
      const current = usePortfolioStore.getState();
      void writePortfolioDraft(current.document, current.history, current.future, nextDraftId).catch(() => {
        if (active) setActionError("Không thể lưu bản nháp trong trình duyệt.");
      });
      if (changedWhileHydrating) persist();
    }).catch(() => {
      if (!active) return;
      hydrated = true;
      if (changedWhileHydrating) persist();
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      flushDraft();
      window.removeEventListener('pagehide', flushDraft);
      window.removeEventListener('beforeunload', flushDraft);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (mobilePanel === 'none') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobilePanel('none');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobilePanel]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = document.sections.findIndex(
      (s, i) => `${s.type}-${i}` === active.id
    );
    const newIdx = document.sections.findIndex(
      (s, i) => `${s.type}-${i}` === over.id
    );
    if (oldIdx !== -1 && newIdx !== -1) {
      reorderSections(oldIdx, newIdx);
    }
  };

  const handlePublish = async () => {
    setActionError(null);
    const result = await savePortfolioToServer();
    if (result.ok) {
      try {
        await writePortfolioDraft(
          document,
          history,
          future,
          draftIdRef.current ?? result.slug,
          { status: 'completed', completionReason: 'published' },
        );
        setPublishNotice(`Đã xuất bản tại /${result.slug}`);
        setTimeout(() => setPublishNotice(null), 5000);
      } catch (error) {
        setActionError(
          error instanceof Error
            ? `Đã xuất bản nhưng không cập nhật được trạng thái dự án trên máy này: ${error.message}`
            : 'Đã xuất bản nhưng không cập nhật được trạng thái dự án trên máy này.',
        );
      }
    } else {
      setActionError(result.error || 'Không thể xuất bản Portfolio lúc này.');
    }
  };

  const handleDownloadZip = async () => {
    setActionError(null);
    setExportingZip(true);
    try {
      const saveResult = await savePortfolioToServer();
      if (!saveResult.ok) {
        throw new Error(saveResult.error || 'Không thể lưu Portfolio trước khi xuất ZIP.');
      }
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, format: 'zip' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      await writePortfolioDraft(
        document,
        history,
        future,
        draftIdRef.current ?? document.slug,
        { status: 'completed', completionReason: 'zip-exported' },
      );
      a.download = `${document.slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Xuất file ZIP thất bại.'
      );
    } finally {
      setExportingZip(false);
    }
  };

  const handleOpenDraft = (draft: PortfolioDraftRecord) => {
    draftIdRef.current = draft.id;
    setDraftId(draft.id);
    setActivePortfolioDraftId(draft.id);
    restoreDraftSnapshot({
      document: draft.document,
      history: draft.history,
      future: draft.future,
    });
    setDraftLibraryOpen(false);
    setActionError(null);
  };

  const handleArchiveImported = async (importedDocument: typeof document) => {
    const newDraftId = `draft-${crypto.randomUUID()}`;
    draftIdRef.current = newDraftId;
    setDraftId(newDraftId);
    setActivePortfolioDraftId(newDraftId);
    restoreDraftSnapshot({ document: importedDocument });
    try {
      await writePortfolioDraft(importedDocument, [], [], newDraftId);
      setAutoSaveStatus('saved');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không lưu được Portfolio vừa nhập.');
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stone-100 text-stone-900">
      {/* Studio Topbar */}
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2 sm:px-4 lg:h-14 lg:flex-nowrap lg:py-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-editorial text-base font-bold text-stone-900"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-xs text-white">
              PF
            </span>
            <span className="hidden sm:inline">Portfolio Studio</span>
          </Link>

          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 sm:px-3.5"
          >
            <FileUp className="h-3.5 w-3.5 shrink-0" />
            <span>📄 Nhập file .docx bài tập</span>
          </button>

          <button
            type="button"
            onClick={() => setArchiveImportOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mở ZIP đã xuất</span>
          </button>
          <button
            type="button"
            onClick={() => setDraftLibraryOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bản nháp</span>
          </button>

          <Link
            href="/batch"
            className="hidden rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 xl:inline-flex"
          >
            Sản xuất hàng loạt
          </Link>
        </div>

        {/* Center Controls: Mobile Panel Toggles, Template Switcher, Viewports, Undo/Redo */}
        <div className="order-3 flex w-full flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2 md:order-2 md:w-auto md:border-t-0 md:pt-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="toggle-outline-panel"
              aria-label="Mở bảng Bố cục & Theme"
              aria-expanded={mobilePanel === 'outline'}
              onClick={() =>
                setMobilePanel((prev) =>
                  prev === 'outline' ? 'none' : 'outline'
                )
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition lg:hidden ${
                mobilePanel === 'outline'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Bố cục</span>
            </button>

            <button
              type="button"
              data-testid="toggle-inspector-panel"
              aria-label="Mở bảng Chỉnh sửa chi tiết"
              aria-expanded={mobilePanel === 'inspector'}
              onClick={() =>
                setMobilePanel((prev) =>
                  prev === 'inspector' ? 'none' : 'inspector'
                )
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition md:hidden ${
                mobilePanel === 'inspector'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Chi tiết</span>
            </button>

            <select
              aria-label="Chọn bộ Template"
              value={document.templateId}
              onChange={(e) => setTemplateId(e.target.value as TemplateId)}
              className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold outline-none sm:px-3"
            >
              {TEMPLATE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  Mẫu: {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`rounded-full p-1.5 ${
                  viewportMode === 'desktop' ? 'bg-white shadow-sm' : 'text-stone-500'
                }`}
                title="Desktop"
                aria-label="Xem kích thước Desktop"
                aria-pressed={viewportMode === 'desktop'}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={`rounded-full p-1.5 ${
                  viewportMode === 'tablet' ? 'bg-white shadow-sm' : 'text-stone-500'
                }`}
                title="Tablet"
                aria-label="Xem kích thước Tablet"
                aria-pressed={viewportMode === 'tablet'}
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`rounded-full p-1.5 ${
                  viewportMode === 'mobile' ? 'bg-white shadow-sm' : 'text-stone-500'
                }`}
                title="Mobile"
                aria-label="Xem kích thước Mobile"
                aria-pressed={viewportMode === 'mobile'}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                disabled={history.length === 0}
                onClick={undo}
                className="rounded-full p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-35"
                title="Hoàn tác (Undo)"
                aria-label="Hoàn tác (Undo)"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={future.length === 0}
                onClick={redo}
                className="rounded-full p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-35"
                title="Làm lại (Redo)"
                aria-label="Làm lại (Redo)"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetToPreset}
                className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
                title="Khôi phục portfolio mẫu"
                aria-label="Khôi phục mẫu mặc định"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="order-2 flex items-center gap-1.5 sm:gap-2 md:order-3">
          {autoSaveStatus !== "idle" && (
            <span className="hidden text-[10px] text-stone-500 sm:inline" aria-live="polite">
              {autoSaveStatus === "pending" ? "Chờ tự lưu…" : autoSaveStatus === "saving" ? "Đang tự lưu…" : autoSaveStatus === "error" ? "Tự lưu lỗi" : "Đã tự lưu"}
            </span>
          )}
          <button
            type="button"
            disabled={exportingZip}
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60 sm:px-3"
            aria-label="Xuất ZIP"
          >
            {exportingZip ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Xuất ZIP</span>
          </button>

          <Link
            href={`/${document.slug}`}
            target="_blank"
            className="hidden items-center gap-1 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 sm:inline-flex"
          >
            <span>Xem trang</span>
            <ExternalLink className="h-3 w-3" />
          </Link>

          <button
            type="button"
            disabled={isSaving}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60 sm:px-4"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            <span>Xuất bản</span>
          </button>
        </div>
      </header>

      {/* Publish / Error Toast */}
      {(publishNotice || actionError) && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-xs font-semibold ${
            actionError
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionError ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {actionError ? (
              <span>{actionError}</span>
            ) : (
              <Link
                href={`/${document.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 underline hover:opacity-80"
              >
                <span>{publishNotice}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setPublishNotice(null);
              setActionError(null);
            }}
            className="rounded-full p-1 hover:bg-black/5"
            aria-label="Đóng thông báo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3-Column Studio Workspace (with Drawer fallback on < md / < lg) */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Responsive Drawer Backdrop */}
        {mobilePanel !== 'none' && (
          <div
            onClick={() => setMobilePanel('none')}
            aria-hidden="true"
            className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] ${
              mobilePanel === 'outline' ? 'lg:hidden' : 'md:hidden'
            }`}
          />
        )}

        {/* Left Sidebar: Sections & Theme */}
        <aside
          aria-label="Bố cục Sections và Giao diện"
          className={`${
            mobilePanel === 'outline'
              ? 'fixed inset-y-0 left-0 z-40 flex w-72 shadow-2xl'
              : 'hidden'
          } shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white p-3.5 lg:static lg:z-auto lg:flex lg:w-64 lg:shadow-none`}
        >
          <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2.5 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Bố cục & Giao diện
            </span>
            <button
              type="button"
              onClick={() => setMobilePanel('none')}
              className="rounded-full p-1 text-stone-500 hover:bg-stone-100"
              aria-label="Đóng bảng Bố cục"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              <Layers className="h-3.5 w-3.5" />
              <span>Bố cục Sections (Kéo-thả)</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={document.sections.map((s, i) => `${s.type}-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {document.sections.map((section, idx) => (
                    <SortableSectionRow
                      key={`${section.type}-${idx}`}
                      id={`${section.type}-${idx}`}
                      index={idx}
                      section={section}
                      active={activeSectionIndex === idx}
                      onSelect={() => setActiveSectionIndex(idx)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <ThemeCustomizer />
        </aside>

        {/* Center Canvas */}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-stone-200/70 p-3 sm:p-6 space-y-3">
          {/* Quick In-Line Canvas Editing Strip */}
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white/95 px-3.5 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5 truncate">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100 flex items-center justify-center">
                {currentOwnerAvatar ? (
                  <img
                    src={currentOwnerAvatar}
                    alt={currentOwnerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-stone-400" />
                )}
              </div>
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Chủ nhân:
                  </span>
                  <InlineEditableText
                    value={currentOwnerName}
                    onSave={(val) => updateProfileOwner({ fullName: val })}
                    placeholder="Nhấp để sửa tên chủ nhân..."
                    className="font-bold text-stone-900 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-400">Chức danh:</span>
                  <InlineEditableText
                    value={currentOwnerRole}
                    onSave={(val) => updateProfileOwner({ roleTitle: val })}
                    placeholder="Chức danh / Ngành học..."
                    className="text-[11px] text-stone-600 truncate max-w-xs"
                  />
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 border border-amber-200">
                <Sparkles className="h-3 w-3 text-amber-600" />
                In-line Direct Edit
              </span>
              <span className="text-[10px] text-stone-400">
                Nhấp trực tiếp để sửa tiêu đề &amp; thông tin
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1440px] min-w-0">
            <StudioPortfolioPreview
              document={document}
              viewportMode={viewportMode}
              activeSectionIndex={activeSectionIndex}
              onSelectSection={setActiveSectionIndex}
              editableCanvas={
                <PortfolioRenderer
                  document={document}
                  editable
                  activeSectionIndex={activeSectionIndex}
                  onSelectSection={setActiveSectionIndex}
                  generatingProjectId={generatingProjectId}
                  onRegenerateProjectImage={(projectId, customPrompt) =>
                    regenerateProjectAiImage(projectId, customPrompt)
                  }
                  onSwitchProjectImageSource={(projectId, mode) =>
                    switchProjectImageSource(projectId, mode)
                  }
                />
              }
            />
          </div>
        </main>

        {/* Right Inspector */}
        <aside
          aria-label="Bảng chỉnh sửa chi tiết Section"
          className={`${
            mobilePanel === 'inspector'
              ? 'fixed inset-y-0 right-0 z-40 block w-80 max-w-[90vw] shadow-2xl'
              : 'hidden'
          } shrink-0 overflow-y-auto border-l border-stone-200 bg-white md:static md:z-auto md:block md:w-80 md:shadow-none`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 md:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Chỉnh sửa chi tiết
            </span>
            <button
              type="button"
              onClick={() => setMobilePanel('none')}
              className="rounded-full p-1 text-stone-500 hover:bg-stone-100"
              aria-label="Đóng bảng Chỉnh sửa"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SectionInspector imageManagerFocusRequest={imageManagerFocusRequest} />
        </aside>
      </div>

      <DocxImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <DraftLibraryDialog
        open={draftLibraryOpen}
        currentDraftId={draftId}
        onClose={() => setDraftLibraryOpen(false)}
        onOpenDraft={handleOpenDraft}
      />
      {archiveImportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-3">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Mở Portfolio đã xuất</h2>
              <button type="button" onClick={() => setArchiveImportOpen(false)} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100">Đóng</button>
            </div>
            <PortfolioArchiveImporter onImported={handleArchiveImported} />
          </div>
        </div>
      )}
    </div>
  );
}
