'use client';

import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Check, Copy, Download, FileUp, FolderOpen, Trash2, X } from 'lucide-react';
import {
  deletePortfolioDraft,
  listPortfolioDrafts,
  writePortfolioDraft,
  type PortfolioDraftRecord,
} from '@/services/browser/portfolio-draft';
import { PortfolioDocumentSchema, type PortfolioDocument } from '@/schema/portfolio.schema';
import { sanitizeSlug } from '@/utils/slug';
import {
  PORTFOLIO_SOURCE_FORMAT,
  PORTFOLIO_SOURCE_MANIFEST_FILENAME,
  PORTFOLIO_SOURCE_VERSION,
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
        className="inline-block text-sm font-semibold text-stone-900"
      >
        {text}
      </span>
    </div>
  );
}

interface DraftLibraryDialogProps {
  open: boolean;
  currentDraftId: string | null;
  onClose: () => void;
  onOpenDraft: (draft: PortfolioDraftRecord) => void;
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
        : reject(new Error('Không đọc được dữ liệu media trong ZIP.'));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được dữ liệu media trong ZIP.'));
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
    if (!entry) {
      return value;
    }
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

export function DraftLibraryDialog({
  open,
  currentDraftId,
  onClose,
  onOpenDraft,
}: DraftLibraryDialogProps) {
  const [drafts, setDrafts] = useState<PortfolioDraftRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PortfolioDraftRecord | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

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
        // offline fallback
      }

      await refresh();
      setFeedbackMessage(`Đã nhân bản: "${copyName}" (Link Studio: /studio?draft=${copyId})`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (dupError) {
      setError(dupError instanceof Error ? dupError.message : 'Không thể nhân bản dự án.');
    }
  };

  const refresh = async () => {
    try {
      setDrafts(await listPortfolioDrafts());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không đọc được danh sách bản nháp.');
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const exportBackup = () => {
    const backup = {
      format: 'ai-portfolio-factory-backup',
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      drafts,
    };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      let restored = 0;
      let lastRestoredDraft: PortfolioDraftRecord | null = null;

      const isZip =
        file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';

      if (isZip) {
        // --- XỬ LÝ FILE ZIP ---
        const zip = await JSZip.loadAsync(file);

        // Tìm tất cả manifest (portfolio-source.json) hoặc các file JSON có trong ZIP
        const manifestEntries = Object.values(zip.files).filter(
          (entry) => !entry.dir && entry.name.split('/').pop() === PORTFOLIO_SOURCE_MANIFEST_FILENAME,
        );

        if (manifestEntries.length > 0) {
          for (const entry of manifestEntries) {
            try {
              const rawText = await entry.async('string');
              const rawJson = JSON.parse(rawText) as unknown;
              const parsedManifest = PortfolioSourceManifestSchema.safeParse(rawJson);
              if (!parsedManifest.success) continue;

              const manifestDirectory = entry.name.includes('/')
                ? entry.name.slice(0, entry.name.lastIndexOf('/') + 1)
                : '';
              const restoredDoc = await restoreZipAssets(
                parsedManifest.data.document,
                zip,
                manifestDirectory,
              );
              const validatedDoc = PortfolioDocumentSchema.safeParse(restoredDoc);
              if (!validatedDoc.success) continue;

              const doc = validatedDoc.data;
              const id = doc.slug || `draft-${crypto.randomUUID()}`;
              const name = doc.profileOwner?.fullName || doc.seo?.title || doc.slug;
              await writePortfolioDraft(doc, [], [], id, {
                name,
                status: 'draft',
                activate: true,
              });
              restored += 1;
              lastRestoredDraft = {
                id,
                name,
                status: 'draft',
                document: doc,
                history: [],
                future: [],
                updatedAt: new Date().toISOString(),
              };
            } catch {
              // Bỏ qua entry lỗi nếu có nhiều manifest
            }
          }
        } else {
          // Nếu ZIP không có portfolio-source.json chuẩn, tìm bất kỳ file .json nào trong ZIP
          const jsonEntries = Object.values(zip.files).filter(
            (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.json'),
          );

          for (const entry of jsonEntries) {
            try {
              const rawText = await entry.async('string');
              const rawJson = JSON.parse(rawText) as unknown;
              const singleDocCandidate =
                rawJson && typeof rawJson === 'object' && ('portfolio' in rawJson || 'document' in rawJson)
                  ? (rawJson as Record<string, unknown>).portfolio ?? (rawJson as Record<string, unknown>).document
                  : rawJson;

              const parsedSingle = PortfolioDocumentSchema.safeParse(singleDocCandidate);
              if (parsedSingle.success) {
                const doc = parsedSingle.data;
                const id = doc.slug || `draft-${crypto.randomUUID()}`;
                const name = doc.profileOwner?.fullName || doc.seo?.title || doc.slug;
                await writePortfolioDraft(doc, [], [], id, {
                  name,
                  status: 'draft',
                  activate: true,
                });
                restored += 1;
                lastRestoredDraft = {
                  id,
                  name,
                  status: 'draft',
                  document: doc,
                  history: [],
                  future: [],
                  updatedAt: new Date().toISOString(),
                };
                break; // Tìm thấy 1 doc hợp lệ là đủ
              }
            } catch {
              // Tiếp tục tìm file json khác trong zip
            }
          }
        }

        if (restored === 0) {
          throw new Error('File ZIP không chứa dữ liệu nguồn portfolio hợp lệ (thiếu portfolio-source.json).');
        }
      } else {
        // --- XỬ LÝ FILE JSON ---
        const rawText = await file.text();
        let rawJson: unknown;
        try {
          rawJson = JSON.parse(rawText);
        } catch {
          throw new Error('Tập tin không phải là JSON hợp lệ.');
        }

        // Trường hợp 1: File sao lưu chuẩn (ai-portfolio-factory-backup)
        if (
          rawJson &&
          typeof rawJson === 'object' &&
          'format' in rawJson &&
          (rawJson as Record<string, unknown>).format === 'ai-portfolio-factory-backup' &&
          Array.isArray((rawJson as Record<string, unknown>).drafts)
        ) {
          const backupDrafts = (rawJson as unknown as { drafts: Array<Partial<PortfolioDraftRecord>> }).drafts;
          for (const item of backupDrafts) {
            const parsed = PortfolioDocumentSchema.safeParse(item.document);
            if (!parsed.success) continue;
            const id = typeof item.id === 'string' ? item.id : parsed.data.slug;
            const history = Array.isArray(item.history)
              ? item.history.map((entry) => PortfolioDocumentSchema.safeParse(entry)).filter((entry) => entry.success).map((entry) => entry.data)
              : [];
            const future = Array.isArray(item.future)
              ? item.future.map((entry) => PortfolioDocumentSchema.safeParse(entry)).filter((entry) => entry.success).map((entry) => entry.data)
              : [];
            const name = typeof item.name === 'string' ? item.name : parsed.data.profileOwner?.fullName || parsed.data.seo?.title || parsed.data.slug;
            const status = item.status === 'completed' ? 'completed' : 'draft';
            await writePortfolioDraft(parsed.data, history, future, id, {
              name,
              status,
              ...(item.status === 'completed'
                ? {
                    ...(item.completionReason === 'published' || item.completionReason === 'zip-exported'
                      ? { completionReason: item.completionReason }
                      : {}),
                    ...(typeof item.completedAt === 'string'
                      ? { completedAt: item.completedAt }
                      : {}),
                  }
                : {}),
            });
            restored += 1;
            lastRestoredDraft = {
              id,
              name,
              status,
              document: parsed.data,
              history,
              future,
              updatedAt: new Date().toISOString(),
            };
          }
        } else {
          // Trường hợp 2: File JSON chứa trực tiếp PortfolioDocument (hoặc lồng trong { portfolio: ... } / { document: ... })
          const singleDocCandidate =
            rawJson && typeof rawJson === 'object' && ('portfolio' in rawJson || 'document' in rawJson)
              ? (rawJson as Record<string, unknown>).portfolio ?? (rawJson as Record<string, unknown>).document
              : rawJson;

          const parsedSingle = PortfolioDocumentSchema.safeParse(singleDocCandidate);

          if (parsedSingle.success) {
            const doc = parsedSingle.data;
            const id = doc.slug || `draft-${crypto.randomUUID()}`;
            const name = doc.profileOwner?.fullName || doc.seo?.title || doc.slug;
            await writePortfolioDraft(doc, [], [], id, {
              name,
              status: 'draft',
              activate: true,
            });
            restored = 1;
            lastRestoredDraft = {
              id,
              name,
              status: 'draft',
              document: doc,
              history: [],
              future: [],
              updatedAt: new Date().toISOString(),
            };
          } else {
            // Trường hợp 3: Danh sách danh mục portfolio dạng mảng [ ... ] hoặc { portfolios: [ ... ] }
            const listCandidate = Array.isArray(rawJson)
              ? rawJson
              : rawJson && typeof rawJson === 'object' && Array.isArray((rawJson as Record<string, unknown>).portfolios)
                ? ((rawJson as Record<string, unknown>).portfolios as unknown[])
                : null;

            if (listCandidate && listCandidate.length > 0) {
              for (const item of listCandidate) {
                const docCandidate =
                  item && typeof item === 'object' && 'document' in item
                    ? (item as Record<string, unknown>).document
                    : item;
                const parsed = PortfolioDocumentSchema.safeParse(docCandidate);
                if (!parsed.success) continue;
                const doc = parsed.data;
                const id = doc.slug || `draft-${crypto.randomUUID()}`;
                const name = doc.profileOwner?.fullName || doc.seo?.title || doc.slug;
                await writePortfolioDraft(doc, [], [], id, {
                  name,
                  status: 'draft',
                });
                restored += 1;
                lastRestoredDraft = {
                  id,
                  name,
                  status: 'draft',
                  document: doc,
                  history: [],
                  future: [],
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          }
        }

        if (restored === 0) {
          throw new Error('File JSON không đúng cấu trúc PortfolioDocument hoặc không chứa bản nháp hợp lệ.');
        }
      }

      await refresh();

      // Nếu người dùng import một file JSON portfolio cụ thể, mở trực tiếp vào Studio luôn
      if (restored === 1 && lastRestoredDraft) {
        onOpenDraft(lastRestoredDraft);
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Không thể khôi phục file sao lưu.');
    } finally {
      setWorking(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const removeDraft = async () => {
    if (!pendingDraft) return;
    setWorking(true);
    setError(null);
    try {
      await deletePortfolioDraft(pendingDraft.id);
      await refresh();
      setPendingDraft(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không xóa được bản nháp.');
    } finally {
      setWorking(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="draft-library-title" className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div>
            <h2 id="draft-library-title" className="font-semibold text-stone-900">Dự án đang làm trên máy này</h2>
            <p className="text-xs text-stone-500">Bản nháp, ảnh và lịch sử chỉnh sửa được lưu trong trình duyệt.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Đóng"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-stone-100 px-4 py-3">
          <button type="button" onClick={exportBackup} disabled={!drafts.length || working} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><Download className="h-3.5 w-3.5" />Tải bản sao lưu</button>
          <input ref={importRef} type="file" accept=".zip,.json,application/zip,application/x-zip-compressed,application/json" className="hidden" onChange={(event) => void importBackup(event.currentTarget.files?.[0])} />
          <button type="button" onClick={() => importRef.current?.click()} disabled={working} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40" title="Khôi phục trực tiếp từ file ZIP hoặc JSON portfolio"><FileUp className="h-3.5 w-3.5 text-indigo-600" />Khôi phục từ ZIP / JSON</button>
        </div>

        {feedbackMessage && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800 shadow-sm">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}
        {error && <p role="alert" className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <div className="max-h-[55vh] space-y-2.5 overflow-y-auto p-4">
          {drafts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">Chưa có bản nháp đã lưu. Các thay đổi trong Studio sẽ tự xuất hiện ở đây.</p>
          ) : drafts.map((draft) => (
            <article key={draft.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 hover:border-stone-300 transition hover:bg-stone-50/50">
              <FolderOpen className="h-5 w-5 shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <MarqueeDraftTitle text={draft.name} />
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${draft.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {draft.status === 'completed' ? 'Hoàn thành' : 'Nháp'}
                  </span>
                </div>
                <p className="truncate text-[11px] text-stone-500 mt-0.5">/{draft.document.slug} · cập nhật {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className="hidden text-[10px] text-stone-400 sm:inline">{draft.history.length} bước</span>
              <button
                type="button"
                onClick={() => void duplicateDraft(draft)}
                className="rounded-lg p-2 text-stone-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                title="Nhân bản (Tạo bản copy dự án)"
                aria-label={`Tạo bản copy của ${draft.name}`}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onOpenDraft(draft)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${draft.id === currentDraftId ? 'bg-indigo-50 text-indigo-700' : 'bg-stone-900 text-white hover:bg-stone-700'}`}>{draft.id === currentDraftId ? 'Đang mở' : 'Mở'}</button>
              <button type="button" onClick={() => setPendingDraft(draft)} disabled={working} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50" aria-label={`Xóa ${draft.name}`}><Trash2 className="h-4 w-4" /></button>
            </article>
          ))}
        </div>
        <footer className="border-t border-stone-100 px-4 py-3 text-[11px] text-stone-500">Hỗ trợ khôi phục dự án trực tiếp từ file nén ZIP đã xuất hoặc file JSON portfolio để chỉnh sửa tiếp ngay lập tức.</footer>
      </section>
      {pendingDraft && (
        <DraftDeleteConfirmation
          draftName={pendingDraft.name}
          busy={working}
          onCancel={() => setPendingDraft(null)}
          onConfirm={() => void removeDraft()}
        />
      )}
    </div>
  );
}
