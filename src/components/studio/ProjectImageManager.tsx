'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Sparkles,
  Wand2,
  ArrowUp,
  Trash2,
  Loader2,
  Check,
  Plus,
  GripVertical,
  Images,
  ImagePlus,
  FolderOpen,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectItem, VisualStyle, ProjectMediaItem } from '@/schema/portfolio.schema';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import {
  imageFileToDataUrl,
  listPortfolioLibraryImages,
  savePortfolioLibraryImage,
  deletePortfolioLibraryImage,
  clearPortfolioLibrary,
} from '@/services/browser/portfolio-image-library';

function SortableMediaRow({
  m,
  idx,
  project,
  handleMoveFirst,
  setProjectMedia,
}: {
  m: ProjectMediaItem;
  idx: number;
  project: ProjectItem;
  handleMoveFirst: (id: string) => void;
  setProjectMedia: (projectId: string, media: ProjectMediaItem[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: m.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1.5 ${
        isDragging ? 'ring-2 ring-amber-500 shadow-md' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 text-stone-400 hover:text-stone-600 active:cursor-grabbing"
        title="Kéo đổi thứ tự"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <img
        src={m.url}
        alt={m.caption || ''}
        className="h-10 w-12 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-stone-800">
          {idx === 0 ? '★ Ảnh chính • ' : ''}
          {m.sourceType === 'docx-extracted'
            ? 'DOCX Media'
            : m.sourceType === 'ai-generated'
            ? 'AI Generated'
            : 'Uploaded'}
        </p>
        <p className="truncate text-[10px] text-stone-400">
          {m.originalDocxMediaName || m.caption || m.url}
        </p>
      </div>
      {idx > 0 && (
        <button
          type="button"
          onClick={() => handleMoveFirst(m.id)}
          className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"
          title="Đưa lên làm ảnh chính"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          setProjectMedia(
            project.id,
            project.media.filter((item) => item.id !== m.id)
          )
        }
        className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
        title="Gỡ ảnh khỏi bài tập"
        aria-label="Gỡ ảnh khỏi bài tập"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export interface ProjectImageManagerProps {
  project: ProjectItem;
  focusTab?: 'docx';
  focusRequestId?: number;
}

export function ProjectImageManager({
  project,
  focusTab,
  focusRequestId,
}: ProjectImageManagerProps) {
  const {
    document,
    docxExtractedPool,
    generatingProjectId,
    setProjectMedia,
    updateProject,
    regenerateProjectAiImage,
    reorderProjectMedia,
  } = usePortfolioStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleMediaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = project.media.findIndex((m) => m.id === active.id);
    const newIndex = project.media.findIndex((m) => m.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderProjectMedia(project.id, oldIndex, newIndex);
    }
  };

  const [tab, setTab] = useState<'library' | 'docx' | 'ai'>('library');
  const [promptInput, setPromptInput] = useState(project.suggestedAiImagePrompt);
  const [styleChoice, setStyleChoice] = useState<VisualStyle>(
    project.preferredImageStyle
  );
  const [genError, setGenError] = useState<string | null>(null);
  const [savedLibraryItems, setSavedLibraryItems] = useState<ProjectMediaItem[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const managerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listPortfolioLibraryImages()
      .then(setSavedLibraryItems)
      .catch(() => setLibraryError('Không tải được thư viện ảnh trên máy này.'));
  }, []);

  useEffect(() => {
    setPromptInput(project.suggestedAiImagePrompt);
    setStyleChoice(project.preferredImageStyle);
    setGenError(null);
  }, [project.id, project.suggestedAiImagePrompt, project.preferredImageStyle]);

  useEffect(() => {
    if (focusTab === undefined || focusRequestId === undefined) return;
    setTab(focusTab);
    managerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusRequestId, focusTab, project.id]);

  const isGenerating = generatingProjectId === project.id;
  const poolItems = docxExtractedPool[project.id] ?? [];
  const projectLibraryItems = (() => {
    const items = new Map<string, { item: ProjectMediaItem; projectTitle: string }>();
    for (const section of document.sections) {
      if (section.type !== 'projects') continue;
      for (const candidateProject of section.projects) {
        for (const item of candidateProject.media) {
          if (!items.has(item.url)) items.set(item.url, { item, projectTitle: candidateProject.title });
        }
        for (const item of docxExtractedPool[candidateProject.id] ?? []) {
          if (!items.has(item.url)) items.set(item.url, { item, projectTitle: candidateProject.title });
        }
      }
    }
    return Array.from(items.values());
  })();
  const libraryItems = [
    ...savedLibraryItems.map((item) => ({ item, projectTitle: 'Thư viện của tôi' })),
    ...projectLibraryItems.filter(
      ({ item }) => !savedLibraryItems.some((saved) => saved.url === item.url),
    ),
  ];
  const docxAttached = project.media.filter(
    (m) => m.sourceType === 'docx-extracted'
  );
  const allDocxCandidates = [
    ...docxAttached,
    ...poolItems.filter((p) => !docxAttached.some((d) => d.url === p.url)),
  ];

  const handleGenerateAi = async () => {
    setGenError(null);
    try {
      await regenerateProjectAiImage(project.id, promptInput, styleChoice);
    } catch (err) {
      setGenError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo ảnh AI lúc này. Vui lòng thử lại.'
      );
    }
  };

  const handleToggleDocxImage = (item: (typeof allDocxCandidates)[number]) => {
    const exists = project.media.some((m) => m.url === item.url);
    if (exists) {
      setProjectMedia(
        project.id,
        project.media.filter((m) => m.url !== item.url)
      );
    } else {
      setProjectMedia(project.id, [item, ...project.media]);
    }
  };

  const handleMoveFirst = (mediaId: string) => {
    const target = project.media.find((m) => m.id === mediaId);
    if (!target) return;
    setProjectMedia(project.id, [
      target,
      ...project.media.filter((m) => m.id !== mediaId),
    ]);
  };

  const addFilesToLibrary = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setLibraryError('Hãy chọn hoặc dán ít nhất một file ảnh.');
      return;
    }

    setLibraryError(null);
    try {
      const imported = await Promise.all(imageFiles.map(async (file) => ({
        id: crypto.randomUUID(),
        url: await imageFileToDataUrl(file),
        caption: file.name,
        originalDocxMediaName: file.name,
        sourceType: 'user-uploaded' as const,
      })));
      for (const item of imported) await savePortfolioLibraryImage(item);
      setSavedLibraryItems((current) => [...imported, ...current]);
    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? `${error.message} Hãy thử ảnh nhỏ hơn hoặc sao lưu rồi xóa bớt ảnh cũ.`
          : 'Không thể lưu ảnh vào thư viện trên máy này.',
      );
    }
  };

  const handleDeleteLibraryImage = async (item: ProjectMediaItem) => {
    // If it's a saved library image (has id in savedLibraryItems), delete from IndexedDB
    const isSaved = savedLibraryItems.some((s) => s.id === item.id);
    if (isSaved) {
      try {
        await deletePortfolioLibraryImage(item.id);
        setSavedLibraryItems((prev) => prev.filter((s) => s.id !== item.id));
      } catch {
        setLibraryError('Không thể xóa ảnh khỏi thư viện.');
      }
    }
    // Also remove from current project media if attached
    setProjectMedia(project.id, project.media.filter((m) => m.url !== item.url));
  };

  const handleClearSavedLibrary = async () => {
    try {
      await clearPortfolioLibrary();
      setSavedLibraryItems([]);
    } catch {
      setLibraryError('Không thể xóa toàn bộ thư viện.');
    }
  };

  const handleLibraryPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (files.length === 0) return;
    event.preventDefault();
    void addFilesToLibrary(files);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    void addFilesToLibrary(files);
  };

  return (
    <div
      ref={managerRef}
      role="region"
      data-testid="project-image-manager"
      data-project-id={project.id}
      className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5"
      onPaste={handleLibraryPaste}
      tabIndex={0}
      aria-label={`Bộ quản lý ảnh ${project.title}. Có thể dán ảnh vào thư viện.`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
          Quản lý Hình ảnh Bài tập
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-stone-500">
            {project.media.length} ảnh đang gắn
          </span>
          <button
            type="button"
            disabled={project.media.length === 0}
            onClick={() => setProjectMedia(project.id, [])}
            aria-label="Gỡ tất cả ảnh khỏi bài tập"
            title={
              project.media.length === 0
                ? 'Bài tập chưa có ảnh để gỡ'
                : 'Gỡ tất cả ảnh khỏi bài tập'
            }
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            <span>Gỡ ảnh</span>
          </button>
        </div>
      </div>

      {/* In-app Confirm Dialog — Xóa toàn bộ thư viện */}
      {showClearConfirm && (
        <div className="mb-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <Trash2 className="h-4 w-4 text-rose-600" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold text-rose-800">Xóa toàn bộ thư viện đã lưu?</p>
              <p className="text-xs text-rose-700">
                Sẽ xóa vĩnh viễn <strong>{savedLibraryItems.length} ảnh</strong> đang được lưu trên máy này. Thao tác này không thể hoàn tác.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                setShowClearConfirm(false);
                void handleClearSavedLibrary();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa tất cả
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-xl bg-stone-200/70 p-1">        <button
          type="button"
          aria-pressed={tab === 'library'}
          onClick={() => { setTab('library'); setGenError(null); }}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${tab === 'library' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}
        >
          <Images className="h-3.5 w-3.5" />
          <span>Thư viện ảnh</span>
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">{libraryItems.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={tab === 'docx'}
          onClick={() => {
            setTab('docx');
            setGenError(null);
          }}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            tab === 'docx' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Ảnh từ DOCX</span>
          {allDocxCandidates.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">
              {allDocxCandidates.length}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-pressed={tab === 'ai'}
          onClick={() => {
            setTab('ai');
            setGenError(null);
          }}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            tab === 'ai' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>AI Image Studio</span>
        </button>
      </div>

      {/* Skeleton loading indicator while AI image is generating */}
      {isGenerating && (
        <div
          className="mb-3 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-2"
          aria-live="polite"
        >
          <div className="h-10 w-12 shrink-0 animate-pulse rounded-lg bg-amber-200/80" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-3/4 animate-pulse rounded bg-amber-200/80" />
            <p className="text-[11px] font-medium text-amber-800">
              AI đang vẽ ảnh minh họa cho bài tập...
            </p>
          </div>
        </div>
      )}

      {/* Active media order strip */}
      {project.media.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-stone-500">
            Thứ tự hiển thị trên Portfolio (kéo để sắp xếp):
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleMediaDragEnd}
          >
            <SortableContext
              items={project.media.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {project.media.map((m, idx) => (
                  <SortableMediaRow
                    key={m.id}
                    m={m}
                    idx={idx}
                    project={project}
                    handleMoveFirst={handleMoveFirst}
                    setProjectMedia={setProjectMedia}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {tab === 'library' ? (
        <div className="space-y-2">
          <p className="text-[10px] text-stone-500">Ảnh của tất cả bài tập đều có thể dùng cho bài này.</p>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] text-stone-500">Ảnh của tất cả bài tập đều có thể dùng cho bài này.</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
              <input ref={folderInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700 hover:bg-stone-100">
                <ImagePlus className="h-3 w-3" /> Thêm ảnh
              </button>
              <button type="button" onClick={() => {
                folderInputRef.current?.setAttribute('webkitdirectory', '');
                folderInputRef.current?.setAttribute('directory', '');
                folderInputRef.current?.click();
              }} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700 hover:bg-stone-100">
                <FolderOpen className="h-3 w-3" /> Chọn folder
              </button>
              {savedLibraryItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-100"
                  title="Xóa toàn bộ thư viện đã lưu"
                >
                  <Trash2 className="h-3 w-3" /> Xóa tất cả
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-stone-400">Ảnh trong thư viện có thể dùng lại ở mọi bài tập trên máy này. Bấm vào vùng quản lý rồi nhấn Ctrl+V để dán ảnh đã sao chép. Hover vào ảnh để xóa khỏi thư viện.</p>
          {libraryError && <p role="alert" className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] text-rose-700">{libraryError}</p>}
          {libraryItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-white p-3 text-center text-xs text-stone-500">Chưa có ảnh trong thư viện. Tạo ảnh AI hoặc nhập ảnh DOCX để bắt đầu.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {libraryItems.map(({ item, projectTitle }) => {
                const isSelected = project.media.some((m) => m.url === item.url);
                const isSavedLib = savedLibraryItems.some((s) => s.id === item.id);
                return (
                  <div key={item.url} className="group relative overflow-hidden rounded-xl border-2 border-stone-200 transition hover:border-stone-300">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) setProjectMedia(project.id, project.media.filter((m) => m.url !== item.url));
                        else setProjectMedia(project.id, [{ ...item, id: crypto.randomUUID() }, ...project.media]);
                      }}
                      className={`w-full text-left rounded-xl border-2 transition ${isSelected ? 'border-emerald-600 ring-2 ring-inset ring-emerald-500' : 'border-stone-200'}`}
                    >
                      <img src={item.url} alt={item.caption || ''} className="aspect-[4/3] w-full object-cover" />
                      <span className={`absolute right-7 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow ${isSelected ? 'bg-emerald-600' : 'bg-stone-700/70'}`}>
                        {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </span>
                      <span className="block truncate bg-white px-2 py-1 text-[10px] text-stone-600">{projectTitle}</span>
                    </button>
                    {/* Delete button — only for saved library images */}
                    {isSavedLib && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteLibraryImage(item);
                        }}
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white opacity-0 shadow transition group-hover:opacity-100"
                        title="Xóa ảnh khỏi thư viện"
                        aria-label="Xóa ảnh khỏi thư viện"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === 'docx' ? (
        <div className="space-y-2">
          {allDocxCandidates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-white p-3 text-center text-xs text-stone-500">
              Bài tập này chưa có ảnh nhúng từ file .docx. Hãy chuyển sang tab{' '}
              <strong>AI Image Studio</strong> để tạo ảnh minh họa theo chủ đề!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allDocxCandidates.map((item) => {
                const isSelected = project.media.some((m) => m.url === item.url);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleDocxImage(item)}
                    className={`group relative overflow-hidden rounded-xl border-2 text-left transition ${
                      isSelected ? 'border-emerald-600' : 'border-stone-200 opacity-75'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.caption || ''}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <span
                      className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow ${
                        isSelected ? 'bg-emerald-600' : 'bg-stone-700/70'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-stone-700">
              Phong cách ảnh AI
            </label>
            <select
              value={styleChoice}
              onChange={(e) => {
                const val = e.target.value as VisualStyle;
                setStyleChoice(val);
                updateProject(project.id, { preferredImageStyle: val });
              }}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
            >
              <option value="canva-pastel-graphic">Canva Pastel Graphic</option>
              <option value="editorial-illustration">Editorial Flat Illustration</option>
              <option value="3d-render">3D Isometric Render</option>
              <option value="minimal-photo">Minimalist Photo</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700">
              Câu lệnh mô tả ảnh theo chủ đề (Prompt)
            </label>
            <textarea
              rows={3}
              value={promptInput}
              onChange={(e) => {
                setGenError(null);
                setPromptInput(e.target.value);
                updateProject(project.id, { suggestedAiImagePrompt: e.target.value });
              }}
              placeholder="Mô tả nội dung bức ảnh minh họa bằng tiếng Việt hoặc tiếng Anh..."
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-amber-500"
            />
          </div>

          {genError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {genError}
            </p>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateAi}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang tạo ảnh AI mới...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                <span>✨ Tạo ảnh AI ngay</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
