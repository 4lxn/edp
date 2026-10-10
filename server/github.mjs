/**
 * Publishes admin changes as ONE commit on the branch Railway deploys from,
 * through the GitHub Git Data API (blobs → tree → commit → move the branch).
 * Only content paths are ever touched, so code pushed meanwhile is kept: if
 * the branch moved, the commit is rebuilt on top of the new head.
 */
const API = 'https://api.github.com'

export function createPublisher({ token, repo, branch, apiUrl = API, fetchImpl = fetch }) {
  async function gh(method, url, body) {
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
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(`GitHub ${method} ${url} → ${res.status}: ${data.message || 'error'}`)
      err.status = res.status
      throw err
    }
    return data
  }

  /**
   * @param {{ files: {path: string, content: Buffer}[], deletions: string[], message: string }} change
   * @returns {Promise<string>} the new commit SHA
   */
  async function commit({ files, deletions, message }) {
    // Blobs don't depend on the branch head, so create them once.
    const blobs = []
    for (const f of files) {
      const { sha } = await gh('POST', '/git/blobs', { content: f.content.toString('base64'), encoding: 'base64' })
      blobs.push({ path: f.path, mode: '100644', type: 'blob', sha })
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ref = await gh('GET', `/git/ref/heads/${encodeURIComponent(branch)}`)
      const head = ref.object.sha
      const { tree: baseTree } = await gh('GET', `/git/commits/${head}`)
      const tree = await gh('POST', '/git/trees', {
        base_tree: baseTree.sha,
        tree: [...blobs, ...deletions.map((path) => ({ path, mode: '100644', type: 'blob', sha: null }))],
      })
      if (tree.sha === baseTree.sha) return head // nothing actually changed
      const created = await gh('POST', '/git/commits', { message, tree: tree.sha, parents: [head] })
      try {
        await gh('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: created.sha, force: false })
        return created.sha
      } catch (err) {
        if (err.status !== 422 || attempt === 3) throw err // 422 = branch moved meanwhile → retry on the new head
      }
    }
  }

  return { commit, repo, branch }
}
