# Álbumes de proyectos

Cada carpeta aquí dentro = 1 proyecto en el sitio.
La carpeta `<slug>/` se vuelve la URL `/#/album/<slug>`.

**Lo mínimo para que aparezca un proyecto: una carpeta con fotos.** Todo lo
demás (título, captions, etc.) es opcional y se rellena solo con valores por
defecto. Al hacer push a `main`, el sitio se reconstruye y publica solo.

---

## 📱 Desde el celular (github.com, sin terminal)

### Crear un proyecto nuevo

1. Entra a la carpeta `public/albums/` en GitHub.
2. **Add file → Create new file**.
3. En el nombre escribe: `mi-proyecto/_meta.json`
   (esto crea la carpeta `mi-proyecto/`). Como contenido pon `{}` y commitea.
4. Entra a la carpeta `mi-proyecto/` → **Add file → Upload files** → sube tus
   fotos → commitea.
5. Listo. El deploy corre solo y el proyecto aparece en el sitio en ~1 min.

> El título sale del nombre de la carpeta (`casa-luna` → "Casa Luna"). Para
> ponerle ubicación o captions bonitos, edita el `_meta.json` (ver abajo).

### Agregar fotos a un proyecto existente

Entra a su carpeta → **Add file → Upload files** → sube las fotos → commit.
Eso es todo.

---

## 💻 Desde la computadora

### Crear un proyecto nuevo (atajo)

```bash
npm run new-album mi-proyecto "Mi Proyecto"
```

Crea `public/albums/mi-proyecto/` con un `_meta.json` de plantilla. Luego:

1. Copia tus fotos a esa carpeta.
2. `npm run sync` (actualiza la galería para previsualizar con `npm run dev`).
3. `git add -A && git commit -m "feat: álbum mi-proyecto" && git push`

### A mano

1. Crea la carpeta `public/albums/mi-proyecto/` y mete las fotos.
2. `npm run sync` → commit → push.

---

## `_meta.json` (todo opcional)

Sin este archivo, todo se deriva por defecto. Úsalo solo para personalizar.
Puedes borrar los campos que no necesites.

```json
{
  "order": 5,
  "title": "Mi Proyecto",
  "type": { "es": "Palapa de Playa", "en": "Beach Palapa" },
  "location": { "es": "Sayulita · MX", "en": "Sayulita · MX" },
  "hero": "01-vista.jpeg",
  "captions": {
    "01-vista.jpeg": { "es": "Vista frontal", "en": "Front view" }
  }
}
```

Atajos para escribir menos:

- `type`, `location` y cada `caption` pueden ser **solo un texto** en vez de
  `{ es, en }`. Ej.: `"type": "Palapa de Playa"` usa el mismo texto en ambos
  idiomas. Si solo pones `es`, el inglés copia el español.
- `order` también se puede controlar con un **prefijo numérico en el nombre de
  la carpeta**: `02-mi-proyecto/` se ordena como 2 (y el "02-" no aparece en el
  título).

### Valores por defecto cuando faltan

| Campo | Default |
|-------|---------|
| `title` | nombre de la carpeta en Mayúsculas (`casa-luna` → "Casa Luna") |
| `type` | "Proyecto" / "Project" |
| `location` | vacío |
| `hero` | primera foto en orden alfabético |
| `order` | prefijo numérico de la carpeta, o 999 (al final) |
| `captions` | vacío |

---

## Reglas

- Formato de imagen: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- Tamaño recomendado: 2000–3000px lado largo, <500KB cada una
- El `slug` (nombre de carpeta) debe ser kebab-case sin acentos
  (ej. `casa-luna`, no `Casa Luna`)
- Para controlar el orden de las fotos dentro del álbum, nómbralas con prefijo:
  `01-vista.jpeg`, `02-detalle.jpeg`, etc.
- El `hero` es la foto de portada del álbum y del card en la galería del inicio

## Imágenes compartidas

`public/assets/` queda para imágenes globales del sitio (hero del landing,
image breaks). No tocar a menos que quieras cambiar esas tres.
