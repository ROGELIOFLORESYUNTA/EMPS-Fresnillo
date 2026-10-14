import { getLado } from "@/lib/lado-server";
import { InicioAyuntamiento } from "@/components/inicio-ayuntamiento";
import { InicioDesarrollador } from "@/components/inicio-desarrollador";

/**
 * El inicio cambia por completo según el lado (lib/lado.ts): el desarrollador
 * ve una portada con una pregunta, un botón y la cifra de un ejemplo; el
 * Ayuntamiento, el inicio de siempre.
 */
export default async function HomePage() {
  const lado = await getLado();
  return lado === "ayuntamiento" ? <InicioAyuntamiento /> : <InicioDesarrollador />;
}
