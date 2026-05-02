import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const checkSchema = z.object({
  contentHash: z.string().optional(),
  httpStatus: z.number().int().optional(),
  extractedText: z.string().optional(),
  extractedJson: z.unknown().optional(),
  changeDetected: z.boolean().default(false),
  notes: z.string().optional(),
});

/**
 * Registra un snapshot de revision de la fuente.
 * En produccion esto lo invocaria un job programado segun refreshFrequency;
 * en el prototipo lo dispara el usuario manualmente desde la UI.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = checkSchema.parse(body);
    const snapshot = await prisma.liveSourceSnapshot.create({
      data: {
        liveSourceId: id,
        contentHash: data.contentHash ?? null,
        httpStatus: data.httpStatus ?? null,
        extractedText: data.extractedText ?? null,
        extractedJson: data.extractedJson !== undefined ? JSON.stringify(data.extractedJson) : null,
        changeDetected: data.changeDetected,
        reviewStatus: "pending",
        notes: data.notes ?? null,
      },
    });
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
