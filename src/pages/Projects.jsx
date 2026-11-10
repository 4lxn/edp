import { useSearchParams } from 'react-router-dom'
import { ALBUMS, ALBUM_ORDER } from '../albums.generated'
import { useLang } from '../hooks'
import { ProjectCard, CtaBand } from '../components/Blocks'

export default function Projects() {
  const { t, lang } = useLang()
  const [params, setParams] = useSearchParams()
  // Filter by building type — only offered once projects actually carry types.
  const types = [...new Set(ALBUM_ORDER.map((s) => ALBUMS[s].type[lang]).filter(Boolean))]
  const active = types.includes(params.get('tipo')) ? params.get('tipo') : null
  const list = ALBUM_ORDER.filter((s) => !active || ALBUMS[s].type[lang] === active)
  const pick = (type) => setParams(type ? { tipo: type } : {}, { replace: true, preventScrollReset: true })

  return (
    <>
      <div className="wrap page-head">
        <h1 className="h1 h1-page">{t.index.title} <span className="count">{ALBUM_ORDER.length}</span></h1>
        <p className="lede">{t.index.lede}</p>
        {types.length > 1 && (
          <div className="filters" role="group" aria-label={t.project.ficha.type}>
            <button type="button" aria-pressed={!active} onClick={() => pick(null)}>{t.index.all}</button>
            {types.map((type) => (
              <button key={type} type="button" aria-pressed={active === type} onClick={() => pick(type)}>{type}</button>
            ))}
          </div>
        )}
      </div>
      <div className="wrap grid-2">
        {list.map((slug, i) => (
          <ProjectCard key={slug} slug={slug} eager={i < 2} sizes="(min-width: 900px) 44vw, 90vw" />
        ))}
      </div>
      <CtaBand title={t.index.closing} />
    </>
  )
}
