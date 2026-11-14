'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { ArrowRight, FileUp, FolderOpen, Loader2, Pencil, Save, Trash2, X } from 'lucide-react';
import {
  deletePortfolioDraft,
  listPortfolioDrafts,
  renamePortfolioDraft,
  setActivePortfolioDraftId,
  writePortfolioDraft,
  type PortfolioDraftRecord,
} from '@/services/browser/portfolio-draft';
import { PortfolioDocumentSchema } from '@/schema/portfolio.schema';
import {
  PORTFOLIO_SOURCE_MANIFEST_FILENAME,
  PortfolioSourceManifestSchema,
} from '@/schema/portfolio-archive.schema';
import { DraftDeleteConfirmation } from './DraftDeleteConfirmation';

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
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {drafts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDrafts.map((draft) => (
            <article key={draft.id} className="group flex min-w-0 items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2 transition hover:border-[#A96B54]/40 hover:bg-white">
              {editingDraftId === draft.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1"
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
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
                  />
                  <button type="submit" onClick={() => void saveDraftName(draft)} disabled={renaming || !nameDraft.trim()} aria-label="Lưu tên dự án" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
                    <Save className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={renaming} onClick={() => setEditingDraftId(null)} aria-label="Hủy đổi tên dự án" className="rounded-lg p-2 text-stone-500 hover:bg-stone-200 disabled:opacity-40">
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <Link href={`/studio?draft=${encodeURIComponent(draft.id)}`} className="flex min-w-0 flex-1 items-center gap-3 p-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A96B54]/10 text-[#A96B54]"><FolderOpen className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-semibold text-stone-900">{draft.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${draft.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {draft.status === 'completed' ? 'Hoàn thành' : 'Nháp'}
                      </span>
                    </span>
                    <span className="block truncate text-[11px] text-stone-500">/{draft.document.slug} · {new Date(draft.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#A96B54]" />
                </Link>
              )}
              {editingDraftId !== draft.id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDraftId(draft.id);
                    setNameDraft(draft.name);
                  }}
                  className="shrink-0 rounded-lg p-2 text-stone-400 transition hover:bg-amber-50 hover:text-amber-700"
                  aria-label={`Đổi tên dự án ${draft.name}`}
                  title="Đổi tên dự án"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPendingDraft(draft)}
                className="shrink-0 rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                aria-label={`Xóa bản nháp ${draft.name}`}
                title="Xóa dự án"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
