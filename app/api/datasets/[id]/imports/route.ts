import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const importSchema = z.object({
  sourceVersion: z.string().optional(),
  fileName: z.string().optional(),
  fileHash: z.string().optional(),
  rowsImported: z.number().int().min(0).default(0),
  status: z.enum(["pending", "running", "completed", "failed"]).default("completed"),
  importedBy: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imports = await prisma.datasetImportBatch.findMany({
    where: { datasetSourceId: id },
    orderBy: { importedAt: "desc" },
  });
  return NextResponse.json({ imports });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = importSchema.parse(body);
    const batch = await prisma.datasetImportBatch.create({
      data: { ...data, datasetSourceId: id },
    });
    await prisma.estimationDatasetSource.update({
      where: { id },
      data: { lastCheckedAt: new Date() },
    });
    return NextResponse.json({ batch }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
