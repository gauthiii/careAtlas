export type OverridePortal = 'patient' | 'clinician' | 'governance'

export const OVERRIDE_AUTH_CODE = 'leavemealone'
export const PORTAL_AUTH_OVERRIDE_EVENT = 'careatlas:portal-override-auth'

export const PORTAL_AUTH_STORAGE_KEYS: Record<OverridePortal, string> = {
  patient: 'careatlas.patientAuth',
  clinician: 'careatlas.clinicianAuth',
  governance: 'careatlas.governanceAuth',
}

const overrideUsers: Record<OverridePortal, { username: string; name: string; email: string }> = {
  patient: {
    username: 'override.patient@careatlas.local',
    name: 'Override Patient',
    email: 'override.patient@careatlas.local',
  },
  clinician: {
    username: 'override.clinician@careatlas.local',
    name: 'Override Clinician',
    email: 'override.clinician@careatlas.local',
  },
  governance: {
    username: 'override.governance@careatlas.local',
    name: 'Override Governance User',
    email: 'override.governance@careatlas.local',
  },
}

interface StoredOverrideAuth {
  idToken: string
  accessToken: string
  refreshToken: null
  isOverride: true
  user: {
    username: string
    attributes: Record<string, string>
  }
}

export function createOverrideStoredAuth(portal: OverridePortal): StoredOverrideAuth {
  const user = overrideUsers[portal]

  return {
    idToken: `override:${portal}:id`,
    accessToken: `override:${portal}:access`,
    refreshToken: null,
    isOverride: true,
    user: {
      username: user.username,
      attributes: {
        email: user.email,
        name: user.name,
        'custom:portal': portal,
      },
    },
  }
}

export function isOverrideStoredAuth(auth: { accessToken?: string | null; isOverride?: boolean } | null | undefined) {
  return Boolean(auth?.isOverride && auth.accessToken?.startsWith('override:'))
}

export function clearOtherPortalAuth(currentPortal: OverridePortal) {
  Object.entries(PORTAL_AUTH_STORAGE_KEYS).forEach(([portal, storageKey]) => {
    if (portal !== currentPortal) localStorage.removeItem(storageKey)
  })
  window.dispatchEvent(new CustomEvent(PORTAL_AUTH_OVERRIDE_EVENT, { detail: { currentPortal } }))
}
