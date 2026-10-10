import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { Monogram } from '../components/Brand'
import Login from './Login'
import PublishBar from './PublishBar'
import AlbumsView from './AlbumsView'
import TextsEditor from './TextsEditor'

/**
 * Admin panel (/admin). Same UI online (Railway) and in `npm run dev`:
 * online, edits stay "sin publicar" until Publicar commits them to GitHub;
 * locally they're written straight into the repo files.
 */
export default function Admin() {
  const [session, setSession] = useState(null) // { authenticated, configured, mode }
  const [content, setContent] = useState(null)
  const [tab, setTab] = useState('albums')
  const [busy, setBusy] = useState(false) // photos uploading
  const [toast, setToast] = useState(null)
  const [fatal, setFatal] = useState('')

  const notify = useCallback((text, kind = 'ok') => setToast({ text, kind, id: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.kind === 'err' ? 7000 : 3500)
    return () => clearTimeout(t)
  }, [toast])

  const signedOut = useCallback(() => setSession((s) => ({ ...s, authenticated: false })), [])

  const load = useCallback(async () => {
    try { setContent(await api.content()) } catch (e) {
      if (e.status === 401) signedOut()
      else setFatal(e.message)
    }
  }, [signedOut])

  useEffect(() => {
    api.session()
      .then((s) => { setSession(s); if (s.authenticated) load() })
      .catch((e) => setFatal(e.message))
  }, [load])

  /** Runs an API call; a returned snapshot replaces the content. */
  const run = useCallback(async (fn, okText) => {
    try {
      const data = await fn()
      if (data?.albums) setContent(data)
      if (okText) notify(okText)
      return data
    } catch (e) {
      if (e.status === 401) signedOut()
      else notify(e.message, 'err')
      throw e
    }
  }, [notify, signedOut])

  const logout = async () => {
    await api.logout().catch(() => {})
    setContent(null)
    signedOut()
  }

  if (fatal) return <Screen><p className="adm-msg err">{fatal}</p><button className="adm-btn" onClick={() => location.reload()}>Reintentar</button></Screen>
  if (!session) return <Screen><p className="adm-msg">Cargando…</p></Screen>
  if (!session.configured) {
    return (
      <Screen>
        <h1>Panel no activado</h1>
        <p className="adm-msg">
          En Railway → servicio <b>web</b> → <b>Variables</b>, crea <code>ADMIN_PASSWORD</code> con tu
          contraseña. El sitio se vuelve a desplegar solo y el panel queda activo.
        </p>
      </Screen>
    )
  }
  const signIn = () => { setSession((s) => ({ ...s, authenticated: true })); if (!content) load() }
  if (!content && !session.authenticated) return <Login onLogin={signIn} />
  if (!content) return <Screen><p className="adm-msg">Cargando contenido…</p></Screen>

  const locked = !!content.publishing

  return (
    <div className="adm">
      <header className="adm-top">
        <a className="adm-brand" href="/" target="_blank" rel="noreferrer" title="Ver el sitio">
          <Monogram size={22} color="#B39B78" />
          <span>Admin</span>
        </a>
        <nav className="adm-tabs" aria-label="Secciones">
          <button className={tab === 'albums' ? 'is-on' : ''} aria-pressed={tab === 'albums'} onClick={() => setTab('albums')}>Proyectos</button>
          <button className={tab === 'texts' ? 'is-on' : ''} aria-pressed={tab === 'texts'} onClick={() => setTab('texts')}>Textos</button>
        </nav>
        <div className="adm-top-r">
          <a className="adm-link" href="/" target="_blank" rel="noreferrer">Ver sitio ↗</a>
          <button className="adm-link" onClick={logout}>Salir</button>
        </div>
      </header>

      <PublishBar content={content} run={run} reload={load} notify={notify} busy={busy} />

      {/* Both stay mounted so switching tabs keeps unsaved edits. */}
      <main className="adm-main">
        <div hidden={tab !== 'albums'}>
          <AlbumsView content={content} run={run} notify={notify} locked={locked} onBusyChange={setBusy} />
        </div>
        <div hidden={tab !== 'texts'}>
          <TextsEditor site={content.site} run={run} locked={locked} mode={content.mode} />
        </div>
      </main>

      {/* An expired session asks for the password over the page, so unsaved edits survive. */}
      {!session.authenticated && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="Volver a entrar">
          <Login onLogin={signIn} expired />
        </div>
      )}

      {toast && <div key={toast.id} className={`adm-toast is-${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  )
}

function Screen({ children }) {
  return (
    <div className="adm-screen">
      <div className="adm-box">
        <Monogram size={40} color="#B39B78" />
        {children}
      </div>
    </div>
  )
}
