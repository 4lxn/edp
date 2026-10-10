/**
 * Publishes admin changes as ONE commit on the branch Railway deploys from,
 * through the GitHub Git Data API (blobs → tree → commit → move the branch).
 * Only the given content paths are touched. If the branch moved meanwhile,
 * the commit is rebuilt on the new head, and `prepare` gets the chance to
 * merge with what changed there.
 */
import crypto from 'node:crypto'

const API = 'https://api.github.com'
const TIMEOUT_MS = 60_000

/** The id git gives a file's content (what GitHub reports as a blob sha). */
export const gitBlobSha = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function createPublisher({ token, repo, branch, apiUrl = API, fetchImpl = fetch }) {
  async function gh(method, url, body) {
    for (let attempt = 1; ; attempt++) {
      const res = await fetchImpl(`${apiUrl}/repos/${repo}${url}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'edp-admin',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) return data
      // Rate limited (many photos at once): wait as GitHub says, then retry.
      const retryAfter = Number(res.headers.get('retry-after'))
      const limited = res.status === 429 || (res.status === 403 && (retryAfter > 0 || res.headers.get('x-ratelimit-remaining') === '0'))
      if (limited && attempt <= 2) {
        await sleep(Math.min(retryAfter || 60, 120) * 1000)
        continue
      }
      const err = new Error(`GitHub ${method} ${url} → ${res.status}: ${data.message || 'error'}`)
      err.status = res.status
      err.github = true
      throw err
    }
  }

  const uploaded = new Set()
  async function putBlob(content) {
    const sha = gitBlobSha(content)
    if (!uploaded.has(sha)) {
      const res = await gh('POST', '/git/blobs', { content: content.toString('base64'), encoding: 'base64' })
      if (res.sha !== sha) throw new Error(`GitHub stored a different blob (${res.sha} ≠ ${sha})`)
      uploaded.add(sha)
    }
    return sha
  }
  async function readBlob(sha) {
    const { content, encoding } = await gh('GET', `/git/blobs/${sha}`)
    return Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf8')
  }

  /**
   * @param {{ message: string, prepare: (head: { files: Map<string, string>, readBlob: Function }) =>
   *   Promise<{ files: { path: string, content: Buffer }[], deletions: string[] }> }} change
   *   `prepare` gets the head's files (path → blob sha) and returns what to
   *   commit on top of that head.
   * @returns {Promise<{ sha: string, created: boolean, files: { path: string, content: Buffer }[] }>}
   *   `created` is false when the branch already had exactly this content.
   */
  async function commit({ message, prepare }) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ref = await gh('GET', `/git/ref/heads/${encodeURIComponent(branch)}`)
      const head = ref.object.sha
      const { tree: baseTree } = await gh('GET', `/git/commits/${head}`)
      const listing = await gh('GET', `/git/trees/${baseTree.sha}?recursive=1`)
      if (listing.truncated) throw new Error('GitHub truncated the file listing')
      const files = new Map(listing.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]))

      const change = await prepare({ files, readBlob })
      const entries = []
      for (const f of change.files) {
        if (files.get(f.path) === gitBlobSha(f.content)) continue // already like this
        entries.push({ path: f.path, mode: '100644', type: 'blob', sha: await putBlob(f.content) })
      }
      for (const p of change.deletions) {
        if (files.has(p)) entries.push({ path: p, mode: '100644', type: 'blob', sha: null })
      }
      if (!entries.length) return { sha: head, created: false, files: change.files }

      const tree = await gh('POST', '/git/trees', { base_tree: baseTree.sha, tree: entries })
      const created = await gh('POST', '/git/commits', { message, tree: tree.sha, parents: [head] })
      try {
        await gh('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: created.sha, force: false })
        return { sha: created.sha, created: true, files: change.files }
      } catch (err) {
        if (err.status !== 422 || attempt === 3) throw err // 422 = the branch moved → again on the new head
      }
    }
  }

  return { commit, repo, branch }
}
