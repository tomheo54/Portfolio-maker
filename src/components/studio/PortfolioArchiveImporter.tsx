"use client";

import { useState } from "react";
import JSZip from "jszip";
import { Archive, FileUp, LoaderCircle } from "lucide-react";
import { PortfolioDocumentSchema, type PortfolioDocument } from "@/schema/portfolio.schema";
import {
  PORTFOLIO_SOURCE_FORMAT,
  PORTFOLIO_SOURCE_MANIFEST_FILENAME,
  PortfolioSourceManifestSchema,
  PORTFOLIO_SOURCE_VERSION,
} from "@/schema/portfolio-archive.schema";

interface PortfolioArchiveImporterProps {
  onImported: (document: PortfolioDocument) => void;
  className?: string;
}

interface ArchiveCandidate {
  zip: JSZip;
  manifestPath: string;
  displayName: string;
}

function mimeTypeForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    ico: "image/x-icon",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return types[extension ?? ""] ?? "application/octet-stream";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Không đọc được ảnh trong ZIP."));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh trong ZIP."));
    reader.readAsDataURL(blob);
  });
}

async function restoreArchiveAssets(
  value: unknown,
  zip: JSZip,
  manifestDirectory: string,
): Promise<unknown> {
  if (typeof value === "string") {
    const prefix = "portfolio-asset:";
    if (!value.startsWith(prefix)) return value;

    const relativePath = value.slice(prefix.length).replace(/^\/+/, "");
    const zipPath = `${manifestDirectory}${relativePath}`;
    const entry = zip.file(zipPath);
    if (!entry) {
      throw new Error(`ZIP bị thiếu ảnh nguồn: ${relativePath}`);
    }
    const mimeType = mimeTypeForPath(relativePath);
    const blob = await entry.async("blob");
    return blobToDataUrl(blob.slice(0, blob.size, mimeType));
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => restoreArchiveAssets(item, zip, manifestDirectory)));
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, nestedValue]) => [
        key,
        await restoreArchiveAssets(nestedValue, zip, manifestDirectory),
      ] as const),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

export function PortfolioArchiveImporter({
  onImported,
  className = "",
}: PortfolioArchiveImporterProps) {
  const [candidates, setCandidates] = useState<ArchiveCandidate[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const importCandidate = async (candidate: ArchiveCandidate) => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const manifestFile = candidate.zip.file(candidate.manifestPath);
      if (!manifestFile) throw new Error("Không đọc được manifest của Portfolio trong ZIP.");

      const rawManifest: unknown = JSON.parse(await manifestFile.async("string"));
      if (
        !rawManifest ||
        typeof rawManifest !== "object" ||
        (rawManifest as { format?: unknown }).format !== PORTFOLIO_SOURCE_FORMAT
      ) {
        throw new Error("ZIP không phải gói Portfolio do AI Portfolio Factory xuất.");
      }
      if ((rawManifest as { version?: unknown }).version !== PORTFOLIO_SOURCE_VERSION) {
        throw new Error(
          `Phiên bản ZIP ${String((rawManifest as { version?: unknown }).version)} chưa được hỗ trợ.`,
        );
      }
      const parsed = PortfolioSourceManifestSchema.safeParse(rawManifest);
      if (!parsed.success) throw new Error("Dữ liệu nguồn trong ZIP không hợp lệ hoặc không đầy đủ.");

      const manifestDirectory = candidate.manifestPath.includes("/")
        ? candidate.manifestPath.slice(0, candidate.manifestPath.lastIndexOf("/") + 1)
        : "";
      const restored = await restoreArchiveAssets(
        parsed.data.document,
        candidate.zip,
        manifestDirectory,
      );
      const validated = PortfolioDocumentSchema.safeParse(restored);
      if (!validated.success) {
        throw new Error("Dữ liệu nguồn trong ZIP không hợp lệ hoặc không đầy đủ.");
      }

      onImported(validated.data);
      setCandidates([]);
      setStatus(`Đã nhập “${validated.data.profileOwner?.fullName || validated.data.seo.title}” vào Studio.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể nhập ZIP này.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setError("");
    setStatus("");
    setCandidates([]);
    try {
      const zip = await JSZip.loadAsync(file);
      const manifests = Object.values(zip.files).filter(
        (entry) => !entry.dir && entry.name.split("/").pop() === PORTFOLIO_SOURCE_MANIFEST_FILENAME,
      );
      if (manifests.length === 0) {
        throw new Error(
          "ZIP cũ này không có dữ liệu nguồn để chỉnh sửa. Hãy mở bản Portfolio còn lưu trong Studio hoặc dùng ZIP được xuất sau bản cập nhật.",
        );
      }

      const nextCandidates = manifests.map((entry) => ({
        zip,
        manifestPath: entry.name,
        displayName: entry.name.includes("/")
          ? entry.name.slice(0, entry.name.lastIndexOf("/"))
          : file.name.replace(/\.zip$/i, ""),
      }));
      if (nextCandidates.length === 1) {
        await importCandidate(nextCandidates[0]);
      } else {
        setCandidates(nextCandidates);
        setStatus("ZIP này có nhiều Portfolio. Chọn bản muốn mở trong Studio.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể mở file ZIP này.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Archive className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">Mở Portfolio đã xuất</p>
          <p className="mt-1 text-sm text-slate-500">
            Chọn ZIP để khôi phục nội dung và ảnh rồi tiếp tục chỉnh sửa.
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileUp className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? "Đang đọc ZIP…" : "Chọn file ZIP"}
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={loading}
              onChange={(event) => {
                void handleFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {candidates.length > 1 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {candidates.map((candidate) => (
            <li key={candidate.manifestPath}>
              <button
                type="button"
                disabled={loading}
                onClick={() => void importCandidate(candidate)}
                className="w-full truncate rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
              >
                {candidate.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {status && <p role="status" className="mt-3 text-sm text-emerald-700">{status}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
