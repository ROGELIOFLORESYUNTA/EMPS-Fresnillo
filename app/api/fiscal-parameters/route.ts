import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Lista los parametros fiscales versionados que estan vigentes (approvalStatus=approved).
 * Filtros: ?year=2026&state=Zacatecas
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  const state = url.searchParams.get("state");

  const where: { approvalStatus: string; jurisdiction?: string; validFrom?: { gte: Date; lt: Date } } = {
    approvalStatus: "approved",
  };
  if (state === "Zacatecas") where.jurisdiction = "MX-ZAC";
  if (year) {
    const y = Number.parseInt(year, 10);
    where.validFrom = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
  }

  const parameters = await prisma.fiscalParameterVersion.findMany({
    where,
    orderBy: [{ parameterKey: "asc" }, { validFrom: "desc" }],
  });
  return NextResponse.json({ parameters });
}
