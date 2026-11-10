import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ALBUMS } from '../albums.generated'
import { EMAIL } from '../facts'
import { titleOf } from '../routes'
import { useLang } from '../hooks'

const ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`
const EMPTY = { type: '', location: '', stage: '', timing: '', size: '', name: '', email: '', company: '', message: '' }
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** Radio group styled as tap-to-choose chips (real inputs, keyboard operable). */
function Chips({ id, legend, name, options, value, onChange, required, error }) {
  return (
    <fieldset className="fld" aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="lbl" id={`${id}-lbl`}>{legend}</legend>
      <div className="chips" role="radiogroup" aria-labelledby={`${id}-lbl`} aria-required={required || undefined} aria-invalid={error ? true : undefined}>
        {options.map(([val, label]) => (
          <label key={val} className="chip">
            <input
              type="radio" name={name} value={val} checked={value === val}
              onChange={() => onChange(val)} required={required}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {error && <p className="err" id={`${id}-err`} role="alert">{error}</p>}
    </fieldset>
  )
}

function Field({ id, label, optional, error, children }) {
  return (
    <div className="fld">
      <label className="lbl" htmlFor={id}>
        {label}{optional && <span className="lbl-opt"> ({optional})</span>}
      </label>
      {children}
      {error && <p className="err" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  )
}

export default function QuoteForm() {
  const { t, lang, to, projectTo } = useLang()
  const q = t.quote
  const { search } = useLocation()
  const [v, setV] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [ref, setRef] = useState(null)       // project the visitor came from
  const [profile, setProfile] = useState('') // hotel | arquitecto | residencia
  const [status, setStatus] = useState('idle') // idle | sending | ok | fail

  // Prefill from ?tipo= &obra= &perfil= (after mount, so prerendered HTML matches).
  useEffect(() => {
    const p = new URLSearchParams(search)
    const tipo = p.get('tipo')
    if (tipo && q.types.some(([val]) => val === tipo)) setV((s) => ({ ...s, type: tipo }))
    const obra = p.get('obra')
    setRef(obra && ALBUMS[obra] ? obra : null)
    setProfile(p.get('perfil') || '')
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e && e.target ? e.target.value : e }))
  const typeLabel = (q.types.find(([val]) => val === v.type) || [])[1] || ''

  const check = (k, val = v[k]) => {
    if (k === 'type') return val ? '' : q.errChoice
    if (k === 'location' || k === 'name') return val.trim() ? '' : q.errRequired
    if (k === 'email') return !val.trim() ? q.errRequired : emailOk(val) ? '' : q.errEmail
    return ''
  }
  const blur = (k) => () => setErrors((e) => ({ ...e, [k]: check(k) }))

  const summary = () => [
    [q.type, typeLabel], [q.location, v.location], [q.stage, v.stage], [q.timing, v.timing],
    [q.size, v.size], [q.name, v.name], [q.email, v.email], [q.company, v.company],
    [q.reference, ref ? titleOf(ALBUMS[ref], lang) : ''], [q.message, v.message],
  ].filter(([, val]) => val)

  const mailto = (withAnswers) => {
    const body = withAnswers
      ? summary().map(([k, val]) => `${k} ${val}`).join('\n')
      : q.mailBody.join('\n')
    return `mailto:${EMAIL}?subject=${encodeURIComponent(q.mailSubject)}&body=${encodeURIComponent(body)}`
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const errs = {}
    for (const k of ['type', 'location', 'name', 'email']) { const m = check(k); if (m) errs[k] = m }
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      const el = first === 'type' ? form.querySelector('input[name="type"]') : form.querySelector(`#q-${first}`)
      if (el) el.focus()
      return
    }
    setStatus('sending')
    // Field names are in Spanish: they are the row labels of the email the studio reads.
    const data = new FormData()
    data.append('_subject', q.subject(typeLabel, v.location.trim()))
    data.append('_replyto', v.email.trim())
    data.append('_template', 'table')
    data.append('_honey', form.elements._honey.value)
    data.append('Tipo de proyecto', typeLabel)
    data.append('Ubicación', v.location.trim())
    if (v.stage) data.append('Etapa', v.stage)
    if (v.timing) data.append('Fecha deseada', v.timing)
    if (v.size) data.append('Medidas aproximadas', v.size)
    data.append('Nombre', v.name.trim())
    data.append('email', v.email.trim())
    if (v.company) data.append('Empresa o proyecto', v.company)
    if (ref) data.append('Obra de referencia', ALBUMS[ref].title)
    if (profile) data.append('Perfil', profile)
    if (v.message) data.append('Mensaje', v.message)
    data.append('Idioma del visitante', lang === 'es' ? 'Español' : 'English')
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
      // FormSubmit answers HTTP 200 with { success: "false" } when the address is
      // not activated or the message is flagged, so the body decides, not the status.
      const json = await res.json().catch(() => null)
      if (!res.ok || !json || String(json.success) !== 'true') throw new Error('not delivered')
      setStatus('ok')
    } catch {
      setStatus('fail')
    }
  }

  if (status === 'ok') {
    return (
      <div className="q-ok" role="status" tabIndex={-1} ref={(el) => el && el.focus()}>
        <h3 className="h3">{q.okTitle}</h3>
        <p>{q.okBody(v.email.trim())}</p>
        <Link className="link" to={to('projects')}>{q.okLink}</Link>
      </div>
    )
  }

  const aria = (k) => ({
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `q-${k}-err` : undefined,
  })

  return (
    <form className="q-form" onSubmit={onSubmit} noValidate>
      {/* honeypot: bots fill this, FormSubmit drops them */}
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" className="q-honey" />

      {ref && (
        <p className="q-ref">
          {q.reference}: <Link className="link" to={projectTo(ref)}>{titleOf(ALBUMS[ref], lang)}</Link>
        </p>
      )}

      <Chips id="q-type" legend={q.type} name="type" options={q.types} value={v.type} required error={errors.type}
        onChange={(val) => { setV((s) => ({ ...s, type: val })); setErrors((e) => ({ ...e, type: '' })) }} />

      <Field id="q-location" label={q.location} error={errors.location}>
        <input id="q-location" name="location" type="text" required placeholder={q.locationPh}
          autoComplete="address-level2" value={v.location} onChange={set('location')} onBlur={blur('location')} {...aria('location')} />
      </Field>

      <Chips id="q-stage" legend={q.stage} name="stage" options={q.stages.map((s) => [s, s])} value={v.stage} onChange={set('stage')} />
      <Chips id="q-timing" legend={q.timing} name="timing" options={q.timings.map((s) => [s, s])} value={v.timing} onChange={set('timing')} />

      <Field id="q-size" label={q.size} optional={q.optional}>
        <input id="q-size" name="size" type="text" placeholder={q.sizePh} value={v.size} onChange={set('size')} />
      </Field>

      <div className="q-row">
        <Field id="q-name" label={q.name} error={errors.name}>
          <input id="q-name" name="name" type="text" required autoComplete="name"
            value={v.name} onChange={set('name')} onBlur={blur('name')} {...aria('name')} />
        </Field>
        <Field id="q-email" label={q.email} error={errors.email}>
          <input id="q-email" name="email" type="email" required autoComplete="email" inputMode="email"
            value={v.email} onChange={set('email')} onBlur={blur('email')} {...aria('email')} />
        </Field>
      </div>

      <Field id="q-company" label={q.company} optional={q.optional}>
        <input id="q-company" name="company" type="text" autoComplete="organization" value={v.company} onChange={set('company')} />
      </Field>

      <Field id="q-message" label={q.message} optional={q.optional}>
        <textarea id="q-message" name="message" rows={3} value={v.message} onChange={set('message')} />
      </Field>

      <p className="q-note">
        {q.consent[0]}<Link className="link" to={to('privacy')}>{q.consent[1]}</Link>{q.consent[2]} {q.reassure}
      </p>

      <button className="btn btn-light q-submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? q.sending : q.submit}
      </button>

      {status === 'fail' && (
        <p className="err q-fail" role="alert">
          {q.fail} <a className="link" href={mailto(true)}>{EMAIL}</a>.
        </p>
      )}
    </form>
  )
}

/** The full charcoal quote section: pitch + direct email on the left, form on the right. */
export function QuoteSection({ as: Tag = 'h2', id }) {
  const { t } = useLang()
  const q = t.quote
  const href = `mailto:${EMAIL}?subject=${encodeURIComponent(q.mailSubject)}&body=${encodeURIComponent(q.mailBody.join('\n'))}`
  return (
    <section className="quote dark" id={id} data-hide-sticky>
      <div className="wrap quote-grid">
        <div className="quote-pitch">
          <Tag className="h2">{q.title}</Tag>
          <p className="lede">{q.lede}</p>
          <p className="quote-direct">{q.direct}</p>
          <a className="quote-mail" href={href}>{EMAIL}</a>
          <p className="quote-attach">{q.attach}</p>
        </div>
        <QuoteForm />
      </div>
    </section>
  )
}
