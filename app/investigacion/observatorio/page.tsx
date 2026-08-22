"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AlertTriangle, Download, Plus, Sparkles, Trash2, Check, X } from "lucide-react";
import { api, apiPost } from "@/lib/api-client";
import {
  CAUSA_ETIQUETA,
  QUIEN_HABLA_ETIQUETA,
  DESVIACION_ETIQUETA,
  type Causa,
  type QuienHabla,
  type Desviacion,
} from "@/lib/observatorio/taxonomia";

interface Fuente {
  id: string;
  nombre: string;
  tipo: string;
  consulta: string;
  idioma: string | null;
  activa: boolean;
  ultimaCosechaEl: string | null;
  _count: { comentarios: number };
}

interface Comentario {
  id: string;
  videoTitulo: string | null;
  canal: string | null;
  textoOriginal: string | null;
  publicadoEl: string | null;
  analizadoEl: string | null;
  esTestimonio: boolean | null;
  quienHabla: string | null;
  duracionDeclaradaMeses: string | number | null;
  montoDeclarado: string | number | null;
  moneda: string | null;
  tamanoEquipo: number | null;
  desviacion: string | null;
  desviacionPct: string | number | null;
  causasJson: string | null;
  confianza: string | null;
  citasJson: string | null;
  razonamiento: string | null;
  errorAnalisis: string | null;
  revisadoPorHumano: boolean;
  coincideConHumano: boolean | null;
  fuente: { nombre: string };
}

interface Resumen {
  advertencia: string;
  conteos: {
    comentarios: number;
    sinAnalizar: number;
    fallidos: number;
    testimonios: number;
    descartados: number;
    revisadosPorHumano: number;
  };
  porCausa: Array<{ causa: string; etiqueta: string; factorDelMotor: string | null; cuantos: number }>;
  porQuienHabla: Array<{ quienHabla: string; etiqueta: string; cuantos: number }>;
  porDesviacion: Array<{ desviacion: string; etiqueta: string; cuantos: number }>;
  duracionMeses: { cuantosLaDicen: number; mediana: number | null; minimo: number | null; maximo: number | null };
  tamanoEquipo: { cuantosLoDicen: number; mediana: number | null };
  validacionDelAnotador: { revisados: number; acuerdo: number | null; nota: string };
}

const FORM_FUENTE = { nombre: "", tipo: "busqueda", consulta: "", idioma: "es", notas: "" };

export default function ObservatorioPage() {
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [filtro, setFiltro] = useState("testimonios");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_FUENTE);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [f, c, r] = await Promise.all([
      api<{ fuentes: Fuente[] }>("/api/observatorio/fuentes"),
      api<{ comentarios: Comentario[] }>(`/api/observatorio/comentarios?filtro=${filtro}`),
      api<Resumen>("/api/observatorio/resumen"),
    ]);
    setFuentes(f.fuentes);
    setComentarios(c.comentarios);
    setResumen(r);
  }, [filtro]);

  useEffect(() => {
    cargar().catch((e) => setAviso(e instanceof Error ? e.message : "No se pudo cargar."));
  }, [cargar]);

  async function correr(etapa: "cosechar" | "analizar" | "purgar", cuerpo: unknown = {}) {
    setTrabajando(etapa);
    setAviso(null);
    try {
      const r = await apiPost<Record<string, unknown>>(`/api/observatorio/${etapa}`, cuerpo);
      setAviso(resumirCorrida(etapa, r));
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Algo falló.");
    } finally {
      setTrabajando(null);
    }
  }

  async function crearFuente(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost("/api/observatorio/fuentes", { ...form, idioma: form.idioma || null });
      setForm(FORM_FUENTE);
      setMostrarForm(false);
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo guardar la fuente.");
    }
  }

  async function marcarRevision(id: string, coincide: boolean) {
    await fetch(`/api/observatorio/comentarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coincideConHumano: coincide }),
    });
    await cargar();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Investigación", href: "/investigacion" }, { label: "Observatorio" }]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          Observatorio de comentarios
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Trae comentarios públicos de YouTube donde la gente cuenta cómo le fue con un proyecto de
          software, y los analiza uno por uno.
        </p>
      </div>

      {/* La advertencia va fija y arriba: es la que evita que estos números terminen donde no deben. */}
      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Esto no valida la hipótesis de la tesis.</strong> Son testimonios sin verificar:
          comenta quien tuvo una experiencia extrema, casi siempre mala, y no hay forma de comprobar
          lo que dice. Sirven para saber <strong>qué</strong> sale mal, no para medir{" "}
          <strong>cuánto</strong>. Nunca entran al análisis de resultados reales.
        </p>
      </div>

      {aviso && (
        <div className="rounded-md border bg-muted px-4 py-3 text-sm whitespace-pre-line">{aviso}</div>
      )}

      {/* Etapas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las etapas</CardTitle>
          <CardDescription>
            Cosechar es gratis y rápido. Analizar cuesta dinero, así que primero puedes ver cuánto
            saldría. Purgar borra el texto original de lo que ya cumplió 30 días, como exigen las
            políticas de YouTube; el análisis se conserva.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => correr("cosechar", { max: 200 })} disabled={trabajando !== null}>
            <Download className="w-4 h-4 mr-2" />
            {trabajando === "cosechar" ? "Trayendo..." : "1. Traer comentarios"}
          </Button>
          <Button
            variant="outline"
            onClick={() => correr("analizar", { simular: true })}
            disabled={trabajando !== null}
          >
            ¿Cuánto costaría analizar?
          </Button>
          <Button onClick={() => correr("analizar", { max: 50 })} disabled={trabajando !== null}>
            <Sparkles className="w-4 h-4 mr-2" />
            {trabajando === "analizar" ? "Analizando..." : "2. Analizar 50"}
          </Button>
          <Button variant="outline" onClick={() => correr("purgar")} disabled={trabajando !== null}>
            <Trash2 className="w-4 h-4 mr-2" />
            3. Purgar vencidos
          </Button>
        </CardContent>
      </Card>

      {/* Resumen */}
      {resumen && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qué hay juntado</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Dato n={resumen.conteos.comentarios} t="comentarios traídos" />
              <Dato n={resumen.conteos.testimonios} t="son testimonios" />
              <Dato n={resumen.conteos.sinAnalizar} t="sin analizar" />
              <Dato n={resumen.conteos.descartados} t="descartados (no eran testimonio)" />
              {resumen.conteos.fallidos > 0 && <Dato n={resumen.conteos.fallidos} t="fallaron" />}
              <Dato n={resumen.conteos.revisadosPorHumano} t="revisados a mano" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qué tanto le atina el modelo</CardTitle>
              <CardDescription>{resumen.validacionDelAnotador.nota}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {resumen.validacionDelAnotador.acuerdo === null ? (
                <p className="text-muted-foreground">
                  Todavía no hay comentarios revisados a mano. Abre uno de la lista y di si el
                  análisis coincide con lo que tú entiendes.
                </p>
              ) : (
                <p>
                  Coincide en el{" "}
                  <strong className="text-lg">{resumen.validacionDelAnotador.acuerdo}%</strong> de los{" "}
                  {resumen.validacionDelAnotador.revisados} revisados.
                </p>
              )}
            </CardContent>
          </Card>

          {resumen.porCausa.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Qué dice la gente que salió mal</CardTitle>
                <CardDescription>
                  A la derecha, el factor del sistema que ya cubre esa causa. Si algo se repite mucho
                  y no tiene factor, ahí hay algo que al sistema le falta preguntar.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Causa</TableHead>
                      <TableHead className="text-center">Cuántos la mencionan</TableHead>
                      <TableHead>Factor del sistema</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.porCausa.map((c) => (
                      <TableRow key={c.causa}>
                        <TableCell className="text-sm">{c.etiqueta}</TableCell>
                        <TableCell className="text-center font-medium">{c.cuantos}</TableCell>
                        <TableCell className="text-sm">
                          {c.factorDelMotor ? (
                            <span className="text-muted-foreground">{c.factorDelMotor}</span>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                              el sistema no lo modela
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {resumen.duracionMeses.cuantosLaDicen > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Lo que declaran</CardTitle>
                <CardDescription>
                  Medianas, no promedios, y solo de quienes dieron el dato. No representan a nadie
                  más que a quienes comentaron.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
                <Dato
                  n={resumen.duracionMeses.mediana ?? 0}
                  t={`meses de duración (mediana de ${resumen.duracionMeses.cuantosLaDicen})`}
                />
                <Dato
                  n={resumen.tamanoEquipo.mediana ?? 0}
                  t={`personas en el equipo (mediana de ${resumen.tamanoEquipo.cuantosLoDicen})`}
                />
                <div>
                  <p className="text-muted-foreground text-xs">Rango de duración</p>
                  <p className="font-medium">
                    {resumen.duracionMeses.minimo} a {resumen.duracionMeses.maximo} meses
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fuentes */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">De dónde se trae</CardTitle>
            <CardDescription>
              Una búsqueda cuesta 100 de las 10,000 unidades diarias gratis; traer comentarios cuesta
              1 por cada 100. Conviene pocas búsquedas y bien pensadas.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setMostrarForm(!mostrarForm)}>
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {mostrarForm && (
            <form onSubmit={crearFuente} className="grid gap-3 sm:grid-cols-2 border rounded-md p-4 bg-muted/30">
              <div className="grid gap-1.5">
                <Label htmlFor="nombre">Cómo le llamas</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  minLength={2}
                  placeholder="ej. Freelancers hablando de presupuestos"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tipo">Qué es</Label>
                <Select
                  id="tipo"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="busqueda">Una búsqueda</option>
                  <option value="video">Un video en concreto</option>
                  <option value="canal">Un canal</option>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="consulta">
                  {form.tipo === "video" ? "Identificador del video" : "Qué buscar"}
                </Label>
                <Input
                  id="consulta"
                  value={form.consulta}
                  onChange={(e) => setForm({ ...form, consulta: e.target.value })}
                  required
                  minLength={2}
                  placeholder={
                    form.tipo === "video"
                      ? "ej. dQw4w9WgXcQ"
                      : "ej. cuánto cobrar por un sistema a la medida"
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="idioma">Idioma</Label>
                <Select
                  id="idioma"
                  value={form.idioma}
                  onChange={(e) => setForm({ ...form, idioma: e.target.value })}
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="">Cualquiera</option>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="notas">Por qué esta fuente (opcional)</Label>
                <Textarea
                  id="notas"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  placeholder="Para acordarte del criterio con el que la elegiste"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm">Guardar fuente</Button>
              </div>
            </form>
          )}

          {fuentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Todavía no hay fuentes. Agrega una búsqueda para empezar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Qué busca</TableHead>
                  <TableHead className="text-center">Comentarios</TableHead>
                  <TableHead>Última vez</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuentes.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-sm">{f.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.consulta}</TableCell>
                    <TableCell className="text-center">{f._count.comentarios}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.ultimaCosechaEl
                        ? new Date(f.ultimaCosechaEl).toLocaleDateString("es-MX")
                        : "nunca"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Comentarios */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Comentario por comentario</CardTitle>
            <CardDescription>
              Abre uno para ver qué extrajo el modelo y de qué frase sacó cada dato. Ahí mismo dices
              si coincide con lo que tú entiendes.
            </CardDescription>
          </div>
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-auto">
            <option value="testimonios">Testimonios</option>
            <option value="por_revisar">Falta revisarlos a mano</option>
            <option value="descartados">Descartados</option>
            <option value="sin_analizar">Sin analizar</option>
            <option value="fallidos">Fallaron</option>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nada que mostrar con ese filtro.
            </p>
          ) : (
            comentarios.map((c) => (
              <ComentarioFila
                key={c.id}
                c={c}
                abierto={abierto === c.id}
                onToggle={() => setAbierto(abierto === c.id ? null : c.id)}
                onRevisar={marcarRevision}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Dato({ n, t }: { n: number; t: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{n}</p>
      <p className="text-muted-foreground text-xs">{t}</p>
    </div>
  );
}

function ComentarioFila({
  c,
  abierto,
  onToggle,
  onRevisar,
}: {
  c: Comentario;
  abierto: boolean;
  onToggle: () => void;
  onRevisar: (id: string, coincide: boolean) => void;
}) {
  const causas: string[] = (() => {
    try {
      return JSON.parse(c.causasJson ?? "[]");
    } catch {
      return [];
    }
  })();
  const citas: Record<string, string> = (() => {
    try {
      return JSON.parse(c.citasJson ?? "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm line-clamp-2 flex-1">
            {c.textoOriginal ?? (
              <span className="italic text-muted-foreground">
                Texto borrado por la política de 30 días. El análisis se conserva.
              </span>
            )}
          </p>
          <div className="flex gap-1.5 shrink-0">
            {c.errorAnalisis && <Badge variant="destructive" className="text-xs">falló</Badge>}
            {c.esTestimonio === false && (
              <Badge variant="outline" className="text-xs">no es testimonio</Badge>
            )}
            {c.confianza && (
              <Badge
                variant="outline"
                className={
                  c.confianza === "alta"
                    ? "text-xs border-green-300 text-green-700"
                    : c.confianza === "baja"
                      ? "text-xs border-amber-300 text-amber-700"
                      : "text-xs"
                }
              >
                confianza {c.confianza}
              </Badge>
            )}
            {c.revisadoPorHumano && (
              <Badge variant="secondary" className="text-xs">
                {c.coincideConHumano ? "coincide" : "no coincide"}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {c.fuente.nombre}
          {c.videoTitulo ? ` · ${c.videoTitulo}` : ""}
        </p>
      </button>

      {abierto && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
          {c.errorAnalisis ? (
            <p className="text-sm text-destructive">{c.errorAnalisis}</p>
          ) : !c.analizadoEl ? (
            <p className="text-sm text-muted-foreground">Todavía no se analiza.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Campo
                  etiqueta="Quién habla"
                  valor={QUIEN_HABLA_ETIQUETA[c.quienHabla as QuienHabla] ?? c.quienHabla}
                  cita={citas.quienHabla}
                />
                <Campo
                  etiqueta="Cómo le fue"
                  valor={DESVIACION_ETIQUETA[c.desviacion as Desviacion] ?? c.desviacion}
                  cita={citas.desviacion}
                />
                <Campo
                  etiqueta="Duración"
                  valor={c.duracionDeclaradaMeses ? `${c.duracionDeclaradaMeses} meses` : null}
                  cita={citas.duracionDeclaradaMeses}
                />
                <Campo
                  etiqueta="Monto"
                  valor={
                    c.montoDeclarado
                      ? `${Number(c.montoDeclarado).toLocaleString("es-MX")} ${c.moneda ?? ""}`
                      : null
                  }
                  cita={citas.montoDeclarado}
                />
                <Campo
                  etiqueta="Equipo"
                  valor={c.tamanoEquipo ? `${c.tamanoEquipo} personas` : null}
                  cita={citas.tamanoEquipo}
                />
                <Campo
                  etiqueta="Se pasó por"
                  valor={c.desviacionPct ? `${c.desviacionPct}%` : null}
                  cita={citas.desviacionPct}
                />
              </div>

              {causas.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Qué salió mal</p>
                  <div className="flex flex-wrap gap-1.5">
                    {causas.map((x) => (
                      <Badge key={x} variant="secondary" className="text-xs font-normal">
                        {CAUSA_ETIQUETA[x as Causa] ?? x}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {c.razonamiento && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cómo llegó a eso</p>
                  <p className="text-sm italic">{c.razonamiento}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  ¿Coincide con lo que tú entiendes del comentario?
                </span>
                <Button size="sm" variant="outline" onClick={() => onRevisar(c.id, true)}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Sí
                </Button>
                <Button size="sm" variant="outline" onClick={() => onRevisar(c.id, false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> No
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  cita,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  cita?: string;
}) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="font-medium">{valor}</p>
      {cita && <p className="text-xs text-muted-foreground italic mt-0.5">&ldquo;{cita}&rdquo;</p>}
    </div>
  );
}

/** Traduce la respuesta de cada etapa a una frase que se entienda. */
function resumirCorrida(etapa: string, r: Record<string, unknown>): string {
  const n = (k: string) => Number(r[k] ?? 0);
  if (etapa === "cosechar") {
    const base = `Se trajeron ${n("nuevos")} comentarios nuevos. Quedan ${n("sinAnalizar")} sin analizar. Se usaron ${n("unidadesDeCuota")} de las 10,000 unidades del día.`;
    return r.cuotaAgotada ? `${base}\nSe acabó la cuota de hoy; se reinicia a medianoche del Pacífico.` : base;
  }
  if (etapa === "analizar") {
    if (r.simulacion) {
      return `Hay ${n("pendientes")} comentarios sin analizar. Costaría unos ${r.costoEstimadoUsd} dólares. Este mes llevas ${r.gastadoEsteMesUsd} de ${r.topeMensualUsd}.`;
    }
    const base = `Se analizaron ${n("analizados")}: ${n("testimonios")} son testimonios y ${n("descartados")} no lo eran. Costó ${r.costoDeEstaCorridaUsd} dólares (este mes van ${r.gastadoEsteMesUsd} de ${r.topeMensualUsd}).`;
    return r.detenidoPorTope ? `${base}\nSe detuvo al llegar al tope del mes.` : base;
  }
  if (etapa === "purgar") {
    return `Se borró el texto original de ${n("textosBorrados")} comentarios vencidos. ${r.nota ?? ""}`;
  }
  return "Listo.";
}
