# Álbumes de proyectos

Cada carpeta aquí dentro = 1 proyecto en el sitio.
La carpeta `<slug>/` se vuelve la URL `/#/album/<slug>`.

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
