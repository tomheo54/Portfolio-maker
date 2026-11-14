'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { ArrowRight, Check, Copy, ExternalLink, FileUp, FolderOpen, Loader2, Pencil, Save, Trash2, X } from 'lucide-react';
import {
  deletePortfolioDraft,
  listPortfolioDrafts,
  renamePortfolioDraft,
  setActivePortfolioDraftId,
  writePortfolioDraft,
  type PortfolioDraftRecord,
} from '@/services/browser/portfolio-draft';
import { PortfolioDocumentSchema, type PortfolioDocument } from '@/schema/portfolio.schema';
import { sanitizeSlug } from '@/utils/slug';
import {
  PORTFOLIO_SOURCE_MANIFEST_FILENAME,
  PortfolioSourceManifestSchema,
} from '@/schema/portfolio-archive.schema';
import { DraftDeleteConfirmation } from './DraftDeleteConfirmation';

function MarqueeDraftTitle({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const update = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.clientWidth;
        setDistance(diff > 4 ? diff : 0);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden whitespace-nowrap"
      title={text}
    >
      <span
        ref={textRef}
        style={
          distance > 0
            ? ({
                '--marquee-dist': `-${distance + 14}px`,
                animation: 'draftTitleMarquee 6s ease-in-out infinite alternate',
              } as React.CSSProperties)
            : undefined
        }
        className="inline-block text-sm font-bold text-stone-900 group-hover:text-[#A96B54] transition-colors"
      >
        {text}
      </span>
    </div>
  );
}

function mimeTypeForPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };
  return types[extension ?? ''] ?? 'application/octet-stream';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Không đọc được media trong file ZIP.'));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được media trong file ZIP.'));
    reader.readAsDataURL(blob);
  });
}

async function restoreZipAssets(
  value: unknown,
  zip: JSZip,
  manifestDirectory: string,
): Promise<unknown> {
  if (typeof value === 'string') {
    const prefix = 'portfolio-asset:';
    if (!value.startsWith(prefix)) return value;

    const relativePath = value.slice(prefix.length).replace(/^\/+/, '');
    const zipPath = `${manifestDirectory}${relativePath}`;
    const entry = zip.file(zipPath);
    if (!entry) return value;
    const mimeType = mimeTypeForPath(relativePath);
    const blob = await entry.async('blob');
    return blobToDataUrl(blob.slice(0, blob.size, mimeType));
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => restoreZipAssets(item, zip, manifestDirectory)));
  }

  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, nestedValue]) => [
        key,
        await restoreZipAssets(nestedValue, zip, manifestDirectory),
      ] as const),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

export function RecentPortfolioDrafts() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<PortfolioDraftRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PortfolioDraftRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refreshDrafts = async () => {
    try {
      const list = await listPortfolioDrafts();
      setDrafts(list);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Không đọc được danh sách bản nháp.');
    }
  };

  useEffect(() => {
    void refreshDrafts();
  }, []);

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      let restoredDoc: unknown = null;
      let targetId = '';
      let targetName = '';

      const isZip =
        file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';

      if (isZip) {
        const zip = await JSZip.loadAsync(file);
        const manifestEntries = Object.values(zip.files).filter(
          (entry) => !entry.dir && entry.name.split('/').pop() === PORTFOLIO_SOURCE_MANIFEST_FILENAME,
        );

        if (manifestEntries.length > 0) {
          const entry = manifestEntries[0];
          const rawText = await entry.async('string');
          const rawJson = JSON.parse(rawText) as unknown;
          const parsedManifest = PortfolioSourceManifestSchema.safeParse(rawJson);
          if (parsedManifest.success) {
            const manifestDir = entry.name.includes('/')
              ? entry.name.slice(0, entry.name.lastIndexOf('/') + 1)
              : '';
            restoredDoc = await restoreZipAssets(parsedManifest.data.document, zip, manifestDir);
          }
        } else {
          const jsonEntries = Object.values(zip.files).filter(
            (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.json'),
          );
          for (const entry of jsonEntries) {
            try {
              const rawText = await entry.async('string');
              const rawJson = JSON.parse(rawText) as unknown;
              const candidate =
                rawJson && typeof rawJson === 'object' && ('portfolio' in rawJson || 'document' in rawJson)
                  ? (rawJson as Record<string, unknown>).portfolio ?? (rawJson as Record<string, unknown>).document
                  : rawJson;
              const parsed = PortfolioDocumentSchema.safeParse(candidate);
              if (parsed.success) {
                restoredDoc = parsed.data;
                break;
              }
            } catch {
              // Tiếp tục tìm
            }
          }
        }
      } else {
        const rawText = await file.text();
        const rawJson = JSON.parse(rawText) as unknown;
        const rawJsonRecord = rawJson && typeof rawJson === 'object' ? (rawJson as Record<string, unknown>) : null;
        if (
          rawJsonRecord &&
          rawJsonRecord.format === 'ai-portfolio-factory-backup' &&
          Array.isArray(rawJsonRecord.drafts) &&
          rawJsonRecord.drafts.length > 0
        ) {
          const firstBackup = rawJsonRecord.drafts[0] as { document?: unknown; id?: string; name?: string };
          restoredDoc = firstBackup.document;
          targetId = firstBackup.id || '';
          targetName = firstBackup.name || '';
        } else {
          restoredDoc =
            rawJsonRecord && ('portfolio' in rawJsonRecord || 'document' in rawJsonRecord)
              ? rawJsonRecord.portfolio ?? rawJsonRecord.document
              : rawJson;
        }
      }

      const validated = PortfolioDocumentSchema.safeParse(restoredDoc);
      if (!validated.success) {
        throw new Error('Tập tin không chứa dữ liệu portfolio hợp lệ (.zip hoặc .json).');
      }

      const doc = validated.data;
      const finalId = targetId || doc.slug || `draft-${crypto.randomUUID()}`;
      const finalName = targetName || doc.profileOwner?.fullName || doc.seo?.title || doc.slug;

      await writePortfolioDraft(doc, [], [], finalId, {
        name: finalName,
        status: 'draft',
        activate: true,
      });

      setActivePortfolioDraftId(finalId);
      router.push(`/studio?draft=${encodeURIComponent(finalId)}`);
    } catch (importErr) {
      setError(importErr instanceof Error ? importErr.message : 'Không mở được file dự án này.');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const removeDraft = async () => {
    if (!pendingDraft) return;
    setDeleting(true);
    try {
      await deletePortfolioDraft(pendingDraft.id);
      setDrafts((currentDrafts) => currentDrafts.filter((item) => item.id !== pendingDraft.id));
      setError(null);
      setPendingDraft(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không xóa được bản nháp.');
    } finally {
      setDeleting(false);
    }
  };

  const saveDraftName = async (draft: PortfolioDraftRecord) => {
    setRenaming(true);
    try {
      await renamePortfolioDraft(draft.id, nameDraft);
      setDrafts((currentDrafts) =>
        currentDrafts.map((item) =>
          item.id === draft.id ? { ...item, name: nameDraft.trim() } : item,
        ),
      );
      setEditingDraftId(null);
      setError(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Không đổi được tên dự án.');
    } finally {
      setRenaming(false);
    }
  };

  const duplicateDraft = async (draft: PortfolioDraftRecord) => {
    try {
      const copyName = `Copy của ${draft.name}`;
      const baseSlug = draft.document.slug || sanitizeSlug(draft.name) || 'portfolio';
      const cleanBaseSlug = baseSlug.startsWith('copy-cua-') ? baseSlug : `copy-cua-${baseSlug}`;
      let copySlug = sanitizeSlug(cleanBaseSlug);
      let counter = 1;
      while (drafts.some((d) => d.id === copySlug || d.document.slug === copySlug)) {
        copySlug = sanitizeSlug(`${cleanBaseSlug}-${counter}`);
        counter += 1;
      }
      const copyId = copySlug;

      const clonedDoc: PortfolioDocument = JSON.parse(JSON.stringify(draft.document));
      clonedDoc.id = copyId;
      clonedDoc.slug = copySlug;
      if (clonedDoc.seo) {
        clonedDoc.seo.title = `Copy của ${clonedDoc.seo.title || draft.name}`;
      }
      if (clonedDoc.profileOwner) {
        clonedDoc.profileOwner.fullName = `Copy của ${clonedDoc.profileOwner.fullName || draft.name}`;
      }
      const hero = clonedDoc.sections?.find((s) => s.type === 'hero');
      if (hero && hero.type === 'hero') {
        hero.fullName = `Copy của ${hero.fullName || draft.name}`;
      }

      await writePortfolioDraft(
        clonedDoc,
        draft.history,
        [],
        copyId,
        {
          name: copyName,
          status: 'draft',
          activate: false,
        },
      );

      try {
        await fetch('/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clonedDoc),
        });
      } catch {
        // local / offline mode
      }

      await refreshDrafts();
      setFeedbackMessage(`Đã tạo bản sao: "${copyName}" (Link Studio: /studio?draft=${copyId})`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (dupError) {
      setError(dupError instanceof Error ? dupError.message : 'Không thể nhân bản dự án.');
    }
  };

  const visibleDrafts = libraryOpen ? drafts : drafts.slice(0, 3);

  return (
    <section aria-labelledby="recent-drafts-title" className="mx-auto mt-12 max-w-5xl rounded-3xl border border-[#3E2723]/10 bg-white/85 p-5 shadow-sm sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A96B54]">Đã lưu trên máy này</p>
          <h2 id="recent-drafts-title" className="mt-1 font-editorial text-xl font-bold text-[#3E2723]">Thư viện dự án</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,.json,application/zip,application/x-zip-compressed,application/json"
            className="hidden"
            onChange={(e) => void handleImportFile(e.currentTarget.files?.[0])}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#A96B54]/40 bg-white px-3.5 py-2 text-xs font-semibold text-[#735340] hover:bg-[#A96B54]/10 transition disabled:opacity-50 shadow-sm"
            title="Khôi phục / Nhập dự án từ file ZIP hoặc JSON"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A96B54]" /> : <FileUp className="h-3.5 w-3.5 text-[#A96B54]" />}
            <span>Khôi phục dự án (ZIP / JSON)</span>
          </button>

          <button
            type="button"
            aria-expanded={libraryOpen}
            onClick={() => setLibraryOpen((open) => !open)}
            className="rounded-full border border-[#A96B54]/30 bg-white px-3 py-2 text-xs font-semibold text-[#735340] hover:bg-[#A96B54]/5"
          >
            {libraryOpen ? 'Thu gọn thư viện' : 'Mở thư viện dự án'}
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {drafts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDrafts.map((draft) => (
            <article
              key={draft.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:border-[#A96B54]/50 hover:shadow-md"
            >
              {/* Top Row: Icon + Badge trạng thái tách biệt + Bộ nút hành động */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#A96B54]/10 text-[#A96B54]">
                    <FolderOpen className="h-4 w-4" />
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                      draft.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {draft.status === 'completed' ? '✓ Hoàn thành' : '✎ Bản nháp'}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void duplicateDraft(draft)}
                    className="rounded-lg p-1.5 text-stone-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Nhân bản (Tạo bản copy dự án)"
                    aria-label={`Tạo bản copy của ${draft.name}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  {editingDraftId !== draft.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDraftId(draft.id);
                        setNameDraft(draft.name);
                      }}
                      className="rounded-lg p-1.5 text-stone-400 transition hover:bg-amber-50 hover:text-amber-700"
                      title="Đổi tên dự án"
                      aria-label={`Đổi tên dự án ${draft.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPendingDraft(draft)}
                    className="rounded-lg p-1.5 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                    title="Xóa dự án"
                    aria-label={`Xóa bản nháp ${draft.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Middle Row: Tên dự án có Marquee chạy chữ toàn bộ chiều ngang */}
              {editingDraftId === draft.id ? (
                <form
                  className="flex min-w-0 items-center gap-1 py-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveDraftName(draft);
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Tên dự án"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={renaming || !nameDraft.trim()}
                    aria-label="Lưu tên dự án"
                    className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={renaming}
                    onClick={() => setEditingDraftId(null)}
                    aria-label="Hủy đổi tên dự án"
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <Link
                  href={`/studio?draft=${encodeURIComponent(draft.id)}`}
                  className="group/link block min-w-0 py-1"
                  title={`Mở Studio: ${draft.name}`}
                >
                  <MarqueeDraftTitle text={draft.name} />
                  <p className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="truncate font-mono opacity-80">/{draft.document.slug}</span>
                    <span className="shrink-0 text-[10px] opacity-70">
                      {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </p>
                </Link>
              )}

              {/* Bottom Row: Nút mở Studio và xem trang web xuất bản */}
              <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                <Link
                  href={`/studio?draft=${encodeURIComponent(draft.id)}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#735340] hover:text-[#A96B54] transition"
                >
                  <span>Mở chỉnh sửa</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href={`/${draft.document.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 transition"
                  title="Xem trang web đã xuất bản"
                >
                  <span>Xem trang</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {!libraryOpen && drafts.length > visibleDrafts.length && (
        <p className="mt-3 text-center text-xs text-stone-500">Đang xem {visibleDrafts.length} / {drafts.length} dự án gần đây</p>
      )}
      {pendingDraft && (
        <DraftDeleteConfirmation
          draftName={pendingDraft.name}
          busy={deleting}
          onCancel={() => setPendingDraft(null)}
          onConfirm={() => void removeDraft()}
        />
      )}
    </section>
  );
}
