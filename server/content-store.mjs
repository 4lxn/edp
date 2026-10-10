/**
 * Where the admin reads and writes site content: the album folders
 * (public/albums/<slug>/…) and the site copy (src/content/site.json),
 * addressed by repo-relative paths.
 *
 * - DirectStore (`npm run dev`): reads/writes the repo files themselves.
 * - OverlayStore (production): the deployed checkout is read-only; edits go to
 *   a "pending" layer on the volume until they're published (committed to
 *   GitHub). Reads merge both layers, so the admin always shows the latest.
 *   For JSON files it also remembers the checkout's version from when editing
 *   began (the "origin"), so publishing can merge with changes made on GitHub
 *   in the meantime (server/merge.mjs).
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

export const ALBUMS_PREFIX = 'public/albums/'
export const SITE_PATH = 'src/content/site.json'

/** Normalize and validate a content path; returns null for anything outside the allowed areas. */
export function contentPath(p) {
  const norm = path.posix.normalize(String(p || '')).replace(/^\/+/, '')
  if (norm.includes('..') || norm.includes('\\') || norm.includes('\0')) return null
  if (norm === SITE_PATH) return norm
  return norm.startsWith(ALBUMS_PREFIX) && norm.length > ALBUMS_PREFIX.length ? norm : null
}

const exists = (p) => fsp.access(p).then(() => true, () => false)

async function listDir(dir) {
  try { return await fsp.readdir(dir, { withFileTypes: true }) } catch { return [] }
}

function readJsonFile(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

/** Writes through a uniquely named temp file + rename: readers never see half a file. */
async function writeAtomic(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  await fsp.writeFile(tmp, data)
  await fsp.rename(tmp, file)
}

/** Repo files, read and written in place (local development). */
export class DirectStore {
  constructor({ root }) { this.root = root }
  abs(p) { return path.join(this.root, p) }

  async read(p) {
    try { return await fsp.readFile(this.abs(p)) } catch { return null }
  }
  async write(p, data) { await writeAtomic(this.abs(p), data) }
  async remove(p) { await fsp.rm(this.abs(p), { force: true }) }
  async removeDir(dir) { await fsp.rm(this.abs(dir), { recursive: true, force: true }) }

  /** Entries directly inside a directory: { files: [...], dirs: [...] } */
  async list(dir) {
    const entries = await listDir(this.abs(dir))
    return {
      files: entries.filter((e) => e.isFile() && !e.name.endsWith('.tmp')).map((e) => e.name).sort(),
      dirs: entries.filter((e) => e.isDirectory()).map((e) => e.name).sort(),
    }
  }

  async changes() { return { written: [], deleted: [] } }
  async clear() {}
}

/** Read-only base checkout + a pending overlay on the volume (production). */
export class OverlayStore {
  constructor({ root, dataDir }) {
    this.root = root
    this.pendingDir = path.join(dataDir, 'admin', 'pending')
    this.deletedFile = path.join(dataDir, 'admin', 'deleted.json')
    this.originsFile = path.join(dataDir, 'admin', 'origins.json')
    this.deleted = new Set(readJsonFile(this.deletedFile, []))
    // repo path → base64 of the checkout's version when editing began (null: it didn't exist)
    this.origins = new Map(Object.entries(readJsonFile(this.originsFile, {})))
  }
  pending(p) { return path.join(this.pendingDir, p) }
  base(p) { return path.join(this.root, p) }

  async saveDeleted() { await writeAtomic(this.deletedFile, JSON.stringify([...this.deleted].sort(), null, 1)) }
  async saveOrigins() { await writeAtomic(this.originsFile, JSON.stringify(Object.fromEntries(this.origins))) }

  async read(p) {
    try { return await fsp.readFile(this.pending(p)) } catch { /* not pending */ }
    if (this.deleted.has(p)) return null
    try { return await fsp.readFile(this.base(p)) } catch { return null }
  }

  async write(p, data) {
    if (p.endsWith('.json') && !this.origins.has(p)) {
      const base = await fsp.readFile(this.base(p)).catch(() => null)
      this.origins.set(p, base ? base.toString('base64') : null)
      await this.saveOrigins()
    }
    await writeAtomic(this.pending(p), data)
    if (this.deleted.delete(p)) await this.saveDeleted()
  }

  async remove(p) {
    await fsp.rm(this.pending(p), { force: true })
    if (this.origins.delete(p)) await this.saveOrigins()
    if (await exists(this.base(p))) {
      this.deleted.add(p)
      await this.saveDeleted()
    }
  }

  async removeDir(dir) {
    const { files, dirs } = await this.list(dir)
    for (const f of files) await this.remove(`${dir}/${f}`)
    for (const d of dirs) await this.removeDir(`${dir}/${d}`)
    await fsp.rm(this.pending(dir), { recursive: true, force: true })
  }

  async list(dir) {
    const files = new Set()
    const dirs = new Set()
    for (const e of await listDir(this.base(dir))) {
      if (e.isFile() && !this.deleted.has(`${dir}/${e.name}`)) files.add(e.name)
      else if (e.isDirectory()) dirs.add(e.name)
    }
    for (const e of await listDir(this.pending(dir))) {
      if (e.isFile() && !e.name.endsWith('.tmp')) files.add(e.name)
      else if (e.isDirectory()) dirs.add(e.name)
    }
    // A directory whose files were all deleted no longer exists.
    const live = []
    for (const d of dirs) {
      const inner = await this.list(`${dir}/${d}`)
      if (inner.files.length || inner.dirs.length) live.push(d)
    }
    return { files: [...files].sort(), dirs: live.sort() }
  }

  /** Every file in the pending layer (repo paths), plus leftover temp files. */
  async walkPending() {
    const files = []
    const temps = []
    const walk = async (rel) => {
      for (const e of await listDir(this.pending(rel))) {
        const p = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) await walk(p)
        else (e.name.endsWith('.tmp') ? temps : files).push(p)
      }
    }
    await walk('')
    return { files: files.sort(), temps }
  }

  /** Repo paths written or deleted since the last publish. */
  async changes() {
    const { files } = await this.walkPending()
    return { written: files, deleted: [...this.deleted].sort() }
  }

  /** The origin of a pending JSON file — { content: Buffer|null } — or undefined if untracked. */
  origin(p) {
    if (!this.origins.has(p)) return undefined
    const v = this.origins.get(p)
    return { content: v === null ? null : Buffer.from(v, 'base64') }
  }

  /** After a publish: the pending copy is what the branch now has, and that is its new origin. */
  async markCommitted(p, content) {
    const cur = await fsp.readFile(this.pending(p)).catch(() => null)
    if (!cur || !cur.equals(content)) await writeAtomic(this.pending(p), content)
    this.origins.set(p, content.toString('base64'))
    await this.saveOrigins()
  }

  async clear() {
    await fsp.rm(this.pendingDir, { recursive: true, force: true })
    this.deleted.clear()
    this.origins.clear()
    await this.saveDeleted()
    await this.saveOrigins()
  }

  /** Drops pending edits the checkout already has: files identical to the
   *  deployed ones, and deletions of files that are already gone (e.g. once
   *  the commit that published them is live). Edits made later stay. */
  async prune() {
    const { files, temps } = await this.walkPending()
    for (const t of temps) await fsp.rm(this.pending(t), { force: true })
    for (const p of files) {
      const base = await fsp.readFile(this.base(p)).catch(() => null)
      const mine = await fsp.readFile(this.pending(p)).catch(() => null)
      if (base && mine && base.equals(mine)) await fsp.rm(this.pending(p), { force: true })
    }
    let originsChanged = false
    for (const p of [...this.origins.keys()]) {
      if (!(await exists(this.pending(p)))) { this.origins.delete(p); originsChanged = true }
    }
    if (originsChanged) await this.saveOrigins()
    let deletedChanged = false
    for (const p of [...this.deleted]) {
      if (!(await exists(this.base(p)))) { this.deleted.delete(p); deletedChanged = true }
    }
    if (deletedChanged) await this.saveDeleted()
  }
}
