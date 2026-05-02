import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Lista los modos de desarrollo del catalogo + sus factores de productividad
 * (multiplicadores per-fase del addendum 22).
 */
export async function GET() {
  const modes = await prisma.devModeCatalog.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    include: {
      productivityFactors: {
        orderBy: { scenarioName: "asc" },
      },
    },
  });
  return NextResponse.json({ modes });
}
