"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User2, KeyRound, Copy, RefreshCw, Save, Check } from "lucide-react";

interface Workspace {
  id: string;
  displayName: string | null;
  role: string | null;
  recoveryCode: string | null;
  createdAt?: string;
  lastSeenAt?: string;
}

const ROLES = [
  { value: "operador_municipal", label: "Operador del Ayuntamiento" },
  { value: "proveedor", label: "Proveedor de software" },
  { value: "investigador", label: "Investigador / académico" },
  { value: "explorando", label: "Solo estoy explorando" },
  { value: "otro", label: "Otro" },
];

export default function MiWorkspacePage() {
  const router = useRouter();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recoverCode, setRecoverCode] = useState("");
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => {
        setWs(d.workspace);
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
      setWs(d.workspace);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  async function handleCopy() {
    if (!ws?.recoveryCode) return;
    await navigator.clipboard.writeText(ws.recoveryCode);
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
      setRecoverError(d.error ?? "Error al recuperar.");
      setRecovering(false);
      return;
    }
    // Cambió la cookie → recargar para que todo el sitio use el nuevo workspace.
    router.refresh();
    setTimeout(() => router.push("/projects"), 500);
  }

  if (!ws) {
    return <p className="text-center py-12 text-muted-foreground">Cargando tu workspace...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User2 className="w-6 h-6 text-blue-600" />
          Mi workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu workspace es como un cajón privado en este sistema. Lo que tú creas (proyectos, parámetros editados, estimaciones) queda solo en tu workspace. Nadie más lo ve.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo te llamamos</CardTitle>
          <CardDescription>
            Opcional. Sirve para que tú reconozcas tu workspace y para que el investigador del estudio sepa quién es quién, sin obligarte a registrarte. Lo puedes cambiar cuando quieras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre o apodo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Juan del Ayuntamiento"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Rol con el que vas a usar el sistema</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-input bg-background rounded-md h-10 px-3 text-sm"
              >
                <option value="">— Sin especificar —</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            Tu código de recuperación
          </CardTitle>
          <CardDescription>
            Cópialo y guárdalo en un lugar seguro (notas del celular, correo a ti mismo). Si limpias cookies o cambias de computadora, este código te devuelve tu workspace con todos tus proyectos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-amber-50 border border-amber-200 text-amber-950 font-mono text-xl font-bold tracking-widest px-4 py-3 rounded-md text-center">
              {ws.recoveryCode ?? "—"}
            </code>
            <Button type="button" variant="outline" onClick={handleCopy} disabled={!ws.recoveryCode}>
              {copied ? <><Check className="w-4 h-4 mr-2" /> Copiado</> : <><Copy className="w-4 h-4 mr-2" /> Copiar</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠ Quien tenga este código puede acceder a tu workspace. Trátalo como una contraseña personal. No lo compartas.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            Recuperar un workspace existente
          </CardTitle>
          <CardDescription>
            Si tienes un código de recuperación (porque trabajaste antes desde otro navegador o dispositivo), pégalo aquí. Tu sesión actual se conectará a ese workspace y verás los proyectos que ya tenías.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecover} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="recover">Código (formato XXXX-XXXX)</Label>
              <Input
                id="recover"
                value={recoverCode}
                onChange={(e) => setRecoverCode(e.target.value.toUpperCase())}
                placeholder="ABCD-2345"
                className="font-mono uppercase tracking-widest"
                maxLength={9}
              />
            </div>
            {recoverError && <p className="text-sm text-destructive">{recoverError}</p>}
            <Button type="submit" variant="outline" disabled={recovering || recoverCode.length !== 9}>
              {recovering ? "Recuperando..." : "Recuperar workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
        <p>
          ID interno: <span className="font-mono">{ws.id}</span>
        </p>
        <p>
          {ws.displayName ? "Identificado como" : "Workspace anónimo"}
          {ws.role && (
            <>
              {" · "}
              <Badge variant="outline" className="text-xs">
                {ROLES.find((r) => r.value === ws.role)?.label ?? ws.role}
              </Badge>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
