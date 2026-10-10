import { useEffect, useState } from 'react'
import { api } from './api'

/** "public/albums/acapulco/03-a1b2c3.jpeg" → readable line for the change list. */
function describe(path, deleted) {
  if (path === 'src/content/site.json') return 'Textos del sitio'
  const [, , slug, file] = path.split('/')
  if (file === '_meta.json') return deleted ? `Proyecto «${slug}» borrado` : `Datos de «${slug}»`
  return deleted ? `Foto borrada en «${slug}»` : `Foto nueva en «${slug}»`
}

function summarize({ written, deleted }) {
  const counts = new Map()
  for (const p of written) { const k = describe(p, false); counts.set(k, (counts.get(k) || 0) + 1) }
  for (const p of deleted) { const k = describe(p, true); counts.set(k, (counts.get(k) || 0) + 1) }
  return [...counts].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k))
}

const POLL_MS = 8000

/**
 * Sticky bar: how many edits are unpublished, and the Publicar flow. After
 * publishing it polls /status until the server reports the new commit is the
 * running deployment (Railway rebuilds in ~2 minutes).
 */
export default function PublishBar({ content, run, reload, notify }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const { changes, publishing, canPublish, mode } = content
  const pending = changes.written.length + changes.deleted.length

  useEffect(() => {
    if (!publishing) return
    const started = Date.parse(publishing.at)
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    const poll = setInterval(async () => {
      try {
        const st = await api.status()
        if (!st.publishing) {
          clearInterval(poll)
          notify('¡Publicado! Los cambios ya están en línea.')
          reload()
        }
      } catch { /* the server restarts during the deploy — keep waiting */ }
    }, POLL_MS)
    return () => { clearInterval(tick); clearInterval(poll) }
  }, [publishing, notify, reload])

  if (mode === 'dev') {
    return (
      <div className="adm-bar is-dev">
        Modo local: los cambios se guardan directo en los archivos del proyecto. Publica con <code>git push</code>.
      </div>
    )
  }

  if (publishing) {
    const min = Math.floor(elapsed / 60)
    const sec = String(elapsed % 60).padStart(2, '0')
    return (
      <div className="adm-bar is-busy" role="status">
        <span className="adm-spinner" aria-hidden="true" />
        <span>Publicando… el sitio se actualiza en unos 2 minutos <span className="adm-muted">({min}:{sec})</span></span>
        {elapsed > 600 && (
          <button className="adm-btn" onClick={() => run(api.unlock, 'Desbloqueado')}>¿Tarda demasiado? Desbloquear</button>
        )}
      </div>
    )
  }

  if (!pending) return <div className="adm-bar is-ok">Todo publicado ✓</div>

  const publish = async () => {
    setBusy(true)
    try {
      await run(() => api.publish(note))
      setOpen(false)
      setNote('')
    } catch { /* toast already shown */ }
    setBusy(false)
  }

  const discard = async () => {
    if (!confirm(`¿Descartar ${pending} cambio(s) sin publicar? No se puede deshacer.`)) return
    await run(api.discard, 'Cambios descartados').catch(() => {})
  }

  return (
    <div className="adm-bar is-pending">
      <div className="adm-bar-row">
        <button className="adm-bar-count" onClick={() => setOpen(!open)} aria-expanded={open}>
          <b>{pending}</b> <span className="adm-wide-only">{pending === 1 ? 'cambio' : 'cambios'}</span> sin publicar{' '}
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
        <div className="adm-bar-actions">
          <button className="adm-btn" onClick={discard} disabled={busy}>Descartar</button>
          <button className="adm-btn adm-btn-primary" onClick={() => setOpen(true)} disabled={busy || !canPublish}>Publicar</button>
        </div>
      </div>
      {!canPublish && (
        <p className="adm-msg err">Publicar aún no está activo: falta <code>GITHUB_TOKEN</code> en las variables de Railway.</p>
      )}
      {open && (
        <div className="adm-bar-panel">
          <ul>{summarize(changes).map((line) => <li key={line}>{line}</li>)}</ul>
          {canPublish && (
            <>
              <label className="adm-f">
                <span>Nota (opcional)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. fotos nuevas de Acapulco" maxLength={200} />
              </label>
              <button className="adm-btn adm-btn-primary" onClick={publish} disabled={busy}>
                {busy ? 'Publicando…' : 'Publicar ahora'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
