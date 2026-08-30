// Client-side settings for Slide AI. There is no backend settings endpoint
// in Phase 1, so preferences are persisted in localStorage under a single key.

const SETTINGS_KEY = 'slideai.settings'

export interface AppSettings {
  displayName: string
  defaultSlideCount: number
  defaultTone: string
  defaultLanguage: string
  autosaveDelay: number
  animationsEnabled: boolean
  // Model the user picked for Slide AI (settings page / AI panel).
  // Empty string = use the backend's default model.
  aiModel: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayName: '',
  defaultSlideCount: 10,
  defaultTone: 'Professional',
  defaultLanguage: 'English',
  autosaveDelay: 3,
  animationsEnabled: true,
  aiModel: '',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS }
    return {
      displayName:
        typeof parsed.displayName === 'string'
          ? parsed.displayName
          : DEFAULT_SETTINGS.displayName,
      defaultSlideCount:
        typeof parsed.defaultSlideCount === 'number' &&
        parsed.defaultSlideCount >= 1 &&
        parsed.defaultSlideCount <= 30
          ? parsed.defaultSlideCount
          : DEFAULT_SETTINGS.defaultSlideCount,
      defaultTone:
        typeof parsed.defaultTone === 'string'
          ? parsed.defaultTone
          : DEFAULT_SETTINGS.defaultTone,
      defaultLanguage:
        typeof parsed.defaultLanguage === 'string'
          ? parsed.defaultLanguage
          : DEFAULT_SETTINGS.defaultLanguage,
      autosaveDelay:
        parsed.autosaveDelay === 1 || parsed.autosaveDelay === 5
          ? parsed.autosaveDelay
          : parsed.autosaveDelay === 3
            ? 3
            : DEFAULT_SETTINGS.autosaveDelay,
      animationsEnabled:
        typeof parsed.animationsEnabled === 'boolean'
          ? parsed.animationsEnabled
          : DEFAULT_SETTINGS.animationsEnabled,
      aiModel:
        typeof parsed.aiModel === 'string'
          ? parsed.aiModel
          : DEFAULT_SETTINGS.aiModel,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  } catch {
    /* ignore storage errors */
  }
  return next
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    /* ignore storage errors */
  }
}
