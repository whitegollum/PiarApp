const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_SCOPE = 'openid email profile'
const STATE_KEY = 'google_oauth_state'
const REDIRECT_KEY = 'google_oauth_redirect'

const generateState = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  const values = new Uint32Array(4)
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values)
    return Array.from(values).map(value => value.toString(16)).join('')
  }

  return Math.random().toString(36).slice(2)
}

export const buildGoogleOAuthUrl = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('Google Client ID no configurado')
  }

  const redirectUri =
    import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
    `${window.location.origin}/auth/google/callback`

  const state = generateState()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(REDIRECT_KEY, redirectUri)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export const startGoogleOAuth = () => {
  window.location.assign(buildGoogleOAuthUrl())
}

export const getStoredGoogleState = () => {
  return sessionStorage.getItem(STATE_KEY)
}

export const getStoredGoogleRedirect = () => {
  return sessionStorage.getItem(REDIRECT_KEY)
}

export const clearGoogleOAuthState = () => {
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(REDIRECT_KEY)
}
