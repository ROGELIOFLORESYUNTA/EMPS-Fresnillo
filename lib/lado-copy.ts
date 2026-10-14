/**
 * Textos que cambian según el lado (la cara del sitio).
 *
 * El lado lo decide el host (lib/lado.ts): estimacion.hazlatarea.com es la
 * cara del desarrollador y ayuntamientos.hazlatarea.com la del Ayuntamiento.
 * Aquí viven los textos que identifican a cada cara: la marca del encabezado,
 * el título y la descripción que ve quien pega el enlace, el pie de página,
 * la imagen de la vista previa y el menú.
 *
 * Es un archivo de datos puros (sin Node ni Prisma) para que lo lean igual el
 * servidor, el navegador y las pruebas.
 */
import type { Lado } from "@/lib/lado";

export interface EnlaceDeMenu {
  href: string;
  label: string;
  /** La acción principal de la cara: en pantalla ancha se dibuja como botón. */
  principal?: boolean;
}

export interface CopiaDeLado {
  /** Nombre que va en el encabezado. */
  marca: string;
  /** Renglón chico bajo la marca (solo en pantalla ancha); null = ninguno. */
  submarca: string | null;
  /** Letras dentro del cuadro de la marca. */
  siglas: string;
  /** Título de la pestaña y de la vista previa al compartir el enlace. */
  titulo: string;
  /** Una frase para buscadores y para la vista previa al compartir el enlace. */
  descripcion: string;
  /** Texto del pie de página. */
  pie: string;
  /** Segundo párrafo del pie (de dónde salen los valores); null = ninguno. */
  pieFuentes: string | null;
  /** Imagen de la vista previa en redes, de 1200 x 630, ruta dentro de /public. */
  ogImage: string;
  /** Texto alternativo de esa imagen. */
  ogAlt: string;
  /** Cómo se llama este lado en "Mi cuenta". */
  etiquetaDeLado: string;
  /** Menú del encabezado, en el orden en que se dibuja. */
  menu: readonly EnlaceDeMenu[];
}

export const COPIA: Record<Lado, CopiaDeLado> = {
  desarrollador: {
    marca: "Cotizador de software",
    submarca: null,
    siglas: "CS",
    titulo: "Cotizador de software: cuánto cobrar por un sistema",
    descripcion: "Describe lo que te piden y en un minuto tienes precio, tiempo y qué incluir en la cotización.",
    pie: "Hecho en la Universidad Autónoma de Zacatecas como parte de una tesis de Ingeniería de Software. Los parámetros tienen fuente y fecha.",
    pieFuentes: null,
    ogImage: "/og-desarrollador.png",
    ogAlt: "Cotizador de software: cuánto cobrar por un sistema, con precio, tiempo y qué incluir.",
    etiquetaDeLado: "Desarrollador que cotiza",
    menu: [
      { href: "/cotizar", label: "Cotizar", principal: true },
      { href: "/projects", label: "Mis proyectos" },
      { href: "/fuentes", label: "Fuentes" },
      { href: "/como-funciona", label: "Cómo funciona" },
    ],
  },
  ayuntamiento: {
    marca: "EMPS Fresnillo",
    submarca: "Estimador Municipal de Proyectos",
    siglas: "EM",
    titulo: "EMPS Fresnillo. Estimador Municipal de Proyectos de Software",
    descripcion: "Calcula cuánto cuesta un sistema de software antes de firmar: horas, nómina, impuestos, cambios y mantenimiento.",
    pie: "Estimador Municipal de Proyectos de Software. Desarrollado por Rogelio Flores Rodríguez como parte de una investigación de Ingeniería de Software en la Universidad Autónoma de Zacatecas.",
    pieFuentes:
      "Valores fiscales y laborales vigentes 2026, verificados contra el Diario Oficial de la Federación, CONASAMI, IMSS y la Secretaría de Finanzas de Zacatecas.",
    ogImage: "/og-ayuntamientos.png",
    ogAlt: "EMPS Fresnillo: cuánto cuesta un sistema de software antes de firmar el contrato.",
    etiquetaDeLado: "Ayuntamiento",
    menu: [
      { href: "/", label: "Inicio" },
      { href: "/projects", label: "Mis proyectos" },
      { href: "/como-funciona", label: "Tutorial" },
      { href: "/glossary", label: "Glosario" },
    ],
  },
};
