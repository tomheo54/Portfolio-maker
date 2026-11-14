import type { PortfolioDocument, TemplateId, VisualStyle } from "@/schema/portfolio.schema";

export type PersistedBatchItemStatus = "pending" | "processing" | "succeeded" | "failed";
export type AssignmentDiscoveryStatus = "pending" | "discovering" | "ready" | "failed";

export interface PersistedBatchAssignment {
  index: number;
  title: string;
  selected: boolean;
}

export interface PersistedBatchResult {
  slug: string;
  fullName: string;
  roleTitle: string;
  url: string;
  assignmentCount: number;
  docxImages: number;
  aiImages: number;
  document: PortfolioDocument;
}

export interface PersistedBatchFile {
  id: string;
  inputIndex: number;
  name: string;
  relativePath: string;
  file: File;
  discoveryStatus: AssignmentDiscoveryStatus;
  assignments: PersistedBatchAssignment[];
  detectedImageCount: number;
  discoveryError?: string;
  status: PersistedBatchItemStatus;
  error?: string;
  result?: PersistedBatchResult;
  options?: {
    templateId?: TemplateId;
    layout?: "standard" | "projects-first";
    visualStyle?: VisualStyle;
  };
}

export interface PersistedBatchJob {
  id: string;
  updatedAt: number;
  docxImportMode?: "multiple-files" | "scan-single";
  csvText: string;
  imageMode: string;
  visualStyle: string;
  templateId: string;
  layout: "standard" | "projects-first";
  files: PersistedBatchFile[];
  useSampleBatch: boolean;
  sampleStatus: PersistedBatchItemStatus;
  sampleError?: string;
  sampleResults: PersistedBatchResult[];
}

const DATABASE_NAME = "portfolio-batch-jobs";
const STORE_NAME = "jobs";
const CURRENT_JOB_KEY = "current";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không mở được kho lưu lô."));
  });
}

export async function readBatchJob(): Promise<PersistedBatchJob | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(CURRENT_JOB_KEY);
      request.onsuccess = () => resolve((request.result as PersistedBatchJob | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Không đọc được lô đã lưu."));
    });
  } finally {
    db.close();
  }
}

export async function writeBatchJob(job: PersistedBatchJob): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(
        { ...job, updatedAt: Date.now() },
        CURRENT_JOB_KEY,
      );
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Không lưu được lô hiện tại."));
    });
  } finally {
    db.close();
  }
}

export async function clearBatchJob(): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(CURRENT_JOB_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Không xóa được lô đã lưu."));
    });
  } finally {
    db.close();
  }
}

