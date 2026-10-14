/**
 * Cotización para el cliente de un proyecto (cara del desarrollador).
 *
 * GET /api/projects/[id]/cotizacion
 *   Devuelve la cotización guardada o, si todavía no hay, los campos con los
 *   que arrancaría (nombre de quien cotiza, cliente, opción elegida o
 *   recomendada, exclusiones y supuestos por omisión) junto con las cifras de
 *   hoy. Con ?mode=...&scenario=... devuelve las cifras de esa otra opción sin
 *   guardar nada (la vista previa del formulario).
 * PUT /api/projects/[id]/cotizacion
 *   Crea o reemplaza la cotización. Congela las cifras de la estimación y le
 *   asigna su número (COT-AAAA-NNNN) la primera vez.
 *
 * Quién puede: el dueño del proyecto, del lado del desarrollador (404 igual que
 * un proyecto que no existe si no). El ejemplo compartido se puede leer pero
 * no guardar, salvo con sesión de administrador. La cotización no existe del
 * lado del Ayuntamiento.
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { isAdmin } from "@/lib/admin-auth";
import { ladoDelProyecto } from "@/lib/lado";
import { cotizacionGuardarSchema } from "@/lib/cotizacion";
import { ErrorDeCotizacion, cargarCotizacion, guardarCotizacion } from "@/lib/cotizacion-server";
import { getCurrentWorkspace, logWorkspaceActivity, peekWorkspace } from "@/lib/workspace";

const NO_ENCONTRADO = { error: "Proyecto no encontrado." };

/** El proyecto, solo si se puede abrir y es de la cara del desarrollador. */
async function proyectoDelDesarrollador(id: string) {
  const { project, status } = await cargarProyectoConAcceso(id);
  if (!project || ladoDelProyecto(project.lado) !== "desarrollador") return { project: null, status };
  return { project, status };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await proyectoDelDesarrollador(id);
  if (!project) return NextResponse.json(NO_ENCONTRADO, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const workspace = await peekWorkspace();
  const carga = await cargarCotizacion(id, {
    puedeEditar: !project.isTemplate || (await isAdmin()),
    proveedorNombrePorOmision: workspace?.displayName ?? null,
    mode: sp.get("mode"),
    scenario: sp.get("scenario"),
  });
  if (!carga) return NextResponse.json(NO_ENCONTRADO, { status: 404 });
  return NextResponse.json(carga);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project } = await proyectoDelDesarrollador(id);
    if (!project) return NextResponse.json(NO_ENCONTRADO, { status: 404 });
    if (project.isTemplate && !(await isAdmin())) {
      return NextResponse.json(
        { error: "Este proyecto es el ejemplo compartido y su cotización no se guarda. Crea tu propio proyecto para guardar la tuya." },
        { status: 403 },
      );
    }

    const datos = cotizacionGuardarSchema.parse(await req.json());
    const { carga, numero, nueva } = await guardarCotizacion(id, datos);

    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "quote_saved", {
        projectId: id,
        numero,
        nueva,
        mode: datos.mode,
        scenario: datos.scenario,
      });
    }
    return NextResponse.json(carga, { status: nueva ? 201 : 200 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "Los datos de la cotización no son válidos.", campo: e.issues[0]?.path.join(".") || null },
        { status: 400 },
      );
    }
    if (e instanceof ErrorDeCotizacion) return NextResponse.json({ error: e.message }, { status: e.estado });
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo guardar la cotización." }, { status: 400 });
  }
}
