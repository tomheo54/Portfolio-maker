"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Factory,
  FileText,
  Sparkles,
  ExternalLink,
  Download,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Users,
  X,
  AlertCircle,
  Clock3,
  RefreshCw,
  ListChecks,
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type {
  ImageMode,
  PortfolioDocument,
  TemplateId,
  VisualStyle,
} from "@/schema/portfolio.schema";
import { PortfolioDocumentSchema } from "@/schema/portfolio.schema";
import {
  readBatchJob,
  writeBatchJob,
  clearBatchJob,
  type PersistedBatchJob,
  type PersistedBatchItemStatus,
  type AssignmentDiscoveryStatus,
  type PersistedBatchAssignment,
} from "@/services/browser/batch-jobs";
import {
  readPortfolioDraft,
  setActivePortfolioDraftId,
  writePortfolioDraft,
} from "@/services/browser/portfolio-draft";

interface BatchPortfolioResult {
  slug: string;
  fullName: string;
  roleTitle: string;
  url: string;
  assignmentCount: number;
  docxImages: number;
  aiImages: number;
  document: PortfolioDocument;
}

type BatchLayout = "standard" | "projects-first";
type DocxImportMode = "multiple-files" | "scan-single";
type BatchFileOptions = {
  templateId?: TemplateId;
  layout?: BatchLayout;
  visualStyle?: VisualStyle;
};
type BatchFile = {
  id: string;
  inputIndex: number;
  file: File;
  relativePath: string;
  discoveryStatus: AssignmentDiscoveryStatus;
  assignments: PersistedBatchAssignment[];
  detectedImageCount: number;
  discoveryError?: string;
  status: PersistedBatchItemStatus;
  error?: string;
  result?: BatchPortfolioResult;
};

async function saveBatchResultsToLibrary(
  results: BatchPortfolioResult[],
): Promise<string[]> {
  const failures: string[] = [];

  for (const result of results) {
    const parsed = PortfolioDocumentSchema.safeParse(result.document);
    if (!parsed.success || parsed.data.slug !== result.slug) {
      failures.push(`${result.fullName || result.slug}: dữ liệu Portfolio không hợp lệ.`);
      continue;
    }

    const draftId = `batch-result-${result.slug}`;
    try {
      const existing = await readPortfolioDraft(draftId);
      await writePortfolioDraft(
        existing?.document ?? parsed.data,
        existing?.history ?? [],
        existing?.future ?? [],
        draftId,
        {
          name: existing?.name ?? (result.fullName.trim() || result.slug),
          status: "completed",
          completionReason: "published",
          activate: false,
        },
      );
    } catch (saveError) {
      failures.push(
        `${result.fullName || result.slug}: ${
          saveError instanceof Error ? saveError.message : "lỗi lưu không xác định"
        }`,
      );
    }
  }

  return failures;
}

const SAMPLE_BATCH_ITEMS = [
  { id: "sample-assignments", name: "sample-assignments.docx" },
];

const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: "canva-editorial", label: "Canva Editorial" },
  { id: "medical-ruby", label: "Medical Ruby" },
  { id: "clinical-navy", label: "Clinical Navy" },
  { id: "pedagogical-mauve", label: "Pedagogical Mauve" },
  { id: "educational-terracotta", label: "Educational Terracotta" },
  { id: "pedagogical-rose", label: "Pedagogical Rose" },
  { id: "content-creator", label: "Content Creator" },
  { id: "oceanic-teal", label: "Oceanic Teal" },
  { id: "warm-editorial", label: "Warm Editorial" },
  { id: "creative-bold", label: "Bold Creative" },
  { id: "minimal-chic", label: "Minimal Chic" },
  { id: "vibrant-student", label: "Vibrant Student" },
  { id: "artistic-organic", label: "Artistic Organic" },
  { id: "academic-presentation", label: "Academic Presentation" },
  { id: "bento-grid", label: "Bento Grid" },
  { id: "framer-minimal", label: "Framer Minimal" },
  { id: "creative-showcase", label: "Creative Showcase" },
  { id: "growth-marketer", label: "Growth Marketer" },
  { id: "tech-developer", label: "Tech Developer" },
];

function createBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createBatchFormData(options: {
  imageMode: ImageMode;
  visualStyle: VisualStyle;
  templateId: TemplateId;
  layout: BatchLayout;
  csvText: string;
}): FormData {
  const formData = new FormData();
  formData.append("imageMode", options.imageMode);
  formData.append("visualStyle", options.visualStyle);
  formData.append("templateId", options.templateId);
  formData.append("layout", options.layout);
  formData.append("csvText", options.csvText);
  return formData;
}

async function readBatchResponse(response: Response): Promise<{ portfolios: BatchPortfolioResult[] }> {
  const payload = await response.json().catch(() => null) as
    | { portfolios?: BatchPortfolioResult[]; error?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Yêu cầu thất bại (${response.status}).`);
  }
  if (!payload || !Array.isArray(payload.portfolios)) {
    throw new Error("Phản hồi từ máy chủ không đúng định dạng.");
  }
  return { portfolios: payload.portfolios };
}

async function discoverDocxAssignments(file: File, assignmentMode: DocxImportMode): Promise<{ assignments: PersistedBatchAssignment[]; imageCount: number }> {
  const formData = new FormData();
  formData.append("files", file, file.name);
  const parserMode = assignmentMode === "multiple-files" ? "whole-file" : "bai-headings";
  const response = await fetch(`/api/docx-ingest?assignmentMode=${parserMode}`, { method: "POST", body: formData });
  const payload = await response.json().catch(() => null) as {
    extractions?: Array<{ detectedAssignments?: Array<{ index: number; rawHeading: string }>; extractedImages?: unknown[] }>;
    error?: string;
  } | null;
  if (!response.ok) throw new Error(payload?.error || `Không thể đọc DOCX (${response.status}).`);
  const detected = payload?.extractions?.[0]?.detectedAssignments;
  if (!detected?.length) throw new Error("Không tìm thấy bài tập trong tài liệu.");
  return {
    assignments: detected.map((assignment) => ({
      index: assignment.index,
      title: assignment.rawHeading.trim() || `Bài ${assignment.index + 1}`,
      selected: true,
    })),
    imageCount: payload?.extractions?.[0]?.extractedImages?.length ?? 0,
  };
}

export default function BatchFactoryPage() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [docxImportMode, setDocxImportMode] = useState<DocxImportMode>("multiple-files");
  const [fileOptions, setFileOptions] = useState<
    Record<string, BatchFileOptions>
  >({});
  const [useSampleBatch, setUseSampleBatch] = useState(false);
  const [csvText, setCsvText] = useState("tenfile,hoten,chucdanh,email");
  const [imageMode, setImageMode] = useState<ImageMode>("hybrid-auto");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    "canva-pastel-graphic",
  );
  const [templateId, setTemplateId] = useState<TemplateId>("canva-editorial");
  const [layout, setLayout] = useState<BatchLayout>("standard");

  const [isRunning, setIsRunning] = useState(false);
  const [isExportingBulk, setIsExportingBulk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleStatus, setSampleStatus] = useState<PersistedBatchItemStatus>("pending");
  const [sampleError, setSampleError] = useState<string | undefined>();
  const [sampleResults, setSampleResults] = useState<BatchPortfolioResult[]>([]);
  const [jobId, setJobId] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [recoveredJob, setRecoveredJob] = useState(false);
  const [openingResultSlug, setOpeningResultSlug] = useState<string | null>(null);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null);

  const results = useMemo(
    () => useSampleBatch ? sampleResults : files.flatMap((item) => item.result ? [item.result] : []),
    [files, sampleResults, useSampleBatch],
  );

  const persistBatchResults = async (items: BatchPortfolioResult[]) => {
    if (items.length === 0) return;
    setIsSavingToLibrary(true);
    setLibrarySaveError(null);
    try {
      const failures = await saveBatchResultsToLibrary(items);
      if (failures.length > 0) {
        setLibrarySaveError(
          `Đã xuất bản nhưng chưa lưu được ${failures.length} Portfolio vào thư viện: ${failures.join("; ")}`,
        );
      }
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  useEffect(() => {
    let active = true;
    void readBatchJob()
      .then((job) => {
        if (!active || !job) return;
        if (!job.useSampleBatch && job.files.length === 0 && job.sampleResults.length === 0) return;
        setJobId(job.id);
        setDocxImportMode(job.docxImportMode ?? (job.files.length === 1 ? "scan-single" : "multiple-files"));
        setCsvText(job.csvText === "filename,fullName,roleTitle,email"
          ? "tenfile,hoten,chucdanh,email"
          : job.csvText);
        setImageMode(job.imageMode as ImageMode);
        setVisualStyle(job.visualStyle as VisualStyle);
        setTemplateId(job.templateId as TemplateId);
        setLayout(job.layout);
        setUseSampleBatch(job.useSampleBatch);
        setSampleStatus(job.sampleStatus === "processing" ? "pending" : job.sampleStatus);
        setSampleError(job.sampleError);
        setSampleResults(job.sampleResults);
        const options: Record<string, BatchFileOptions> = {};
        const restoredFiles = job.files.map((item, index) => {
          options[item.id] = item.options ?? {};
          const file = item.file instanceof File
            ? item.file
            : new File([item.file], item.name, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
          const restoredDiscoveryStatus = item.discoveryStatus === "discovering" ? "pending" : item.discoveryStatus ?? "pending";
          return {
            id: item.id,
            inputIndex: item.inputIndex ?? index,
            file,
            relativePath: item.relativePath || item.name,
            status: item.status === "processing" ? "pending" : item.status,
            discoveryStatus: docxImportMode === "multiple-files" && restoredDiscoveryStatus === "ready"
              ? "ready"
              : "pending",
            assignments: docxImportMode === "multiple-files" && restoredDiscoveryStatus === "ready"
              ? [{ index: 0, title: file.name.replace(/\.docx$/i, ""), selected: true }]
              : [],
            detectedImageCount: item.detectedImageCount ?? 0,
            discoveryError: item.discoveryError,
            error: item.error,
            result: item.result,
          } satisfies BatchFile;
        });
        setFileOptions(options);
        setFiles(restoredFiles);
        setRecoveredJob(true);
        const recoveredResults = job.useSampleBatch
          ? job.sampleResults
          : job.files.flatMap((item) => item.result ? [item.result] : []);
        if (recoveredResults.length > 0) {
          void persistBatchResults(recoveredResults);
        }
      })
      .catch(() => {
        if (active) setError("Không đọc được lô đã lưu. Bạn vẫn có thể tạo một lô mới.");
      })
      .finally(() => {
        if (active) setIsHydrated(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const hasWork = useSampleBatch || files.length > 0 || sampleResults.length > 0;
    if (!hasWork) {
      void clearBatchJob().catch(() => undefined);
      return;
    }
    const timer = window.setTimeout(() => {
      const persisted: PersistedBatchJob = {
        id: jobId || createBatchId(),
        updatedAt: Date.now(),
        docxImportMode,
        csvText,
        imageMode,
        visualStyle,
        templateId,
        layout,
        files: files.map(({ id, inputIndex, file, relativePath, discoveryStatus, assignments, detectedImageCount, discoveryError, status, error: itemError, result }) => ({
          id,
          inputIndex,
          name: file.name,
          relativePath,
          file,
          discoveryStatus,
          assignments,
          detectedImageCount,
          discoveryError,
          status,
          error: itemError,
          result,
          options: fileOptions[id],
        })),
        useSampleBatch,
        sampleStatus,
        sampleError,
        sampleResults,
      };
      if (!jobId) setJobId(persisted.id);
      void writeBatchJob(persisted).catch(() => {
        setError("Không lưu được tiến độ lô này vào trình duyệt. Hãy tải kết quả sau khi hoàn tất.");
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    csvText,
    docxImportMode,
    fileOptions,
    files,
    imageMode,
    isHydrated,
    jobId,
    layout,
    sampleError,
    sampleResults,
    sampleStatus,
    templateId,
    useSampleBatch,
    visualStyle,
  ]);

  const handleFiles = (picked: FileList | null) => {
    if (!picked) return;
    const valid = Array.from(picked).filter((f) =>
      f.name.toLowerCase().endsWith(".docx"),
    );
    if (valid.length === 0) {
      setError("Vui lòng chọn các file .docx hợp lệ.");
      return;
    }
    if (docxImportMode === "scan-single" && files.length + valid.length > 1) {
      setError("Nhánh quét chỉ nhận một file DOCX. Hãy chọn đúng một file hoặc chuyển sang nhánh nhiều file.");
      return;
    }
    setError(null);
    setUseSampleBatch(false);
    const additions = valid.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(36)
          .slice(2)}`,
        inputIndex: index,
        file,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        discoveryStatus: "pending" as const,
        assignments: [],
        detectedImageCount: 0,
        status: "pending" as const,
      }));
    setFiles((prev) => {
      const nextIndex = prev.reduce((maximum, item) => Math.max(maximum, item.inputIndex + 1), 0);
      return [...prev, ...additions.map((item, index) => ({ ...item, inputIndex: nextIndex + index }))];
    });
  };

  const handleImportModeChange = (nextMode: DocxImportMode) => {
    if (nextMode === docxImportMode) return;
    if (nextMode === "scan-single" && files.length > 1) {
      setError("Hãy xóa bớt file, chỉ giữ lại một file trước khi chuyển sang nhánh lọc nhiều bài.");
      return;
    }
    setError(null);
    setDocxImportMode(nextMode);
    setFiles((current) => current.map((item) => item.status === "succeeded"
      ? item
      : { ...item, discoveryStatus: "pending", assignments: [], discoveryError: undefined }));
  };

  const moveFile = (fileId: string, direction: -1 | 1) => {
    setFiles((current) => {
      const index = current.findIndex((item) => item.id === fileId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered.map((item, inputIndex) => ({ ...item, inputIndex }));
    });
  };

  const retryAssignmentDiscovery = async (fileId: string) => {
    const item = files.find((candidate) => candidate.id === fileId);
    if (!item) return;
    setFiles((current) => current.map((candidate) => candidate.id === fileId
      ? { ...candidate, discoveryStatus: "discovering", discoveryError: undefined }
      : candidate));
    try {
      const { assignments, imageCount } = await discoverDocxAssignments(item.file, docxImportMode);
      setFiles((current) => current.map((candidate) => candidate.id === fileId
        ? { ...candidate, discoveryStatus: "ready", assignments, detectedImageCount: imageCount }
        : candidate));
    } catch (discoveryError) {
      setFiles((current) => current.map((candidate) => candidate.id === fileId
        ? { ...candidate, discoveryStatus: "failed", discoveryError: discoveryError instanceof Error ? discoveryError.message : "Không thể đọc bài tập." }
        : candidate));
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    for (const item of files) {
      if (item.discoveryStatus === "pending") {
        void retryAssignmentDiscovery(item.id);
      }
    }
  }, [files, isHydrated]);

  const handleRunBatch = async (retryOnlyId?: string) => {
    if (!useSampleBatch && files.length === 0) {
      setError('Vui lòng nạp ít nhất 1 file .docx hoặc chọn "Nạp lô mẫu".');
      return;
    }
    setError(null);
    setIsRunning(true);
    const activeJobId = jobId || createBatchId();
    setJobId(activeJobId);
    try {
      if (useSampleBatch) {
        setSampleStatus("processing");
        setSampleError(undefined);
        const formData = createBatchFormData({ imageMode, visualStyle, templateId, layout, csvText });
        formData.append("useSampleBatch", "true");
        formData.append("batchId", activeJobId);
        formData.append("fileId", "sample-assignments");
        formData.append("fileOptions", JSON.stringify([fileOptions["sample-assignments"] ?? {}]));
        const res = await fetch("/api/batch", { method: "POST", body: formData });
        const data = await readBatchResponse(res);
        setSampleResults(data.portfolios);
        setSampleStatus("succeeded");
        await persistBatchResults(data.portfolios);
      } else {
        const needsDiscovery = files.filter((item) =>
          (item.status === "pending" || item.status === "failed") &&
          item.discoveryStatus !== "ready",
        );
        if (needsDiscovery.length > 0) {
          setError(`Cần quét xong ${needsDiscovery.length} file DOCX trước khi tạo portfolio. Thử quét lại từng file bị lỗi.`);
          return;
        }
        const invalidSelection = files.find((item) => {
          if (item.status !== "pending" && item.status !== "failed") return false;
          if (docxImportMode === "multiple-files") return false;
          const selectedCount = item.assignments.filter((assignment) => assignment.selected).length;
          return selectedCount === 0;
        });
        if (invalidSelection) {
          setError(`Hãy chọn ít nhất một bài trong ${invalidSelection.file.name}.`);
          return;
        }
        const queue = files.filter((item) =>
          (item.status === "pending" || item.status === "failed") &&
          (!retryOnlyId || item.id === retryOnlyId),
        );
        for (let index = 0; index < queue.length; index++) {
          const item = queue[index];
          setFiles((current) => current.map((candidate) => candidate.id === item.id
            ? { ...candidate, status: "processing", error: undefined }
            : candidate));
          try {
            const formData = createBatchFormData({ imageMode, visualStyle, templateId, layout, csvText });
            formData.append("files", item.file, item.file.name);
            formData.append("fileOptions", JSON.stringify([{
              templateId: fileOptions[item.id]?.templateId ?? templateId,
              layout: fileOptions[item.id]?.layout ?? layout,
              visualStyle: fileOptions[item.id]?.visualStyle ?? visualStyle,
            }]));
            formData.append("batchId", activeJobId);
            formData.append("fileId", item.id);
            formData.append("fileIndex", String(item.inputIndex));
            formData.append("sourcePath", item.relativePath);
            formData.append("assignmentMode", docxImportMode === "multiple-files" ? "whole-file" : "bai-headings");
            if (docxImportMode === "scan-single") {
              formData.append("selectedAssignmentIndexes", JSON.stringify(item.assignments.filter((assignment) => assignment.selected).map((assignment) => assignment.index)));
            }
            const res = await fetch("/api/batch", { method: "POST", body: formData });
            const data = await readBatchResponse(res);
            const result = data.portfolios[0];
            if (!result) throw new Error("Máy chủ không trả kết quả cho file này.");
            setFiles((current) => current.map((candidate) => candidate.id === item.id
              ? { ...candidate, status: "succeeded", error: undefined, result }
              : candidate));
            await persistBatchResults([result]);
          } catch (itemError) {
            setFiles((current) => current.map((candidate) => candidate.id === item.id
              ? { ...candidate, status: "failed", error: itemError instanceof Error ? itemError.message : "Không xử lý được file." }
              : candidate));
          }
        }
      }
    } catch (err) {
      if (useSampleBatch) {
        setSampleStatus("failed");
        setSampleError(err instanceof Error ? err.message : "Không xử lý được lô mẫu.");
      }
      setError(
        err instanceof Error
          ? err.message
          : "Không thể chạy sản xuất hàng loạt.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleCsvUpload = async (picked: FileList | null) => {
    const file = picked?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  };

  const completedCount = useSampleBatch
    ? sampleStatus === "succeeded" ? 1 : 0
    : files.filter((item) => item.status === "succeeded").length;
  const failedCount = useSampleBatch
    ? sampleStatus === "failed" ? 1 : 0
    : files.filter((item) => item.status === "failed").length;
  const totalCount = useSampleBatch ? 1 : files.length;

  const handleBulkZipExport = async () => {
    if (results.length === 0) return;
    setError(null);
    setIsExportingBulk(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: results.map((r) => r.document),
          format: "zip",
        }),
      });
      if (!res.ok) throw new Error("Bulk export failed");
      const blob = await res.blob();
      await persistBatchResults(results);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolios-batch-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xuất file Bulk ZIP.",
      );
    } finally {
      setIsExportingBulk(false);
    }
  };

  const handleEditResultInStudio = async (item: BatchPortfolioResult) => {
    setOpeningResultSlug(item.slug);
    setError(null);
    try {
      const parsedDocument = PortfolioDocumentSchema.safeParse(item.document);
      if (!parsedDocument.success) {
        throw new Error("Dữ liệu Portfolio không hợp lệ hoặc không tương thích với Studio.");
      }
      if (parsedDocument.data.slug !== item.slug) {
        throw new Error("Slug của kết quả Batch không khớp với Portfolio.");
      }

      const draftId = `batch-result-${item.slug}`;
      const existingDraft = await readPortfolioDraft(draftId);
      if (!existingDraft) {
        await writePortfolioDraft(parsedDocument.data, [], [], draftId);
      }
      setActivePortfolioDraftId(draftId);
      window.location.assign(`/studio?draft=${encodeURIComponent(draftId)}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Không thể mở kết quả trong Studio: ${saveError.message}`
          : "Không thể mở kết quả trong Studio. Hãy kiểm tra dung lượng lưu trữ của trình duyệt rồi thử lại.",
      );
      setOpeningResultSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F1] text-stone-900">
      {/* Top Bar */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold hover:bg-stone-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại Studio</span>
            </Link>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-amber-600" />
              <h1 className="font-editorial text-xl font-bold">
                Mass-Production Portfolio Factory
              </h1>
            </div>
          </div>
          <Link
            href="/portfolio-mau-hoan-chinh"
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            Xem mẫu /portfolio-mau-hoan-chinh →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* Input Controls Card */}
        <section className="grid grid-cols-1 gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Bước 1 • Nạp lô file .docx học viên
              </span>
              <h2 className="mt-1 text-lg font-bold">Chọn cách nhập bài tập DOCX</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Cách nhập file DOCX">
              <button
                type="button"
                aria-pressed={docxImportMode === "multiple-files"}
                onClick={() => handleImportModeChange("multiple-files")}
                className={`rounded-xl border p-3 text-left transition ${
                  docxImportMode === "multiple-files"
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-300"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <span className="block text-xs font-bold text-stone-900">Nhiều file DOCX · mỗi file một bài</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-stone-600">
                  Thêm hoặc xóa file để điều chỉnh số bài. Mỗi file được nhập nguyên văn thành một bài.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={docxImportMode === "scan-single"}
                onClick={() => handleImportModeChange("scan-single")}
                className={`rounded-xl border p-3 text-left transition ${
                  docxImportMode === "scan-single"
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-300"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <span className="block text-xs font-bold text-stone-900">Một file DOCX · lọc nhiều bài</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-stone-600">
                  Chọn một tài liệu; chỉ các đề mục bắt đầu bằng “Bài” được tách để lọc và chọn.
                </span>
              </button>
            </div>
            <p className="-mt-2 text-xs leading-relaxed text-stone-600">
              {docxImportMode === "multiple-files"
                ? "Có thể chọn nhiều file, chọn thư mục hoặc kéo thả. Dùng nút mũi tên để sắp xếp thứ tự bài."
                : "Nhánh này chỉ nhận một file DOCX; chỉ lọc các tiêu đề bắt đầu bằng “Bài”, không chia theo Phần/Chương."}
            </p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center hover:border-amber-500"
            >
              <Upload className="h-8 w-8 text-amber-600" />
              <p className="mt-2 text-sm font-semibold">
                {docxImportMode === "multiple-files"
                  ? "Kéo thả hàng loạt file .docx — thêm file để tăng số bài"
                  : "Kéo thả một file .docx để quét các bài bên trong"}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <label className="cursor-pointer rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800">
                  <span>{docxImportMode === "multiple-files" ? "Thêm nhiều file .docx" : "Chọn một file .docx"}</span>
                  <input
                    type="file"
                    accept=".docx"
                    multiple={docxImportMode === "multiple-files"}
                    className="hidden"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>

                {docxImportMode === "multiple-files" && (
                  <label className="cursor-pointer rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100">
                    <span>Chọn thư mục .docx</span>
                    <input
                      type="file"
                      accept=".docx"
                      multiple
                      className="hidden"
                      {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                      onChange={(e) => {
                        handleFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}

                <button
                  type="button"
                  disabled={!isHydrated || isRunning}
                  onClick={() => {
                    setUseSampleBatch(true);
                    setFiles([]);
                    setSampleStatus("pending");
                    setSampleError(undefined);
                    setSampleResults([]);
                    setError(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    useSampleBatch
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <Users className="mr-1 inline h-3.5 w-3.5" />
                  Nạp lô mẫu
                </button>
              </div>

              {(useSampleBatch || files.length > 0) && (
                <>
                {!useSampleBatch && docxImportMode === "multiple-files" && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900" data-testid="batch-import-count">
                    Đã thêm {files.length} file • {files.length} bài theo thứ tự file
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {useSampleBatch ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                      Sẵn sàng 1 tài liệu minh họa • không gán danh tính cá nhân
                    </span>
                  ) : (
                    files.map(({ id, file }, index) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{index + 1}. {file.name}</span>
                        {docxImportMode === "multiple-files" && (
                          <>
                            <button type="button" disabled={index === 0 || isRunning} onClick={() => moveFile(id, -1)} aria-label={`Đưa ${file.name} lên trước`} className="rounded-full p-0.5 hover:bg-amber-200 disabled:opacity-40"><ArrowUp className="h-3 w-3" /></button>
                            <button type="button" disabled={index === files.length - 1 || isRunning} onClick={() => moveFile(id, 1)} aria-label={`Đưa ${file.name} xuống sau`} className="rounded-full p-0.5 hover:bg-amber-200 disabled:opacity-40"><ArrowDown className="h-3 w-3" /></button>
                          </>
                        )}
                        <button
                          type="button"
                          aria-label={`Xóa ${file.name}`}
                          onClick={() =>
                            setFiles((prev) =>
                              prev.filter((item) => item.id !== id).map((item, index) => ({ ...item, inputIndex: index })),
                            )
                          }
                          className="rounded-full p-0.5 text-amber-800 hover:bg-amber-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                {files.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-left">
                    {files.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                        <span className="min-w-0 flex-1 truncate font-medium text-stone-700" title={item.relativePath}>{item.relativePath}</span>
                        <span className={`inline-flex items-center gap-1 font-semibold ${item.status === "succeeded" ? "text-emerald-700" : item.status === "failed" ? "text-rose-700" : item.status === "processing" ? "text-amber-700" : "text-stone-500"}`}>
                          {item.status === "processing" ? <Loader2 className="h-3 w-3 animate-spin" /> : item.status === "failed" ? <AlertCircle className="h-3 w-3" /> : item.status === "succeeded" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                          {item.status === "processing" ? "Đang xử lý" : item.status === "failed" ? "Lỗi" : item.status === "succeeded" ? "Hoàn tất" : "Đang chờ"}
                        </span>
                        {item.status === "failed" && <span className="w-full text-rose-700" role="alert">{item.error}</span>}
                        {item.status === "failed" && !isRunning && (
                          <button type="button" onClick={() => void handleRunBatch(item.id)} className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-50">
                            <RefreshCw className="h-3 w-3" /> Chạy lại
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {files.map((item, index) => (
                  <div key={`assignments-${item.id}`} className="mt-3 w-full rounded-xl border border-stone-200 bg-white p-3 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-stone-800">{item.relativePath}</p>
                        {item.discoveryStatus === "discovering" && <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700"><Loader2 className="h-3 w-3 animate-spin" /> {docxImportMode === "multiple-files" ? "Đang đọc nội dung file…" : "Đang lọc tiêu đề bắt đầu bằng “Bài”…"}</p>}
                        {item.discoveryStatus === "ready" && <p className="mt-1 text-[11px] text-stone-600"><ListChecks className="mr-1 inline h-3 w-3" /> {docxImportMode === "multiple-files" ? "1 bài (toàn bộ file)" : `Tìm thấy ${item.assignments.length} bài`} • {item.detectedImageCount} ảnh</p>}
                        {item.discoveryStatus === "failed" && <p className="mt-1 text-[11px] text-rose-700">{item.discoveryError}</p>}
                      </div>
                      {item.discoveryStatus === "failed" && !isRunning && (
                        <button type="button" onClick={() => void retryAssignmentDiscovery(item.id)} className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">
                          <RefreshCw className="h-3 w-3" /> Quét lại
                        </button>
                      )}
                    </div>
                    {item.discoveryStatus === "ready" && docxImportMode === "scan-single" && (
                      <>
                        <p className="mt-2 text-[11px] text-stone-600">Chọn các bài cần nhập; có thể bỏ chọn để giảm số bài trong portfolio.</p>
                        {item.assignments.length > 1 && (
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => setFiles((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, assignments: candidate.assignments.map((assignment) => ({ ...assignment, selected: true })) } : candidate))} className="text-[11px] font-semibold text-amber-800 underline">Chọn tất cả</button>
                            <button type="button" onClick={() => setFiles((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, assignments: candidate.assignments.map((assignment) => ({ ...assignment, selected: false })) } : candidate))} className="text-[11px] font-semibold text-stone-600 underline">Bỏ chọn tất cả</button>
                          </div>
                        )}
                        <div className="mt-2 space-y-1.5">
                          {item.assignments.map((assignment) => (
                            <label key={`${item.id}-${assignment.index}`} className="flex cursor-pointer items-start gap-2 rounded-lg bg-stone-50 px-2.5 py-2 text-xs text-stone-700">
                              <input
                                type="checkbox"
                                checked={assignment.selected}
                                disabled={item.status === "processing" || item.status === "succeeded"}
                                aria-label={`Đưa bài ${assignment.index + 1} trong ${item.file.name} vào portfolio`}
                                onChange={(event) => setFiles((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, assignments: candidate.assignments.map((entry) => entry.index === assignment.index ? { ...entry, selected: event.target.checked } : entry) } : candidate))}
                                className="mt-0.5 accent-amber-600"
                              />
                              <span><strong>Bài {assignment.index + 1}:</strong> {assignment.title}</span>
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-stone-500">Đã chọn {item.assignments.filter((assignment) => assignment.selected).length}/{item.assignments.length} bài cho portfolio này.</p>
                      </>
                    )}
                    {item.discoveryStatus === "ready" && docxImportMode === "multiple-files" && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-stone-600">
                        <span>Bài thứ {index + 1} theo thứ tự hiện tại</span>
                        <span className="flex gap-1">
                          <button type="button" disabled={index === 0 || isRunning} onClick={() => moveFile(item.id, -1)} aria-label={`Đưa ${item.file.name} lên trước`} className="rounded p-1 hover:bg-stone-100 disabled:opacity-40"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" disabled={index === files.length - 1 || isRunning} onClick={() => moveFile(item.id, 1)} aria-label={`Đưa ${item.file.name} xuống sau`} className="rounded p-1 hover:bg-stone-100 disabled:opacity-40"><ArrowDown className="h-3.5 w-3.5" /></button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                </>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-stone-700">
                  Danh sách CSV bổ sung thông tin (tùy chọn: tenfile,hoten,chucdanh,email)
                </label>
                <label className="cursor-pointer rounded-full border border-stone-300 bg-white px-3 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100">
                  <span>Nạp file .csv</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => void handleCsvUpload(e.target.files)}
                  />
                </label>
              </div>
              <textarea
                rows={3}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                aria-label="CSV thông tin học viên"
                className="mt-1.5 w-full rounded-xl border border-stone-200 p-3 font-mono text-xs outline-none focus:border-amber-500"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                Dùng các cột không dấu `tenfile,hoten,chucdanh,email`. Hệ thống ghép theo tên đường dẫn file trước, rồi mới ghép theo thứ tự nếu CSV không có `tenfile`; vẫn chấp nhận CSV cũ dùng tên cột tiếng Anh.
              </p>
            </div>

            {(useSampleBatch || files.length > 0) && (
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-800">
                    Tùy chỉnh từng file
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                    Mặc định kế thừa cấu hình chung ở bước 2. Chỉ thay lựa chọn
                    trên những hồ sơ cần giao diện riêng.
                  </p>
                </div>
                {(useSampleBatch
                  ? SAMPLE_BATCH_ITEMS.map((item) => ({
                      ...item,
                      fileOptions: fileOptions[item.id],
                    }))
                  : files.map(({ id, file }) => ({
                      id,
                      name: file.name,
                      fileOptions: fileOptions[id],
                    }))
                ).map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-2"
                  >
                    <p className="truncate text-xs font-semibold text-stone-800 sm:col-span-2">
                      {item.name}
                    </p>
                    <label className="text-[11px] font-semibold text-stone-600">
                      Template
                      <select
                        aria-label={`Template cho ${item.name}`}
                        value={item.fileOptions?.templateId ?? templateId}
                        onChange={(e) =>
                          setFileOptions((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              templateId: e.target.value as TemplateId,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800"
                      >
                        {TEMPLATE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-stone-600">
                      Bố cục
                      <select
                        aria-label={`Bố cục cho ${item.name}`}
                        value={item.fileOptions?.layout ?? layout}
                        onChange={(e) =>
                          setFileOptions((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              layout: e.target.value as BatchLayout,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800"
                      >
                        <option value="standard">Thứ tự tiêu chuẩn</option>
                        <option value="projects-first">
                          Bài tập / dự án trước
                        </option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-stone-600 sm:col-span-2">
                      Phong cách ảnh
                      <select
                        aria-label={`Phong cách ảnh cho ${item.name}`}
                        value={item.fileOptions?.visualStyle ?? visualStyle}
                        onChange={(e) =>
                          setFileOptions((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              visualStyle: e.target.value as VisualStyle,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800"
                      >
                        <option value="canva-pastel-graphic">
                          Canva Pastel Graphic
                        </option>
                        <option value="editorial-illustration">
                          Editorial Illustration
                        </option>
                        <option value="3d-render">3D Isometric Render</option>
                        <option value="minimal-photo">Minimalist Photo</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 lg:col-span-5">
            <div className="space-y-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Bước 2 • Cấu hình dây chuyền
              </span>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Template mặc định cho cả lô
                </label>
                <select
                  aria-label="Template mặc định cho cả lô"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value as TemplateId)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold"
                >
                  {TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Bố cục mặc định cho cả lô
                </label>
                <select
                  aria-label="Bố cục mặc định cho cả lô"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as BatchLayout)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="standard">Thứ tự tiêu chuẩn</option>
                  <option value="projects-first">Bài tập / dự án trước</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Chế độ xử lý hình ảnh
                </label>
                <select
                  aria-label="Chế độ xử lý hình ảnh"
                  value={imageMode}
                  onChange={(e) => setImageMode(e.target.value as ImageMode)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="hybrid-auto">
                    Ưu tiên ảnh trong DOCX + Tự bù bằng ảnh AI nếu thiếu
                  </option>
                  <option value="docx-extract">
                    Chỉ lấy ảnh gốc trong DOCX
                  </option>
                  <option value="ai-generate-all">
                    Tạo mới toàn bộ ảnh AI theo chủ đề
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Phong cách ảnh AI
                </label>
                <select
                  aria-label="Phong cách ảnh AI"
                  value={visualStyle}
                  onChange={(e) =>
                    setVisualStyle(e.target.value as VisualStyle)
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="canva-pastel-graphic">
                    Canva Pastel Graphic
                  </option>
                  <option value="editorial-illustration">
                    Editorial Illustration
                  </option>
                  <option value="3d-render">3D Isometric Render</option>
                  <option value="minimal-photo">Minimalist Photo</option>
                </select>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {error}
                </div>
              )}
              {recoveredJob && (
                <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                  Đã khôi phục lô gần nhất cùng các file đã chọn. Tiến độ được lưu tự động trong trình duyệt.
                </p>
              )}
              {(files.length > 0 || useSampleBatch) && (
                <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-700" role="status" aria-live="polite">
                  <strong>Tiến độ:</strong> {completedCount}/{totalCount} hoàn tất
                  {failedCount > 0 ? <span className="ml-2 font-semibold text-rose-700">• {failedCount} lỗi</span> : null}
                  {useSampleBatch && sampleStatus === "failed" ? <p className="mt-1 text-rose-700">{sampleError}</p> : null}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!isHydrated || isRunning || (useSampleBatch ? sampleStatus === "succeeded" : files.length > 0 && files.every((item) => item.status === "succeeded"))}
              onClick={() => void handleRunBatch()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-60"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý hàng loạt...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{failedCount > 0 ? "Chạy lại các mục lỗi" : "Chạy sản xuất hàng loạt"}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Output Results Table */}
        {results.length > 0 && (
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold">
                  Đã xuất bản {results.length} trang Portfolio thành công!
                </h2>
              </div>

              <button
                type="button"
                disabled={isExportingBulk}
                onClick={handleBulkZipExport}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
              >
                {isExportingBulk ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>📦 Tải Bulk ZIP toàn bộ lớp</span>
              </button>
            </div>

            <div
              role={librarySaveError ? "alert" : "status"}
              className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs ${
                librarySaveError
                  ? "border border-rose-200 bg-rose-50 text-rose-800"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <span>
                {isSavingToLibrary
                  ? "Đang lưu các Portfolio vào thư viện dự án..."
                  : librarySaveError ??
                    "Các Portfolio đã được lưu vào thư viện dự án với trạng thái Hoàn thành."}
              </span>
              {librarySaveError && (
                <button
                  type="button"
                  disabled={isSavingToLibrary}
                  onClick={() => void persistBatchResults(results)}
                  className="rounded-full border border-rose-300 px-3 py-1 font-semibold hover:bg-rose-100 disabled:opacity-60"
                >
                  Lưu lại vào thư viện
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
                    <th className="py-3 pr-4">Học viên</th>
                    <th className="py-3 pr-4">URL Portfolio</th>
                    <th className="py-3 pr-4">Số bài tập</th>
                    <th className="py-3 pr-4">Ảnh DOCX / Ảnh AI</th>
                    <th className="py-3 text-right">Mở / chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {results.map((item) => (
                    <tr key={item.slug} className="hover:bg-stone-50">
                      <td className="py-3.5 pr-4">
                        <p className="font-bold">{item.fullName}</p>
                        <p className="text-xs text-stone-500">
                          {item.roleTitle}
                        </p>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-xs text-amber-800">
                        {item.url}
                      </td>
                      <td className="py-3.5 pr-4 text-xs font-semibold">
                        {item.assignmentCount} bài tập
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          {item.docxImages} DOCX
                        </span>{" "}
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                          {item.aiImages} AI
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <Link
                            href={item.url}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100"
                          >
                            <span>Mở trang</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <button
                            type="button"
                            disabled={Boolean(openingResultSlug)}
                            onClick={() => void handleEditResultInStudio(item)}
                            aria-label={`Sửa ${item.fullName} trong Studio`}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            {openingResultSlug === item.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                            <span>Sửa trong Studio</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
