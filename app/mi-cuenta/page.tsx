"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle2, KeyRound, Copy, Smartphone, Save, Check, Info, ChevronDown, ChevronUp } from "lucide-react";

interface MyAccount {
  id: string;
  displayName: string | null;
  role: string | null;
  recoveryCode: string | null;
  createdAt?: string;
  lastSeenAt?: string;
}

// Roles en lenguaje cotidiano, no tecnico.
const ROLES = [
  { value: "operador_municipal", label: "Trabajo en un Ayuntamiento (Catastro, Tesorería, Obras, etc.)" },
  { value: "proveedor", label: "Soy desarrollador / proveedor de software" },
  { value: "investigador", label: "Soy investigador o profesor" },
  { value: "explorando", label: "Solo estoy curioseando para ver de qué se trata" },
  { value: "otro", label: "Otro" },
];

export default function MiCuentaPage() {
  const router = useRouter();
  const [me, setMe] = useState<MyAccount | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recoverCode, setRecoverCode] = useState("");
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.workspace);
        setName(d.workspace?.displayName ?? "");
        setRole(d.workspace?.role ?? "");
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const r = await fetch("/api/workspace/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name, role }),
    });
    const d = await r.json();
    if (r.ok) {
      setMe(d.workspace);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Notificar al WorkspaceBadge del header que la identidad cambio
      // para que se refresque sin reload completo.
      window.dispatchEvent(new CustomEvent("emps:identity-changed"));
    }
    setSaving(false);
  }

  async function handleCopy() {
    if (!me?.recoveryCode) return;
    await navigator.clipboard.writeText(me.recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setRecoverError(null);
    setRecovering(true);
    const r = await fetch("/api/workspace/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: recoverCode }),
    });
    const d = await r.json();
    if (!r.ok) {
      setRecoverError(d.error ?? "Esa llave no la encontramos. Verifica que la escribiste igual (sin espacios, con guion).");
      setRecovering(false);
      return;
    }
    router.refresh();
    setTimeout(() => router.push("/projects"), 500);
  }

  if (!me) {
    return <p className="text-center py-12 text-muted-foreground">Cargando tu cuenta...</p>;
  }

  const identified = !!me.displayName;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle2 className="w-7 h-7 text-blue-600" />
          Mi cuenta en este sitio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Este sitio NO te pide registro, correo ni contraseña. Aquí guardas tu nombre (opcional) para que el sistema te recuerde, y una llave para seguir usándolo si cambias de computadora.
        </p>
      </div>

      {/* Estado actual visual prominente */}
      <div
        className={`rounded-lg border-2 px-4 py-3 flex items-center gap-3 ${
          identified ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
        }`}
      >
        {identified ? (
          <Check className="w-6 h-6 text-green-700 shrink-0" />
        ) : (
          <Info className="w-6 h-6 text-amber-700 shrink-0" />
        )}
        <div className="flex-1 text-sm">
          {identified ? (
            <>
              <p className="font-semibold text-green-900">Estás identificado como <strong>{me.displayName}</strong></p>
              <p className="text-green-800 text-xs mt-0.5">Tus proyectos y ediciones quedan asociados a tu nombre. Puedes cambiarlo abajo cuando quieras.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-amber-900">Estás navegando como anónimo</p>
              <p className="text-amber-800 text-xs mt-0.5">Tus proyectos y ediciones se guardan, pero el sistema no sabe tu nombre. Si quieres que aparezca, llena el formulario de abajo. Es opcional.</p>
            </>
          )}
        </div>
      </div>

      {/* SECCION 1: nombre y rol */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Cómo te llamamos?</CardTitle>
          <CardDescription>
            Opcional. Solo sirve para que tú reconozcas tu cuenta cuando regreses y para que el autor de este estudio sepa quién es quién. No se comparte con terceros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tu nombre o apodo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. María del Ayuntamiento, Juan, etc."
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">¿Para qué vas a usar este sitio?</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-input bg-background rounded-md h-10 px-3 text-sm"
              >
                <option value="">— Prefiero no decir —</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                El autor del estudio agrupa respuestas anónimas por este campo para sus estadísticas. No afecta lo que ves en el sitio.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              {saved && (
                <span className="text-sm text-green-700 inline-flex items-center gap-1">
                  <Check className="w-4 h-4" /> Guardado
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SECCION 2: llave de respaldo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            Tu llave para seguir usando esto desde otra PC o celular
          </CardTitle>
          <CardDescription>
            <strong>Sin login y sin contraseña:</strong> esta llave es la única forma de conectar tu cuenta en otro dispositivo. Cópiala y guárdala en un lugar seguro (notas del celular, correo a ti mismo, captura de pantalla). Si limpias cookies del navegador, también la vas a necesitar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-amber-50 border border-amber-200 text-amber-950 font-mono text-2xl font-bold tracking-widest px-4 py-4 rounded-md text-center">
              {me.recoveryCode ?? "—"}
            </code>
            <Button type="button" variant="outline" onClick={handleCopy} disabled={!me.recoveryCode}>
              {copied ? <><Check className="w-4 h-4 mr-2" /> Copiado</> : <><Copy className="w-4 h-4 mr-2" /> Copiar</>}
            </Button>
          </div>
          <div className="bg-amber-50/60 border border-amber-200 rounded p-3 text-xs text-amber-900">
            <p className="font-semibold mb-1">⚠ Importante:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Cualquier persona que tenga esta llave puede ver tus proyectos. Trátala como una contraseña.</li>
              <li>El sistema NO la puede recuperar si la pierdes — vas a empezar desde cero con una cuenta nueva.</li>
              <li>No tiene letras O, I, L ni números 0, 1 — para que no te confundas al escribirla.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* SECCION 3: vengo de otra PC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-600" />
            ¿Vienes desde otra computadora o celular?
          </CardTitle>
          <CardDescription>
            Si ya usaste este sitio antes desde otro dispositivo y guardaste tu llave, pégala aquí y vas a recuperar todos tus proyectos y ediciones. Si es tu primera vez, ignora esta sección.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecover} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="recover">Tu llave (formato XXXX-XXXX)</Label>
              <Input
                id="recover"
                value={recoverCode}
                onChange={(e) => setRecoverCode(e.target.value.toUpperCase())}
                placeholder="ABCD-2345"
                className="font-mono uppercase tracking-widest text-lg"
                maxLength={9}
              />
            </div>
            {recoverError && <p className="text-sm text-destructive">{recoverError}</p>}
            <Button type="submit" variant="outline" disabled={recovering || recoverCode.length !== 9}>
              {recovering ? "Conectando..." : "Conectar con esa cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Detalles técnicos colapsables */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Detalles técnicos
        </button>
        {showDetails && (
          <div className="text-xs text-muted-foreground space-y-1 mt-2 pl-4">
            <p>Identificador interno: <span className="font-mono">{me.id}</span></p>
            <p>Creada: {me.createdAt ? new Date(me.createdAt).toLocaleString("es-MX") : "—"}</p>
            <p>Último ingreso: {me.lastSeenAt ? new Date(me.lastSeenAt).toLocaleString("es-MX") : "—"}</p>
            {me.role && (
              <p>
                Rol declarado:{" "}
                <Badge variant="outline" className="text-xs">
                  {ROLES.find((r) => r.value === me.role)?.label ?? me.role}
                </Badge>
              </p>
            )}
            <p className="pt-1 italic">El sistema NO guarda tu correo, ubicación, IP ni historial de navegación.</p>
          </div>
        )}
      </div>
    </div>
  );
}
