# Estructuras del Pacífico

Sitio web del taller de arquitectura tropical en madera **Estructuras del
Pacífico**. Landing page editorial + galería de proyectos (álbumes de fotos),
bilingüe (ES/EN).

🌐 **En vivo:** https://estructurasdelpacifico.com

---

## ¿Qué es esto?

Un sitio **Vite + React** que se **pre-renderiza**: cada página se genera como
HTML completo al compilar (lo que lee Google y lo que muestran WhatsApp/Facebook
al compartir un link), y luego React la hace interactiva en el navegador.

| Página | Español | English |
|--------|---------|---------|
| Inicio — hero, filosofía, obra selecta, contacto | `/` | `/en` |
| Todos los proyectos | `/proyectos` | `/en/projects` |
| Álbum de un proyecto | `/proyectos/<slug>` | `/en/projects/<slug>` |
| Aviso de privacidad | `/aviso-de-privacidad` | `/en/privacy` |

Los links viejos con `#` (`/#/album/<slug>`) redirigen solos a la URL nueva.

Se hospeda en **Railway**: un servidor Node pequeño sirve las páginas y genera
las fotos en el tamaño y formato justo (AVIF/WebP/JPEG) para cada pantalla.

## Stack

| Pieza | Qué usa |
|-------|---------|
| Build | [Vite](https://vitejs.dev) 6 (bundle de navegador + bundle SSR) |
| UI | [React](https://react.dev) 18 + framer-motion (transiciones) |
| Rutas | React Router 6 (`BrowserRouter`, URLs limpias) |
| Pre-render | `scripts/prerender.mjs` → HTML por página, sitemap, robots |
| Servidor | `server/index.mjs` (Node + [sirv](https://github.com/lukeed/sirv)) |
| Imágenes | [sharp](https://sharp.pixelplumbing.com), bajo demanda en `/_img/…` |
| Tipografía | Montserrat + Lora, servidas desde el propio sitio (Fontsource) |
| Hosting | [Railway](https://railway.com) + dominio propio |
| CI | GitHub Actions: revisa que cada push compile (`ci.yml`) |

## Estructura del proyecto

```
edp/
├─ index.html                 # plantilla HTML (el pre-render rellena <head> y contenido)
├─ admin/index.html           # página del panel /admin (build aparte del sitio)
├─ vite.config.js
├─ server/
│  ├─ index.mjs               # servidor de producción (npm start)
│  ├─ images.mjs              # /_img/<ancho>/<formato>/<foto> con caché en disco
│  ├─ admin-api.mjs           # API del panel: sesión, álbumes, fotos, textos, publicar
│  ├─ content-store.mjs       # dónde escribe el panel (repo en dev, volumen en Railway)
│  ├─ albums.mjs              # operaciones de álbumes/fotos/textos (validan todo)
│  └─ github.mjs              # "Publicar" = un commit vía la API de GitHub
├─ src/
│  ├─ entry-client.jsx        # arranque en el navegador
│  ├─ entry-server.jsx        # arranque para el pre-render
│  ├─ App.jsx                 # rutas de ambos idiomas
│  ├─ content/site.json       # ✏️ TODO el texto del sitio (ES/EN) + datos de contacto
│  ├─ i18n.js                 # idiomas y URLs
│  ├─ seo.js                  # <head> por página, sitemap, robots, schema.org
│  ├─ images.js               # tamaños de imagen permitidos
│  ├─ pages/                  # Home, Projects, Album, Privacy, NotFound
│  ├─ components/             # header, footer, menú móvil, lightbox, …
│  ├─ admin/                  # interfaz del panel /admin (proyectos, fotos, textos)
│  ├─ styles.css
│  └─ albums.generated.js     # AUTO-GENERADO por `npm run sync` (no editar)
├─ public/
│  ├─ assets/                 # fotos globales (hero, separadores)
│  └─ albums/                 # 📁 un proyecto por carpeta → ver su README
├─ scripts/
│  ├─ prerender.mjs           # último paso del build
│  ├─ sync-albums.mjs         # public/albums/ → albums.generated.js
│  ├─ new-album.mjs           # atajo para crear un proyecto nuevo
│  ├─ vite-plugin-admin.mjs   # la misma API del panel en `npm run dev`
│  └─ vite-plugin-images.mjs  # /_img/ en desarrollo
└─ .github/workflows/ci.yml   # build de prueba en cada push
```

## Desarrollo local

Necesitas [Node.js](https://nodejs.org) 24.

```bash
bash scripts/setup.sh   # instala Node si falta, deps y la lista de álbumes
npm run dev             # servidor local con recarga en caliente
```

Abre la URL que imprime (normalmente http://localhost:5173). La terminal también
imprime el link del **panel** (`/admin/`) y su contraseña (una nueva cada vez,
salvo que definas `ADMIN_PASSWORD`). En desarrollo el panel escribe directo en
los archivos del repo; se publica con `git push`.

### Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo local |
| `npm run build` | Compila y pre-renderiza todo a `dist/` (corre `sync` primero) |
| `npm start` | Sirve `dist/` como en producción (puerto 3000 o `$PORT`) |
| `npm run preview` | `build` + `start`: prueba el sitio exactamente como en Railway |
| `npm run sync` | Regenera `src/albums.generated.js` desde `public/albums/` |
| `npm run new-album <slug> ["Título"]` | Crea la carpeta de un proyecto nuevo |

### Editar textos

Todo el texto vive en **`src/content/site.json`**, un bloque `es` y otro `en`
con la misma forma. Ahí también están el correo, teléfono/WhatsApp y redes
(`business`): lo que pongas aparece en el sitio y en los datos para Google.
Lo más cómodo es editarlo desde el panel → pestaña **Textos**.

## Agregar fotos y crear álbumes

👉 **[`public/albums/README.md`](public/albums/README.md)**

Resumen: desde el **panel `/admin`** (celular o compu), o subiendo una carpeta
con fotos a `public/albums/` en github.com. No hace falta achicar las fotos: el
servidor genera cada tamaño la primera vez que se pide y lo guarda.

## Panel de administración (`/admin`)

https://estructurasdelpacifico.com/admin — con contraseña, desde cualquier
dispositivo:

- **Proyectos**: crear y borrar proyectos; subir fotos (se optimizan solas),
  ordenarlas, elegir la portada, pies de foto y descripciones para Google (ES/EN);
  tipo, ubicación, descripción, orden y "destacado en el inicio".
- **Textos**: todos los textos del sitio en español e inglés, los títulos y
  descripciones para Google y los datos del negocio (correo, teléfono,
  WhatsApp, redes, datos del aviso de privacidad).

Cómo funciona: **Guardar** deja el cambio "sin publicar" (guardado en el volumen
de Railway; el sitio no cambia todavía). **Publicar** junta todo lo pendiente en
**un commit** a la rama que despliega Railway; Railway recompila y en ~2 minutos
el sitio está actualizado (el panel avisa cuando termina). Así el repo sigue
siendo la única fuente de verdad y cada cambio queda en el historial de git.

> El panel hace commits a la rama del deploy: antes de hacer push de código,
> haz `git pull --rebase`.

**Activarlo** (Railway → servicio → *Variables*):

| Variable | Valor |
|----------|-------|
| `ADMIN_PASSWORD` | La contraseña del panel (larga; un gestor de contraseñas ayuda) |
| `GITHUB_TOKEN` | Token *fine-grained* de GitHub, solo este repo, permiso **Contents: Read and write** |

Sin `GITHUB_TOKEN` el panel funciona pero no puede publicar. La sesión dura 30
días; tras varios intentos fallidos el login se bloquea 15 minutos.

## Cómo se publica (Railway)

1. Haces cambios y push a la rama `main`.
2. GitHub Actions compila para verificar que nada esté roto.
3. Railway detecta el push, corre `npm run build` y arranca `npm start`.
4. En 1–2 minutos, https://estructurasdelpacifico.com está actualizado.

### Configuración del servicio en Railway (una sola vez)

1. **New Project → Deploy from GitHub repo** → este repo, rama `main`.
   Railway detecta Node solo (Railpack): `npm run build` y `npm start`.
   Por si acaso, en *Settings* deja **Start Command** = `npm start`.
2. **Volume** (necesario para el panel): créalo, conéctalo al servicio y
   móntalo en `/data`. Ahí se guardan las fotos ya optimizadas entre deploys y
   los cambios del panel aún sin publicar.
3. **Settings → Healthcheck Path**: `/healthz`.
4. **Settings → Edge → CDN**: actívalo (gratis) para servir fotos y archivos
   desde la red de Railway (o con la CLI: `railway cdn enable`). Cada deploy
   limpia solo el HTML cacheado; si reemplazas una foto conservando el mismo
   nombre de archivo, limpia todo con `railway cdn purge all`.
5. **Networking → Custom Domain**: agrega `estructurasdelpacifico.com` y
   `www.estructurasdelpacifico.com`. Railway te da los valores para el DNS.

### DNS (Porkbun)

Railway pide, para cada dominio, un registro **CNAME/ALIAS** y un **TXT** de
verificación (los dos son obligatorios).

- `www` → registro **CNAME** con el valor que da Railway.
- Dominio raíz (`@`) → registro **ALIAS** con el valor que da Railway.
- Los **TXT** tal cual los muestra Railway.
- Borra los registros **A** viejos de GitHub Pages (`185.199.108–111.153`)
  cuando el dominio ya verifique en Railway.

Sugerencia: prueba primero con el dominio `*.up.railway.app` que da Railway o
con un subdominio (ej. `nuevo.estructurasdelpacifico.com`) antes de mover el
dominio principal; así el sitio actual nunca se cae.

### Variables de entorno

| Variable | Para qué |
|----------|----------|
| `ADMIN_PASSWORD` | Activa el panel `/admin` (ver arriba) |
| `GITHUB_TOKEN` | Permite al panel publicar (ver arriba) |
| `GITHUB_REPO`, `GITHUB_BRANCH` | Solo si el panel debe publicar a otro repo/rama (por defecto, los del deploy) |
| `PORT` | La pone Railway sola |
| `IMG_CACHE_DIR` | Carpeta de fotos optimizadas (por defecto `<volumen>/img-cache`) |
| `IMG_WARM=0` | No pre-generar fotos al arrancar |

### Si el sitio se cae

- **DNS** — el ALIAS/CNAME y el TXT deben coincidir con lo que muestra Railway
  (*Networking → Custom Domain*).
- **El último deploy falló** — revisa *Deployments* en Railway (logs del build)
  y la pestaña *Actions* en GitHub.
- **Estado del servidor** — https://estructurasdelpacifico.com/healthz debe
  responder `ok`.
