import { useState } from 'react'
import { business, copy } from '../i18n'

/** Contact form posted to FormSubmit (AJAX) — no backend of our own yet. */
export default function ContactForm({ lang }) {
  const f = copy(lang).contact.form
  const email = business.email
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setSending(true); setError(false)
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${email}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(e.currentTarget),
      })
      if (!res.ok) throw new Error('bad status')
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return <p className="contact-ok" role="status">{f.ok}</p>
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <input type="hidden" name="_subject" value={f.subject} />
      {/* honeypot: bots fill this, FormSubmit drops them */}
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      <label className="contact-field">
        <span>{f.name}</span>
        <input type="text" name="name" required autoComplete="name" />
      </label>
      <label className="contact-field">
        <span>{f.email}</span>
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label className="contact-field">
        <span>{f.message}</span>
        <textarea name="message" rows={4} required />
      </label>
      <button className="btn btn-solid" type="submit" disabled={sending}>
        {sending ? f.sending : f.send}<span className="btn-arrow" aria-hidden="true">→</span>
      </button>
      {error && (
        <p className="contact-err" role="alert">
          {f.error} <a href={`mailto:${email}`}>{email}</a>.
        </p>
      )}
    </form>
  )
}
