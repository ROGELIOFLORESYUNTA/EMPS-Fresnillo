import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  sourceKey: z.string().min(2),
  sourceName: z.string().min(2),
  category: z.enum(["fiscal", "fiscal_state", "labor", "dataset", "procurement", "research", "technology"]),
  officialPriority: z.number().int().min(1).max(3).default(1),
  sourceUrl: z.string().url(),
  refreshFrequency: z.enum(["manual", "daily", "weekly", "monthly", "quarterly", "yearly"]).default("manual"),
  parserType: z.enum(["manual_review", "pdf_manual", "csv", "json", "html"]).default("manual_review"),
  requiresHumanApproval: z.boolean().default(true),
  active: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const where = category ? { category } : {};
  const sources = await prisma.liveSourceRegistry.findMany({
    where,
    orderBy: [{ category: "asc" }, { sourceKey: "asc" }],
    include: { _count: { select: { snapshots: true } } },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const source = await prisma.liveSourceRegistry.create({ data });
    return NextResponse.json({ source }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
