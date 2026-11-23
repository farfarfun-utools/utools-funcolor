import { formatAllColorFormats, parseColor, rgbaToHex } from './color'
import { evaluateContrast } from './contrast'
import { generateColorScale, generateHarmonies, type HarmonyKind } from './palette'

const VALID_HARMONIES = new Set<string>([
  'all',
  'complementary',
  'analogous',
  'triadic',
  'split-complementary',
  'tetradic',
  'monochromatic',
])

export function convertColorTool(params: unknown) {
  if (!params || typeof params !== 'object') {
    return { ok: false as const, error: 'Parameters must be an object with a "color" string' }
  }
  const color = (params as Record<string, unknown>).color
  if (typeof color !== 'string' || !color.trim() || color.length > 120) {
    return { ok: false as const, error: 'Parameter "color" must be a non-empty color string' }
  }
  const parsed = parseColor(color)
  if (!parsed) {
    return { ok: false as const, error: `Unrecognized color value: "${color}"` }
  }
  const formats: Record<string, string> = {}
  for (const item of formatAllColorFormats(parsed)) {
    formats[item.id] = item.value
  }
  return {
    ok: true as const,
    hex: rgbaToHex(parsed),
    rgba: parsed,
    formats,
  }
}

export function checkContrastTool(params: unknown) {
  if (!params || typeof params !== 'object') {
    return { ok: false as const, error: 'Parameters must include "foreground" and "background"' }
  }
  const rec = params as Record<string, unknown>
  if (typeof rec.foreground !== 'string' || typeof rec.background !== 'string') {
    return { ok: false as const, error: '"foreground" and "background" must be strings' }
  }
  const fg = parseColor(rec.foreground)
  const bg = parseColor(rec.background)
  if (!fg) return { ok: false as const, error: `Invalid foreground color: "${rec.foreground}"` }
  if (!bg) return { ok: false as const, error: `Invalid background color: "${rec.background}"` }

  const report = evaluateContrast(fg, bg)
  return {
    ok: true as const,
    foreground: rgbaToHex(fg),
    background: rgbaToHex(bg),
    ...report,
  }
}

export function generatePaletteTool(params: unknown) {
  if (!params || typeof params !== 'object') {
    return { ok: false as const, error: 'Parameters must include a "color" string' }
  }
  const rec = params as Record<string, unknown>
  if (typeof rec.color !== 'string' || !rec.color.trim()) {
    return { ok: false as const, error: 'Parameter "color" must be a non-empty color string' }
  }
  const harmony = rec.harmony === undefined ? 'all' : rec.harmony
  if (typeof harmony !== 'string' || !VALID_HARMONIES.has(harmony)) {
    return { ok: false as const, error: 'Invalid "harmony" option' }
  }
  const parsed = parseColor(rec.color)
  if (!parsed) {
    return { ok: false as const, error: `Unrecognized color value: "${rec.color}"` }
  }

  const scale = generateColorScale(parsed).reduce<Record<string, string>>((acc, s) => {
    acc[String(s.step)] = s.hex
    return acc
  }, {})

  const allHarmonies = generateHarmonies(parsed)
  const filtered =
    harmony === 'all'
      ? allHarmonies
      : allHarmonies.filter((h) => h.id === (harmony as HarmonyKind))

  const harmonies: Record<string, string[]> = {}
  for (const h of filtered) {
    harmonies[h.id] = h.colors
  }

  return {
    ok: true as const,
    base: rgbaToHex(parsed),
    scale,
    harmonies,
  }
}

export function registerFunColorAiTools(): void {
  if (typeof window === 'undefined' || typeof window.utools?.registerTool !== 'function') {
    return
  }
  window.utools.registerTool('convert_color', convertColorTool)
  window.utools.registerTool('check_contrast', checkContrastTool)
  window.utools.registerTool('generate_palette', generatePaletteTool)
}
