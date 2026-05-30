/**
 * POST /api/projects/[id]/changes/preview
 *
 * v7: estima un cambio antes de registrarlo formalmente.
 * No persiste nada. No requiere changeRequestId existente.
 *
 * Aplica rate limit por IP (60 req/min) como defensa básica.
 * Carga parámetros del motor v7 desde tabla Parameter.
 */
import { NextRequest, NextResponse } from "next/server";
import { changeImpactInputSchema } from "@/lib/validators";
import { computeChangeImpact } from "@/lib/engine";
import { loadChangeImpactParameters } from "@/lib/parameters";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, { maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento.", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const input = changeImpactInputSchema.parse(body);

    const engineParams = await loadChangeImpactParameters(2026, "Zacatecas");
    const result = computeChangeImpact({ ...input, projectId: id }, engineParams);

    return NextResponse.json({
      result,
      parametersUsed: engineParams.loadedKeys,
      warnings: engineParams.fallbackWarnings,
      rateLimit: { remaining: rl.remaining },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
