import type { ProjectMediaItem } from "@/schema/portfolio.schema";
import JSZip from "jszip";

const DATABASE_NAME = "portfolio-studio-image-library";
const STORE_NAME = "images";

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không mở được thư viện ảnh."));
  });
}

export async function listPortfolioLibraryImages(): Promise<ProjectMediaItem[]> {
  const db = await openLibrary();
  try {
    const values = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error ?? new Error("Không đọc được thư viện ảnh."));
    });
    return values.filter(
      (value): value is ProjectMediaItem =>
        Boolean(value) &&
        typeof value === "object" &&
        typeof (value as ProjectMediaItem).id === "string" &&
        typeof (value as ProjectMediaItem).url === "string",
    );
  } finally {
    db.close();
  }
}

export async function savePortfolioLibraryImage(item: ProjectMediaItem): Promise<void> {
  const db = await openLibrary();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không lưu được ảnh vào thư viện."));
      tx.onabort = () => reject(tx.error ?? new Error("Lưu ảnh vào thư viện bị hủy."));
    });
  } finally {
    db.close();
  }
}

export async function deletePortfolioLibraryImage(id: string): Promise<void> {
  const db = await openLibrary();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không xóa được ảnh khỏi thư viện."));
      tx.onabort = () => reject(tx.error ?? new Error("Xóa ảnh khỏi thư viện bị hủy."));
    });
  } finally {
    db.close();
  }
}

export async function clearPortfolioLibrary(): Promise<void> {
  const db = await openLibrary();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không xóa được thư viện."));
    });
  } finally {
    db.close();
  }
}

export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Không đọc được nội dung ảnh."));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh."));
    reader.readAsDataURL(file);
  });
}

/**
 * Extract embedded images from a Word (.docx) document in the browser using JSZip.
 */
export async function extractImagesFromDocxFile(file: File): Promise<ProjectMediaItem[]> {
  const zip = await JSZip.loadAsync(file);
  const mediaFolder = zip.folder("word/media");
  if (!mediaFolder) return [];

  const entries: { name: string; zipEntry: JSZip.JSZipObject }[] = [];
  mediaFolder.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && relativePath.match(/\.(png|jpe?g|webp|gif|svg|bmp)$/i)) {
      entries.push({ name: relativePath, zipEntry });
    }
  });

  entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  const results: ProjectMediaItem[] = [];
  const baseName = file.name.replace(/\.docx$/i, "");

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const filename = entry.name.split("/").pop() || entry.name;
    const ext = filename.split(".").pop()?.toLowerCase() || "png";
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
        ? "image/webp"
        : ext === "gif"
        ? "image/gif"
        : ext === "svg"
        ? "image/svg+xml"
        : ext === "bmp"
        ? "image/bmp"
        : "image/png";

    const base64 = await entry.zipEntry.async("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    results.push({
      id: crypto.randomUUID(),
      url: dataUrl,
      caption: `${baseName} - Ảnh ${i + 1}`,
      originalDocxMediaName: filename,
      sourceType: "docx-extracted",
    });
  }

  return results;
}
