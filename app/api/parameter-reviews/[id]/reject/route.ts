import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const rejectSchema = z.object({
  rejectedBy: z.string().min(2),
  reason: z.string().min(2),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = rejectSchema.parse(body);
    const updated = await prisma.parameterChangeReview.update({
      where: { id },
      data: {
        decision: "rejected",
        decidedBy: data.rejectedBy,
        decidedAt: new Date(),
        reviewerNotes: data.reason,
      },
    });
    return NextResponse.json({ review: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
