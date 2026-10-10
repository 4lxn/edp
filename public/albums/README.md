# Álbumes de proyectos

Cada carpeta aquí dentro = 1 proyecto en el sitio.
La carpeta `<slug>/` se vuelve la URL `/proyectos/<slug>` (y
`/en/projects/<slug>` en inglés).

**Lo mínimo para que aparezca un proyecto: una carpeta con fotos.** Todo lo
demás (título, descripción, captions, etc.) es opcional y se rellena solo con
valores por defecto. Al hacer push a `main`, el sitio se reconstruye y publica
solo. El servidor genera cada foto en el tamaño y formato que necesita cada
pantalla, así que no hace falta achicarlas a mano.

## ⭐ Lo más fácil: el panel `/admin`

Desde el celular o la compu: **https://estructurasdelpacifico.com/admin** →
contraseña → **Proyectos**.

- **+ Nuevo proyecto** crea la carpeta (el nombre se vuelve la URL).
- **+ Subir fotos**: elige varias a la vez; se **optimizan solas** (≤2400px,
  JPG). En iPhone se convierten solas a JPG; si alguna marca error de formato:
  *Ajustes › Cámara › Formatos › Más compatible*.
- En cada foto: **↑ ↓** para ordenar, **★** para hacerla portada, **✕** para
  borrarla, su pie de foto (ES/EN) y una descripción para Google.
- Arriba: nombre, tipo de obra, ubicación, descripción, orden y "Destacado en
  el inicio".

**Guardar** deja los cambios *sin publicar*; **Publicar** los sube al sitio
(~2 minutos). Detalles en el README principal → "Panel de administración".

En la compu también funciona con `npm run dev` (link y contraseña en la
terminal): ahí escribe directo en estas carpetas y se publica con `git push`.

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

1. Copia tus fotos a esa carpeta (o súbelas desde el panel `/admin`).
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
  "featured": false,
  "title": "Mi Proyecto",
  "type": { "es": "Palapa de Playa", "en": "Beach Palapa" },
  "location": { "es": "Sayulita · MX", "en": "Sayulita · MX" },
  "description": {
    "es": "Palapa de playa con techo de palma y estructura de parota.",
    "en": "Beach palapa with a palm-thatched roof on a parota frame."
  },
  "hero": "01-vista.jpeg",
  "imageOrder": ["01-vista.jpeg", "02-detalle.jpeg"],
  "captions": {
    "01-vista.jpeg": { "es": "Vista frontal", "en": "Front view" }
  },
  "alts": {
    "02-detalle.jpeg": { "es": "Ensamble de vigas de parota bajo el techo de palma", "en": "Parota beam joinery under the palm roof" }
  }
}
```

- `description` aparece bajo el título del álbum y es el texto que Google
  muestra en los resultados: 1–2 frases sobre qué se construyó, dónde y con
  qué madera.
- `captions` se ven debajo de cada foto. `alts` no se ven: describen la foto
  para lectores de pantalla y Google Imágenes (si falta, se usa el caption).

Atajos para escribir menos:

- `type`, `location`, `description`, cada `caption` y cada `alt` pueden ser
  **solo un texto** en vez de `{ es, en }`. Ej.: `"type": "Palapa de Playa"` usa
  el mismo texto en ambos idiomas. Si solo pones `es`, el inglés copia el español.
- `order` también se puede controlar con un **prefijo numérico en el nombre de
  la carpeta**: `02-mi-proyecto/` se ordena como 2 (y el "02-" no aparece en el
  título).
- `featured: true` hace que el proyecto aparezca en los destacados del inicio.
- `imageOrder` fija el orden de las fotos sin renombrarlas (lo usa el panel).

### Valores por defecto cuando faltan

| Campo | Default |
|-------|---------|
| `title` | nombre de la carpeta en Mayúsculas (`casa-luna` → "Casa Luna") |
| `type` | vacío (no se muestra la línea) |
| `location` | vacío |
| `description` | vacío (Google usa un texto genérico con título y ubicación) |
| `hero` | primera foto en orden alfabético |
| `order` | prefijo numérico de la carpeta, o 999 (al final) |
| `featured` | `false` |
| `captions` | vacío |
| `alts` | el caption, o "Título: foto 3 de 12" |

---

## Reglas

- Formato de imagen: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- Tamaño: cualquiera sirve (el servidor genera las versiones web). Para no
  inflar el repositorio conviene ≤2400px de lado largo — el panel `/admin` y
  `npm run optimize` lo hacen por ti.
- El `slug` (nombre de carpeta) debe ser kebab-case sin acentos
  (ej. `casa-luna`, no `Casa Luna`)
- Para controlar el orden de las fotos dentro del álbum, nómbralas con prefijo:
  `01-vista.jpeg`, `02-detalle.jpeg`, etc.
- El `hero` es la foto de portada del álbum y del card en la galería del inicio

## Imágenes compartidas

`public/assets/` queda para imágenes globales del sitio (hero del landing,
image breaks). No tocar a menos que quieras cambiar esas tres.
