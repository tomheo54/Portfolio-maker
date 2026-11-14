import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { privateApiUnavailableResponse } from '@/services/deployment/private-api-guard';
import { parseDocxBuffer } from '@/services/docx/docx-parser';
import type { RawDocxExtractionResult } from '@/schema/docx-ingestion.schema';

export async function POST(req: NextRequest) {
  const unavailable = privateApiUnavailableResponse('/api/docx-ingest');
  if (unavailable) return unavailable;

  try {
    const useSample = req.nextUrl.searchParams.get('useSample') === 'true';
    const assignmentModeValue = req.nextUrl.searchParams.get('assignmentMode') ?? 'detect';
    if (!['detect', 'whole-file', 'bai-headings'].includes(assignmentModeValue)) {
      return NextResponse.json({ error: 'Chế độ nhận diện bài DOCX không hợp lệ.' }, { status: 400 });
    }
    const assignmentMode = assignmentModeValue as 'detect' | 'whole-file' | 'bai-headings';

    if (useSample) {
      const samplePath = path.resolve(
        process.cwd(),
        'references/sample-assignments.docx'
      );
      if (!fs.existsSync(samplePath)) {
        return NextResponse.json(
          { error: 'Sample DOCX file not found at references/sample-assignments.docx' },
          { status: 404 }
        );
      }
      const buffer = fs.readFileSync(samplePath);
      const extraction = await parseDocxBuffer(buffer, 'sample-assignments.docx', { assignmentMode });
      return NextResponse.json({ extractions: [extraction] });
    }

    const formData = await req.formData();
    const entries = formData.getAll('files');
    const singleFile = formData.get('file');
    const fileList = [
      ...entries,
      ...(singleFile ? [singleFile] : []),
    ].filter((item): item is File => item instanceof File);

    if (fileList.length === 0) {
      return NextResponse.json(
        { error: 'No .docx files provided in form-data' },
        { status: 400 }
      );
    }

    const extractions: RawDocxExtractionResult[] = [];
    for (const file of fileList) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await parseDocxBuffer(buffer, file.name, { assignmentMode });
      extractions.push(parsed);
    }

    return NextResponse.json({ extractions });
  } catch (error) {
    console.error('DOCX ingest error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to parse DOCX file',
      },
      { status: 500 }
    );
  }
}
