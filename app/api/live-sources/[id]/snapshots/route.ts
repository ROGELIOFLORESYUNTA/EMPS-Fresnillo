import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  const snapshots = await prisma.liveSourceSnapshot.findMany({
    where: { liveSourceId: id },
    orderBy: { checkedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ snapshots });
}
