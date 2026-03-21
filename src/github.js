const GH_REPO = 'claudia-vasquez-universae/crm-data-dictionary'
const GH_BRANCH = 'main'

export { GH_REPO, GH_BRANCH }

export function getPAT() {
  return localStorage.getItem('gh_pat')
}

export function storePAT(token) {
  localStorage.setItem('gh_pat', token)
}

export function savePAT() {
  const input = document.getElementById('pat-input')
  if (input?.value) {
    storePAT(input.value)
    closePATModal()
  }
}

export function openPATModal() {
  document.getElementById('pat-modal')?.classList.add('open')
}

export function closePATModal() {
  document.getElementById('pat-modal')?.classList.remove('open')
  const input = document.getElementById('pat-input')
  if (input) input.value = ''
}

export function requirePAT(fn) {
  const pat = getPAT()
  if (!pat) {
    openPATModal()
    return
  }
  fn(pat)
}

export async function ghGetFile(path) {
  const pat = getPAT()
  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`,
    { headers: { Authorization: `token ${pat}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub GET error ${res.status}`)
  }
  return res.json()
}

export async function ghUpdateFile(path, content, sha, message) {
  const pat = getPAT()
  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${pat}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        sha,
        branch: GH_BRANCH,
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub PUT error ${res.status}`)
  }
  return res.json()
}

export async function saveFieldValue(moduleApi, fieldApiName, key, value) {
  const path = `docs/modules/${moduleApi}/fields.json`
  const file = await ghGetFile(path)
  const fields = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, '')))))
  const idx = fields.findIndex(f => f.api_name === fieldApiName)
  if (idx === -1) throw new Error('Campo no encontrado')
  fields[idx][key] = value
  const updated = JSON.stringify(fields, null, 2)
  await ghUpdateFile(path, updated, file.sha, `docs(${moduleApi}): actualiza ${key} de ${fieldApiName}`)
}
