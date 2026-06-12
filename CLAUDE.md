# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El resto de este archivo está en español: el proyecto, su contenido y el cliente trabajan en español.

## Proyecto

Portfolio fotográfico estático de Orlando Moure, desplegado en `https://adondevoy.com.ar`. Una página por país/viaje. Cada página es un scroller vertical (fullpage.js) compuesto por carruseles horizontales (Swiper). No hay backend: las imágenes y captions se leen del filesystem en build time.

## Comandos

Gestor de paquetes: **pnpm**. Node ≥ 22.12.0.

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo en `localhost:4321` (usa otro puerto si está ocupado) |
| `pnpm build` | Build de producción a `./dist/` |
| `pnpm preview` | Sirve el build local para previsualizar |
| `pnpm astro check` | Type-check de archivos `.astro`. La primera vez pide instalar `@astrojs/check` (no está en las deps). No hay suite de tests. |

## Convención de datos

- Las fotos viven en `public/<País>/<Destino>/` como `.webp`.
- **`00.webp` es la portada / OG image** *y* aparece como **primer slide de imagen del carrusel** (slot **2/N** en el contador, justo después del slide intro autogenerada). Además se referencia como `ogImage` en el `<head>` para la vista previa en redes. **No renombrar.**
- Orden natural-numérico (`localeCompare(..., { numeric: true })`): `15.webp`, `15a.webp`, `15b.webp` se intercalan correctamente sin renumerar.
- `fotos.json` opcional por carpeta, con array de `{ photo, title, description }`. Si falta el archivo o una entrada, el caption simplemente no se renderiza — el build no falla.
- El `src` de cada imagen se arma en `GallerySection.astro` como `` `${import.meta.env.BASE_URL}${folder}/${img}` `` para que el sitio siga funcionando si en el futuro se configura un `base` en `astro.config.mjs`.

## Numeración "FOTO N" del cliente vs. archivos

El cliente entrega los textos en .doc numerados como "FOTO 1", "FOTO 2", … Esos números **NO** son los nombres de archivo. El contador del carrusel se compone así:

- Slot **1/N**: slide intro autogenerada (con el `title`/`sub` de la sección).
- Slot **2/N**: `00.webp` (portada).
- Slot **3/N** en adelante: `01.webp`, `02.webp`, …

El cliente **no entrega texto para `00.webp`** en el .doc (es la portada). El .doc arranca directamente en **"FOTO 2"**, y ese texto corresponde a `01.webp`.

**Regla operativa estable** (la única que importa al cargar captions):

- **doc FOTO N → archivo `(N-1).webp`** para `N ≥ 2` (generalmente; con intercalados como `15a.webp` el offset se mantiene por orden natural-numérico, no por número estricto).

Ejemplo (`public/Argentina/Valadon/`): "FOTO 2" del .doc (Suzanne en Bessines) → `01.webp`. "FOTO 7" (que menciona "Acróbata" + "Amazona") → `06-Circo2-Acrobata-Amazona.webp`.

Antes de empezar a aplicar un .doc nuevo, **chequear esta correspondencia con un par de archivos cuyo nombre tenga hint descriptivo** (p. ej. uno con apellido o tema en el filename) — confirma que el offset es el esperado y descarta que el cliente haya numerado de otra forma en ese álbum.

## Arquitectura: componentes compartidos + páginas de datos

Cada página (`src/pages/*.astro`) es un **archivo de datos delgado**: arma `const sections: GallerySectionData[]` (una entrada por destino) y se lo pasa a `<GalleryPage>` junto con `currentCountry` y las props SEO. Toda la UI transversal, el CSS y el JavaScript viven en piezas compartidas:

- **`src/lib/gallery.ts`** — helpers de build (corren en SSG): `getImages`, `getImagesRecursive`, `getImagesFromCaptions`, `getFolderCaptions`, `getFolderCaptionsRecursive`; la interfaz `CaptionEntry` y el tipo `GallerySectionData`.
- **`src/data/countries.ts`** — fuente **única** del menú entre países (lista de `{ path, country, label }` + separador "Europa").
- **`src/components/CountryNav.astro`** — el menú hamburguesa, generado desde `countries.ts`. Marca el link activo **en build** comparando la prop `currentCountry` con `country` (`data-current`).
- **`src/components/GallerySection.astro`** — una sección de galería: carrusel Swiper (slide intro + un slide por foto) y un **footer fijo** (caption + contador + flechas). Pone `data-anchor`/`data-title`/`data-sub` en su raíz, y `data-caption-title`/`data-caption-desc` en cada slide de foto.
- **`src/layouts/GalleryPage.astro`** — **layout principal**. Compone el header sticky, `<CountryNav>`, el `#fullpage` con `sections.map(s => <GallerySection {...s}/>)`, el `.section-nav` (bullets) generado, y **el `<script>` y el `<style is:global>` compartidos una sola vez**.
- **`src/layouts/Layout.astro`** — `<head>` (meta/OG/Twitter, canonical, JSON-LD) y el `<h1>` sr-only vía `pageHeading`.

`GallerySectionData` = `{ anchor, folder, title, sub?, body?, label?, photos, captions }`.

### Cómo funciona el script (genérico, una sola copia)

El `<script>` de `GalleryPage.astro` no tiene datos hardcodeados: **lee las secciones del DOM** (`document.querySelectorAll('.photo-gallery__section')`, en orden de DOM). Crea un Swiper por sección y un único fullpage.js; el orden de navegación y los bullets salen del orden del array `sections`. No hay un array `SECTIONS` separado que mantener sincronizado.

El **footer es fijo por sección** (fuera del swiper, no se desliza). Al cambiar de foto, el script actualiza el contador y el caption leyendo `data-caption-title`/`data-caption-desc` del slide activo; solo la imagen se desliza. El header sticky se actualiza desde `data-title`/`data-sub` de la sección activa.

### Páginas existentes
- `src/pages/index.astro` — Argentina (23 secciones; Halloween usa `getImagesRecursive` + `getFolderCaptionsRecursive`).
- `src/pages/bahamas.astro` — 1 sección (la más simple para copiar).
- `brasil` (11; Río de Janeiro usa `getImagesFromCaptions`), `chile` (10), `uruguay` (9), `espana` (13), `portugal` (7), `europa-rin` (15), `europa-danubio` (11), `europa-baltico` (12), `europa-oeste` (16).

### Menú entre páginas
Data-driven: `src/data/countries.ts` es la fuente única y `CountryNav.astro` lo renderiza. **Agregar o cambiar un país = editar solo `countries.ts`** (ya no está duplicado a mano en cada página).

## Cómo agregar fotos a una galería existente (caso más frecuente)

1. Optimizar y convertir a `.webp` antes de copiar.
2. Copiar a `public/<País>/<Destino>/`. Numeración:
   - Secuencial al final: `16.webp`, `17.webp`, …
   - O sufijo alfabético para intercalar sin renumerar: `15a.webp`, `15b.webp` (caen entre `15` y `16` por el orden natural-numérico).
3. Si querés caption, agregar la entrada al `fotos.json` de esa carpeta:
   ```json
   { "photo": "16.webp", "title": "...", "description": "..." }
   ```
   Si la foto va sin caption, no hace falta tocar `fotos.json`.
4. `pnpm dev` o `pnpm build` recoge los cambios automáticamente. **No se toca código `.astro`.**

## Cómo editar títulos y descripciones

- **Captions de fotos:** `public/<País>/<Destino>/fotos.json`. Cada entrada `{ photo, title, description }`; el `photo` debe coincidir exactamente con el nombre del archivo (con extensión). `title` o `description` en `""` ocultan ese span; ambos vacíos = foto sin caption.
- **Intro de cada sección** (el heading grande, el tagline en cursiva, el párrafo): vive en la entrada del array `sections` del `.astro` de la página, en los campos `title`, `sub` y `body`. El header sticky usa el **mismo** `title`/`sub` — no hay que actualizarlo en otro lado.

## Cómo agregar una carpeta nueva (nueva sección dentro de un país)

1. **Filesystem** — crear `public/<País>/<NuevaCarpeta>/` con `00.webp` (portada), las fotos numeradas y, opcional, `fotos.json`.
2. **Página** — agregar una entrada al array `sections` del `.astro`:
   ```ts
   {
     anchor: 'nueva-carpeta',           // slug único (data-anchor, id de swiper, anchor de fullpage)
     folder: 'País/NuevaCarpeta',       // ruta dentro de public/
     title: 'NUEVA CARPETA',            // heading del intro + header sticky
     sub: 'subtítulo',                  // opcional: tagline del intro + sub del header
     body: 'Párrafo descriptivo…',      // opcional: párrafo del intro
     label: 'Nueva Carpeta',            // opcional (default: title) — etiqueta del section-nav
     photos: getImages('País/NuevaCarpeta'),
     captions: getFolderCaptions('País/NuevaCarpeta'),
   },
   ```
   **El orden en el array `sections` = orden de scroll y de los bullets.** No se toca markup, CSS ni script.
   - Subcarpetas anidadas: usar `getImagesRecursive` + `getFolderCaptionsRecursive`.
   - Para derivar la lista del orden del `fotos.json` (en vez del filesystem): `getImagesFromCaptions`.

## Cómo agregar una página de país nueva

1. Copiar una página delgada existente (`bahamas.astro` es la más simple) a `src/pages/<slug>.astro`.
2. Cambiar el array `sections`, `currentCountry`, el JSON-LD y las props SEO que se pasan a `<GalleryPage>`.
3. Agregar **una** entrada a `src/data/countries.ts` (`{ path, country, label }`). Eso suma el link al menú en todas las páginas — no se tocan los demás archivos.

## Layout y SEO

- `GalleryPage.astro` recibe `sections`, `currentCountry` y las props SEO (`title`, `description`, `ogImage`, `canonical`, `pageHeading`, `jsonLd`) y las reenvía a `Layout.astro`.
- Cada página pasa su propio JSON-LD `ImageGallery` y su URL canónica.
- Sitemap generado por `@astrojs/sitemap` desde el campo `site` en `astro.config.mjs`. `public/robots.txt` apunta a `sitemap-index.xml`.
- El `<h1>` está visualmente oculto (`.sr-only`) y se setea vía la prop `pageHeading`. Los títulos de galería son `<h2>` dentro de los slides intro.

## TypeScript

`tsconfig.json` extiende `astro/tsconfigs/strict`. Tipar el array de cada página como `GallerySectionData[]` (importado de `src/lib/gallery.ts`); ese tipo más la interfaz `CaptionEntry` son el patrón a seguir.
