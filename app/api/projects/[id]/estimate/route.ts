import { NextRequest, NextResponse } from "next/server";
import { estimateRequestSchema } from "@/lib/validators";
import { runEstimate } from "@/lib/estimate-service";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = estimateRequestSchema.parse(body);
    const result = await runEstimate({ projectId: id, ...data });

    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "estimate_run", {
        projectId: id,
        mode: data.mode,
        scenarios: data.scenarios,
        targetMargin: data.targetMargin,
        costMode: data.costMode,
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 400 },
    );
  }
}
