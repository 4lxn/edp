import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from './api'
import './admin.css'

const emptyMeta = (title = '') => ({
  title,
  type: { es: '', en: '' },
  location: { es: '', en: '' },
  order: 999,
  featured: false,
  hero: '',
  captions: {},
  imageOrder: [],
})

function toDraft(al) {
  return {
    title: al.title || '',
    type: { es: al.type?.es || '', en: al.type?.en || '' },
    location: { es: al.location?.es || '', en: al.location?.en || '' },
    order: al.order ?? 999,
    featured: !!al.featured,
    hero: al.hero || (al.files?.[0] || ''),
    captions: al.captions || {},
    imageOrder: Array.isArray(al.imageOrder) ? al.imageOrder : [],
  }
}

function orderedFiles(files, imageOrder) {
  const inOrder = (imageOrder || []).filter((f) => files.includes(f))
  const rest = files.filter((f) => !inOrder.includes(f)).sort()
  return [...inOrder, ...rest]
}

function draftToMeta(draft, files) {
  return {
    order: Number(draft.order) || 999,
    featured: !!draft.featured,
    title: draft.title,
    type: draft.type,
    location: draft.location,
    hero: draft.hero || files[0] || '',
    imageOrder: orderedFiles(files, draft.imageOrder),
    captions: draft.captions || {},
  }
}

export default function Admin() {
  const [albums, setAlbums] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(null)
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileInput = useRef(null)

  const refresh = async () => {
    const { albums } = await api.listAlbums()
    setAlbums(albums)
    return albums
  }

  useEffect(() => { refresh().catch((e) => setStatus('Error: ' + e.message)) }, [])

  // Guard against losing unsaved edits when closing/reloading the tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const select = (al) => {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return
    setSelected(al.slug)
    setDraft(toDraft(al))
    setFiles(al.files || [])
    setStatus('')
    setDirty(false)
  }

  const patch = (edits) => { setDraft((d) => ({ ...d, ...edits })); setDirty(true) }

  const run = async (label, fn) => {
    setBusy(true)
    setStatus(label + '…')
    try {
      await fn()
      setStatus(label + ' ✓')
    } catch (e) {
      setStatus('Error: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const saveMeta = () =>
    run('Guardado', async () => {
      const res = await api.saveAlbum(selected, draftToMeta(draft, files))
      setFiles(res.files)
      await refresh()
      setDirty(false)
    })

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!arr.length || !selected) return
    run(`Subiendo ${arr.length} foto(s)`, async () => {
      // Persist current edits first so the server appends onto saved meta.
      await api.saveAlbum(selected, draftToMeta(draft, files))
      let last
      for (const f of arr) {
        const dataUrl = await api.fileToDataUrl(f)
        last = await api.uploadImage(selected, f.name, dataUrl)
      }
      if (last) {
        setDraft(toDraft({ ...last.meta, files: last.files }))
        setFiles(last.files)
      }
      await refresh()
      setDirty(false)
    })
  }

  const removeImage = (file) =>
    run('Foto eliminada', async () => {
      await api.saveAlbum(selected, draftToMeta(draft, files))
      const res = await api.deleteImage(selected, file)
      setDraft(toDraft({ ...res.meta, files: res.files }))
      setFiles(res.files)
      await refresh()
      setDirty(false)
    })

  const moveImage = (file, dir) => {
    const ord = orderedFiles(files, draft.imageOrder)
    const i = ord.indexOf(file)
    const j = i + dir
    if (j < 0 || j >= ord.length) return
    ;[ord[i], ord[j]] = [ord[j], ord[i]]
    patch({ imageOrder: ord })
  }

  const setCaption = (file, lang, value) => {
    setDraft((d) => ({
      ...d,
      captions: { ...d.captions, [file]: { ...(d.captions[file] || { es: '', en: '' }), [lang]: value } },
    }))
    setDirty(true)
  }

  const newAlbum = () =>
    run('Álbum creado', async () => {
      const slug = (prompt('Slug del álbum (kebab-case, ej. "el-cielo"):') || '').trim()
      if (!slug) throw new Error('cancelado')
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('slug inválido (usa a-z, 0-9, -)')
      if (albums.some((a) => a.slug === slug)) throw new Error('ese slug ya existe')
      const title = (prompt('Título visible (ej. "El Cielo"):') || slug).trim()
      const order = (albums.reduce((m, a) => Math.max(m, a.order ?? 0), 0) || 0) + 1
      await api.saveAlbum(slug, { ...emptyMeta(title), order })
      const list = await refresh()
      const created = list.find((a) => a.slug === slug)
      if (created) select(created)
    })

  const removeAlbum = () => {
    if (!selected) return
    if (!confirm(`¿Borrar el álbum "${selected}" y todas sus fotos? Esto no se puede deshacer.`)) return
    run('Álbum borrado', async () => {
      await api.deleteAlbum(selected)
      setSelected(null)
      setDraft(null)
      setFiles([])
      await refresh()
      setDirty(false)
    })
  }

  const ordered = draft ? orderedFiles(files, draft.imageOrder) : []

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-top-l">
          <strong>Modo edición</strong>
          <span className="adm-badge">local · dev</span>
        </div>
        <div className="adm-top-r">
          <Link to="/" className="adm-link">↗ Ver sitio</Link>
          <span className={'adm-status' + (status.startsWith('Error') ? ' is-err' : '')}>{status}</span>
        </div>
      </header>

      <div className="adm-body">
        {/* Sidebar */}
        <aside className="adm-side">
          <button className="adm-new" onClick={newAlbum} disabled={busy}>+ Nuevo álbum</button>
          <ul className="adm-list">
            {albums.map((a) => (
              <li key={a.slug}>
                <button
                  className={'adm-item' + (a.slug === selected ? ' is-sel' : '')}
                  onClick={() => select(a)}
                >
                  <span className="adm-item-t">{a.title || a.slug}</span>
                  <span className="adm-item-m">
                    {a.files?.length || 0} fotos{a.featured ? ' · ★' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor */}
        <main className="adm-main">
          {!draft ? (
            <div className="adm-empty">Selecciona un álbum o crea uno nuevo.</div>
          ) : (
            <>
              <div className="adm-head">
                <h2>{draft.title || selected} <span className="adm-slug">/{selected}</span></h2>
                <div className="adm-head-actions">
                  <Link className="adm-link" to={`/album/${selected}`}>Ver álbum →</Link>
                  <button className="adm-danger" onClick={removeAlbum} disabled={busy}>Borrar álbum</button>
                </div>
              </div>

              <section className="adm-fields">
                <label className="adm-f">
                  <span>Título</span>
                  <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
                </label>
                <label className="adm-f">
                  <span>Orden</span>
                  <input type="number" value={draft.order} onChange={(e) => patch({ order: e.target.value })} />
                </label>
                <label className="adm-f">
                  <span>Tipo (ES)</span>
                  <input value={draft.type.es} onChange={(e) => patch({ type: { ...draft.type, es: e.target.value } })} />
                </label>
                <label className="adm-f">
                  <span>Tipo (EN)</span>
                  <input value={draft.type.en} onChange={(e) => patch({ type: { ...draft.type, en: e.target.value } })} />
                </label>
                <label className="adm-f">
                  <span>Ubicación (ES)</span>
                  <input value={draft.location.es} onChange={(e) => patch({ location: { ...draft.location, es: e.target.value } })} />
                </label>
                <label className="adm-f">
                  <span>Ubicación (EN)</span>
                  <input value={draft.location.en} onChange={(e) => patch({ location: { ...draft.location, en: e.target.value } })} />
                </label>
                <label className="adm-f adm-f-check">
                  <input type="checkbox" checked={draft.featured} onChange={(e) => patch({ featured: e.target.checked })} />
                  <span>Destacado en el inicio (★)</span>
                </label>
              </section>

              <div className="adm-savebar">
                <button className="adm-save" onClick={saveMeta} disabled={busy || !dirty}>{dirty ? 'Guardar cambios •' : 'Sin cambios'}</button>
                <span className="adm-hint">Subir/borrar guarda automáticamente. Para publicar online: <code>git push</code>.</span>
              </div>

              {/* Dropzone */}
              <div
                className={'adm-drop' + (dragOver ? ' is-over' : '')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => fileInput.current?.click()}
              >
                <input
                  ref={fileInput} type="file" accept="image/*" multiple hidden
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
                />
                Arrastra fotos aquí o haz clic para subir (se optimizan automáticamente)
              </div>

              {/* Image grid */}
              <div className="adm-grid">
                {ordered.map((file, i) => {
                  const cap = draft.captions[file] || { es: '', en: '' }
                  return (
                    <div key={file} className={'adm-card' + (draft.hero === file ? ' is-hero' : '')}>
                      <div className="adm-thumb">
                        <img src={`/albums/${selected}/${file}`} alt={file} loading="lazy" />
                        {draft.hero === file && <span className="adm-herotag">Portada</span>}
                      </div>
                      <div className="adm-card-body">
                        <div className="adm-card-row">
                          <span className="adm-fname">{i + 1}. {file}</span>
                          <span className="adm-card-btns">
                            <button onClick={() => moveImage(file, -1)} disabled={busy || i === 0} title="Subir">↑</button>
                            <button onClick={() => moveImage(file, 1)} disabled={busy || i === ordered.length - 1} title="Bajar">↓</button>
                            <button onClick={() => patch({ hero: file })} disabled={busy} title="Usar como portada">★</button>
                            <button className="adm-x" onClick={() => removeImage(file)} disabled={busy} title="Borrar">✕</button>
                          </span>
                        </div>
                        <input className="adm-cap" placeholder="Caption ES" value={cap.es} onChange={(e) => setCaption(file, 'es', e.target.value)} />
                        <input className="adm-cap" placeholder="Caption EN" value={cap.en} onChange={(e) => setCaption(file, 'en', e.target.value)} />
                      </div>
                    </div>
                  )
                })}
                {ordered.length === 0 && <div className="adm-empty">Sin fotos todavía. Sube algunas arriba.</div>}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
