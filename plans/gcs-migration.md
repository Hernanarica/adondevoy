# Plan: Migrar imágenes a GCP Cloud Storage

## Context

Las imágenes están en `public/` (assets estáticos). El cliente las subió a GCS (acceso público). El objetivo es reemplazar las rutas locales por URLs de GCS almacenadas en `fotos.json`, cargando imágenes a demanda para controlar costos de egress.

El usuario subirá los `fotos.json` actualizados con el campo `url` ya poblado. Las imágenes locales se eliminarán después.

---

## ⚠️ Costos GCS (acción requerida antes de publicar)

**Números:** 5,017 archivos · 925 MB · ~184 KB/foto promedio.  
Storage: $0.037/mes (irrelevante). El costo real es el **egress: $0.12/GB**.

**Antes de publicar**, aplicar Cache-Control a todos los objetos para que los browsers cacheen por 1 año y los visitantes recurrentes no paguen egress:

```bash
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://BUCKET_NAME/**/*.webp"
```

---

## Cambios en `src/pages/index.astro`

### 1. Reemplazar las dos funciones de datos por una sola

Eliminar `getImages()` y `getFolderCaptions()`. Agregar `getFolderPhotos()` que lee el JSON como array y filtra `00.*`:

```typescript
interface PhotoEntry {
  photo: string;
  url?: string;
  title?: string;
  description?: string;
}

function getFolderPhotos(folder: string): PhotoEntry[] {
  const jsonPath = join(process.cwd(), 'public', folder, 'fotos.json');
  try {
    const data: Array<{ photo: string; url?: string; title: string; description: string }> =
      JSON.parse(readFileSync(jsonPath, 'utf-8'));
    return data
      .filter(item => !/^00\./i.test(item.photo))
      .map(item => ({
        photo: item.photo,
        url: item.url || undefined,
        title: item.title || undefined,
        description: item.description || undefined,
      }));
  } catch {
    return [];
  }
}

const barilochePhotos    = getFolderPhotos('Argentina/Bariloche');
const mendozaPhotos      = getFolderPhotos('Argentina/Mendoza');
const malvinasPhotos     = getFolderPhotos('Argentina/IslasMalvinas');
// en bahamas.astro:
const bahamasPhotos      = getFolderPhotos('Bahamas/Bahamas');
```

### 2. Actualizar los render loops

Usar `entry.url` con fallback a ruta local. Mismo patrón para Bariloche y Mendoza:

```astro
{barilochePhotos.map((entry, i) => (
  <div class="swiper-slide photo-gallery__slide">
    <div class="photo-gallery__slide-media">
      <img
        class="photo-gallery__image"
        src={entry.url ?? `${import.meta.env.BASE_URL}Argentina/Bariloche/${entry.photo}`}
        alt={`Bariloche — ${entry.title || entry.photo.replace(/\.\w+$/, '').replace(/-/g, ' ')}`}
        loading={i === 0 ? 'eager' : 'lazy'}
        decoding={i === 0 ? 'sync' : 'async'}
      />
    </div>
    <div class="photo-gallery__caption">
      {entry.title && <span class="photo-gallery__caption-title">{entry.title}</span>}
      {entry.description && <span class="photo-gallery__caption-desc">{entry.description}</span>}
    </div>
  </div>
))}
```

### 3. Carga a demanda (lazy loading)

**Cómo funciona en la práctica:** todos los `<img>` están en el DOM, pero el browser solo descarga la imagen cuando el slide está próximo a aparecer en pantalla. El usuario paga egress únicamente por las fotos que efectivamente ve.

Dos mecanismos combinados:

**a) HTML nativo** — ya está en el código actual, se mantiene:
```html
loading={i === 0 ? 'eager' : 'lazy'}   <!-- primera foto: carga inmediata; resto: a demanda -->
decoding={i === 0 ? 'sync' : 'async'}
```

**b) Swiper** — agregar `lazyPreloadPrevNext: 1` para precargar solo el slide siguiente (fluidez al pasar de foto):
```javascript
swipers[anchor] = new Swiper(`#swiper-${anchor}`, {
  // ... resto igual
  preloadImages: false,       // ya estaba — Swiper no precarga nada por su cuenta
  lazyPreloadPrevNext: 1,     // ← nuevo: solo el slide inmediato siguiente
  on: makeHandlers(anchor),
});
```

**Resultado:** si el usuario entra a Bariloche (52 fotos) y ve solo 10, solo se descargan ~10 fotos desde GCS. Las otras 42 no generan egress.

---

## Archivos a modificar

- `src/pages/index.astro` — refactor data layer + render loops + Swiper config
- `src/pages/bahamas.astro` — ídem (misma migración)
- `public/Argentina/Bariloche/fotos.json` — el usuario agrega campo `url` por entry
- `public/Argentina/Mendoza/fotos.json` — ídem
- `public/Argentina/IslasMalvinas/fotos.json` — ídem
- `public/Bahamas/Bahamas/fotos.json` — ídem

---

## Verificación

1. `pnpm dev` → abrir galería
2. Network tab: las imágenes deben venir de `storage.googleapis.com`
3. Lazy loading: fotos fuera del viewport no deben aparecer en Network hasta navegar hacia ellas
4. Fallback: quitar `url` de un entry → debe cargar la imagen local sin errores
