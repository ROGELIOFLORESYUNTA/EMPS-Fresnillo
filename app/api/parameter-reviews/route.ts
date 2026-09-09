import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const reviews = await prisma.parameterChangeReview.findMany({
    where: { decision: status },
    orderBy: { detectedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ reviews });
}
