import type { ProjectMediaItem } from "@/schema/portfolio.schema";

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
