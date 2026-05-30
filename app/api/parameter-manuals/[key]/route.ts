/**
 * GET /api/parameter-manuals/[key]
 *
 * Devuelve el manual extendido de un parámetro (FASE G.I). Si no existe en
 * la tabla ParameterManual, responde 404 con mensaje claro al usuario.
 *
 * Espera ser poblado por seed inicial a partir de 46_parameter_manuals_2026.json
 * (generado con ChatGPT Pro, ver §G.I.7 del plan).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const manual = await prisma.parameterManual.findUnique({ where: { parameterKey: key } });
  if (!manual) {
    return NextResponse.json(
      {
        manual: null,
        message:
          "Este parámetro aún no tiene manual cargado. El administrador del sistema debe generarlo con ChatGPT Pro y cargar 46_parameter_manuals_2026.json al seed.",
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ manual });
}
