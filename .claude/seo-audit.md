# SEO Audit — Adondevoy

## Contexto

Adondevoy es una galería fotográfica de viajes de Orlando Moure. El sitio tiene 9 páginas (Argentina, Brasil, Uruguay, Chile, Bahamas, y 4 rutas europeas), construidas con Astro 6 + fullpage.js + Swiper. La infraestructura SEO base existe en `Layout.astro` (title, description, OG, Twitter, canonical como props opcionales) pero casi no se usa: 8 de 9 páginas tienen metadata genérica y faltan robots.txt, sitemap y datos estructurados.

---

## Hallazgos por Prioridad

### 🔴 Crítico — Bloquean indexación o visibilidad directa

| # | Problema | Evidencia |
|---|----------|-----------|
| 1 | **Sin `site` en astro.config.mjs** | El config sólo tiene `vite.optimizeDeps`. Sin `site`, Astro no puede generar URLs absolutas para el sitemap ni para canónicos programáticos. |
| 2 | **Sin robots.txt** | No existe `/public/robots.txt`. Google entra en modo permisivo pero no hay referencia al sitemap ni control de rastreo. |
| 3 | **Sin sitemap.xml** | No está `@astrojs/sitemap` ni ningún sitemap estático. Las 9 páginas no son descubribles por crawlers. |
| 4 | **8/9 páginas con título y descripción genéricos** | `brasil.astro:62`, `chile.astro:60`, `uruguay.astro:58`, `bahamas.astro`, `europa-rin.astro:70`, `europa-danubio.astro`, `europa-baltico.astro`, `europa-oeste.astro` — todas pasan `<Layout>` sin props. El title default es `"Adondevoy — Fotografía de viajes"` y description `"Galería fotográfica de viajes por el mundo."` para todas. |

---

### 🟠 Alto impacto — Limitan ranking y CTR

| # | Problema | Evidencia |
|---|----------|-----------|
| 5 | **Sin H1 en ninguna página** | Todas las páginas usan `<h2>` para los títulos de sección (ej. `index.astro:114`). No existe ningún `<h1>`. Google usa el H1 como señal principal de tema. |
| 6 | **Sin canónicos** | `Layout.astro:43` soporta `canonical` como prop pero ninguna página lo pasa. Sin URL canónica explícita, Google elige por su cuenta (puede elegir la versión incorrecta). |
| 7 | **Sin og:image** | `Layout.astro:34` soporta `ogImage` pero ninguna página lo pasa — ni Argentina. Todas las páginas aparecen sin preview visual en redes sociales. |

---

### 🟡 Medio impacto — Mejoras de calidad y datos estructurados

| # | Problema | Evidencia |
|---|----------|-----------|
| 8 | **Sin datos estructurados (JSON-LD)** | No hay schemas de tipo `ImageGallery`, `Person`/`Photographer`, ni `BreadcrumbList`. Con ~5,000 fotos, ImageGallery y Person ayudarían a rich results. |
| 9 | **Alt text auto-generado desde nombre de archivo** | `index.astro:135`: `alt={`Bariloche — ${img.replace(...)}`}`. Funcional, pero el alt depende 100% del nombre del archivo, no de una descripción editorial. Las fotos con `fotos.json` ya tienen `title` y `description` disponibles que no se usan en el alt. |

---

### 🟢 Bien implementado (no tocar)

- `lang="es"` en `<html>` (`Layout.astro:20`)
- Imágenes en formato WebP
- `loading="lazy"` / `loading="eager"` según posición (`index.astro:133`)
- `decoding="async"` / `decoding="sync"` correctamente aplicado
- Navegación interna consistente entre las 9 páginas
- Favicons SVG + ICO

---

## Plan de Implementación

### Paso 1 — Configuración base (`astro.config.mjs`)

```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://adondevoy.com', // confirmar dominio real
  integrations: [sitemap()],
  vite: {
    optimizeDeps: { include: ['fullpage.js'] },
  },
});
```

Instalar: `npm install @astrojs/sitemap`

---

### Paso 2 — robots.txt (`public/robots.txt`)

```
User-agent: *
Allow: /

Sitemap: https://adondevoy.com/sitemap-index.xml
```

---

### Paso 3 — H1 en Layout (`src/layouts/Layout.astro`)

Agregar prop `pageHeading?: string` y renderizar un `<h1>` visualmente oculto dentro del `<body>` via slot o como prop del Layout, para que cada página declare su H1 sin romper el diseño fullpage.

```astro
// en el <head> no, pero justo al abrir <body>:
{pageHeading && <h1 class="sr-only">{pageHeading}</h1>}
```

CSS en Layout:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

---

### Paso 4 — Metadata por página

Actualizar las 8 páginas sin metadata. Modelo:

| Página | title | description |
|--------|-------|-------------|
| `brasil.astro` | `Brasil — Fotografía de viajes` | `Galería fotográfica de Brasil: Río de Janeiro, Salvador, Gramado, Ilha Grande, Buzios, Petrópolis y más. Fotografías de Orlando Moure.` |
| `uruguay.astro` | `Uruguay — Fotografía de viajes` | `Galería fotográfica de Uruguay: Montevideo, Punta del Este, Colonia Sacramento, Piriápolis, Carmelo y más. Fotografías de Orlando Moure.` |
| `chile.astro` | `Chile — Fotografía de viajes` | `Galería fotográfica de Chile: Valparaíso, Santiago, Torres del Paine, Cabo de Hornos, Patagonia, Punta Arenas y más. Fotografías de Orlando Moure.` |
| `bahamas.astro` | `Bahamas — Fotografía de viajes` | `Galería fotográfica de Bahamas: paisajes del Caribe. Fotografías de Orlando Moure.` |
| `europa-rin.astro` | `Crucero por el Rin — Fotografía de viajes` | `Galería fotográfica del Crucero por el Rin: Basilea, Estrasburgo, Heidelberg, Colonia, Düsseldorf, Ámsterdam y más. Fotografías de Orlando Moure.` |
| `europa-danubio.astro` | `Crucero por el Danubio — Fotografía de viajes` | `Galería fotográfica del Crucero por el Danubio: Pasau, Linz, Viena, Bratislava, Budapest, Salzburgo y más. Fotografías de Orlando Moure.` |
| `europa-baltico.astro` | `Crucero por el Báltico — Fotografía de viajes` | `Galería fotográfica del Crucero por el Báltico: Estocolmo, Helsinki, San Petersburgo, Tallin, Copenhague, Berlín y más. Fotografías de Orlando Moure.` |
| `europa-oeste.astro` | `Europa Occidental — Fotografía de viajes` | `Galería fotográfica de Europa Occidental: París, Lucerna, Andalucía, Brujas, Bruselas y más. Fotografías de Orlando Moure.` |

Además agregar `canonical` en cada página:
```astro
<Layout
  title="Brasil — Fotografía de viajes"
  description="..."
  canonical="https://adondevoy.com/brasil"
  ogImage="https://adondevoy.com/Brasil/Rio-de-Janeiro/00.webp"
>
```

---

### Paso 5 — JSON-LD en Layout (`src/layouts/Layout.astro`)

Agregar prop `jsonLd?: object` y renderizar en `<head>`:

```astro
{jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
```

Schema mínimo recomendado por página (en cada `.astro`):
```js
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  "name": "Brasil — Fotografía de viajes",
  "description": "...",
  "author": {
    "@type": "Person",
    "name": "Orlando Moure",
    "url": "https://adondevoy.com"
  },
  "url": "https://adondevoy.com/brasil"
}
```

---

### Paso 6 — Mejorar alt text con datos de fotos.json

En las páginas que ya leen `fotos.json` (`getFolderCaptions()`), el título de la foto está disponible como `captions[img]?.title`. Usar ese valor como alt cuando exista:

```astro
alt={captions[img]?.title ?? `${sectionName} — ${img.replace(/\.\w+$/, '').replace(/-/g, ' ')}`}
```

Archivo afectado: todos los `.astro` en `src/pages/`. Línea de referencia: `index.astro:135`.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `astro.config.mjs` | Agregar `site` + integración `@astrojs/sitemap` |
| `public/robots.txt` | Crear (nuevo) |
| `src/layouts/Layout.astro` | Props `pageHeading`, `jsonLd`; render H1 sr-only; render JSON-LD |
| `src/pages/brasil.astro` | Props title, description, canonical, ogImage, pageHeading, jsonLd |
| `src/pages/uruguay.astro` | Ídem |
| `src/pages/chile.astro` | Ídem |
| `src/pages/bahamas.astro` | Ídem |
| `src/pages/europa-rin.astro` | Ídem |
| `src/pages/europa-danubio.astro` | Ídem |
| `src/pages/europa-baltico.astro` | Ídem |
| `src/pages/europa-oeste.astro` | Ídem |
| `src/pages/index.astro` | Agregar canonical, ogImage, pageHeading, jsonLd (ya tiene title y description) |

---

## Verificación

1. `npm run build` — confirmar que genera `dist/sitemap-index.xml` y `dist/sitemap-0.xml` con las 9 URLs
2. Abrir `dist/robots.txt` — verificar referencia al sitemap
3. Abrir cada página en `dist/` y verificar:
   - `<title>` único y correcto
   - `<meta name="description">` única y correcta
   - `<link rel="canonical">` presente
   - `<h1>` en el DOM (invisible)
   - `<script type="application/ld+json">` en `<head>`
4. `npm run preview` y verificar visualmente que el H1 oculto no rompe el layout
