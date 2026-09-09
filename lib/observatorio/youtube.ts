/**
 * Cliente de la API de datos de YouTube.
 *
 * Es la PRIMERA llamada saliente a internet de todo el sistema, así que va
 * contenida aquí: nada fuera de este archivo habla con YouTube.
 *
 * Cuota: 10,000 unidades gratis al día por proyecto de Google Cloud.
 *   commentThreads.list = 1 unidad por llamada (hasta 100 comentarios)
 *   search.list         = 100 unidades por llamada  <-- caro, se usa poco
 * Con eso alcanzan unos 50,000 comentarios diarios si no se abusa de search.
 *
 * Las políticas de YouTube obligan a borrar o refrescar el texto crudo a los
 * 30 días. Quien guarda decide la fecha de expiración; aquí solo se trae.
 */

const BASE = "https://youtube.googleapis.com/youtube/v3";

/** Días que se puede conservar el texto crudo antes de borrarlo o refrescarlo. */
export const DIAS_RETENCION_CRUDO = 30;

export class YouTubeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly cuotaAgotada: boolean = false,
  ) {
    super(message);
    this.name = "YouTubeError";
  }
}

export interface ComentarioYouTube {
  externalId: string;
  videoId: string;
  canal: string | null;
  texto: string;
  publicadoEl: Date | null;
  likes: number | null;
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new YouTubeError(
      "Falta YOUTUBE_API_KEY. Actívala en Google Cloud (YouTube Data API v3) y ponla en el .env del servidor.",
      503,
    );
  }
  return key;
}

async function llamar<T>(ruta: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/${ruta}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey());

  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const cuerpo = await r.text().catch(() => "");
    // 403 con reason quotaExceeded es lo normal cuando se acaba la cuota del día.
    const cuotaAgotada = r.status === 403 && /quota/i.test(cuerpo);
    throw new YouTubeError(
      cuotaAgotada
        ? "Se acabó la cuota diaria de YouTube. Vuelve mañana; se reinicia a medianoche del Pacífico."
        : `YouTube respondió ${r.status}. ${cuerpo.slice(0, 200)}`,
      r.status,
      cuotaAgotada,
    );
  }
  return (await r.json()) as T;
}

interface RespuestaComentarios {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      videoId?: string;
      topLevelComment?: {
        id?: string;
        snippet?: {
          textOriginal?: string;
          authorChannelTitle?: string;
          publishedAt?: string;
          likeCount?: number;
        };
      };
    };
  }>;
}

/**
 * Trae comentarios de un video, paginando hasta `max`.
 * Devuelve también cuántas unidades de cuota costó, para poder avisar.
 */
export async function comentariosDeVideo(
  videoId: string,
  max: number,
): Promise<{ comentarios: ComentarioYouTube[]; unidades: number }> {
  const comentarios: ComentarioYouTube[] = [];
  let pageToken: string | undefined;
  let unidades = 0;

  while (comentarios.length < max) {
    const params: Record<string, string> = {
      part: "snippet",
      videoId,
      maxResults: String(Math.min(100, max - comentarios.length)),
      order: "relevance",
      textFormat: "plainText",
    };
    if (pageToken) params.pageToken = pageToken;

    let data: RespuestaComentarios;
    try {
      data = await llamar<RespuestaComentarios>("commentThreads", params);
    } catch (e) {
      // Muchos videos tienen los comentarios apagados: no es un error del sistema.
      if (e instanceof YouTubeError && e.status === 403 && !e.cuotaAgotada) break;
      throw e;
    }
    unidades += 1;

    for (const item of data.items ?? []) {
      const top = item.snippet?.topLevelComment;
      const s = top?.snippet;
      if (!top?.id || !s?.textOriginal) continue;
      comentarios.push({
        externalId: top.id,
        videoId: item.snippet?.videoId ?? videoId,
        canal: s.authorChannelTitle ?? null,
        texto: s.textOriginal,
        publicadoEl: s.publishedAt ? new Date(s.publishedAt) : null,
        likes: typeof s.likeCount === "number" ? s.likeCount : null,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return { comentarios: comentarios.slice(0, max), unidades };
}

interface RespuestaBusqueda {
  items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>;
}

export interface VideoEncontrado {
  videoId: string;
  titulo: string | null;
  canal: string | null;
}

/**
 * Busca videos por términos. CUESTA 100 UNIDADES por llamada, así que quien
 * la use debe guardar los videoId encontrados y no repetir la búsqueda.
 */
export async function buscarVideos(
  consulta: string,
  maxVideos: number,
  idioma?: string | null,
): Promise<{ videos: VideoEncontrado[]; unidades: number }> {
  const params: Record<string, string> = {
    part: "snippet",
    q: consulta,
    type: "video",
    maxResults: String(Math.min(50, maxVideos)),
    order: "relevance",
  };
  if (idioma) params.relevanceLanguage = idioma;

  const data = await llamar<RespuestaBusqueda>("search", params);
  const videos: VideoEncontrado[] = [];
  for (const item of data.items ?? []) {
    if (!item.id?.videoId) continue;
    videos.push({
      videoId: item.id.videoId,
      titulo: item.snippet?.title ?? null,
      canal: item.snippet?.channelTitle ?? null,
    });
  }
  return { videos, unidades: 100 };
}

interface RespuestaVideos {
  items?: Array<{ id?: string; snippet?: { title?: string; channelTitle?: string } }>;
}

/** Títulos y canales de varios videos en una sola llamada (1 unidad). */
export async function datosDeVideos(
  videoIds: string[],
): Promise<{ porId: Map<string, VideoEncontrado>; unidades: number }> {
  const porId = new Map<string, VideoEncontrado>();
  if (videoIds.length === 0) return { porId, unidades: 0 };

  let unidades = 0;
  for (let i = 0; i < videoIds.length; i += 50) {
    const lote = videoIds.slice(i, i + 50);
    const data = await llamar<RespuestaVideos>("videos", { part: "snippet", id: lote.join(",") });
    unidades += 1;
    for (const item of data.items ?? []) {
      if (!item.id) continue;
      porId.set(item.id, {
        videoId: item.id,
        titulo: item.snippet?.title ?? null,
        canal: item.snippet?.channelTitle ?? null,
      });
    }
  }
  return { porId, unidades };
}

/** Fecha en la que hay que borrar o refrescar el texto crudo. */
export function fechaExpiracionCrudo(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + DIAS_RETENCION_CRUDO * 24 * 60 * 60 * 1000);
}
