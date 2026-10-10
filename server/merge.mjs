/**
 * Three-way merge of JSON values, used when publishing: the admin's pending
 * copy of a file (`mine`) was edited starting from `base`, and the branch now
 * holds `theirs` (e.g. new texts pushed with a code change). Both sides'
 * changes are kept; where both changed the same value, the admin's edit wins.
 */
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function deepEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  if (isObj(a)) {
    if (!isObj(b)) return false
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]))
  }
  return false
}

export function merge3(base, mine, theirs) {
  if (deepEqual(mine, theirs) || deepEqual(base, mine)) return theirs
  if (deepEqual(base, theirs)) return mine
  if (isObj(mine) && isObj(theirs)) {
    const b = isObj(base) ? base : {}
    const out = {}
    const keys = [...Object.keys(theirs), ...Object.keys(mine).filter((k) => !Object.hasOwn(theirs, k))]
    for (const k of keys) {
      const inMine = Object.hasOwn(mine, k)
      const inTheirs = Object.hasOwn(theirs, k)
      const inBase = Object.hasOwn(b, k)
      if (inMine && inTheirs) out[k] = merge3(inBase ? b[k] : undefined, mine[k], theirs[k])
      // Removed on one side: gone, unless the other side changed it.
      else if (inMine) { if (!(inBase && deepEqual(b[k], mine[k]))) out[k] = mine[k] }
      else if (!(inBase && deepEqual(b[k], theirs[k]))) out[k] = theirs[k]
    }
    return out
  }
  if (Array.isArray(base) && Array.isArray(mine) && Array.isArray(theirs)
      && base.length === mine.length && mine.length === theirs.length) {
    return mine.map((v, i) => merge3(base[i], v, theirs[i]))
  }
  return mine
}
