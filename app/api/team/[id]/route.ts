import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { teamProfileCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = teamProfileCreateSchema.partial().parse(body);
    const profile = await prisma.teamProfile.update({ where: { id }, data });
    // Registro para la cronología "qué se modificó después de decidir".
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "team_updated", {
        projectId: profile.projectId,
        teamProfileId: profile.id,
        name: profile.name,
      });
    }
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.teamProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
