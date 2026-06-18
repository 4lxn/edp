# Álbumes de proyectos

Cada carpeta aquí dentro = 1 proyecto en el sitio.
La carpeta `<slug>/` se vuelve la URL `/#/album/<slug>`.

## ⭐ Forma fácil: panel de administración local

Con el sitio corriendo en desarrollo (`npm run dev`), abre:

> **http://localhost:5173/#/admin**

Desde ahí puedes, sin tocar archivos a mano:
- Crear álbumes y editar título, tipo, ubicación (ES/EN), orden, destacado y portada.
- Subir fotos arrastrándolas (se **optimizan solas** a ≤2400px y se comprimen).
- Escribir las captions (ES/EN) de cada foto y reordenarlas.

El panel **solo existe en desarrollo** (nunca en el sitio publicado) y escribe en estas
mismas carpetas. **Para publicar online, haz `git push`** (el deploy es automático).

El resto de este documento explica el formato de archivos por si prefieres editarlo a mano.

## Cómo agregar fotos a un álbum existente

1. Pon tus fotos en la carpeta del proyecto, ej. `punta-garrobo/`
2. Nómbralas con prefijo numérico para controlar el orden:
   `05-detalle-cumbrera.jpeg`, `06-atardecer.jpeg`, etc.
3. (Opcional) Abre `_meta.json` y agrega caption bilingüe:
   ```json
   "05-detalle-cumbrera.jpeg": {
     "es": "Detalle de cumbrera",
     "en": "Ridge detail"
   }
   ```
4. Corre `npm run sync` desde la raíz del repo
5. Commit + push → GitHub Actions deploya

## Cómo crear un álbum nuevo

1. Crea una carpeta nueva: `public/albums/mi-proyecto/`
2. Mete tus fotos numeradas: `01-vista.jpeg`, `02-detalle.jpeg`, etc.
3. Crea `_meta.json`:
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
4. `npm run sync` → commit → push

## Reglas

- Formato: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- Tamaño recomendado: 2000-3000px lado largo, <500KB cada una
- El `slug` (nombre de carpeta) debe ser kebab-case sin acentos
- El campo `order` controla el orden en la galería del landing
- `hero` define la foto que se ve en la portada del álbum y del card en la galería

## Imágenes compartidas

`public/assets/` queda para imágenes globales del sitio (hero del landing, image breaks). No tocar a menos que quieras cambiar esas tres.
