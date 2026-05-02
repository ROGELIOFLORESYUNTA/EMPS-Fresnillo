import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const reviews = await prisma.parameterChangeReview.findMany({
    where: { decision: status },
    orderBy: { detectedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ reviews });
}
