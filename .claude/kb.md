# KB — Estructuras del Pacífico

Cheat-sheet para no re-explorar el repo cada sesión. Si algo aquí ya no
coincide con el código, **gana el código** (y actualiza este archivo).

## Qué es

Landing editorial + galería de proyectos para un taller de arquitectura
tropical en madera. Bilingüe ES (raíz) / EN (`/en`). **Vite + React
pre-renderizado**: el build genera un HTML completo por página (SEO, previews
al compartir) y React hidrata en el navegador. Servido por un servidor Node
propio (`server/index.mjs`) en **Railway**, con dominio estructurasdelpacifico.com
(DNS en Porkbun). Push a `main` → Railway compila y publica; GitHub Actions
solo verifica que compile (`ci.yml`).

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm install` | Instalar deps (Node 24) |
| `npm run dev` | Vite con HMR → http://localhost:5173 (sin pre-render; imprime el link del admin) |
| `npm run build` | sync → bundle cliente (`dist/client`) → bundle SSR (`dist/server`) → `scripts/prerender.mjs` |
| `npm start` | Servidor de producción sobre `dist/` (puerto `$PORT` o 3000) |
| `npm run preview` | build + start (igual que Railway) |
| `npm run sync` | Regenera `src/albums.generated.js` desde `public/albums/` |
| `npm run new-album <slug> ["Título"]` | Crea carpeta de proyecto nuevo |

En esta máquina Node/npm y el SSH de git **solo existen dentro de WSL**:
`wsl.exe -d ubuntu -e bash -lc 'export NVM_DIR=~/.nvm; . ~/.nvm/nvm.sh; cd ~/Desktop/Projects/edp && <cmd>'`.
`.claude/launch.json` tiene `estructuras-dev` (5173) y `estructuras-prod`
(build + start en 3000) para el panel de preview.

## URLs (src/i18n.js)

| Página | ES | EN |
|--------|----|----|
| home | `/` | `/en` |
| projects | `/proyectos` | `/en/projects` |
| album | `/proyectos/<slug>` | `/en/projects/<slug>` |
| privacy | `/aviso-de-privacidad` | `/en/privacy` |

Secciones del home: `#filosofia`, `#contacto`. Links viejos `/#/album/x` los
redirige el script inline de `index.html` (antes de pintar).

## Mapa de archivos

```
index.html            Plantilla: script de arranque (clase .js + redirección de
                      links con #), placeholders <!--app-head--> / <!--app-html-->.
server/
  index.mjs           Producción: sirv (br/gz precomprimidos, cache headers),
                      redirects (www, http, slash final, index.html), 404 real,
                      /healthz, warm-up de imágenes (dist/img-warm.json).
  images.mjs          /_img/<ancho|og>/<avif|webp|jpeg>/<ruta en public>:
                      sharp bajo demanda + caché en disco (volumen de Railway
                      vía RAILWAY_VOLUME_MOUNT_PATH o IMG_CACHE_DIR).
src/
  entry-client.jsx    hydrateRoot si hay HTML pre-renderizado, si no createRoot.
                      Importa fuentes (Fontsource) y styles.css.
  entry-server.jsx    render(url) para el pre-render (StaticRouter).
  App.jsx             Rutas de ambos idiomas + HeadManager + ScrollManager.
                      LazyMotion → en JSX se usa <m.div>, NO <motion.div>.
  content/site.json   TODO el texto ES/EN + `business` (email, teléfono,
                      redes, razón social). ← editar textos aquí.
  i18n.js             LANGS, pathFor(), matchRoute(), alternatePath(), albumCards().
  seo.js              buildHead(): title/description/canonical/hreflang/OG/
                      JSON-LD por página; sitemapXml(); robotsTxt().
  images.js           WIDTHS/FORMATS permitidos + imgUrl()/srcSet().
  pages/              Home, Projects, Album, Privacy, NotFound.
  components/         SiteHeader (+MobileMenu, LangSwitch), SiteFooter,
                      ResponsiveImage (<picture> AVIF/WebP/JPEG), Lightbox,
                      ContactForm, HeadManager, Brand (Monogram).
  hooks.js            useReveal, usePageMotion, ScrollManager, useFocusTrap,
                      useScrollLock, useScrolledPast.
  admin/              Panel local de álbumes (api.js ↔ vite-plugin-admin.mjs).
  albums.generated.js AUTO-GENERADO por `npm run sync`. NO editar a mano.
public/
  assets/             Fotos globales (hero, image breaks). Originales 4032px:
                      nunca se sirven directo, siempre vía /_img/.
  albums/<slug>/      1 carpeta = 1 proyecto + _meta.json opcional (title,
                      type, location, description, hero, imageOrder, captions,
                      alts, featured, order). Ver public/albums/README.md.
scripts/              prerender, sync-albums, new-album, optimize-images,
                      vite-plugin-admin (dev, con token), vite-plugin-images (dev).
```

## Convenciones y trampas (LEER antes de tocar)

- **Parallax = SOLO CSS scroll-driven animations** (`animation-timeline:
  scroll()/view()` en styles.css, bloque "Parallax"). NO reintroducir parallax
  con JS (`useScroll`/`useTransform`/listeners de scroll): janquea en móvil.
  El hover-zoom usa la propiedad `scale` (no `transform`) para no pelear con el
  `translate` del parallax. Las capas tienen overscan (inset negativo).
- **Entrada del hero = CSS** (`.hero-in` + `--d`), no framer-motion: así el
  titular pre-renderizado pinta sin esperar JS (LCP). Mismo patrón `.page-in`.
- **Reveal on scroll** (`[data-reveal]`) solo oculta contenido bajo `html.js`
  y `prefers-reduced-motion: no-preference`: sin JS la página se ve completa.
  Nada arriba del pliegue debe llevar `data-reveal`.
- **Imágenes**: siempre `<ResponsiveImage src="/albums/…">`, nunca
  `background-image` ni `<img src>` directo a originales. `priority` solo en la
  imagen principal (hero). Tamaños permitidos en `src/images.js` (el servidor
  rechaza otros).
- **Textos**: nada de strings sueltos en JSX; van en `content/site.json` en
  ambos idiomas (misma forma en `es` y `en`).
- **Nuevas páginas**: agregar a `PAGES`/`pathFor`/`matchRoute`/`allPaths` en
  i18n.js, a las rutas de App.jsx y a `buildHead` en seo.js; el pre-render y el
  sitemap las toman de `allPaths()`. El pre-render falla si falta title,
  description, canonical o h1.
- **Admin local**: solo en dev (`import.meta.env.DEV` + plugin `apply:'serve'`),
  exige el token impreso por `npm run dev` (header `x-admin-token`). Al guardar
  reescribe `_meta.json` completo → si agregas un campo al meta, agrégalo a
  `toDraft`/`draftToMeta` en Admin.jsx o se borrará al guardar.
- **Formulario de contacto**: FormSubmit AJAX, con honeypot.
- No editar `albums.generated.js`.
- `public/CNAME` solo servía a GitHub Pages; se puede borrar tras mover el DNS
  a Railway.

## Despliegue / sitio caído

Railway: *Deployments* (logs) y `/healthz`. DNS en Porkbun: ALIAS en la raíz +
CNAME `www` + TXT de verificación de Railway (ver README → "Cómo se publica").
