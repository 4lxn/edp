# KB — Estructuras del Pacífico

Cheat-sheet para no re-explorar el repo cada sesión. Si algo aquí ya no
coincide con el código, **gana el código** (y actualiza este archivo).

## Qué es

Landing editorial + galería de proyectos para un taller de arquitectura
tropical en madera. Bilingüe ES/EN. Sitio **estático** Vite + React, hosteado
en **GitHub Pages** con dominio propio (`public/CNAME` →
estructurasdelpacifico.com). Push a `main` → GitHub Actions hace
`npm run build` y publica solo (~1 min).

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm install` | Instalar deps (una vez) |
| `npm run dev` | Servidor local con HMR → http://localhost:5173 |
| `npm run sync` | Regenera `src/albums.generated.js` desde `public/albums/` |
| `npm run new-album <slug> ["Título"]` | Crea carpeta de proyecto nuevo |
| `npm run optimize` | Reduce las imágenes (≤2400px) |
| `npm run build` | Build a `dist/` (corre `sync` primero) |

**Agregar fotos localmente:** lo más fácil es `npm run dev` y abrir
**http://localhost:5173/#/admin** (panel solo-dev): crear álbumes, subir fotos
arrastrando — se optimizan solas —, captions, orden, portada, destacados. O a
mano: mete `.jpeg` en `public/albums/<slug>/`, corre `npm run sync`, y
`git push` para publicar.

## Mapa de archivos

```
src/
  main.jsx            Arranque React + HashRouter. Rutas: / , /proyectos,
                      /album/:slug , /admin (este último SOLO en dev).
                      Usa LazyMotion → en JSX se usa <m.div>, NO <motion.div>.
  App.jsx             Landing entera (Hero, Statement, Gallery, ImageBreak,
                      Contact, Footer) + TweaksPanel (idioma/ajustes).
  Album.jsx           Página de un álbum (/album/:slug) + lightbox.
  Projects.jsx        Índice de todos los proyectos.
  copy.js             TODO el texto ES/EN (export COPY). Deriva PROJECT_ALBUMS
                      y GALLERY desde albums.generated.js. ← editar textos aquí.
  albums.generated.js AUTO-GENERADO por `npm run sync`. NO editar a mano.
  styles.css          Todos los estilos.
  hooks.js            useScrolledPast, useReveal, usePageMotion.
  admin/              Panel local (api.js habla con vite-plugin-admin.mjs).
public/
  assets/             Imágenes globales del sitio (hero, image breaks). Solo 3.
  albums/<slug>/      1 carpeta = 1 proyecto. _meta.json opcional (título,
                      type, location ES/EN, hero, imageOrder, captions,
                      featured, order). Ver public/albums/README.md.
scripts/              sync-albums, new-album, optimize-images, vite-plugin-admin.
```

## Convenciones y trampas (LEER antes de tocar)

- **Parallax = SOLO CSS scroll-driven animations** (`animation-timeline:
  scroll()/view()` en styles.css, bloque "Parallax"). NO reintroducir parallax
  con JS (`useScroll`/`useTransform`/listeners de scroll): janquea en móvil
  porque los navegadores móviles no emiten scroll por-frame durante el scroll
  inercial → la imagen salta. El CSS corre en el compositor y sí va fluido en
  móvil; degrada a imagen estática donde no haya soporte (`@supports`).
  El hover-zoom de la galería usa la propiedad `scale` (no `transform`) para
  no pelear con el `translate` del parallax. Las capas tienen overscan
  (inset negativo) para cubrir siempre.
- **HashRouter** (URLs con `#`) porque GitHub Pages no enruta SPA. `base: '/'`.
- **Admin** existe solo en dev (`import.meta.env.DEV` + plugin `apply:'serve'`).
  Nunca entra al build de producción.
- **Formulario de contacto**: FormSubmit AJAX (sin backend), con honeypot.
- No editar `albums.generated.js` ni borrar `public/CNAME`.
- Reduce-motion respetado: animaciones bajo `@media (prefers-reduced-motion:
  no-preference)`.

## Despliegue / sitio caído

Casi siempre es DNS (A records → 185.199.108–111.153), el cert HTTPS tardando
unos minutos, o un deploy fallido (pestaña Actions). No es el código.
