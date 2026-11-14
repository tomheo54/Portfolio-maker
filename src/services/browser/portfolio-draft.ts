import {
  PortfolioDocumentSchema,
  type PortfolioDocument,
} from "@/schema/portfolio.schema";

const DATABASE_NAME = "portfolio-studio-drafts";
const LEGACY_STORE_NAME = "drafts";
const STORE_NAME = "drafts_v2";
const LEGACY_DRAFT_KEY = "current";
const ACTIVE_DRAFT_KEY = "portfolio-studio-active-draft";

export type PortfolioDraftStatus = "draft" | "completed";
export type PortfolioDraftCompletionReason = "published" | "zip-exported";

export interface PortfolioDraftRecord {
  id: string;
  name: string;
  status: PortfolioDraftStatus;
  completionReason?: PortfolioDraftCompletionReason;
  completedAt?: string;
  document: PortfolioDocument;
  history: PortfolioDocument[];
  future: PortfolioDocument[];
  updatedAt: string;
}

export interface PortfolioDraftMetadata {
  name?: string;
  status?: PortfolioDraftStatus;
  completionReason?: PortfolioDraftCompletionReason;
  completedAt?: string;
  activate?: boolean;
}

type StoredDraft = Omit<PortfolioDraftRecord, "document" | "history" | "future"> & {
  formatVersion: 1;
  document: unknown;
  history: unknown[];
  future: unknown[];
};

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        db.createObjectStore(LEGACY_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Không mở được kho bản nháp."));
  });
}

function parseDocument(value: unknown): PortfolioDocument | null {
  const parsed = PortfolioDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseStoredDraft(value: unknown, fallbackId: string): PortfolioDraftRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredDraft> & Partial<PortfolioDocument>;

  // Migrate the previous single-draft shape, which stored a PortfolioDocument directly.
  const document = parseDocument(candidate.document ?? value);
  if (!document) return null;

  const history = Array.isArray(candidate.history)
    ? candidate.history.map(parseDocument).filter((item): item is PortfolioDocument => Boolean(item))
    : [];
  const future = Array.isArray(candidate.future)
    ? candidate.future.map(parseDocument).filter((item): item is PortfolioDocument => Boolean(item))
    : [];

  return {
    id: typeof candidate.id === "string" ? candidate.id : fallbackId,
    name: typeof candidate.name === "string" ? candidate.name : document.profileOwner?.fullName || document.slug,
    status: candidate.status === "completed" ? "completed" : "draft",
    ...(candidate.status === "completed" &&
    (candidate.completionReason === "published" || candidate.completionReason === "zip-exported")
      ? { completionReason: candidate.completionReason }
      : {}),
    ...(candidate.status === "completed" && typeof candidate.completedAt === "string"
      ? { completedAt: candidate.completedAt }
      : {}),
    document,
    history: history.slice(-40),
    future: future.slice(0, 40),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không truy cập được bản nháp."));
  });
}

export function getActivePortfolioDraftId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_DRAFT_KEY);
}

export function setActivePortfolioDraftId(id: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_DRAFT_KEY, id);
  }
}

export async function listPortfolioDrafts(): Promise<PortfolioDraftRecord[]> {
  const db = await openDraftDatabase();
  try {
    const tx = db.transaction([STORE_NAME, LEGACY_STORE_NAME], "readonly");
    const [storedValues, legacyValue] = await Promise.all([
      requestResult(tx.objectStore(STORE_NAME).getAll()),
      requestResult(tx.objectStore(LEGACY_STORE_NAME).get(LEGACY_DRAFT_KEY)),
    ]);
    const records = (storedValues as unknown[])
      .map((value, index) => parseStoredDraft(value, `draft-${index + 1}`))
      .filter((record): record is PortfolioDraftRecord => Boolean(record));

    if (records.length === 0 && legacyValue) {
      const legacy = parseStoredDraft(
        legacyValue,
        getActivePortfolioDraftId() ?? LEGACY_DRAFT_KEY,
      );
      if (legacy && !records.some((record) => record.id === legacy.id)) records.push(legacy);
    }

    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}

export async function readPortfolioDraft(id?: string | null): Promise<PortfolioDraftRecord | null> {
  const db = await openDraftDatabase();
  try {
    const targetId = id || getActivePortfolioDraftId();
    if (targetId) {
      const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
      const stored = await requestResult(store.get(targetId));
      const parsed = parseStoredDraft(stored, targetId);
      if (parsed) return parsed;
    } else {
      const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
      const allStored = (await requestResult(store.getAll())) as unknown[];
      const records = allStored
        .map((value, index) => parseStoredDraft(value, `draft-${index + 1}`))
        .filter((record): record is PortfolioDraftRecord => Boolean(record))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      if (records.length > 0) {
        return records[0];
      }
    }

    const legacyStore = db.transaction(LEGACY_STORE_NAME, "readonly").objectStore(LEGACY_STORE_NAME);
    const legacyDirect = targetId ? await requestResult(legacyStore.get(targetId)) : null;
    const legacy = legacyDirect ?? (await requestResult(legacyStore.get(LEGACY_DRAFT_KEY)));
    if (legacy) return parseStoredDraft(legacy, targetId || "current");
    return null;
  } finally {
    db.close();
  }
}

export async function writePortfolioDraft(
  document: PortfolioDocument,
  history: PortfolioDocument[] = [],
  future: PortfolioDocument[] = [],
  id?: string,
  metadata: PortfolioDraftMetadata = {},
): Promise<string> {
  const safeId = id || document.slug || `draft-${Date.now()}`;
  const db = await openDraftDatabase();
  try {
    const tx = db.transaction([STORE_NAME, LEGACY_STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const previousRequest = store.get(safeId);
    previousRequest.onsuccess = () => {
      const previous = parseStoredDraft(previousRequest.result, safeId);
      const status = metadata.status ?? previous?.status ?? "draft";
      const record: StoredDraft = {
        formatVersion: 1,
        id: safeId,
        name:
          metadata.name?.trim() ||
          previous?.name ||
          document.profileOwner?.fullName ||
          document.slug,
        status,
        ...(status === "completed"
          ? {
              ...(metadata.completionReason ?? previous?.completionReason
                ? { completionReason: metadata.completionReason ?? previous?.completionReason }
                : {}),
              completedAt:
                metadata.completedAt ??
                previous?.completedAt ??
                new Date().toISOString(),
            }
          : {}),
        document,
        history: history.slice(-40),
        future: future.slice(0, 40),
        updatedAt: new Date().toISOString(),
      };
      store.put(record);
      if (metadata.activate !== false || getActivePortfolioDraftId() === safeId) {
        tx.objectStore(LEGACY_STORE_NAME).put(document, LEGACY_DRAFT_KEY);
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không lưu được bản nháp."));
      tx.onabort = () => reject(tx.error ?? new Error("Lưu bản nháp bị hủy."));
    });
    if (metadata.activate !== false) {
      setActivePortfolioDraftId(safeId);
    }
    return safeId;
  } finally {
    db.close();
  }
}

export async function renamePortfolioDraft(id: string, name: string): Promise<void> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Tên dự án không được để trống.");
  const draft = await readPortfolioDraft(id);
  if (!draft) throw new Error("Không tìm thấy dự án cần đổi tên.");
  await writePortfolioDraft(draft.document, draft.history, draft.future, draft.id, {
    name: cleanName,
  });
}

export async function deletePortfolioDraft(id: string): Promise<void> {
  const activeDraftId = getActivePortfolioDraftId();
  const db = await openDraftDatabase();
  try {
    const tx = db.transaction([STORE_NAME, LEGACY_STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    if (id === LEGACY_DRAFT_KEY || id === activeDraftId) {
      tx.objectStore(LEGACY_STORE_NAME).delete(LEGACY_DRAFT_KEY);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không xóa được bản nháp."));
      tx.onabort = () => reject(tx.error ?? new Error("Xóa bản nháp bị hủy."));
    });
    if (activeDraftId === id) {
      window.localStorage.removeItem(ACTIVE_DRAFT_KEY);
    }
  } finally {
    db.close();
  }
}
