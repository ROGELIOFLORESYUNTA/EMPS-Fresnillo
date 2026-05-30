/**
 * GET /api/parameter-manuals/[key]
 *
 * Devuelve el manual extendido de un parámetro (FASE G.I). Si no existe en
 * la tabla ParameterManual, responde 404 con mensaje claro al usuario.
 *
 * Se pobla desde 46_parameter_manuals_2026.json al ejecutar el seed.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [manual, parameter] = await Promise.all([
    prisma.parameterManual.findUnique({ where: { parameterKey: key } }),
    prisma.parameter.findFirst({
      where: { key, effectiveUntil: null },
      orderBy: { effectiveFrom: "desc" },
      select: {
        id: true,
        value: true,
        unit: true,
        base: true,
        source: true,
        sourceUrl: true,
        notes: true,
        year: true,
        effectiveFrom: true,
      },
    }),
  ]);
  if (!manual) {
    return NextResponse.json(
      {
        manual: null,
        parameter,
        message:
          "Este parámetro aún no tiene manual cargado. Pídele al administrador del sistema que lo agregue.",
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ manual, parameter });
}
