import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number.parseInt(url.searchParams.get("year") ?? "2026", 10);
  const country = url.searchParams.get("country") ?? "Mexico";
  const state = url.searchParams.get("state") ?? "Zacatecas";

  const parameters = await prisma.parameter.findMany({
    where: {
      year,
      country,
      OR: [{ state }, { state: null }],
    },
    orderBy: [{ key: "asc" }],
  });
  return NextResponse.json({ parameters });
}
