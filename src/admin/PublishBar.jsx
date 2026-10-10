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

const STUCK_S = 600 // the server allows unlocking after 10 minutes

/**
 * Sticky bar: how many edits are unpublished, and the Publicar flow. Publishing
 * runs on the server in two phases — sending the commit to GitHub, then Railway
 * rebuilding the site (~2 minutes) — and this bar follows it via /status.
 */
export default function PublishBar({ content, run, reload, notify, busy }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const { changes, publishing, canPublish, mode, lastError } = content
  const pending = changes.written.length + changes.deleted.length
  const phase = publishing ? publishing.phase || 'deploying' : null

  useEffect(() => {
    if (!publishing) return
    const started = Date.parse(publishing.at)
    const update = () => setElapsed(Math.max(0, Math.round((Date.now() - started) / 1000)))
    update()
    const tick = setInterval(update, 1000)
    let stopped = false
    let timer
    const every = phase === 'committing' ? 2000 : 8000
    const poll = async () => {
      try {
        const st = await api.status()
        if (stopped) return
        if (!st.publishing) {
          const failed = st.lastError && Date.parse(st.lastError.at) >= started
          notify(failed ? `No se publicó: ${st.lastError.message}` : '¡Publicado! Los cambios ya están en línea.', failed ? 'err' : 'ok')
          return reload()
        }
        if ((st.publishing.phase || 'deploying') !== phase) return reload() // GitHub done → now Railway
      } catch { /* the server restarts during the deploy — keep waiting */ }
      if (!stopped) timer = setTimeout(poll, every)
    }
    timer = setTimeout(poll, every)
    return () => { stopped = true; clearInterval(tick); clearTimeout(timer) }
  }, [publishing, phase, notify, reload])

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
        <span>
          {phase === 'committing' ? 'Enviando los cambios a GitHub…' : 'Publicando… el sitio se actualiza en unos 2 minutos'}
          {' '}<span className="adm-muted">({min}:{sec})</span>
        </span>
        {phase !== 'committing' && elapsed > STUCK_S && (
          <button className="adm-btn" onClick={() => run(api.unlock).catch(() => {})}>¿Tarda demasiado? Desbloquear</button>
        )}
      </div>
    )
  }

  if (!pending) return <div className="adm-bar is-ok">Todo publicado ✓</div>

  const publish = async () => {
    setSending(true)
    try {
      await run(() => api.publish(note))
      setOpen(false)
      setNote('')
    } catch { /* toast already shown */ }
    setSending(false)
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
          <button className="adm-btn" onClick={discard} disabled={sending || busy}>Descartar</button>
          <button className="adm-btn adm-btn-primary" onClick={() => setOpen(true)} disabled={sending || busy || !canPublish}>
            Publicar
          </button>
        </div>
      </div>
      {busy && <p className="adm-msg">Espera a que terminen de subir las fotos para publicar.</p>}
      {!canPublish && (
        <p className="adm-msg err">Publicar aún no está activo: falta <code>GITHUB_TOKEN</code> en las variables de Railway.</p>
      )}
      {lastError && <p className="adm-msg err" role="alert">La última publicación no se completó: {lastError.message}</p>}
      {open && (
        <div className="adm-bar-panel">
          <ul>{summarize(changes).map((line) => <li key={line}>{line}</li>)}</ul>
          {canPublish && (
            <>
              <label className="adm-f">
                <span>Nota (opcional)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. fotos nuevas de Acapulco" maxLength={200} />
              </label>
              <button className="adm-btn adm-btn-primary" onClick={publish} disabled={sending || busy}>
                {sending ? 'Publicando…' : 'Publicar ahora'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
