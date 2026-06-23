# Estructuras del Pacífico

Sitio web del taller de arquitectura tropical en madera **Estructuras del
Pacífico**. Landing page editorial + galería de proyectos (álbumes de fotos),
bilingüe (ES/EN).

🌐 **En vivo:** https://estructurasdelpacifico.com

---

## ¿Qué es esto?

Una página estática hecha con **Vite + React**. Tiene dos vistas:

- **Inicio** (`/`) — hero, filosofía, galería de obra, materiales, proceso,
  contacto.
- **Álbum de proyecto** (`/#/album/<slug>`) — galería de fotos de un proyecto.

Se hospeda gratis en **GitHub Pages** y se publica sola cada vez que se hace
push a `main`.

## Stack

| Pieza | Qué usa |
|-------|---------|
| Build | [Vite](https://vitejs.dev) 6 |
| UI | [React](https://react.dev) 18 |
| Rutas | React Router 6 (`HashRouter`) |
| Hosting | GitHub Pages + dominio propio (`estructurasdelpacifico.com`) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

> Se usa `HashRouter` (URLs con `#`) porque GitHub Pages sirve archivos
> estáticos y no sabe enrutar rutas del lado del cliente.

## Estructura del proyecto

```
edp/
├─ index.html              # punto de entrada HTML
├─ vite.config.js          # config de Vite (base: '/')
├─ src/
│  ├─ main.jsx             # arranque de React + router (define las rutas)
│  ├─ App.jsx              # la landing page (todas sus secciones)
│  ├─ Album.jsx            # la página de un álbum de proyecto
│  ├─ copy.js              # TODO el texto del sitio (ES/EN) + datos de álbumes
│  ├─ TweaksPanel.jsx      # panel de idioma / ajustes
│  ├─ styles.css           # estilos
│  └─ albums.generated.js  # AUTO-GENERADO por `npm run sync` (no editar)
├─ public/
│  ├─ CNAME                # el dominio propio (lo lee GitHub Pages)
│  ├─ assets/              # imágenes globales (hero, separadores)
│  └─ albums/              # 📁 un proyecto por carpeta → ver su README
│     └─ <slug>/
│        ├─ *.jpeg         # las fotos del proyecto
│        └─ _meta.json     # (opcional) título, captions, etc.
├─ scripts/
│  ├─ sync-albums.mjs      # escanea public/albums/ → genera albums.generated.js
│  └─ new-album.mjs        # atajo para crear un proyecto nuevo
└─ .github/workflows/
   └─ deploy.yml           # build + deploy a GitHub Pages
```

## Desarrollo local

Necesitas [Node.js](https://nodejs.org) 18+.

**Atajo (instala todo de una):**

```bash
bash scripts/setup.sh   # instala Node si falta, deps y la lista de álbumes
npm run dev             # servidor local con recarga en caliente
```

O a mano:

```bash
npm install        # instalar dependencias (una sola vez)
npm run sync       # generar la lista de álbumes
npm run dev        # servidor local con recarga en caliente
```

Abre la URL que imprime (normalmente http://localhost:5173).

### Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo local |
| `npm run build` | Compila a `dist/` (corre `sync` automáticamente) |
| `npm run preview` | Previsualiza el build de producción |
| `npm run sync` | Regenera `src/albums.generated.js` desde `public/albums/` |
| `npm run new-album <slug> ["Título"]` | Crea la carpeta de un proyecto nuevo |

## Agregar fotos y crear álbumes

Es el flujo más común, así que tiene su propia guía:

👉 **[`public/albums/README.md`](public/albums/README.md)**

Resumen: una carpeta con fotos dentro de `public/albums/` es suficiente. Puedes
hacerlo desde el celular (subiendo a github.com) o desde la compu
(`npm run new-album`). Al hacer push, el sitio se actualiza solo.

## Cómo se publica

1. Haces cambios y push a la rama `main`.
2. GitHub Actions corre `npm run build` (que incluye `npm run sync`).
3. El resultado se sube a GitHub Pages.
4. En ~1 minuto, https://estructurasdelpacifico.com está actualizado.

No hay que correr nada a mano para publicar. El archivo `public/CNAME` mantiene
el dominio propio en cada deploy.

### Si el sitio se cae

Casi siempre es una de tres cosas, **fuera del código**:

- **DNS** — los registros A del dominio deben apuntar a GitHub Pages
  (`185.199.108–111.153`).
- **Certificado HTTPS** — tras verificar el DNS, GitHub tarda ~minutos en
  emitirlo. Hay que esperar sin tocar nada y luego activar "Enforce HTTPS" en
  *Settings → Pages*.
- **El último deploy falló** — revisa la pestaña *Actions* en GitHub.
