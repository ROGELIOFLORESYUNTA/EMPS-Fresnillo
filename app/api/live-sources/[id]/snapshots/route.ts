import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshots = await prisma.liveSourceSnapshot.findMany({
    where: { liveSourceId: id },
    orderBy: { checkedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ snapshots });
}
