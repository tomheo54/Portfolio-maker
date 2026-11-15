'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Wand2,
  Layers,
  UserCircle2,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type {
  HeroSection,
  AboutSection,
  ImageMode,
  ProjectMediaItem,
  VisualStyle,
} from '@/schema/portfolio.schema';
import type {
  DetectedAssignment,
  RawDocxExtractionResult,
  SummarizeAssignmentsResponse,
} from '@/schema/docx-ingestion.schema';
import {
  CANVA_REFERENCE_THEME,
  usePortfolioStore,
} from '@/store/usePortfolioStore';

export interface DocxImportWizardProps {
  open: boolean;
  onClose: () => void;
}

type DocxQueueStatus = 'queued' | 'processing' | 'ready' | 'error';
type DocxIntakeMode = 'single' | 'multiple';
interface DocxQueueItem {
  id: string;
  file: File;
  status: DocxQueueStatus;
  error?: string;
  extraction?: RawDocxExtractionResult;
}

interface AssignmentGroup {
  sourceId: string;
  sourceName: string;
  assignments: DetectedAssignment[];
}

const assignmentSelectionKey = (sourceId: string, index: number) =>
  `${sourceId}:${index}`;

const IMAGE_MODE_OPTIONS: Array<{
  value: ImageMode;
  title: string;
  badge?: string;
  desc: string;
}> = [
  {
    value: 'hybrid-auto',
    title: 'Tự động kết hợp (Khuyên dùng)',
    badge: 'Thông minh',
    desc: 'Ưu tiên lấy ảnh có sẵn trong file .docx. Bài tập nào không có ảnh sẽ tự động dùng AI vẽ ảnh minh họa theo chủ đề.',
  },
  {
    value: 'docx-extract',
    title: 'Chỉ dùng ảnh gốc trong file .docx',
    desc: 'Giữ nguyên toàn bộ ảnh chụp màn hình, biểu đồ hoặc thiết kế nhúng sẵn trong file Word.',
  },
  {
    value: 'ai-generate-all',
    title: 'Tạo mới toàn bộ ảnh bằng AI theo chủ đề',
    desc: 'AI đọc chủ đề từng bài tập và sinh bộ ảnh minh họa đồng bộ 100% với tông màu Portfolio.',
  },
];

const VISUAL_STYLE_OPTIONS: Array<{ value: VisualStyle; label: string }> = [
  { value: 'canva-pastel-graphic', label: 'Canva Pastel Graphic' },
  { value: 'editorial-illustration', label: 'Editorial Flat Illustration' },
  { value: '3d-render', label: '3D Isometric Render' },
  { value: 'minimal-photo', label: 'Minimalist Realistic Photo' },
];

export function DocxImportWizard({ open, onClose }: DocxImportWizardProps) {
  const { applyDocxSummaryToPortfolio, document } = usePortfolioStore();

  const heroSec = document?.sections?.find((s): s is HeroSection => s.type === 'hero');
  const aboutSec = document?.sections?.find((s): s is AboutSection => s.type === 'about');
  const currentFullName = document?.profileOwner?.fullName || heroSec?.fullName || '';
  const currentRoleTitle = document?.profileOwner?.roleTitle || heroSec?.roleTitle || '';
  const currentEmail = document?.profileOwner?.email || aboutSec?.contactInfo?.email || '';
  const currentAvatar = document?.profileOwner?.avatar?.url || heroSec?.avatar?.url || '';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intakeMode, setIntakeMode] = useState<DocxIntakeMode>('single');
  const [files, setFiles] = useState<File[]>([]);
  const [fileQueue, setFileQueue] = useState<DocxQueueItem[]>([]);
  const [useSampleDocx, setUseSampleDocx] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<DocxQueueStatus>('queued');
  const [sampleExtraction, setSampleExtraction] =
    useState<RawDocxExtractionResult | null>(null);
  const [selectedAssignmentKeys, setSelectedAssignmentKeys] = useState<string[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState('');

  const [fullName, setFullName] = useState(currentFullName);
  const [roleTitle, setRoleTitle] = useState(currentRoleTitle);
  const [email, setEmail] = useState(currentEmail);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(currentFullName);
      setRoleTitle(currentRoleTitle);
      setEmail(currentEmail);
      setAvatarUrl(currentAvatar);
    }
  }, [open, currentFullName, currentRoleTitle, currentEmail, currentAvatar]);

  const [imageMode, setImageMode] = useState<ImageMode>('hybrid-auto');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('canva-pastel-graphic');

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [extractions, setExtractions] = useState<RawDocxExtractionResult[]>([]);
  const [summaryResult, setSummaryResult] =
    useState<SummarizeAssignmentsResponse | null>(null);

  if (!open) return null;

  const handleFilePick = (picked: FileList | null) => {
    if (!picked) return;
    const valid = Array.from(picked).filter((f) =>
      f.name.toLowerCase().endsWith('.docx')
    );
    if (intakeMode === 'single' && (valid.length > 1 || files.length > 0)) {
      setErrorMsg('Nhánh quét chỉ nhận một file DOCX. Chọn nhánh nhiều file để nhập nhiều nguồn.');
      return;
    }
    if (valid.length === 0) {
      setErrorMsg('Vui lòng chọn file định dạng .docx');
      return;
    }
    setErrorMsg(null);
    setUseSampleDocx(false);
    setSampleExtraction(null);
    setSelectedAssignmentKeys((previous) => previous.filter((key) => !key.startsWith('sample:')));
    setFiles((prev) => [...prev, ...valid]);
    setFileQueue((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: 'queued' as const,
      })),
    ]);
  };

  const moveFile = (fileId: string, direction: -1 | 1) => {
    const index = fileQueue.findIndex((item) => item.id === fileId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= fileQueue.length) return;
    const reordered = [...fileQueue];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setFileQueue(reordered);
    setFiles(reordered.map((item) => item.file));
  };

  const handleAvatarFilePick = (picked: FileList | null) => {
    const file = picked?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file ảnh hợp lệ (PNG, JPG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setErrorMsg(null);
        setAvatarPreviewError(false);
        setAvatarFileName(file.name);
        setAvatarUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Không thể đọc file ảnh đại diện. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const ingestQueuedFile = async (taskId: string) => {
    const task = fileQueue.find((item) => item.id === taskId);
    if (!task) return;
    setFileQueue((prev) => prev.map((item) => item.id === taskId
      ? { ...item, status: 'processing', error: undefined }
      : item));
    setStatusMessage(`Äang Ä‘á»c ${task.file.name}...`);
    try {
      const formData = new FormData();
      formData.append('files', task.file);
      const assignmentMode = intakeMode === 'multiple' ? 'whole-file' : 'bai-headings';
      const response = await fetch(`/api/docx-ingest?assignmentMode=${assignmentMode}`, { method: 'POST', body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Má»Ÿ file tháº¥t báº¡i (${response.status}).`);
      const extraction = (payload?.extractions as RawDocxExtractionResult[] | undefined)?.[0];
      if (!extraction) throw new Error('KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u sau khi Ä‘á»c file.');

      setFileQueue((prev) => prev.map((item) => item.id === taskId
        ? { ...item, status: 'ready', error: undefined, extraction }
        : item));
      const assignmentKeys = extraction.detectedAssignments.map((assignment) =>
        assignmentSelectionKey(taskId, assignment.index),
      );
      setSelectedAssignmentKeys((prev) => Array.from(new Set([
        ...prev,
        ...(intakeMode === 'multiple' ? assignmentKeys.slice(0, 1) : assignmentKeys),
      ])));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ Ä‘á»c file DOCX.';
      setFileQueue((prev) => prev.map((item) => item.id === taskId
        ? { ...item, status: 'error', error: message }
        : item));
    }
  };

  const ingestSampleFile = async () => {
    setSampleStatus('processing');
    setStatusMessage('Äang Ä‘á»c file DOCX máº«u...');
    try {
      const assignmentMode = intakeMode === 'multiple' ? 'whole-file' : 'bai-headings';
      const response = await fetch(`/api/docx-ingest?useSample=true&assignmentMode=${assignmentMode}`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Má»Ÿ file máº«u tháº¥t bá¡i (${response.status}).`);
      const extraction = (payload?.extractions as RawDocxExtractionResult[] | undefined)?.[0];
      if (!extraction) throw new Error('KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u DOCX máº«u.');
      setSampleExtraction(extraction);
      setSampleStatus('ready');
      const assignmentKeys = extraction.detectedAssignments.map((assignment) =>
        assignmentSelectionKey('sample', assignment.index),
      );
      setSelectedAssignmentKeys(intakeMode === 'multiple' ? assignmentKeys.slice(0, 1) : assignmentKeys);
    } catch (error) {
      setSampleStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ Ä‘á»c file máº«u.');
    }
  };

  const handleRunPipeline = async () => {
    if (!useSampleDocx && files.length === 0) {
      setErrorMsg('HÃ£y chá»n Ã­t nháº¥t 1 file .docx hoáº·c dÃ¹ng file máº«u.');
      return;
    }

    const hasPending = useSampleDocx
      ? sampleStatus === 'queued'
      : fileQueue.some((item) => item.status === 'queued');
    if (hasPending) {
      setErrorMsg(null);
      setIsProcessing(true);
      try {
        if (useSampleDocx) {
          await ingestSampleFile();
        } else {
          for (const item of fileQueue.filter((entry) => entry.status === 'queued')) {
            await ingestQueuedFile(item.id);
          }
        }
      } finally {
        setIsProcessing(false);
        setStatusMessage('');
      }
      return;
    }

    const sources = useSampleDocx
      ? (sampleExtraction ? [{ sourceId: 'sample', extraction: sampleExtraction }] : [])
      : fileQueue.flatMap((item) => item.extraction
        ? [{ sourceId: item.id, extraction: item.extraction }]
        : []);
    const selectedExtractions = sources.flatMap(({ sourceId, extraction }) => {
      if (intakeMode === 'multiple') return [extraction];
      const selected = extraction.detectedAssignments.filter((assignment) =>
        selectedAssignmentKeys.includes(assignmentSelectionKey(sourceId, assignment.index)),
      );
      if (selected.length === 0) return [];
      const imageIds = new Set(selected.flatMap((assignment) => assignment.imageIds));
      return [{
        ...extraction,
        rawText: selected.map((assignment) => assignment.rawText).join('\n\n'),
        detectedAssignments: selected,
        extractedImages: extraction.extractedImages.filter((image) => imageIds.has(image.id)),
      }];
    });
    if (selectedExtractions.length === 0) {
      setErrorMsg('ChÆ°a cÃ³ bÃ i táº­p Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»c. HÃ£y thá»­ láº¡i file lá»—i hoáº·c chá»n file DOCX.');
      return;
    }
    const selectedCount = selectedExtractions.reduce((sum, extraction) => sum + extraction.detectedAssignments.length, 0);
    if (selectedCount === 0) {
      setErrorMsg('HÃ£y chá»n Ã­t nháº¥t má»™t bÃ i táº­p Ä‘á»ƒ Ä‘Æ°a vÃ o Portfolio.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    try {
      setStatusMessage('AI Ä‘ang tÃ³m táº¯t cÃ¡c bÃ i Ä‘Ã£ chá»n vÃ  xá»­ lÃ½ hÃ¬nh áº£nh...');
      const trimmedAvatar = avatarUrl.trim();
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractions: selectedExtractions,
          studentProfile: {
            fullName: fullName.trim() || undefined,
            roleTitle: roleTitle.trim() || undefined,
            email: email.trim() || undefined,
            avatarUrl: trimmedAvatar && !trimmedAvatar.startsWith('data:') ? trimmedAvatar : undefined,
          },
          imageMode,
          visualStyle,
          themeColors: {
            primaryColor: CANVA_REFERENCE_THEME.primaryColor,
            backgroundColor: CANVA_REFERENCE_THEME.backgroundColor,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `AI tÃ³m táº¯t tháº¥t báº¡i (${response.status}).`);
      }
      const summarized: SummarizeAssignmentsResponse = await response.json();
      setExtractions(selectedExtractions);
      setSummaryResult(summarized);
      setStep(3);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'CÃ³ lá»—i khi tÃ³m táº¯t cÃ¡c bÃ i Ä‘Ã£ chá»n.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleApplyToCanvas = () => {
    if (!summaryResult) return;

    const pool: Record<string, ProjectMediaItem[]> = {};
    const allExtractedMedia: ProjectMediaItem[] = extractions.flatMap((ext) =>
      ext.extractedImages.map((img) => ({
        id: img.id,
        url: img.savedUrl,
        caption: `Ảnh từ ${ext.fileName}`,
        sourceType: 'docx-extracted' as const,
        originalDocxMediaName: img.originalName,
      }))
    );

    summaryResult.projects.forEach((p) => {
      const ownDocx = p.media.filter((m) => m.sourceType === 'docx-extracted');
      pool[p.id] = ownDocx.length > 0 ? ownDocx : allExtractedMedia;
    });

    applyDocxSummaryToPortfolio({
      summary: summaryResult,
      studentAvatarUrl: avatarUrl.trim() || undefined,
      studentEmail: email.trim() || undefined,
      imageMode,
      visualStyle,
      docxImagesPool: pool,
    });
    onClose();
  };

  const assignmentGroups: AssignmentGroup[] = [
    ...fileQueue.flatMap((item) => item.extraction
      ? [{ sourceId: item.id, sourceName: item.file.name, assignments: item.extraction.detectedAssignments }]
      : []),
    ...(sampleExtraction
      ? [{ sourceId: 'sample', sourceName: sampleExtraction.fileName, assignments: sampleExtraction.detectedAssignments }]
      : []),
  ];
  const normalizedFilter = assignmentFilter.trim().toLocaleLowerCase();
  const visibleAssignmentGroups = assignmentGroups.map((group) => ({
    ...group,
    assignments: group.assignments.filter((assignment) =>
      !normalizedFilter ||
      `${group.sourceName} ${assignment.rawHeading} ${assignment.rawText}`
        .toLocaleLowerCase()
        .includes(normalizedFilter),
    ),
  })).filter((group) => group.assignments.length > 0);
  const visibleAssignmentKeys = visibleAssignmentGroups.flatMap((group) =>
    group.assignments.map((assignment) => assignmentSelectionKey(group.sourceId, assignment.index)),
  );
  const selectedAssignmentCount = selectedAssignmentKeys.filter((key) =>
    assignmentGroups.some((group) => group.assignments.some((assignment) =>
      assignmentSelectionKey(group.sourceId, assignment.index) === key,
    )),
  ).length;
  const hasPendingIngestion = useSampleDocx
    ? sampleStatus === 'queued'
    : fileQueue.some((item) => item.status === 'queued');
  const toggleVisibleAssignments = () => {
    const allVisibleSelected = visibleAssignmentKeys.length > 0 &&
      visibleAssignmentKeys.every((key) => selectedAssignmentKeys.includes(key));
    setSelectedAssignmentKeys((previous) => allVisibleSelected
      ? previous.filter((key) => !visibleAssignmentKeys.includes(key))
      : Array.from(new Set([...previous, ...visibleAssignmentKeys])),
    );
  };

  const retryFile = async (taskId: string) => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      await ingestQueuedFile(taskId);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const retrySampleFile = async () => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      await ingestSampleFile();
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="DOCX Assignment-to-Portfolio Wizard"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <Sparkles className="h-4 w-4" />
              <span>DOCX Assignment-to-Portfolio Wizard</span>
            </div>
            <h2 className="mt-0.5 text-lg font-bold">
              Chuyển file .docx bài tập thành Portfolio hoàn chỉnh
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-200"
            aria-label="Đóng Wizard"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 border-b border-stone-100 bg-white px-6 py-3 text-xs font-semibold">
          {[
            { num: 1, label: '1. Nạp file .docx & Hồ sơ' },
            { num: 2, label: '2. Chế độ Ảnh & Phong cách' },
            { num: 3, label: '3. Duyệt Bài tập đã Tóm tắt' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                step === s.num
                  ? 'bg-stone-900 text-white'
                  : step > s.num
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
              {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilePick(e.dataTransfer.files);
                }}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/70 p-8 text-center transition hover:border-amber-500 hover:bg-amber-50/30"
              >
                <Upload className="h-10 w-10 text-amber-600" />
                <p className="mt-3 text-sm font-bold text-stone-800">
                  {intakeMode === 'multiple'
                    ? 'Kéo thả nhiều file .docx — mỗi file tương ứng một bài'
                    : 'Kéo thả một file .docx để lọc các đề mục “Bài”'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {intakeMode === 'multiple'
                    ? 'Thêm hoặc bỏ file để tăng/giảm số bài; mỗi file chỉ chọn một bài.'
                    : 'Chọn các bài được phát hiện trong cùng tài liệu để thêm hoặc bớt nội dung nhập.'}
                </p>

                <div className="mt-4 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {([
                    { value: 'single' as const, title: 'Một DOCX · lọc nhiều bài', detail: 'Tìm các đề mục bắt đầu bằng “Bài” rồi chọn nội dung cần nhập.' },
                    { value: 'multiple' as const, title: 'Nhiều DOCX · mỗi file một bài', detail: 'Mỗi file đóng góp đúng một bài. Thêm/bỏ file để đổi số bài nhập.' },
                  ]).map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      disabled={files.length > 0 || useSampleDocx}
                      onClick={() => setIntakeMode(mode.value)}
                      className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                        intakeMode === mode.value
                          ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className="block text-xs font-bold text-stone-800">{mode.title}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-stone-500">{mode.detail}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  <label className="cursor-pointer rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800">
                    <span>{intakeMode === 'multiple' ? 'Thêm nhiều file .docx' : 'Chọn một file .docx'}</span>
                    <input
                      type="file"
                      accept=".docx"
                      multiple={intakeMode === 'multiple'}
                      className="hidden"
                      data-testid="docx-file-input"
                      onChange={(e) => {
                        handleFilePick(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setUseSampleDocx(true);
                      setFiles([]);
                      setFileQueue([]);
                      setSampleStatus('queued');
                      setSampleExtraction(null);
                      setSelectedAssignmentKeys([]);
                      setErrorMsg(null);
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      useSampleDocx
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    📄 Dùng file mẫu (sample-assignments.docx)
                  </button>
                </div>

                {(useSampleDocx || files.length > 0) && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {useSampleDocx && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                        <FileText className="h-3.5 w-3.5" />
                        references/sample-assignments.docx (3 bài tập + 2 ảnh)
                      </span>
                    )}
                    {files.map((f, idx) => {
                      const task = fileQueue.find((item) => item.file === f);
                      return (
                      <span
                        key={`${f.name}-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>
                          {f.name} ({Math.round(f.size / 1024)} KB)
                        </span>
                        {intakeMode === 'multiple' && task && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0 || isProcessing}
                              onClick={() => moveFile(task.id, -1)}
                              className="rounded-full p-0.5 hover:bg-amber-200 disabled:opacity-40"
                              aria-label={`Đưa ${f.name} lên trước`}
                            ><ArrowUp className="h-3 w-3" /></button>
                            <button
                              type="button"
                              disabled={idx === files.length - 1 || isProcessing}
                              onClick={() => moveFile(task.id, 1)}
                              className="rounded-full p-0.5 hover:bg-amber-200 disabled:opacity-40"
                              aria-label={`Đưa ${f.name} xuống sau`}
                            ><ArrowDown className="h-3 w-3" /></button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const task = fileQueue.find((item) => item.file === f);
                            setFiles((prev) => prev.filter((_, i) => i !== idx));
                            if (task) {
                              setFileQueue((prev) => prev.filter((item) => item.id !== task.id));
                              setSelectedAssignmentKeys((prev) =>
                                prev.filter((key) => !key.startsWith(`${task.id}:`)),
                              );
                            }
                          }}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-amber-200"
                          aria-label={`Bỏ file ${f.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                      );
                    })}
                  </div>
                )}

                {(fileQueue.length > 0 || useSampleDocx) && (
                  <div className="mt-4 w-full max-w-2xl space-y-2 text-left">
                    {useSampleDocx && (
                      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs">
                        <span>File máº«u · {sampleStatus === 'ready' ? 'ÄÃ£ Ä‘á»c' : sampleStatus === 'processing' ? 'Äang Ä‘á»c' : sampleStatus === 'error' ? 'Lá»—i' : 'Äang chá»'}</span>
                        {sampleStatus === 'error' && (
                          <button type="button" disabled={isProcessing} onClick={() => { setErrorMsg(null); void retrySampleFile(); }} className="inline-flex items-center gap-1 font-semibold text-amber-700 disabled:opacity-50">
                            <RefreshCw className="h-3 w-3" /> Thá»­ láº¡i
                          </button>
                        )}
                      </div>
                    )}
                    {fileQueue.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          {item.status === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" /> : item.status === 'ready' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : item.status === 'processing' ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-600" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-stone-500" />}
                          <span className="truncate font-semibold">{item.file.name}</span>
                          <span className={item.status === 'error' ? 'text-rose-700' : 'text-stone-500'}>
                            {item.status === 'ready' ? `${item.extraction?.detectedAssignments.length ?? 0} bÃ i Ä‘Æ°á»£c tÃ¬m tháº¥y` : item.status === 'processing' ? 'Äang xá»­ lÃ½' : item.status === 'error' ? item.error : 'Äang chá»'}
                          </span>
                        </span>
                        {item.status === 'error' && (
                          <button type="button" disabled={isProcessing} onClick={() => void retryFile(item.id)} className="inline-flex items-center gap-1 font-semibold text-amber-700 disabled:opacity-50">
                            <RefreshCw className="h-3 w-3" /> Thá»­ láº¡i
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Quick Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Họ và tên hiển thị
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={currentFullName || "Để trống để giữ nguyên, không thay đổi"}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">Để trống nếu muốn giữ nguyên tên hiện tại</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Chức danh / Ngành học
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder={currentRoleTitle || "Để trống để giữ nguyên, không thay đổi"}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">Để trống nếu muốn giữ nguyên ngành học</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={currentEmail || "Để trống để giữ nguyên email hiện tại"}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">Để trống nếu không muốn thay đổi email</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Ảnh đại diện (tải từ máy hoặc nhập URL tùy chọn)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      {avatarUrl.trim() && !avatarPreviewError ? (
                        <img
                          src={avatarUrl}
                          alt="Xem trước ảnh đại diện"
                          data-testid="avatar-preview-img"
                          onError={() => setAvatarPreviewError(true)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle2 className="h-7 w-7 text-stone-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-800 transition hover:bg-stone-100">
                          <Upload className="h-3.5 w-3.5 text-amber-600" />
                          <span>Tải ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            data-testid="avatar-file-input"
                            onChange={(e) => {
                              handleAvatarFilePick(e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {avatarFileName && (
                          <span className="max-w-[160px] truncate rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                            {avatarFileName}
                          </span>
                        )}
                        {avatarUrl.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarUrl('');
                              setAvatarFileName(null);
                              setAvatarPreviewError(false);
                            }}
                            className="text-[11px] font-medium text-rose-600 hover:underline"
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        aria-label="URL Ảnh đại diện"
                        value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                        onChange={(e) => {
                          setAvatarFileName(null);
                          setAvatarPreviewError(false);
                          setAvatarUrl(e.target.value);
                        }}
                        placeholder={
                          avatarUrl.startsWith('data:')
                            ? 'Đang dùng ảnh tải từ máy (hoặc dán URL để thay thế)'
                            : 'Để trống để giữ nguyên ảnh hiện tại hoặc dán URL mới'
                        }
                        className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#735340]/25 bg-[#FFF3E6] px-4 py-2.5 text-xs text-[#3E2723]">
                <span>
                  🎨 <strong>Giữ nguyên bố cục:</strong> Giữ nguyên 100% bố cục, màu sắc và các mục bạn để trống; chỉ đưa bài tập và thông tin cần cập nhật vào trang.
                </span>
                <div className="flex items-center gap-1" aria-hidden="true">
                  <span className="h-3.5 w-3.5 rounded-full border border-black/15 bg-[#FFF3E6]" />
                  <span className="h-3.5 w-3.5 rounded-full bg-[#3E2723]" />
                  <span className="h-3.5 w-3.5 rounded-full bg-[#735340]" />
                  <span className="h-3.5 w-3.5 rounded-full bg-[#5D4037]" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-800">
                  Chọn cơ chế xử lý hình ảnh cho bài tập
                </h3>
                <div className="mt-3 space-y-3">
                  {IMAGE_MODE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        imageMode === opt.value
                          ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="imageMode"
                        value={opt.value}
                        checked={imageMode === opt.value}
                        onChange={() => setImageMode(opt.value)}
                        className="mt-1 accent-amber-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{opt.title}</span>
                          {opt.badge && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                          {opt.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-stone-800">
                  Phong cách ảnh AI minh họa (khi tự động bù hoặc tạo mới)
                </h3>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {VISUAL_STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setVisualStyle(style.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                        visualStyle === style.value
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <section className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4" aria-label="Chọn bài tập từ DOCX">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-800">{intakeMode === 'multiple' ? 'Thứ tự bài theo file' : 'Lọc các bài trong DOCX'}</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      {intakeMode === 'multiple'
                        ? 'Mỗi file được nhập nguyên văn thành một bài. Dùng mũi tên ở danh sách file để sắp xếp thứ tự.'
                        : 'Chỉ lọc các đề mục bắt đầu bằng “Bài” trong tài liệu; không tự chia theo các tiêu đề Phần/Chương khác.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
                    {intakeMode === 'multiple'
                      ? `${useSampleDocx ? 1 : files.length} bài theo thứ tự file`
                      : `Đã chọn ${selectedAssignmentCount} / ${assignmentGroups.reduce((sum, group) => sum + group.assignments.length, 0)} bài`}
                  </span>
                </div>

                {useSampleDocx && sampleStatus === 'error' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs">
                    <span className="text-rose-800">Không đọc được file mẫu. Bạn có thể thử lại.</span>
                    <button type="button" disabled={isProcessing} onClick={() => void retrySampleFile()} className="inline-flex items-center gap-1 font-semibold text-rose-800 disabled:opacity-50">
                      <RefreshCw className="h-3 w-3" /> Thử lại
                    </button>
                  </div>
                )}

                {(fileQueue.some((item) => item.status === 'ready') || (useSampleDocx && sampleStatus === 'ready')) && (
                  <div className="space-y-2">
                    {useSampleDocx && sampleStatus === 'ready' && sampleExtraction && (
                      <div data-testid="docx-source-status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <span className="font-semibold">{sampleExtraction.fileName}</span>
                        <span>{sampleExtraction.detectedAssignments.length} bài được tìm thấy · Đã đọc</span>
                      </div>
                    )}
                    {fileQueue.filter((item) => item.status === 'ready').map((item) => (
                      <div key={item.id} data-testid="docx-source-status" className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <span className="truncate font-semibold">{item.file.name}</span>
                        <span className="shrink-0">{intakeMode === 'multiple' ? '1 bài (toàn bộ file)' : `${item.extraction?.detectedAssignments.length ?? 0} bài được lọc`} · Đã đọc</span>
                      </div>
                    ))}
                  </div>
                )}

                {fileQueue.some((item) => item.status === 'error') && (
                  <div className="space-y-2">
                    {fileQueue.filter((item) => item.status === 'error').map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs">
                        <span className="text-rose-800"><strong>{item.file.name}:</strong> {item.error}</span>
                        <button type="button" disabled={isProcessing} onClick={() => void retryFile(item.id)} className="inline-flex items-center gap-1 font-semibold text-rose-800 disabled:opacity-50">
                          <RefreshCw className="h-3 w-3" /> Thá»­ láº¡i
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {intakeMode === 'multiple' && fileQueue.length > 0 && (
                  <ol className="space-y-2" aria-label="Thứ tự bài theo file">
                    {fileQueue.map((item, index) => (
                      <li key={item.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-900">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-stone-700">{item.file.name}</span>
                        <button type="button" disabled={index === 0 || isProcessing} onClick={() => moveFile(item.id, -1)} aria-label={`Đưa ${item.file.name} lên trước`} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-40"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={index === fileQueue.length - 1 || isProcessing} onClick={() => moveFile(item.id, 1)} aria-label={`Đưa ${item.file.name} xuống sau`} className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-40"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <span className="shrink-0 text-emerald-700">{item.status === 'ready' ? '1 bài' : item.status === 'processing' ? 'Đang đọc' : item.status === 'error' ? 'Lỗi' : 'Đang chờ'}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {intakeMode === 'single' && assignmentGroups.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <input
                          type="search"
                          value={assignmentFilter}
                          onChange={(event) => setAssignmentFilter(event.target.value)}
                          placeholder="Tìm theo tên file, tiêu đề hoặc nội dung bài"
                          className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500"
                          aria-label="Lọc bài tập được phát hiện"
                        />
                      </label>
                      <button type="button" onClick={toggleVisibleAssignments} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100">
                        {visibleAssignmentKeys.length > 0 && visibleAssignmentKeys.every((key) => selectedAssignmentKeys.includes(key)) ? 'Bỏ chọn kết quả đang lọc' : 'Chọn kết quả đang lọc'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {visibleAssignmentGroups.map((group) => {
                        const groupKeys = group.assignments.map((assignment) => assignmentSelectionKey(group.sourceId, assignment.index));
                        const groupSelected = groupKeys.filter((key) => selectedAssignmentKeys.includes(key)).length;
                        return (
                          <fieldset key={group.sourceId} data-testid="assignment-source-group" className="rounded-xl border border-stone-200 bg-white p-3">
                            <legend className="px-1 text-xs font-bold text-stone-800">{group.sourceName}</legend>
                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-stone-100 pb-2 text-[11px] text-stone-500">
                              <span>{group.assignments.length} bài phù hợp · {groupSelected} đã chọn</span>
                              <button
                                type="button"
                                onClick={() => setSelectedAssignmentKeys((previous) => groupSelected === groupKeys.length
                                  ? previous.filter((key) => !groupKeys.includes(key))
                                  : Array.from(new Set([...previous, ...groupKeys])),
                                )}
                                className="font-semibold text-amber-700 hover:underline"
                              >
                                {groupSelected === groupKeys.length ? 'Bỏ chọn file này' : 'Chọn file này'}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {group.assignments.map((assignment) => {
                                const key = assignmentSelectionKey(group.sourceId, assignment.index);
                                return (
                                  <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selectedAssignmentKeys.includes(key) ? 'border-amber-400 bg-amber-50/70' : 'border-stone-100 hover:bg-stone-50'}`}>
                                    <input
                                      type="checkbox"
                                      data-testid="detected-assignment-checkbox"
                                      checked={selectedAssignmentKeys.includes(key)}
                                      onChange={(event) => {
                                        const checked = event.target.checked;
                                        setSelectedAssignmentKeys((previous) => checked
                                          ? Array.from(new Set([...previous, key]))
                                          : previous.filter((item) => item !== key));
                                      }}
                                      className="mt-0.5 accent-amber-600"
                                      aria-label={`Chọn bài ${assignment.rawHeading} từ ${group.sourceName}`}
                                    />
                                    <span className="min-w-0">
                                      <span className="block text-xs font-bold text-stone-800">{assignment.rawHeading || `Bài ${assignment.index + 1}`}</span>
                                      <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-stone-600">{assignment.rawText}</span>
                                      <span className="mt-1 block text-[10px] text-stone-400">{assignment.imageIds.length} ảnh liên quan</span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>
                  </>
                )}

                {intakeMode === 'single' && assignmentGroups.length === 0 && (
                  <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-xs leading-relaxed text-stone-600">
                    {fileQueue.some((item) => item.status === 'ready') || (useSampleDocx && sampleStatus === 'ready')
                      ? 'Không tìm thấy đề mục bài bắt đầu bằng “Bài”. Hãy kiểm tra file hoặc chuyển sang nhánh nhiều file để nhập nguyên tài liệu thành một bài.'
                      : 'Chưa đọc DOCX. Bấm nút bên dưới để tìm các đề mục bắt đầu bằng “Bài”; sau đó lọc và chọn bài cần nhập.'}
                  </p>
                )}
              </section>

              {isProcessing && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>
          )}

          {step === 3 && summaryResult && (
            <div className="space-y-5">
              {/* Summary stats banner */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-stone-900 p-4 text-white sm:grid-cols-4">
                <div>
                  <p className="text-[11px] text-stone-300">File .docx đã đọc</p>
                  <p className="text-xl font-bold">{summaryResult.stats.totalFiles}</p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-300">Bài tập tách được</p>
                  <p className="text-xl font-bold text-amber-300">
                    {summaryResult.stats.totalAssignments}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-300">Ảnh lấy từ DOCX</p>
                  <p className="text-xl font-bold text-emerald-300">
                    {summaryResult.stats.docxImagesFound}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-300">Ảnh AI tạo theo chủ đề</p>
                  <p className="text-xl font-bold text-sky-300">
                    {summaryResult.stats.aiImagesGenerated}
                  </p>
                </div>
              </div>

              {/* Review Cards */}
              <div className="space-y-3">
                {summaryResult.projects.map((proj, idx) => (
                  <div
                    key={proj.id}
                    className="grid grid-cols-1 gap-4 rounded-2xl border border-stone-200 p-4 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-4">
                      {proj.media[0] ? (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                          <img
                            src={proj.media[0].url}
                            alt={proj.title}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                            {proj.media[0].sourceType === 'docx-extracted'
                              ? '📄 Ảnh từ DOCX'
                              : '✨ Ảnh AI theo chủ đề'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-stone-300 text-xs text-stone-400">
                          <ImageIcon className="mr-1.5 h-4 w-4" /> Chưa có ảnh
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold">
                          Bài #{idx + 1}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                          {proj.category}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setSummaryResult((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  projects: prev.projects.map((p) =>
                                    p.id === proj.id ? { ...p, title: nextVal } : p
                                  ),
                                }
                              : prev
                          );
                        }}
                        className="w-full rounded-lg border border-stone-200 px-2.5 py-1 text-sm font-bold focus:border-amber-500 focus:outline-none"
                      />
                      {proj.assignmentBrief && (
                        <p className="text-xs text-stone-600">
                          <strong>Đề bài:</strong> {proj.assignmentBrief}
                        </p>
                      )}
                      <p className="text-xs leading-relaxed text-stone-700">
                        <strong>Tóm tắt:</strong> {proj.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-3.5">
          {step > 1 ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại</span>
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={() => {
                if (!useSampleDocx && files.length === 0) {
                  setErrorMsg('Hãy chọn ít nhất 1 file .docx hoặc dùng file mẫu.');
                  return;
                }
                setErrorMsg(null);
                setStep(2);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              <span>Tiếp tục cấu hình ảnh</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRunPipeline}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-amber-700 disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              <span>
                {hasPendingIngestion
                  ? `Đọc ${useSampleDocx ? 'file mẫu' : 'các file DOCX'}`
                  : `Tóm tắt ${selectedAssignmentCount} bài đã chọn`}
              </span>
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleApplyToCanvas}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-700"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Đổ vào Portfolio Canvas</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
