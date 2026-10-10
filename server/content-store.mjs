/**
 * Where the admin reads and writes site content: the album folders
 * (public/albums/<slug>/…) and the site copy (src/content/site.json),
 * addressed by repo-relative paths.
 *
 * - DirectStore (`npm run dev`): reads/writes the repo files themselves.
 * - OverlayStore (production): the deployed checkout is read-only; edits go to
 *   a "pending" layer on the volume until they're published (committed to
 *   GitHub). Reads merge both layers, so the admin always shows the latest.
 */
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

/** Repo files, read and written in place (local development). */
export class DirectStore {
  constructor({ root }) { this.root = root }
  abs(p) { return path.join(this.root, p) }

  async read(p) {
    try { return await fsp.readFile(this.abs(p)) } catch { return null }
  }
  async write(p, data) {
    await fsp.mkdir(path.dirname(this.abs(p)), { recursive: true })
    await fsp.writeFile(this.abs(p), data)
  }
  async remove(p) { await fsp.rm(this.abs(p), { force: true }) }
  async removeDir(dir) { await fsp.rm(this.abs(dir), { recursive: true, force: true }) }

  /** Entries directly inside a directory: { files: [...], dirs: [...] } */
  async list(dir) {
    const entries = await listDir(this.abs(dir))
    return {
      files: entries.filter((e) => e.isFile()).map((e) => e.name).sort(),
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
    this.deleted = new Set()
    try { this.deleted = new Set(JSON.parse(fs.readFileSync(this.deletedFile, 'utf8'))) } catch { /* none yet */ }
  }
  pending(p) { return path.join(this.pendingDir, p) }
  base(p) { return path.join(this.root, p) }

  async saveDeleted() {
    await fsp.mkdir(path.dirname(this.deletedFile), { recursive: true })
    await fsp.writeFile(this.deletedFile, JSON.stringify([...this.deleted].sort(), null, 1))
  }

  async read(p) {
    try { return await fsp.readFile(this.pending(p)) } catch { /* not pending */ }
    if (this.deleted.has(p)) return null
    try { return await fsp.readFile(this.base(p)) } catch { return null }
  }

  async write(p, data) {
    await fsp.mkdir(path.dirname(this.pending(p)), { recursive: true })
    const tmp = `${this.pending(p)}.${process.pid}.tmp`
    await fsp.writeFile(tmp, data)
    await fsp.rename(tmp, this.pending(p))
    if (this.deleted.delete(p)) await this.saveDeleted()
  }

  async remove(p) {
    await fsp.rm(this.pending(p), { force: true })
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

  /** Repo paths written or deleted since the last publish. */
  async changes() {
    const written = []
    const walk = async (rel) => {
      for (const e of await listDir(this.pending(rel))) {
        const p = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) await walk(p)
        else if (!e.name.endsWith('.tmp')) written.push(p)
      }
    }
    await walk('')
    return { written: written.sort(), deleted: [...this.deleted].sort() }
  }

  async clear() {
    await fsp.rm(this.pendingDir, { recursive: true, force: true })
    this.deleted.clear()
    await this.saveDeleted()
  }

  /** Drops pending edits the checkout already has: files identical to the
   *  deployed ones, and deletions of files that are already gone (e.g. once
   *  the commit that published them is live). */
  async prune() {
    const { written } = await this.changes()
    for (const p of written) {
      const base = await fsp.readFile(this.base(p)).catch(() => null)
      const mine = await fsp.readFile(this.pending(p)).catch(() => null)
      if (base && mine && base.equals(mine)) await fsp.rm(this.pending(p), { force: true })
    }
    let changed = false
    for (const p of [...this.deleted]) {
      if (!(await exists(this.base(p)))) { this.deleted.delete(p); changed = true }
    }
    if (changed) await this.saveDeleted()
  }
}
