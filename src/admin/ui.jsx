import { useEffect } from 'react'

const LANG_NAMES = { es: 'español', en: 'inglés' }

/**
 * ES + EN inputs for one bilingual text. `max` shows a character counter
 * (e.g. Google titles), `hint` a line of help under the label.
 */
export function Pair({ label, value, onChange, placeholder, long, compact, hint, max, invalid = [] }) {
  const Input = long ? 'textarea' : 'input'
  return (
    <div className={'adm-pair' + (compact ? ' is-compact' : '')}>
      <span className="adm-pair-label">{label}</span>
      {hint && <span className="adm-pair-hint">{hint}</span>}
      {['es', 'en'].map((l) => {
        const v = value[l] || ''
        return (
          <label key={l} className="adm-pair-field">
            <span className="adm-lang" aria-hidden="true">{l.toUpperCase()}</span>
            <Input
              value={v}
              onChange={(e) => onChange(l, e.target.value)}
              placeholder={l === 'es' ? placeholder : undefined}
              aria-label={`${label} (${LANG_NAMES[l]})`}
              aria-invalid={invalid.includes(l) || undefined}
              rows={long ? 3 : undefined}
            />
            {invalid.includes(l) && <span className="adm-pair-err">No puede quedar vacío</span>}
            {max > 0 && (
              <span className={'adm-count' + (v.length > max ? ' is-over' : '')}>{v.length}/{max}</span>
            )}
          </label>
        )
      })}
    </div>
  )
}

/** Asks before closing or reloading the tab while there are unsaved edits. */
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
