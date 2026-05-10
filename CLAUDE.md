# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El resto de este archivo está en español: el proyecto, su contenido y el cliente trabajan en español.

## Proyecto

Portfolio fotográfico estático de Orlando Moure, desplegado en `https://adondevoy.com.ar`. Una página por país/viaje. Cada página es un scroller vertical (fullpage.js) compuesto por carruseles horizontales (Swiper). No hay backend: las imágenes y captions se leen del filesystem en build time.

## Comandos

Gestor de paquetes: **pnpm**. Node ≥ 22.12.0.

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo en `localhost:4321` |
| `pnpm build` | Build de producción a `./dist/` |
| `pnpm preview` | Sirve el build local para previsualizar |
| `pnpm astro check` | Type-check de archivos `.astro` (no hay suite de tests) |

## Convención de datos

- Las fotos viven en `public/<País>/<Destino>/` como `.webp`.
- **`00.webp` es la portada / OG image** y se excluye del carrusel vía la regex `^00\.` en `getImages`. **No renombrar.**
- Orden natural-numérico (`localeCompare(..., { numeric: true })`): `15.webp`, `15a.webp`, `15b.webp` se intercalan correctamente sin renumerar.
- `fotos.json` opcional por carpeta, con array de `{ photo, title, description }`. Si falta el archivo o una entrada, el caption simplemente no se renderiza — el build no falla.
- Todos los `src` de imágenes en los templates usan `` `${import.meta.env.BASE_URL}…` `` para que el sitio siga funcionando si en el futuro se configura un `base` en `astro.config.mjs`.

## Arquitectura: el patrón de galería

Cada página (`src/pages/*.astro`) repite la misma estructura de tres partes que **deben mantenerse sincronizadas**:

1. **Frontmatter** — llamadas `getImages('País/Carpeta')` y `getFolderCaptions(...)` (una por destino) más el mapa `captions`.
2. **Markup** — un `<div class="section photo-gallery__section" data-anchor="<slug>">` por destino, conteniendo un `.swiper#swiper-<slug>` con un slide intro + `.map(photo => slide)`, más botones `#prev-<slug>` / `#next-<slug>`.
3. **Script** — un array `SECTIONS` al inicio del `<script>` listando cada anchor en el **mismo orden del DOM**, con `title` y `sub` para el header sticky. El script crea un Swiper por anchor y un único fullpage.js que navega por `SECTIONS.map(s => s.anchor)`. Solo el Swiper de la sección activa queda `enable()`d.

Si `SECTIONS` y los `data-anchor` divergen, la navegación se rompe en silencio (el script hace lookup por string en `swipers[anchor]`).

### Páginas existentes
- `src/pages/index.astro` — Argentina (referencia del patrón completo, 16 secciones).
- `src/pages/bahamas.astro` — 1 sección (template más simple para copiar).
- `brasil`, `chile`, `uruguay`, `europa-rin`, `europa-danubio`, `europa-baltico`, `europa-oeste`.

### Menú entre páginas — gotcha
El menú hamburguesa (`.country-nav`) está **duplicado a mano en cada página**, con `data-country="<slug>"` que matchea un `currentCountry` por página para resaltar el link activo. Cambios en el menú requieren editar **todas** las páginas.

## Cómo agregar fotos a una galería existente (caso más frecuente)

1. Optimizar y convertir a `.webp` antes de copiar.
2. Copiar a `public/<País>/<Destino>/`. Numeración:
   - Secuencial al final: `16.webp`, `17.webp`, …
   - O sufijo alfabético si querés intercalar entre fotos existentes sin renumerar: `15a.webp`, `15b.webp` (caen entre `15` y `16` por el orden natural-numérico).
3. Si querés caption, agregar la entrada al `fotos.json` de esa carpeta:
   ```json
   { "photo": "16.webp", "title": "...", "description": "..." }
   ```
   Si la foto va sin caption, no hace falta tocar `fotos.json`.
4. `pnpm dev` o `pnpm build` recoge los cambios automáticamente. **No se toca código `.astro`.**

## Cómo editar títulos y descripciones

- Archivo: `public/<País>/<Destino>/fotos.json`.
- Cada entrada: `{ photo, title, description }`. El campo `photo` debe coincidir **exactamente** con el nombre del archivo, incluyendo la extensión.
- `title` o `description` con string vacío (`""`) ocultan ese span; ambos vacíos = sin caption visible para esa foto.
- ⚠️ El **intro de cada sección** (el heading grande tipo "BARILOCHE", el tagline "en familia", el párrafo descriptivo) **no está en `fotos.json`**. Vive hardcoded en el `.astro` dentro de `.photo-gallery__slide--intro`. Para editarlo:
  1. Editar el texto en el `.astro` (`<h2 class="photo-gallery__intro-heading">`, `<p class="photo-gallery__intro-tagline">`, `<p class="photo-gallery__intro-body">`).
  2. Si cambia el título o subtítulo, actualizar también la entrada correspondiente en el array `SECTIONS` del `<script>` (campos `title` y `sub`) — es lo que se muestra en el header sticky cuando estás en esa sección.

## Cómo agregar una carpeta nueva (nueva sección dentro de un país)

Los cuatro pasos son obligatorios y deben quedar en orden coherente:

1. **Filesystem** — crear `public/<País>/<NuevaCarpeta>/` con:
   - `00.webp` (portada, no aparece en el carrusel).
   - Las fotos numeradas (`01.webp`, `02.webp`, …).
   - Opcional: `fotos.json` con los captions.

2. **Frontmatter** del `.astro` del país — agregar dos líneas:
   ```ts
   const nuevaPhotos = getImages('País/NuevaCarpeta');
   // …y dentro del objeto captions:
   NuevaCarpeta: getFolderCaptions('País/NuevaCarpeta'),
   ```

3. **Markup** — copiar un bloque `<div class="section photo-gallery__section" data-anchor="<slug>">` existente (los compactos como Calafate o Gaiman en `index.astro` sirven de template). Reemplazar:
   - El `data-anchor` y los IDs `#swiper-<slug>` / `#prev-<slug>` / `#next-<slug>`.
   - La ruta del `<img src>` (`País/NuevaCarpeta/${img}`).
   - El array iterado (`nuevaPhotos.map(...)`).
   - Las referencias al caption (`captions.NuevaCarpeta?.[img]?.title` / `.description`).
   - El total del contador (`nuevaPhotos.length + 1`).

4. **Script** — agregar entrada al array `SECTIONS`:
   ```ts
   { anchor: 'nueva-carpeta', label: 'Nueva Carpeta', title: 'NUEVA CARPETA', sub: 'subtítulo' },
   ```
   **El orden en `SECTIONS` debe coincidir con el orden de los `<div class="section">` en el DOM**, porque fullpage.js navega secuencialmente y el header sticky usa el índice del anchor.

## Cómo agregar una página de país nueva

Caso menos frecuente, pero tiene un gotcha importante:

1. Copiar una página existente (`bahamas.astro` es la más simple) a `src/pages/<nuevo-pais>.astro`.
2. Cambiar `currentCountry`, las rutas de `getImages`, el JSON-LD, los meta tags pasados a `<Layout>` y el array `SECTIONS`.
3. **Actualizar el menú hamburguesa (`.country-nav`) en TODAS las páginas existentes** para incluir el nuevo país. No hay componente compartido — está hand-duplicated.

## Layout y SEO

- `src/layouts/Layout.astro` acepta `title`, `description`, `ogImage`, `canonical`, `pageHeading`, `jsonLd`. Cada página pasa su propio JSON-LD `ImageGallery` y URL canónica.
- Sitemap generado por `@astrojs/sitemap` desde el campo `site` en `astro.config.mjs`. `public/robots.txt` apunta a `sitemap-index.xml`.
- El `<h1>` está visualmente oculto (`.sr-only`) y se setea vía la prop `pageHeading`. Los títulos de galería son `<h2>` dentro de los slides intro.

## TypeScript

`tsconfig.json` extiende `astro/tsconfigs/strict`. Mantener tipado el frontmatter — la interfaz `CaptionEntry` y las anotaciones `Record<string, ...>` que ya están en uso son el patrón a seguir.
