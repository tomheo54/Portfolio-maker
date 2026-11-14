import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { privateApiUnavailableResponse } from "@/services/deployment/private-api-guard";
import completedPortfolioPreset from "@/data/presets/portfolio-mau-hoan-chinh.json";
import {
  ImageModeSchema,
  PortfolioDocumentSchema,
  TemplateIdSchema,
  VisualStyleSchema,
  type TemplateId,
  type PortfolioDocument,
} from "@/schema/portfolio.schema";
import { THEME_PRESETS } from "@/schema/theme.schema";
import { parseDocxBuffer } from "@/services/docx/docx-parser";
import { summarizeAssignments } from "@/services/ai/summarize-assignments";
import {
  sanitizeSlug,
  savePortfolioDocument,
} from "@/services/export/portfolio-repository";

interface CsvRowInfo {
  fileName?: string;
  fullName?: string;
  roleTitle?: string;
  email?: string;
  avatarUrl?: string;
}

function parseCsvRecords(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csvText.length; index++) {
    const char = csvText[index];
    if (char === '"') {
      if (quoted && csvText[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csvText[index + 1] === "\n") index++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const BatchLayoutSchema = z.enum(["standard", "projects-first"]);
const BatchFileOptionsSchema = z
  .object({
    templateId: TemplateIdSchema.optional(),
    layout: BatchLayoutSchema.optional(),
    visualStyle: VisualStyleSchema.optional(),
  })
  .strict();

function parseSimpleCsv(csvText: string): CsvRowInfo[] {
  const [headerRow, ...rows] = parseCsvRecords(csvText);
  if (!headerRow || rows.length === 0) return [];

  const headers = headerRow.map((header) => header.toLowerCase());
  return rows.map((cols) => {
    const row: CsvRowInfo = {};
    headers.forEach((h, i) => {
      if (h.includes("file")) row.fileName = cols[i];
      else if (h.includes("name") || h.includes("ten")) row.fullName = cols[i];
      else if (h.includes("role") || h.includes("nganh") || h.includes("chucdanh"))
        row.roleTitle = cols[i];
      else if (h.includes("mail")) row.email = cols[i];
      else if (h.includes("avatar") || h.includes("anh"))
        row.avatarUrl = cols[i];
    });
    return row;
  });
}

function inferNameFromFilename(fileName: string): string {
  const base = fileName
    .replace(/\.docx$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(baitap|bai tap|assignment|portfolio|profile)\b/gi, "")
    .trim();
  return base || "Học viên TNT Lab";
}

export async function POST(req: NextRequest) {
  const unavailable = privateApiUnavailableResponse('/api/batch');
  if (unavailable) return unavailable;

  try {
    const formData = await req.formData();
    const useSampleBatch = formData.get("useSampleBatch") === "true";

    const imageMode = ImageModeSchema.parse(
      formData.get("imageMode") || "hybrid-auto",
    );
    const visualStyle = VisualStyleSchema.parse(
      formData.get("visualStyle") || "canva-pastel-graphic",
    );
    const defaultLayout = BatchLayoutSchema.parse(
      formData.get("layout") || "standard",
    );
    const defaultTemplateId = TemplateIdSchema.parse(
      formData.get("templateId") || "canva-editorial",
    );
    const csvText = String(formData.get("csvText") || "");
    const csvRows = csvText ? parseSimpleCsv(csvText) : [];
    const stableBatchId = String(formData.get("batchId") || "").trim();
    const requestedFileId = String(formData.get("fileId") || "").trim();
    const fileIndexValue = formData.get("fileIndex");
    const requestedFileIndex = fileIndexValue === null ? Number.NaN : Number(fileIndexValue);
    const requestedSourcePath = String(formData.get("sourcePath") || "").trim();
    const assignmentModeValue = String(formData.get("assignmentMode") || "detect");
    if (!["detect", "whole-file", "bai-headings"].includes(assignmentModeValue)) {
      return NextResponse.json({ error: "Chế độ nhận diện bài DOCX không hợp lệ." }, { status: 400 });
    }
    const assignmentMode = assignmentModeValue as "detect" | "whole-file" | "bai-headings";
    const selectedAssignmentValue = formData.get("selectedAssignmentIndexes");
    let selectedAssignmentIndexes: number[] | undefined;
    if (selectedAssignmentValue !== null) {
      try {
        const parsed = JSON.parse(String(selectedAssignmentValue)) as unknown;
        if (!Array.isArray(parsed) || !parsed.every((index) => Number.isInteger(index) && index >= 0)) {
          throw new Error("invalid assignment indexes");
        }
        selectedAssignmentIndexes = Array.from(new Set(parsed as number[]));
      } catch {
        return NextResponse.json({ error: "Danh sách bài tập được chọn không hợp lệ." }, { status: 400 });
      }
    }

    const baseTemplateDoc = PortfolioDocumentSchema.parse(completedPortfolioPreset);

    type InputEntry = {
      fileName: string;
      sourcePath: string;
      stableId?: string;
      buffer: Buffer;
      overrideName?: string;
      overrideRole?: string;
      overrideEmail?: string;
      overrideAvatarUrl?: string;
    };

    const inputs: InputEntry[] = [];

    if (useSampleBatch) {
      const samplePath = path.resolve(
        process.cwd(),
        "references/sample-assignments.docx",
      );
      if (!fs.existsSync(samplePath)) {
        return NextResponse.json(
          { error: "Sample DOCX not found" },
          { status: 404 },
        );
      }
      const sampleBuf = fs.readFileSync(samplePath);
      inputs.push({
        fileName: "sample-assignments.docx",
        sourcePath: "sample-assignments.docx",
        stableId: requestedFileId || undefined,
        buffer: sampleBuf,
        overrideName: "Hồ sơ minh họa",
        overrideRole: "Dữ liệu mẫu",
      });
    } else {
      const uploadedFiles = formData
        .getAll("files")
        .filter((f): f is File => f instanceof File);

      if (uploadedFiles.length === 0) {
        return NextResponse.json(
          { error: "Vui lòng chọn ít nhất 1 file .docx" },
          { status: 400 },
        );
      }

      for (let i = 0; i < uploadedFiles.length; i++) {
        const f = uploadedFiles[i];
        const buf = Buffer.from(await f.arrayBuffer());
        const sourcePath = uploadedFiles.length === 1 && requestedSourcePath
          ? requestedSourcePath
          : ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name);
        const fileIndex = Number.isInteger(requestedFileIndex) && requestedFileIndex >= 0
          ? requestedFileIndex
          : i;
        const normalizePath = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
        const csvMatch =
          csvRows.find(
            (r) => r.fileName && normalizePath(r.fileName) === normalizePath(sourcePath),
          ) ?? csvRows.find(
            (r) => r.fileName && normalizePath(r.fileName).split("/").pop() === normalizePath(f.name),
          ) ?? csvRows[fileIndex];

        inputs.push({
          fileName: f.name,
          sourcePath,
          stableId: uploadedFiles.length === 1 && requestedFileId
            ? requestedFileId
            : `${i}-${f.name}-${f.size}`,
          buffer: buf,
          overrideName: csvMatch?.fullName || inferNameFromFilename(f.name),
          overrideRole: csvMatch?.roleTitle,
          overrideEmail: csvMatch?.email,
          overrideAvatarUrl: csvMatch?.avatarUrl,
        });
      }
    }

    const fileOptionsValue = formData.get("fileOptions");
    let perFileOptions: z.infer<typeof BatchFileOptionsSchema>[] = [];
    if (fileOptionsValue !== null) {
      if (typeof fileOptionsValue !== "string") {
        return NextResponse.json(
          { error: "Tùy chọn theo file phải là dữ liệu JSON hợp lệ." },
          { status: 400 },
        );
      }

      let parsedOptions: unknown;
      try {
        parsedOptions = JSON.parse(fileOptionsValue);
      } catch {
        return NextResponse.json(
          { error: "Tùy chọn theo file phải là dữ liệu JSON hợp lệ." },
          { status: 400 },
        );
      }
      const validatedOptions = z
        .array(BatchFileOptionsSchema)
        .safeParse(parsedOptions);
      if (!validatedOptions.success) {
        return NextResponse.json(
          {
            error:
              "Tùy chọn template, bố cục hoặc phong cách ảnh không hợp lệ.",
          },
          { status: 400 },
        );
      }
      if (validatedOptions.data.length !== inputs.length) {
        return NextResponse.json(
          { error: "Số tùy chọn phải khớp với số file đầu vào." },
          { status: 400 },
        );
      }
      perFileOptions = validatedOptions.data;
    }

    const createdResults: Array<{
      slug: string;
      fullName: string;
      roleTitle: string;
      url: string;
      assignmentCount: number;
      docxImages: number;
      aiImages: number;
      document: PortfolioDocument;
    }> = [];

    const usedSlugs = new Set<string>();

    for (let i = 0; i < inputs.length; i++) {
      const entry = inputs[i];
      const options = perFileOptions[i] ?? {};
      const templateId: TemplateId = options.templateId ?? defaultTemplateId;
      const fileLayout = options.layout ?? defaultLayout;
      const fileVisualStyle = options.visualStyle ?? visualStyle;
      const preset =
        THEME_PRESETS.find((p) => p.templateId === templateId) ??
        THEME_PRESETS[0];
      const effectiveTheme =
        templateId === "canva-editorial"
          ? { ...baseTemplateDoc.theme }
          : { ...preset.theme };
      const parsedExtraction = await parseDocxBuffer(entry.buffer, entry.fileName, { assignmentMode });
      let extraction = parsedExtraction;
      if (selectedAssignmentIndexes) {
        const selectedAssignments = parsedExtraction.detectedAssignments.filter((assignment) =>
          selectedAssignmentIndexes?.includes(assignment.index),
        );
        if (selectedAssignments.length === 0) {
          return NextResponse.json({ error: `Hãy chọn ít nhất một bài tập có trong ${entry.fileName}.` }, { status: 400 });
        }
        if (selectedAssignments.length !== selectedAssignmentIndexes.length) {
          return NextResponse.json({ error: `Danh sách bài chọn có mục không tồn tại trong ${entry.fileName}.` }, { status: 400 });
        }
        const usedImageIds = new Set(selectedAssignments.flatMap((assignment) => assignment.imageIds));
        extraction = {
          ...parsedExtraction,
          rawText: selectedAssignments.map((assignment) => assignment.rawText).join("\n\n"),
          detectedAssignments: selectedAssignments,
          extractedImages: parsedExtraction.extractedImages.filter((image) => usedImageIds.has(image.id)),
        };
      }

      const summary = await summarizeAssignments({
        extractions: [extraction],
        studentProfile: {
          fullName: entry.overrideName,
          roleTitle: entry.overrideRole,
          email: entry.overrideEmail,
          avatarUrl: entry.overrideAvatarUrl,
        },
        imageMode,
        visualStyle: fileVisualStyle,
        themeColors: {
          primaryColor: effectiveTheme.primaryColor,
          backgroundColor: effectiveTheme.backgroundColor,
        },
      });

      const baseSlug = sanitizeSlug(`${summary.fullName}portfolio`);
      const stableSuffix = stableBatchId && entry.stableId
        ? createHash("sha256").update(`${stableBatchId}:${entry.stableId}`).digest("hex").slice(0, 8)
        : "";
      const candidateSlug = stableSuffix ? `${baseSlug}-${stableSuffix}` : baseSlug;
      let slug = candidateSlug;
      let suffix = 2;
      while (usedSlugs.has(slug)) {
        slug = `${candidateSlug}-${suffix++}`;
      }
      usedSlugs.add(slug);

      const generatedSections = baseTemplateDoc.sections.map((sec) => {
        if (sec.type === "hero") {
          return {
            ...sec,
            variant: sec.variant,
            headline: "Digital Portfolio",
            fullName: summary.fullName,
            roleTitle: summary.roleTitle,
            shortBio: summary.shortBio,
            avatar: {
              ...sec.avatar,
              url: entry.overrideAvatarUrl || "",
              sourceType: entry.overrideAvatarUrl
                ? ("user-uploaded" as const)
                : ("docx-extracted" as const),
            },
            quickTags: summary.quickTags,
            ctaButtons: sec.ctaButtons.map((btn) => ({ ...btn })),
            decorations: sec.decorations.map((dec) => ({
              ...dec,
              position: { ...dec.position },
            })),
          };
        }
        if (sec.type === "about") {
          return {
            ...sec,
            variant: sec.variant,
            title: sec.title,
            biography: summary.biography,
            highlights: summary.highlights,
            contactInfo: {
              email: entry.overrideEmail,
              socials: [],
            },
          };
        }
        if (sec.type === "skills") {
          return {
            ...sec,
            variant: sec.variant,
            title: sec.title,
            categories: summary.skills,
          };
        }
        if (sec.type === "education") {
          return {
            ...sec,
            items: [],
          };
        }
        if (sec.type === "projects") {
          return {
            ...sec,
            variant: sec.variant,
            title: `Project • ${String(summary.projects.length).padStart(
              2,
              "0",
            )} Bài Tập Thực Hành`,
            subtitle:
              "Nội dung được tổng hợp từ tài liệu DOCX đã nạp; vui lòng kiểm tra tính chính xác trước khi công bố.",
            projects: summary.projects,
          };
        }
        if (sec.type === "contact") {
          return {
            ...sec,
            title: sec.title,
            subtitle: `Cảm ơn bạn đã xem hồ sơ của ${summary.fullName}. Vui lòng xác nhận thông tin liên hệ trước khi công bố.`,
            thankYouMessage: sec.thankYouMessage,
            showContactForm: sec.showContactForm,
          };
        }
        return sec;
      });
      const sections =
        fileLayout === "projects-first"
          ? [
              ...generatedSections.filter(
                (section) => section.type === "projects",
              ),
              ...generatedSections.filter(
                (section) => section.type !== "projects",
              ),
            ]
          : generatedSections;

      const doc: PortfolioDocument = {
        ...baseTemplateDoc,
        id: `batch-${slug}-${Date.now()}-${i}`,
        slug,
        templateId,
        imageGenerationConfig: {
          mode: imageMode,
          visualStyle: fileVisualStyle,
        },
        seo: {
          title: `${summary.fullName} | Digital Portfolio 2026`,
          description: summary.shortBio,
          ogImage: entry.overrideAvatarUrl,
        },
        theme: effectiveTheme,
        sections,
      };

      const saved = savePortfolioDocument(doc);
      createdResults.push({
        slug: saved.slug,
        fullName: summary.fullName,
        roleTitle: summary.roleTitle,
        url: `/${saved.slug}`,
        assignmentCount: summary.stats.totalAssignments,
        docxImages: summary.stats.docxImagesFound,
        aiImages: summary.stats.aiImagesGenerated,
        document: saved,
      });
    }

    return NextResponse.json({
      count: createdResults.length,
      portfolios: createdResults,
    });
  } catch (error) {
    console.error("Batch factory error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Batch generation failed",
      },
      { status: 500 },
    );
  }
}
