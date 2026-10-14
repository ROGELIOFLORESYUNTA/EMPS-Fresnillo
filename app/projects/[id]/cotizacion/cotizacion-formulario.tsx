"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, apiPut } from "@/lib/api-client";
import { CotizacionDocumento } from "@/components/cotizacion-documento";
import { DEVELOPMENT_MODES, SCENARIO_LABELS, formatMXN } from "@/lib/utils";
import {
  documentoDeCarga,
  lineasDeTexto,
  supuestosPorOmision,
  textoDeLineas,
  type CamposDeCotizacion,
  type CotizacionPayload,
} from "@/lib/cotizacion";
import { Printer, Save, RefreshCw } from "lucide-react";

/** Los campos tal como se escriben: los números como texto, para poder dejarlos vacíos mientras se teclea. */
interface Estado {
  proveedorNombre: string;
  proveedorRfc: string;
  proveedorContacto: string;
  clienteNombre: string;
  mode: string;
  scenario: string;
  vigenciaDias: string;
  anticipoPct: string;
  finalPct: string;
  incluyeMantenimiento: boolean;
  mantenimientoMensual: string;
  exclusiones: string;
  supuestos: string;
  notas: string;
}

function estadoDe(c: CamposDeCotizacion): Estado {
  return {
    proveedorNombre: c.proveedorNombre,
    proveedorRfc: c.proveedorRfc ?? "",
    proveedorContacto: c.proveedorContacto ?? "",
    clienteNombre: c.clienteNombre,
    mode: c.mode,
    scenario: c.scenario,
    vigenciaDias: String(c.vigenciaDias),
    anticipoPct: String(c.anticipoPct),
    finalPct: String(c.finalPct),
    incluyeMantenimiento: c.incluyeMantenimiento,
    mantenimientoMensual: c.mantenimientoMensual === null ? "" : String(c.mantenimientoMensual),
    exclusiones: textoDeLineas(c.exclusiones),
    supuestos: textoDeLineas(c.supuestos),
    notas: c.notas ?? "",
  };
}

const entero = (v: string, porOmision: number) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : porOmision;
};

/** Los campos que entiende el documento y la API, a partir de lo que hay en pantalla. */
function camposDe(e: Estado, base: CamposDeCotizacion): CamposDeCotizacion {
  const monto = Number.parseFloat(e.mantenimientoMensual);
  return {
    numero: base.numero,
    fecha: base.fecha,
    vigenciaDias: Math.max(1, entero(e.vigenciaDias, 15)),
    proveedorNombre: e.proveedorNombre.trim(),
    proveedorRfc: e.proveedorRfc.trim() || null,
    proveedorContacto: e.proveedorContacto.trim() || null,
    clienteNombre: e.clienteNombre.trim(),
    mode: e.mode,
    scenario: e.scenario,
    exclusiones: lineasDeTexto(e.exclusiones),
    supuestos: lineasDeTexto(e.supuestos),
    incluyeMantenimiento: e.incluyeMantenimiento,
    mantenimientoMensual: Number.isFinite(monto) && monto > 0 ? monto : null,
    anticipoPct: Math.max(0, entero(e.anticipoPct, 0)),
    finalPct: Math.max(0, entero(e.finalPct, 0)),
    notas: e.notas.trim() || null,
  };
}

/** Lo que se manda a guardar. */
function cuerpoDe(c: CamposDeCotizacion, refrescarCifras: boolean) {
  return {
    vigenciaDias: c.vigenciaDias,
    proveedorNombre: c.proveedorNombre,
    proveedorRfc: c.proveedorRfc,
    proveedorContacto: c.proveedorContacto,
    clienteNombre: c.clienteNombre,
    mode: c.mode,
    scenario: c.scenario,
    exclusiones: c.exclusiones,
    supuestos: c.supuestos,
    incluyeMantenimiento: c.incluyeMantenimiento,
    mantenimientoMensual: c.mantenimientoMensual,
    anticipoPct: c.anticipoPct,
    finalPct: c.finalPct,
    notas: c.notas,
    refrescarCifras,
  };
}

function mensajeDeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : "";
  // api-client arma "API 400: {json}"; se saca el mensaje del cuerpo si viene.
  const m = /^API \d+: (.*)$/s.exec(texto);
  if (m) {
    try {
      const j = JSON.parse(m[1]) as { error?: string };
      if (j.error) return j.error;
    } catch {
      /* el cuerpo no era JSON */
    }
  }
  return texto || "No se pudo guardar la cotización.";
}

const ESCENARIOS_EN_ORDEN = ["optimistic", "probable", "conservative"] as const;

function Campo({ id, etiqueta, ayuda, children }: { id: string; etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-xs text-tinta-suave">{ayuda}</p>}
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-lg border border-border bg-lienzo p-5 sm:p-6">
      <legend className="px-1 text-seccion text-tinta">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** ¿Los supuestos que hay son exactamente los que el sistema escribiría solo para estos campos? */
function supuestosSonLosDeOmision(c: CamposDeCotizacion, fechaParametros: string | null | undefined): boolean {
  const base = supuestosPorOmision({ clienteNombre: c.clienteNombre, mode: c.mode, scenario: c.scenario, fechaParametros });
  return textoDeLineas(base) === textoDeLineas(c.supuestos);
}

export function CotizacionFormulario({ inicial }: { inicial: CotizacionPayload }) {
  const projectId = inicial.proyecto.id;
  const [carga, setCarga] = useState<CotizacionPayload>(inicial);
  const [e, setE] = useState<Estado>(() => estadoDe(inicial.campos));
  // Lo último que se guardó, para saber si hay cambios sin guardar.
  const [guardado, setGuardado] = useState<string>(() => JSON.stringify(cuerpoDe(camposDe(estadoDe(inicial.campos), inicial.campos), false)));
  const [ocupado, setOcupado] = useState<null | "guardando" | "cifras" | "opcion">(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Los supuestos se escriben solos mientras la persona no los toque a mano.
  const supuestosTocados = useRef<boolean | null>(null);
  if (supuestosTocados.current === null) {
    supuestosTocados.current = !supuestosSonLosDeOmision(inicial.campos, inicial.cifras?.estimacion.calculadaEl);
  }

  const campos = useMemo(() => camposDe(e, carga.campos), [e, carga.campos]);
  const documento = useMemo(() => documentoDeCarga({ ...carga, campos }), [carga, campos]);
  const hayCambiosSinGuardar = JSON.stringify(cuerpoDe(campos, false)) !== guardado;

  const modosConEstimacion = DEVELOPMENT_MODES.filter((m) => carga.opciones.some((o) => o.mode === m.value));
  const escenariosDelModo = ESCENARIOS_EN_ORDEN.map((s) => carga.opciones.find((o) => o.mode === e.mode && o.scenario === s)).filter(
    (o): o is NonNullable<typeof o> => !!o,
  );
  const opcionElegida = carga.opciones.find((o) => o.mode === e.mode && o.scenario === e.scenario);
  const nombreDeModo = (m: string) => DEVELOPMENT_MODES.find((x) => x.value === m)?.label ?? m;
  const nombreDeEscenario = (s: string) => SCENARIO_LABELS[s]?.toLowerCase() ?? s;

  const avancePct = Math.max(0, 100 - campos.anticipoPct - campos.finalPct);
  const sumaPasada = campos.anticipoPct + campos.finalPct > 100;

  /** Cambia uno o varios campos. Si los supuestos siguen siendo los de siempre, se rehacen con el cliente y la opción nuevos. */
  function ponerVarios(cambios: Partial<Estado>, fechaParametros: string | null | undefined = carga.cifras?.estimacion.calculadaEl) {
    setE((previo) => {
      const siguiente = { ...previo, ...cambios };
      const cambiaronLosSupuestos = "supuestos" in cambios;
      const afectaAlosSupuestos = "clienteNombre" in cambios || "mode" in cambios || "scenario" in cambios;
      if (!supuestosTocados.current && !cambiaronLosSupuestos && afectaAlosSupuestos) {
        siguiente.supuestos = textoDeLineas(
          supuestosPorOmision({ clienteNombre: siguiente.clienteNombre, mode: siguiente.mode, scenario: siguiente.scenario, fechaParametros }),
        );
      }
      return siguiente;
    });
    setAviso(null);
  }

  function poner<K extends keyof Estado>(clave: K, valor: Estado[K]) {
    ponerVarios({ [clave]: valor } as Partial<Estado>);
  }

  /** Cambia la forma de hacerlo o el escenario y trae las cifras de esa opción (sin guardar). */
  async function elegirOpcion(mode: string, scenario: string) {
    setError(null);
    ponerVarios({ mode, scenario });
    setOcupado("opcion");
    try {
      const nueva = await api<CotizacionPayload>(`/api/projects/${projectId}/cotizacion?mode=${mode}&scenario=${scenario}`);
      setCarga((previo) => ({ ...previo, cifras: nueva.cifras, acumulado: nueva.acumulado, desactualizada: nueva.desactualizada }));
      if (!supuestosTocados.current) {
        // Ahora que llegaron las cifras, los supuestos citan la fecha de los parámetros de esa estimación.
        setE((previo) => ({
          ...previo,
          supuestos: textoDeLineas(
            supuestosPorOmision({
              clienteNombre: previo.clienteNombre,
              mode,
              scenario,
              fechaParametros: nueva.cifras?.estimacion.calculadaEl,
            }),
          ),
        }));
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setOcupado(null);
    }
  }

  function alCambiarElModo(mode: string) {
    const escenarios = carga.opciones.filter((o) => o.mode === mode).map((o) => o.scenario);
    const scenario = escenarios.includes(e.scenario) ? e.scenario : escenarios.includes("probable") ? "probable" : escenarios[0];
    if (scenario) void elegirOpcion(mode, scenario);
  }

  async function guardar(refrescarCifras: boolean) {
    setError(null);
    setAviso(null);
    setOcupado(refrescarCifras ? "cifras" : "guardando");
    try {
      const nueva = await apiPut<CotizacionPayload>(`/api/projects/${projectId}/cotizacion`, cuerpoDe(campos, refrescarCifras));
      setCarga(nueva);
      // Lo que se ve queda como lo normalizó el servidor (RFC en mayúsculas, renglones limpios).
      setE(estadoDe(nueva.campos));
      setGuardado(JSON.stringify(cuerpoDe(nueva.campos, false)));
      setAviso(
        refrescarCifras
          ? `Cifras actualizadas con el precio de hoy. Cotización ${nueva.campos.numero}.`
          : `Guardada como ${nueva.campos.numero}. Ya puedes imprimirla o compartirla.`,
      );
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setOcupado(null);
    }
  }

  const sinPermiso = !carga.puedeEditar;

  return (
    <div className="space-y-8">
      {carga.esEjemplo && (
        <p className="rounded-md border border-border bg-papel px-4 py-3 text-sm text-tinta">
          Este es el proyecto de ejemplo. Puedes mover los campos para ver cómo cambia la cotización, pero no se guarda. Crea tu propio
          proyecto para guardar la tuya.
        </p>
      )}

      {carga.desactualizada && (
        <div className="space-y-2 rounded-md border border-border bg-papel px-4 py-3 text-sm text-tinta">
          <p>
            Después de guardar esta cotización volviste a calcular el precio: antes eran{" "}
            <strong>{formatMXN(carga.desactualizada.totalGuardado)}</strong> y hoy son{" "}
            <strong>{formatMXN(carga.desactualizada.totalHoy)}</strong>. La cotización que le diste a tu cliente sigue con el precio de antes.
          </p>
          {!sinPermiso && (
            <Button type="button" variant="outline" size="sm" onClick={() => void guardar(true)} disabled={ocupado !== null}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {ocupado === "cifras" ? "Actualizando..." : "Actualizar con el precio de hoy"}
            </Button>
          )}
        </div>
      )}

      <form
        className="space-y-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          void guardar(false);
        }}
      >
        <Bloque titulo="Quién cotiza y para quién">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="cot-proveedor" etiqueta="Tu nombre o el de tu empresa">
              <Input id="cot-proveedor" value={e.proveedorNombre} required minLength={2} maxLength={160} onChange={(ev) => poner("proveedorNombre", ev.target.value)} />
            </Campo>
            <Campo id="cot-cliente" etiqueta="Nombre de tu cliente">
              <Input id="cot-cliente" value={e.clienteNombre} required minLength={2} maxLength={200} onChange={(ev) => poner("clienteNombre", ev.target.value)} />
            </Campo>
            <Campo id="cot-rfc" etiqueta="Tu RFC (opcional)" ayuda="Si lo pones, sale en el encabezado de la cotización.">
              <Input id="cot-rfc" value={e.proveedorRfc} maxLength={13} className="uppercase" onChange={(ev) => poner("proveedorRfc", ev.target.value)} />
            </Campo>
            <Campo id="cot-contacto" etiqueta="Correo o teléfono para contactarte (opcional)">
              <Input id="cot-contacto" value={e.proveedorContacto} maxLength={200} onChange={(ev) => poner("proveedorContacto", ev.target.value)} />
            </Campo>
          </div>
        </Bloque>

        <Bloque titulo="Qué le cotizas">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="cot-modo" etiqueta="Cómo lo vas a hacer">
              <Select id="cot-modo" value={e.mode} onChange={(ev) => alCambiarElModo(ev.target.value)} disabled={ocupado === "opcion"}>
                {modosConEstimacion.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo id="cot-escenario" etiqueta="Qué escenario le cotizas">
              <Select id="cot-escenario" value={e.scenario} onChange={(ev) => void elegirOpcion(e.mode, ev.target.value)} disabled={ocupado === "opcion"}>
                {escenariosDelModo.map((o) => (
                  <option key={o.scenario} value={o.scenario}>
                    {SCENARIO_LABELS[o.scenario] ?? o.scenario}: {formatMXN(o.total)} con IVA
                  </option>
                ))}
              </Select>
            </Campo>
          </div>
          <div className="space-y-1 text-sm text-tinta-suave">
            {opcionElegida && (
              <p>
                Vas a cotizar <strong className="text-tinta">{nombreDeModo(e.mode)}</strong>, escenario {nombreDeEscenario(e.scenario)}, por{" "}
                <strong className="text-tinta">{formatMXN(opcionElegida.total)}</strong> con IVA.
              </p>
            )}
            {carga.decision && (
              <p>
                Tú elegiste en la pantalla del proyecto: {nombreDeModo(carga.decision.mode)}, escenario {nombreDeEscenario(carga.decision.scenario)}.
              </p>
            )}
            {carga.recomendada && (
              <p>
                El sistema recomienda: {nombreDeModo(carga.recomendada.mode)}, escenario {nombreDeEscenario(carga.recomendada.scenario)}.
              </p>
            )}
            {ocupado === "opcion" && <p>Trayendo las cifras de esa opción...</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo id="cot-vigencia" etiqueta="Días que vale la cotización" ayuda={`Hasta el ${documento?.vigenciaHastaTexto ?? ""}.`}>
              <Input id="cot-vigencia" type="number" inputMode="numeric" min={1} max={365} value={e.vigenciaDias} onChange={(ev) => poner("vigenciaDias", ev.target.value)} />
            </Campo>
          </div>
        </Bloque>

        <Bloque titulo="Cómo te pagan">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo id="cot-anticipo" etiqueta="Anticipo al firmar (%)">
              <Input id="cot-anticipo" type="number" inputMode="numeric" min={0} max={100} value={e.anticipoPct} onChange={(ev) => poner("anticipoPct", ev.target.value)} />
            </Campo>
            <Campo id="cot-final" etiqueta="Pago final al entregar (%)">
              <Input id="cot-final" type="number" inputMode="numeric" min={0} max={100} value={e.finalPct} onChange={(ev) => poner("finalPct", ev.target.value)} />
            </Campo>
            <div className="grid content-end text-sm text-tinta-suave">
              {sumaPasada ? (
                <p className="text-red-700">El anticipo y el pago final no pueden sumar más de 100 %.</p>
              ) : (
                <p>
                  El {avancePct} % restante se paga contra avances
                  {documento ? ` (${documento.pagos.filter((p) => p.clave === "avance").length} pago(s))` : ""}.
                </p>
              )}
            </div>
          </div>
        </Bloque>

        <Bloque titulo="Mantenimiento después de entregar">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={e.incluyeMantenimiento}
              onChange={(ev) => poner("incluyeMantenimiento", ev.target.checked)}
            />
            Ofrecer mantenimiento mensual a mi cliente
          </label>
          {e.incluyeMantenimiento && (
            <Campo
              id="cot-mantenimiento"
              etiqueta="Monto al mes, con IVA (pesos)"
              ayuda={
                documento?.mantenimiento.esSugerido && documento.mantenimiento.mensual !== null
                  ? `Si lo dejas vacío se usa ${formatMXN(documento.mantenimiento.mensual)}, que es el 2 % del precio por mes.`
                  : "Déjalo vacío para usar el 2 % del precio por mes."
              }
            >
              <Input
                id="cot-mantenimiento"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={e.mantenimientoMensual}
                placeholder="Vacío = el sugerido"
                onChange={(ev) => poner("mantenimientoMensual", ev.target.value)}
              />
            </Campo>
          )}
        </Bloque>

        <Bloque titulo="Lo que dice la cotización">
          <div className="grid gap-4 lg:grid-cols-2">
            <Campo id="cot-exclusiones" etiqueta="Qué no incluye" ayuda="Escribe una cosa por renglón.">
              <Textarea id="cot-exclusiones" rows={7} value={e.exclusiones} onChange={(ev) => poner("exclusiones", ev.target.value)} />
            </Campo>
            <Campo id="cot-supuestos" etiqueta="Supuestos" ayuda="Escribe una cosa por renglón. Lo que das por hecho para que el precio y el plazo valgan.">
              <Textarea
                id="cot-supuestos"
                rows={7}
                value={e.supuestos}
                onChange={(ev) => {
                  supuestosTocados.current = true;
                  poner("supuestos", ev.target.value);
                }}
              />
            </Campo>
          </div>
          <Campo id="cot-notas" etiqueta="Notas para tu cliente (opcional)">
            <Textarea id="cot-notas" rows={3} maxLength={2000} value={e.notas} onChange={(ev) => poner("notas", ev.target.value)} />
          </Campo>
        </Bloque>

        <div className="space-y-3">
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {aviso && (
            <p role="status" className="text-sm font-medium text-tinta">
              {aviso}
            </p>
          )}
          {sinPermiso && !carga.esEjemplo && <p className="text-sm text-tinta-suave">No tienes permiso para guardar cambios en esta cotización.</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              size="lg"
              className="h-12 bg-marino px-7 text-base font-semibold text-white hover:bg-marino/90"
              disabled={sinPermiso || ocupado !== null || sumaPasada}
            >
              <Save className="mr-2 h-4 w-4" />
              {ocupado === "guardando" ? "Guardando..." : "Guardar"}
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
              <Link
                href={`/projects/${projectId}/reports/cotizacion`}
                onClick={(ev) => {
                  if (hayCambiosSinGuardar && !sinPermiso && !confirm("Tienes cambios sin guardar. Si sigues, la hoja para imprimir no los trae. ¿Seguir?")) {
                    ev.preventDefault();
                  }
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Ver para imprimir
              </Link>
            </Button>
            {hayCambiosSinGuardar && !sinPermiso && <span className="text-sm text-tinta-suave">Tienes cambios sin guardar.</span>}
          </div>
        </div>
      </form>

      <section aria-label="Vista previa" className="space-y-3">
        <h2 className="text-seccion text-tinta">Así la va a ver tu cliente</h2>
        <p className="text-sm text-tinta-suave">Se actualiza mientras escribes. Tu cliente solo ve esta hoja: no ve tus costos ni tu equipo.</p>
        {documento ? (
          <CotizacionDocumento documento={documento} />
        ) : (
          <p className="rounded-md border border-border bg-papel px-4 py-3 text-sm">Todavía no hay cifras para armar la cotización.</p>
        )}
      </section>
    </div>
  );
}
