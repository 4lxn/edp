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
| `npm run dev` | Vite con HMR → http://localhost:5173 (sin pre-render; imprime link y contraseña del admin) |
| `npm run build` | sync → bundle cliente (`dist/client`) → admin (`--mode admin` → `dist/client/admin/`) → bundle SSR (`dist/server`) → `scripts/prerender.mjs` |
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
admin/index.html      Página del panel /admin (build aparte: `vite build --mode admin`).
server/
  index.mjs           Producción: sirv (br/gz precomprimidos, cache headers),
                      redirects (www, http, slash final, index.html), 404 real,
                      /healthz, warm-up de imágenes (dist/img-warm.json).
  images.mjs          /_img/<ancho|og>/<avif|webp|jpeg>/<ruta en public>:
                      sharp bajo demanda + caché en disco (volumen de Railway
                      vía RAILWAY_VOLUME_MOUNT_PATH o IMG_CACHE_DIR).
  admin-api.mjs       /admin/api/*: sesión, álbumes, fotos, textos, publicar.
  content-store.mjs   DirectStore (dev: archivos del repo) / OverlayStore (prod:
                      pendientes en <volumen>/admin/pending encima del checkout).
  albums.mjs          Operaciones + validación: _meta.json, fotos (sharp), site.json.
  github.mjs          Publicar = 1 commit vía Git Data API (blobs→tree→commit→ref).
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
  admin/              Panel /admin: Admin (shell) · AlbumsView · TextsEditor ·
                      PublishBar · ui (Pair) · api.js (cliente de /admin/api).
  albums.generated.js AUTO-GENERADO por `npm run sync`. NO editar a mano.
public/
  assets/             Fotos globales (hero, image breaks). Originales 4032px:
                      nunca se sirven directo, siempre vía /_img/.
  albums/<slug>/      1 carpeta = 1 proyecto + _meta.json opcional (title,
                      type, location, description, hero, imageOrder, captions,
                      alts, featured, order). Ver public/albums/README.md.
scripts/              prerender, sync-albums, new-album, optimize-images,
                      vite-plugin-admin (dev: misma API sobre el repo),
                      vite-plugin-images (dev).
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
- **Admin (`/admin`)**: página aparte (admin/index.html, build `--mode admin`),
  nunca entra al bundle del sitio. Misma API (server/admin-api.mjs) en prod
  (OverlayStore en el volumen; Publicar = commit a la rama del deploy) y en dev
  (vite-plugin-admin, DirectStore sobre el repo). Auth: `ADMIN_PASSWORD` →
  cookie HMAC HttpOnly/SameSite=Strict de 30 días; todo POST/PUT/DELETE exige
  el header `x-edp-admin: 1`; login con rate limit.
- `saveAlbum` reescribe `_meta.json` solo con los campos conocidos → si agregas
  un campo al meta, agrégalo a `saveAlbum` (server/albums.mjs) y a `toDraft`
  (src/admin/AlbumsView.jsx) o se borrará al guardar.
- `saveSite` exige la forma actual de site.json (claves, tipos, largo de listas);
  el editor de Textos recorre esa forma solo, así que textos nuevos aparecen
  solos (etiquetas en `SECTIONS`/`PATH_LABELS` de TextsEditor.jsx).
- El admin hace **commits directos** a la rama que despliega Railway → `git pull
  --rebase` antes de hacer push. Los cambios corren uno a la vez (cola en
  admin-api) y ninguno mientras se publica. Publicar va en segundo plano:
  `publishing.phase` = `committing` (GitHub) → `deploying` (Railway); un error
  queda en `lastError` y desbloquea. Si la rama cambió un JSON desde que se
  empezó a editar (`origins.json`), se combina con `server/merge.mjs` (gana el
  admin solo donde ambos tocaron lo mismo). Al arrancar, `prune()` quita lo que
  el checkout ya tiene; nada más se borra.
- Lo que el admin guarda no puede romper el build: `albums.mjs` rechaza textos
  vacíos que antes tenían algo y las palabras que el pre-render toma como bug
  (`undefined`, `NaN`, `[object Object]`). Prueba de punta a punta (sin tocar el
  repo): se hizo con copias temporales y un mock de la API de GitHub.
- **Formulario de contacto**: FormSubmit AJAX, con honeypot.
- No editar `albums.generated.js`.
- `public/CNAME` solo servía a GitHub Pages; se puede borrar tras mover el DNS
  a Railway.

## Despliegue / sitio caído

Railway: *Deployments* (logs) y `/healthz`. DNS en Porkbun: ALIAS en la raíz +
CNAME `www` + TXT de verificación de Railway (ver README → "Cómo se publica").
Variables del panel: `ADMIN_PASSWORD` (activa /admin) y `GITHUB_TOKEN`
(fine-grained, solo este repo, Contents read/write; sin él no publica). Las pone
el dueño en Railway → Variables; nunca en el repo ni en el chat.

**CDN de Railway (activado):** cachea en el edge `/_app/*`, `/_img/*`, fotos e
iconos según su `Cache-Control`; el HTML no se cachea (`max-age=0`). Cada deploy
purga solo HTML → si reemplazas una foto **con el mismo nombre de archivo**,
corre `railway cdn purge all` (CLI ya instalada y enlazada en WSL:
`railway cdn status`).
