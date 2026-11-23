import type { Locale } from './i18n'
import { GRADIENT_PRESETS, sanitizeGradientStopColor, type GradientConfig } from './palette'

export type ViewId = 'picker' | 'image' | 'palette' | 'gradient' | 'contrast' | 'library'
export type ThemeMode = 'system' | 'light' | 'dark'

export interface FunColorSettings {
  theme: ThemeMode
  locale: Locale
  copyFormat: 'hex' | 'rgb' | 'hsl' | 'oklch'
}

export interface StudioState {
  version: number
  activeView: ViewId
  activeHex: string
  contrastBg: string
  favorites: string[]
  history: string[]
  gradient: GradientConfig
  settings: FunColorSettings
}

const STORAGE_KEY = 'funcolor.studio.v1'
const STUDIO_VERSION = 1
const MAX_HISTORY = 24
const VALID_VIEWS = new Set<string>(['picker', 'image', 'palette', 'gradient', 'contrast', 'library'])

export function createDefaultState(): StudioState {
  return {
    version: STUDIO_VERSION,
    activeView: 'picker',
    activeHex: '#EC4899',
    contrastBg: '#FFFFFF',
    favorites: ['#EC4899', '#6366F1', '#10B981', '#F59E0B', '#0EA5E9', '#9D2933'],
    history: ['#EC4899', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#1E293B'],
    gradient: structuredClone(GRADIENT_PRESETS[0].config),
    settings: {
      theme: 'system',
      locale: 'zh-CN',
      copyFormat: 'hex',
    },
  }
}

function getSafeStorage(): Storage | null {
  try {
    const s =
      typeof window !== 'undefined' && window.localStorage ? window.localStorage : globalThis.localStorage
    if (s && typeof s.getItem === 'function' && typeof s.setItem === 'function') return s
  } catch {
    // ignore
  }
  return null
}

function sanitizeHexList(list: unknown, limit: number): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    const clean = item.trim().toUpperCase()
    if (!/^#[0-9A-F]{6}([0-9A-F]{2})?$/.test(clean)) continue
    if (seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
    if (out.length >= limit) break
  }
  return out
}

export function loadStudioState(): StudioState {
  const fallback = createDefaultState()
  const storage = getSafeStorage()
  if (!storage) return fallback

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<StudioState>
    if (!parsed || typeof parsed !== 'object') return fallback

    const rawSettings = parsed.settings ?? ({} as Partial<FunColorSettings>)
    const settings: FunColorSettings = {
      theme:
        rawSettings.theme === 'light' || rawSettings.theme === 'dark' || rawSettings.theme === 'system'
          ? rawSettings.theme
          : 'system',
      locale: rawSettings.locale === 'en' ? 'en' : 'zh-CN',
      copyFormat:
        rawSettings.copyFormat === 'rgb' ||
        rawSettings.copyFormat === 'hsl' ||
        rawSettings.copyFormat === 'oklch'
          ? rawSettings.copyFormat
          : 'hex',
    }

    const activeView =
      typeof parsed.activeView === 'string' && VALID_VIEWS.has(parsed.activeView)
        ? (parsed.activeView as ViewId)
        : 'picker'

    const activeHex =
      typeof parsed.activeHex === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(parsed.activeHex)
        ? parsed.activeHex.toUpperCase()
        : fallback.activeHex

    const contrastBg =
      typeof parsed.contrastBg === 'string' && /^#[0-9A-Fa-f]{6}$/.test(parsed.contrastBg)
        ? parsed.contrastBg.toUpperCase()
        : fallback.contrastBg

    const favorites = Array.isArray(parsed.favorites)
      ? sanitizeHexList(parsed.favorites, 60)
      : fallback.favorites
    const history = Array.isArray(parsed.history)
      ? sanitizeHexList(parsed.history, MAX_HISTORY)
      : fallback.history

    const gradient =
      parsed.gradient &&
      Array.isArray(parsed.gradient.stops) &&
      parsed.gradient.stops.length >= 2
        ? {
            type:
              parsed.gradient.type === 'radial' || parsed.gradient.type === 'conic'
                ? parsed.gradient.type
                : ('linear' as const),
            angle: Number.isFinite(parsed.gradient.angle) ? Math.round(parsed.gradient.angle) : 135,
            stops: parsed.gradient.stops.slice(0, 6).map((s, idx) => ({
              id: typeof s?.id === 'string' && s.id ? s.id : `s-${idx + 1}`,
              color: sanitizeGradientStopColor(typeof s?.color === 'string' ? s.color : '#EC4899'),
              position: Math.min(100, Math.max(0, Math.round(Number(s?.position) || 0))),
            })),
          }
        : fallback.gradient

    return {
      version: STUDIO_VERSION,
      activeView,
      activeHex,
      contrastBg,
      favorites,
      history,
      gradient,
      settings,
    }
  } catch {
    return fallback
  }
}

export function saveStudioState(state: StudioState): void {
  const storage = getSafeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function pushColorHistory(history: string[], hex: string): string[] {
  const clean = hex.trim().toUpperCase()
  const filtered = history.filter((item) => item.toUpperCase() !== clean)
  return [clean, ...filtered].slice(0, MAX_HISTORY)
}
