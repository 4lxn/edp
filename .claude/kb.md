# KB — Estructuras del Pacífico

Cheat-sheet para no re-explorar el repo cada sesión. Si algo aquí ya no
coincide con el código, **gana el código** (y actualiza este archivo).

## Qué es

Sitio del constructor de palapas y estructuras de madera **Estructuras del
Pacífico** ("Ficha de obra"): landing, índice de obras, página por obra,
páginas de servicio y formulario de cotización. Bilingüe: **ES en la raíz, EN
bajo `/en/`**. Sitio **estático** Vite + React **prerenderizado** (HTML real por
ruta), hosteado en **GitHub Pages** con dominio propio (`public/CNAME`). Push a
`main` → GitHub Actions hace `npm run build` y publica.

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm install` | Instalar deps (una vez) |
| `npm run dev` | Servidor local con HMR → http://localhost:5173 |
| `npm run sync` | Regenera `src/albums.generated.js` desde `public/albums/` |
| `npm run images` | Genera variantes AVIF/JPEG en `public/r/` (git-ignored, incremental) |
| `npm run new-album <slug> ["Título"]` | Crea carpeta de proyecto nuevo |
| `npm run optimize` | Reduce los originales (≤2400px) |
| `npm run build` | sync + images + build cliente + build SSR + prerender → `dist/` |

**Agregar fotos localmente:** `npm run dev` y abrir
**http://localhost:5173/admin** (panel solo-dev). O a mano: `.jpeg` en
`public/albums/<slug>/`, `npm run sync`, y `git push` para publicar.

## Mapa de archivos

```
src/
  main.jsx            Arranque: BrowserRouter; hidrata si hay HTML prerenderizado.
                      LazyMotion → en JSX se usa <m.div>, NO <motion.div>.
  entry-server.jsx    Entrada SSR (solo build) usada por scripts/prerender.mjs.
  App.jsx             Shell (Header, Footer, barra fija móvil) + selección de página.
  routes.js           Mapa de URLs ES/EN, resolve(), alternate(), allRoutes().
  seo.js              <head> por ruta: title, description, canonical, hreflang, OG, JSON-LD.
  facts.js            ← TODOS los datos del negocio. null = no confirmado = no se muestra.
  i18n.js             TODO el texto ES/EN (depende de facts.js; sin placeholders).
  pages/              Landing, Projects (índice), Project (ficha), Pages (cotizar,
                      servicios, privacidad, 404).
  components/         Header, Footer, Picture (<img> srcset, nunca escala hacia
                      arriba), QuoteForm (FormSubmit), Blocks (tarjetas, proceso, CTA).
  imgsizes.js         Anchos de variantes (compartido con scripts/responsive-images).
  albums.generated.js AUTO-GENERADO por `npm run sync`. NO editar a mano.
  styles.css          Todos los estilos (CRLF — conservar).
  admin/              Panel local (api.js habla con vite-plugin-admin.mjs).
public/
  albums/<slug>/      1 carpeta = 1 obra. _meta.json: título, type, location,
                      hero, imageOrder, captions, featured, order + ficha (year,
                      client, dimensions, materials, story, fact, sequence,
                      process, focus). Ver cabecera de scripts/sync-albums.mjs.
  albums/_site.json   Hero del landing, fotos de servicios, banda "En obra", imagen OG.
  assets/, video/     Imágenes globales y clips de proceso (mudos, en loop).
  r/                  Variantes generadas (NO se commitea).
scripts/              sync-albums, responsive-images, prerender, new-album,
                      optimize-images, vite-plugin-admin.
```

## Convenciones y trampas (LEER antes de tocar)

- **Sin datos inventados.** Todo número, año, nombre de cliente, garantía o
  promesa vive en `src/facts.js`. Si es `null`, la frase/fila/sección no se
  renderiza. `prerender.mjs` falla si aparece un `[PLACEHOLDER]` en el HTML.
- **Mención de Architectural Digest**: construida pero apagada
  (`FACTS.press.enabled = false`) hasta que el dueño la confirme. Solo texto.
- **Contacto solo por correo**: formulario + correo visible. Sin WhatsApp ni teléfono.
- **Parallax = SOLO CSS scroll-driven animations** (`animation-timeline`), y
  solo en el hero del landing. NO reintroducir JS de scroll
  (`useScroll`/listeners): janquea en móvil. **No hay ningún scroll listener**:
  header y barra fija usan IntersectionObserver (`useAnyInView`).
  **Única excepción:** la sección 3D "Anatomía de una cubierta"
  (`components/Anatomy.jsx` → chunk lazy `components/AnatomyScene.jsx`, three +
  R3F + drei). Su listener es pasivo, coalescido con rAF, solo existe mientras
  la sección cruza el viewport y solo invalida el canvas (`frameloop="demand"`).
  El chunk se pide por IntersectionObserver; SSR/no-JS/sin WebGL ven
  `public/assets/anatomy-poster.{avif,jpg}` (captura de la propia escena; si
  cambia el modelo, regenerarla). Geometría = números del plano en metros.
- **Rutas reales** (BrowserRouter) prerenderizadas a `dist/<ruta>/index.html`.
  `404.html` arranca la SPA para rutas desconocidas; un script en `index.html`
  redirige los enlaces viejos `/#/album/x` → `/proyectos/x/`.
- **Componentes SSR-safe**: `window`/`document` solo dentro de efectos.
- **Fotos**: siempre `<Picture>` (img real, width/height, srcset AVIF+JPEG,
  lazy). Sin bordes, grano ni tintes. Portadas y hero se eligen en
  `_meta.json` / `_site.json`, no en código.
- **Accesibilidad**: bronce nunca como texto pequeño sobre greige (2.4:1);
  nada bajo 12px; foco visible; animaciones bajo
  `prefers-reduced-motion: no-preference`.
- **Admin** existe solo en dev (`import.meta.env.DEV` + plugin `apply:'serve'`).
- **Formulario**: FormSubmit AJAX (sin backend), con honeypot `_honey`.
- No editar `albums.generated.js` ni borrar `public/CNAME`.

## Despliegue / sitio caído

Casi siempre es DNS (A records → 185.199.108–111.153), el cert HTTPS tardando
unos minutos, o un deploy fallido (pestaña Actions). No es el código.
