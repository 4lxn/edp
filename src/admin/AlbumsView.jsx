import { useEffect, useRef, useState } from 'react'
import { api, slugify } from './api'
import { Pair, useUnsavedWarning } from './ui'

const pair = (v) => (typeof v === 'string' ? { es: v, en: v } : { es: v?.es || '', en: v?.en || '' })

function toDraft(al) {
  return {
    title: al.title || '',
    type: pair(al.type),
    location: pair(al.location),
    description: pair(al.description),
    order: al.order ?? 999,
    featured: !!al.featured,
    hero: al.hero || '',
    imageOrder: Array.isArray(al.imageOrder) ? al.imageOrder : [],
    captions: al.captions || {},
    alts: al.alts || {},
  }
}

/** Files in display order: the saved order first, then any others alphabetically. */
function ordered(files, imageOrder) {
  const first = imageOrder.filter((f) => files.includes(f))
  return [...first, ...files.filter((f) => !first.includes(f)).sort()]
}

const pendingIn = (changes, slug) =>
  [...changes.written, ...changes.deleted].some((p) => p.startsWith(`public/albums/${slug}/`))

const DISCARD = 'Tienes cambios sin guardar en este proyecto. ¿Descartarlos?'

export default function AlbumsView({ content, run, notify, locked }) {
  const [selected, setSelected] = useState(null)
  const [dirty, setDirty] = useState(false)
  const album = content.albums.find((a) => a.slug === selected)
  // Online, saved edits wait for "Publicar"; locally they're already in the files.
  const later = content.mode === 'prod' ? ' · falta publicar' : ''

  useEffect(() => {
    if (selected && !album) setSelected(null) // deleted
  }, [selected, album])

  const select = (slug) => {
    if (slug === selected || (dirty && !confirm(DISCARD))) return
    setDirty(false)
    setSelected(slug)
  }

  return (
    <div className={'adm-albums' + (album ? ' has-editor' : '')}>
      <aside className="adm-list" aria-label="Proyectos">
        <NewAlbum run={run} locked={locked} onCreated={select} />
        <ul>
          {content.albums.map((a) => (
            <li key={a.slug}>
              <button
                className={'adm-item' + (a.slug === selected ? ' is-sel' : '')}
                onClick={() => select(a.slug)}
                aria-current={a.slug === selected || undefined}
              >
                {a.hero
                  ? <img src={api.thumb(a.slug, a.hero, 240)} alt="" loading="lazy" />
                  : <span className="adm-item-ph" aria-hidden="true" />}
                <span className="adm-item-txt">
                  <span className="adm-item-t">{a.title || a.slug}</span>
                  <span className="adm-item-m">
                    {a.files.length} {a.files.length === 1 ? 'foto' : 'fotos'}
                    {a.featured && ' · ★ inicio'}
                    {pendingIn(content.changes, a.slug) && <em> · sin publicar</em>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {album
        ? (
          <AlbumEditor
            key={album.slug}
            album={album}
            run={run}
            notify={notify}
            locked={locked}
            later={later}
            onDirtyChange={setDirty}
            onBack={() => select(null)}
          />
        )
        : <div className="adm-empty adm-pick">Elige un proyecto para editar sus fotos y datos, o crea uno nuevo.</div>}
    </div>
  )
}

function NewAlbum({ run, locked, onCreated }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const slug = slugify(title)

  const create = async (e) => {
    e.preventDefault()
    try {
      await run(() => api.createAlbum(slug, title.trim()), 'Proyecto creado')
      setOpen(false)
      setTitle('')
      onCreated(slug)
    } catch { /* toast shown */ }
  }

  if (!open) {
    return <button className="adm-btn adm-new" onClick={() => setOpen(true)} disabled={locked}>+ Nuevo proyecto</button>
  }
  return (
    <form className="adm-newform" onSubmit={create}>
      <label className="adm-f">
        <span>Nombre del proyecto</span>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Casa Luna" maxLength={120} />
      </label>
      {slug && <p className="adm-muted">Dirección: /proyectos/{slug}</p>}
      <div className="adm-row">
        <button type="button" className="adm-btn" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="adm-btn adm-btn-primary" disabled={!slug || locked}>Crear</button>
      </div>
    </form>
  )
}

function AlbumEditor({ album, run, notify, locked, later, onDirtyChange, onBack }) {
  const [draft, setDraft] = useState(() => toDraft(album))
  const [dirty, setDirty] = useState(false)
  const [uploads, setUploads] = useState([])
  const [over, setOver] = useState(false)
  const fileInput = useRef(null)
  const uploading = uploads.some((u) => !u.done)
  const disabled = locked || uploading

  useUnsavedWarning(dirty)
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  // A fresh snapshot (after an upload or a deleted photo) refreshes the form
  // unless it holds unsaved edits.
  useEffect(() => { if (!dirty) setDraft(toDraft(album)) }, [album]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (edits) => { setDraft((d) => ({ ...d, ...edits })); setDirty(true) }
  const setPair = (field, lang, value) => patch({ [field]: { ...draft[field], [lang]: value } })
  const setPhotoText = (field, file, lang, value) => {
    const cur = draft[field][file] || { es: '', en: '' }
    patch({ [field]: { ...draft[field], [file]: { ...cur, [lang]: value } } })
  }

  const files = ordered(album.files, draft.imageOrder)
  const hero = files.includes(draft.hero) ? draft.hero : files[0]

  const save = async () => {
    const data = await run(() => api.saveAlbum(album.slug, { ...draft, imageOrder: files }), 'Guardado' + later)
    const fresh = data.albums?.find((a) => a.slug === album.slug)
    if (fresh) setDraft(toDraft(fresh))
    setDirty(false)
  }
  const saveIfDirty = async () => { if (dirty) await save() }

  const move = (file, dir) => {
    const next = [...files]
    const i = next.indexOf(file)
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    patch({ imageOrder: next })
  }

  const removePhoto = async (file) => {
    if (!confirm('¿Borrar esta foto del proyecto?')) return
    try {
      await saveIfDirty()
      await run(() => api.deletePhoto(album.slug, file), 'Foto borrada' + later)
    } catch { /* toast shown */ }
  }

  const upload = async (list) => {
    const picked = [...list].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))
    if (!picked.length) return
    try { await saveIfDirty() } catch { return }
    const entries = picked.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, progress: 0, done: false, error: '' }))
    setUploads((u) => [...u.filter((x) => x.error), ...entries])
    let ok = 0
    for (let i = 0; i < picked.length; i++) {
      const { id } = entries[i]
      const update = (edits) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, ...edits } : x)))
      try {
        await run(() => api.uploadPhoto(album.slug, picked[i], (p) => update({ progress: p })))
        update({ progress: 1, done: true })
        ok++
      } catch (err) {
        update({ done: true, error: err.message })
      }
    }
    setUploads((u) => u.filter((x) => x.error)) // only failures stay listed
    if (ok) notify(`${ok} ${ok === 1 ? 'foto subida' : 'fotos subidas'}${later}`)
  }

  const removeAlbum = async () => {
    const n = album.files.length
    if (!confirm(`¿Borrar el proyecto «${draft.title || album.slug}» y sus ${n} fotos?`)) return
    try {
      await run(() => api.deleteAlbum(album.slug), 'Proyecto borrado' + later)
      onDirtyChange(false)
      onBack()
    } catch { /* toast shown */ }
  }

  return (
    <section className="adm-editor" aria-label={`Editar ${draft.title || album.slug}`}>
      <div className="adm-editor-head">
        <button className="adm-back" onClick={onBack} aria-label="Volver a la lista de proyectos">←</button>
        <h2>{draft.title || album.slug}</h2>
        <a className="adm-link" href={`/proyectos/${album.slug}`} target="_blank" rel="noreferrer">Ver en el sitio ↗</a>
      </div>
      {locked && <p className="adm-msg">Publicando… podrás editar en cuanto termine.</p>}

      <fieldset className="adm-fields" disabled={disabled}>
        <legend className="sr-only">Datos del proyecto</legend>
        <label className="adm-f adm-wide">
          <span>Nombre</span>
          <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} maxLength={120} />
        </label>
        <Pair label="Tipo de obra" value={draft.type} onChange={(l, v) => setPair('type', l, v)} placeholder="Ej. Palapa de playa" />
        <Pair label="Ubicación" value={draft.location} onChange={(l, v) => setPair('location', l, v)} placeholder="Ej. Zihuatanejo, Gro. · MX" />
        <Pair
          label="Descripción"
          hint="Aparece en la página del proyecto y en Google. Dos o tres frases."
          value={draft.description}
          onChange={(l, v) => setPair('description', l, v)}
          long
        />
        <label className="adm-f">
          <span>Orden en la lista</span>
          <input type="number" inputMode="numeric" value={draft.order} onChange={(e) => patch({ order: e.target.value })} />
        </label>
        <label className="adm-check">
          <input type="checkbox" checked={draft.featured} onChange={(e) => patch({ featured: e.target.checked })} />
          <span>Destacado en el inicio</span>
        </label>
      </fieldset>

      <div className="adm-photos-head">
        <h3>Fotos <span className="adm-muted">({files.length})</span></h3>
        <button className="adm-btn adm-btn-primary" onClick={() => fileInput.current?.click()} disabled={disabled}>
          + Subir fotos
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { upload(e.target.files); e.target.value = '' }}
        />
      </div>

      <div
        className={'adm-drop' + (over ? ' is-over' : '')}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) upload(e.dataTransfer.files) }}
      >
        Arrastra fotos aquí o usa «Subir fotos». Se optimizan solas (JPG o PNG).
      </div>

      {uploads.length > 0 && (
        <ul className="adm-uploads" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className={u.error ? 'is-err' : ''}>
              <span className="adm-up-name">{u.name}</span>
              {u.error
                ? <span>{u.error}</span>
                : <progress max="1" value={u.done ? 1 : u.progress} aria-label={`Subiendo ${u.name}`} />}
            </li>
          ))}
        </ul>
      )}

      <ol className="adm-grid">
        {files.map((file, i) => {
          const cap = draft.captions[file] || { es: '', en: '' }
          const alt = draft.alts[file] || { es: '', en: '' }
          return (
            <li key={file} className={'adm-card' + (file === hero ? ' is-hero' : '')}>
              <div className="adm-thumb">
                <img src={api.thumb(album.slug, file, 480)} alt={alt.es || cap.es || `Foto ${i + 1}`} loading="lazy" />
                {file === hero && <span className="adm-herotag">Portada</span>}
                <span className="adm-num">{i + 1}</span>
              </div>
              <div className="adm-card-tools">
                <button onClick={() => move(file, -1)} disabled={disabled || i === 0} aria-label={`Mover la foto ${i + 1} antes`}>↑</button>
                <button onClick={() => move(file, 1)} disabled={disabled || i === files.length - 1} aria-label={`Mover la foto ${i + 1} después`}>↓</button>
                <button onClick={() => patch({ hero: file })} disabled={disabled || file === hero} aria-label={`Usar la foto ${i + 1} como portada`}>★</button>
                <button className="adm-x" onClick={() => removePhoto(file)} disabled={disabled} aria-label={`Borrar la foto ${i + 1}`}>✕</button>
              </div>
              <fieldset className="adm-card-body" disabled={disabled}>
                <legend className="sr-only">Textos de la foto {i + 1}</legend>
                <Pair label="Pie de foto" value={cap} onChange={(l, v) => setPhotoText('captions', file, l, v)} compact />
                <details>
                  <summary>Descripción para Google</summary>
                  <Pair
                    label="Qué se ve en la foto"
                    hint="La leen Google y los lectores de pantalla."
                    value={alt}
                    onChange={(l, v) => setPhotoText('alts', file, l, v)}
                    compact
                  />
                </details>
              </fieldset>
            </li>
          )
        })}
        {files.length === 0 && <li className="adm-empty">Sin fotos todavía. Usa «Subir fotos».</li>}
      </ol>

      <div className="adm-danger-zone">
        <button className="adm-btn adm-btn-danger" onClick={removeAlbum} disabled={disabled}>Borrar proyecto</button>
      </div>

      {dirty && (
        <div className="adm-savebar" role="region" aria-label="Cambios sin guardar">
          <span>Cambios sin guardar</span>
          <button className="adm-btn" onClick={() => { setDraft(toDraft(album)); setDirty(false) }}>Deshacer</button>
          <button className="adm-btn adm-btn-primary" onClick={() => save().catch(() => {})} disabled={locked}>Guardar</button>
        </div>
      )}
    </section>
  )
}
