const TOKEN_KEY = 'labassets_token'

export const API_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function buildUrl(path, params) {
  const url = new URL(
    `${API_URL}${path.startsWith('/') ? path : `/${path}`}`,
    window.location.origin,
  )
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }
  return url.toString()
}

function readDetail(payload, fallback) {
  if (!payload) return fallback
  if (typeof payload.detail === 'string') return payload.detail
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => item.msg || item.message || 'Invalid value')
      .join('. ')
  }
  if (typeof payload.message === 'string') return payload.message
  return fallback
}

async function request(path, options = {}) {
  const { method = 'GET', body, params, headers = {} } = options
  const token = getToken()
  const finalHeaders = { Accept: 'application/json', ...headers }
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'
  if (token) finalHeaders.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      'Cannot reach the API. Check that the backend is running and VITE_API_URL is correct.',
      0,
    )
  }

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    const message = readDetail(payload, `Request failed (${response.status})`)
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('labassets:unauthorized'))
    }
    throw new ApiError(message, response.status, payload)
  }

  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response
  return response.json()
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

export async function downloadCsv(path, filename) {
  const token = getToken()
  let response
  try {
    response = await fetch(buildUrl(path), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new ApiError('Cannot reach the API to download the report.', 0)
  }
  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new ApiError(
      readDetail(payload, `Download failed (${response.status})`),
      response.status,
    )
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
