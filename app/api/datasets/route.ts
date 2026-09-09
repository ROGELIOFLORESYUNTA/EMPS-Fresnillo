import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";

const createSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  sourceType: z.enum(["zenodo", "csv", "local_capture", "github", "kaggle"]),
  sourceUrl: z.string().url().optional(),
  doi: z.string().optional(),
  license: z.string().optional(),
  description: z.string().optional(),
  intendedUse: z.string().optional(),
});

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const datasets = await prisma.estimationDatasetSource.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { imports: true } } },
  });
  return NextResponse.json({ datasets });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const dataset = await prisma.estimationDatasetSource.create({ data });
    return NextResponse.json({ dataset }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
