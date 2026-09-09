/**
 * Enlace compartible del resultado (/r/[token]), de solo lectura.
 *
 * POST crea el enlace (o devuelve el que ya existe); DELETE lo revoca. Solo
 * el dueño del proyecto (mismo workspace) puede hacerlo, y el ejemplo público
 * no se comparte por esta vía porque ya es público.
 */
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId, logWorkspaceActivity } from "@/lib/workspace";

async function proyectoPropio(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, workspaceId: true, isTemplate: true, shareToken: true },
  });
  if (!project || project.isTemplate || !project.workspaceId) return null;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId || project.workspaceId !== workspaceId) return null;
  return project;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await proyectoPropio(id);
  if (!project) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  const token = project.shareToken ?? randomBytes(12).toString("base64url");
  if (!project.shareToken) {
    await prisma.project.update({ where: { id }, data: { shareToken: token } });
    await logWorkspaceActivity(project.workspaceId!, "share_link_created", { projectId: id });
  }
  return NextResponse.json({ token, url: `/r/${token}` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await proyectoPropio(id);
  if (!project) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  if (project.shareToken) {
    await prisma.project.update({ where: { id }, data: { shareToken: null } });
    await logWorkspaceActivity(project.workspaceId!, "share_link_revoked", { projectId: id });
  }
  return NextResponse.json({ ok: true });
}
