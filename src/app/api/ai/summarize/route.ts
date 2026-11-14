import { NextRequest, NextResponse } from 'next/server';
import { privateApiUnavailableResponse } from '@/services/deployment/private-api-guard';
import { SummarizeAssignmentsRequestSchema } from '@/schema/docx-ingestion.schema';
import { summarizeAssignments } from '@/services/ai/summarize-assignments';

export async function POST(req: NextRequest) {
  const unavailable = privateApiUnavailableResponse('/api/ai/summarize');
  if (unavailable) return unavailable;

  try {
    const body = await req.json();
    const parsedReq = SummarizeAssignmentsRequestSchema.parse(body);
    const result = await summarizeAssignments(parsedReq);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI summarize error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to summarize assignments',
      },
      { status: 400 }
    );
  }
}
