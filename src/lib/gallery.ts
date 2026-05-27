import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
const COVER_RE = /^00\./i;
const SORT_OPTS = { numeric: true, sensitivity: 'base' } as const;

const naturalSort = (a: string, b: string): number =>
  a.localeCompare(b, undefined, SORT_OPTS);

export interface CaptionEntry {
  title?: string;
  description?: string;
}

export interface GallerySectionData {
  /** slug usado en data-anchor, ids de swiper/botones y anchor de fullpage.js */
  anchor: string;
  /** ruta base de las imágenes dentro de public/, ej. 'Bahamas/Bahamas' */
  folder: string;
  /** título grande (intro) y título del header sticky */
  title: string;
  /** subtítulo en cursiva (intro tagline + sub del header sticky) */
  sub?: string;
  /** párrafo descriptivo del slide intro */
  body?: string;
  /** etiqueta del section-nav; por defecto usa title */
  label?: string;
  photos: string[];
  captions: Record<string, CaptionEntry>;
}

/** Lista las imágenes de una carpeta (excluye 00.* portada), orden natural. */
export function getImages(folder: string): string[] {
  const dir = join(process.cwd(), 'public', folder);
  return readdirSync(dir)
    .filter(f => IMAGE_RE.test(f) && !COVER_RE.test(f))
    .sort(naturalSort);
}

/** Igual que getImages pero recorre subcarpetas; devuelve rutas relativas. */
export function getImagesRecursive(folder: string): string[] {
  const root = join(process.cwd(), 'public', folder);
  const out: string[] = [];
  function walk(rel: string): void {
    const abs = rel ? join(root, rel) : root;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(child);
      } else if (IMAGE_RE.test(entry.name) && !COVER_RE.test(entry.name)) {
        out.push(child);
      }
    }
  }
  walk('');
  return out.sort(naturalSort);
}

/** Deriva la lista de imágenes desde el orden del fotos.json (excluye 00.webp). */
export function getImagesFromCaptions(folder: string): string[] {
  const jsonPath = join(process.cwd(), 'public', folder, 'fotos.json');
  try {
    const data: Array<{ photo: string }> = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    return data.map(e => e.photo).filter(p => p !== '00.webp');
  } catch {
    return [];
  }
}

/** Lee fotos.json de una carpeta como mapa filename -> { title, description }. */
export function getFolderCaptions(folder: string): Record<string, CaptionEntry> {
  return readCaptions(join(process.cwd(), 'public', folder, 'fotos.json'), '');
}

/** Igual que getFolderCaptions pero recorre subcarpetas; claves con ruta relativa. */
export function getFolderCaptionsRecursive(folder: string): Record<string, CaptionEntry> {
  const root = join(process.cwd(), 'public', folder);
  const out: Record<string, CaptionEntry> = {};
  function walk(rel: string): void {
    const abs = rel ? join(root, rel) : root;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(rel ? `${rel}/${entry.name}` : entry.name);
    }
    Object.assign(out, readCaptions(join(abs, 'fotos.json'), rel));
  }
  walk('');
  return out;
}

function readCaptions(jsonPath: string, prefix: string): Record<string, CaptionEntry> {
  try {
    const data: Array<{ photo: string; title: string; description: string }> =
      JSON.parse(readFileSync(jsonPath, 'utf-8'));
    return Object.fromEntries(
      data.map(item => [
        prefix ? `${prefix}/${item.photo}` : item.photo,
        { title: item.title || undefined, description: item.description || undefined },
      ])
    );
  } catch {
    return {};
  }
}
