import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

const updateSchema = z.object({
  value: z.string().nullable().optional(),
  unit: z.string().min(1).optional(),
  base: z.string().nullable().optional(),
  source: z.string().min(2).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parameter = await prisma.parameter.findUnique({ where: { id } });
  if (!parameter) return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });
  // FASE G.I — adjunta el override del workspace si existe, para que la UI
  // pueda mostrar el valor propio y el global lado a lado.
  const workspace = await getCurrentWorkspace();
  const override = workspace
    ? await prisma.workspaceParameterOverride.findUnique({
        where: { workspaceId_parameterKey: { workspaceId: workspace.id, parameterKey: parameter.key } },
      })
    : null;
  return NextResponse.json({ parameter, override });
}

/**
 * PUT — FASE G.I: en lugar de modificar el Parameter global,
 * crea o actualiza un WorkspaceParameterOverride para el workspace actual.
 * Esto garantiza que ningún usuario afecte a otros con sus ediciones.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const before = await prisma.parameter.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: "No se pudo identificar el workspace (cookie faltante). Recarga la página." },
        { status: 400 },
      );
    }

    // value puede venir explícito; si no, se preserva el global. Para crear override
    // solo permitimos cambiar `value` (no metadatos como source o effectiveFrom que pertenecen al global).
    const newValue = data.value ?? before.value ?? "";

    const override = await prisma.workspaceParameterOverride.upsert({
      where: {
        workspaceId_parameterKey: {
          workspaceId: workspace.id,
          parameterKey: before.key,
        },
      },
      create: {
        workspaceId: workspace.id,
        parameterKey: before.key,
        value: newValue,
        unit: before.unit,
        source: `Editado por este workspace el ${new Date().toISOString().slice(0, 10)}`,
        notes: data.notes ?? null,
      },
      update: {
        value: newValue,
        notes: data.notes ?? undefined,
      },
    });

    await logWorkspaceActivity(workspace.id, "parameter_overridden", {
      parameterKey: before.key,
      globalValue: before.value,
      overrideValue: newValue,
    });

    await prisma.auditLog.create({
      data: {
        entity: "WorkspaceParameterOverride",
        entityId: override.id,
        action: "upsert",
        before: JSON.stringify({ value: before.value, source: "global" }),
        after: JSON.stringify({ value: newValue, workspace: workspace.id }),
        context: `Override de ${before.key} en workspace ${workspace.id}`,
      },
    });

    return NextResponse.json({
      parameter: { ...before, value: newValue },
      override,
      message: "Tu cambio quedó guardado SOLO en tu workspace. No afecta a otros usuarios.",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}

/**
 * DELETE — FASE G.I: borra el override del workspace, volviendo al valor global.
 * NO borra el Parameter global (que es el catálogo base compartido).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.parameter.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: "No se pudo identificar el workspace (cookie faltante)." },
        { status: 400 },
      );
    }

    const deleted = await prisma.workspaceParameterOverride.deleteMany({
      where: { workspaceId: workspace.id, parameterKey: existing.key },
    });

    await logWorkspaceActivity(workspace.id, "parameter_override_removed", {
      parameterKey: existing.key,
    });

    return NextResponse.json({
      removed: deleted.count,
      message:
        deleted.count > 0
          ? "Tu edición se borró; volvió al valor por default del sistema."
          : "No tenías edición personal para este parámetro.",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}
