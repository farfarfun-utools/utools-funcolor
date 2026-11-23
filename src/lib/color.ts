export interface RgbaColor {
  r: number // 0..255
  g: number // 0..255
  b: number // 0..255
  a: number // 0..1
}

export interface HslColor {
  h: number // 0..360
  s: number // 0..100
  l: number // 0..100
  a: number
}

export interface HsvColor {
  h: number // 0..360
  s: number // 0..100
  v: number // 0..100
  a: number
}

export interface CmykColor {
  c: number // 0..100
  m: number // 0..100
  y: number // 0..100
  k: number // 0..100
}

export interface OklchColor {
  l: number // 0..1
  c: number // 0..0.4
  h: number // 0..360
  a: number
}

export interface ColorFormatItem {
  id: string
  label: string
  group: 'css' | 'model' | 'code'
  value: string
}

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#3B82F6',
  yellow: '#EAB308',
  cyan: '#06B6D4',
  magenta: '#EC4899',
  pink: '#EC4899',
  rose: '#F43F5E',
  orange: '#F97316',
  amber: '#F59E0B',
  purple: '#A855F7',
  violet: '#8B5CF6',
  indigo: '#6366F1',
  teal: '#14B8A6',
  emerald: '#10B981',
  sky: '#0EA5E9',
  slate: '#64748B',
  gray: '#6B7280',
  grey: '#6B7280',
  coral: '#FF7F50',
  crimson: '#DC143C',
  gold: '#FFD700',
  navy: '#000080',
  olive: '#808000',
  salmon: '#FA8072',
  tomato: '#FF6347',
  turquoise: '#40E0D0',
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

export function round(val: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(val * factor) / factor
}

function toHexByte(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase()
}

export function rgbaToHex(c: RgbaColor, includeAlpha = false): string {
  const base = `#${toHexByte(c.r)}${toHexByte(c.g)}${toHexByte(c.b)}`
  if (!includeAlpha) return base
  return `${base}${toHexByte(c.a * 255)}`
}

export function rgbToHsl(c: RgbaColor): HslColor {
  const r = clamp(c.r, 0, 255) / 255
  const g = clamp(c.g, 0, 255) / 255
  const b = clamp(c.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60
        break
      case g:
        h = ((b - r) / d + 2) * 60
        break
      default:
        h = ((r - g) / d + 4) * 60
        break
    }
  }
  return { h: round(h, 1), s: round(s * 100, 1), l: round(l * 100, 1), a: round(clamp(c.a, 0, 1), 3) }
}

export function hslToRgb(hsl: HslColor): RgbaColor {
  const h = ((hsl.h % 360) + 360) % 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: clamp(hsl.a, 0, 1),
  }
}

export function rgbToHsv(c: RgbaColor): HsvColor {
  const r = clamp(c.r, 0, 255) / 255
  const g = clamp(c.g, 0, 255) / 255
  const b = clamp(c.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  const s = max === 0 ? 0 : d / max
  return { h: round(h, 1), s: round(s * 100, 1), v: round(max * 100, 1), a: round(clamp(c.a, 0, 1), 3) }
}

export function hsvToRgb(hsv: HsvColor): RgbaColor {
  const h = ((hsv.h % 360) + 360) % 360
  const s = clamp(hsv.s, 0, 100) / 100
  const v = clamp(hsv.v, 0, 100) / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: clamp(hsv.a, 0, 1),
  }
}

export function rgbToCmyk(c: RgbaColor): CmykColor {
  const r = clamp(c.r, 0, 255) / 255
  const g = clamp(c.g, 0, 255) / 255
  const b = clamp(c.b, 0, 255) / 255
  const k = 1 - Math.max(r, g, b)
  if (k >= 1 - 1e-9) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: round(((1 - r - k) / (1 - k)) * 100),
    m: round(((1 - g - k) / (1 - k)) * 100),
    y: round(((1 - b - k) / (1 - k)) * 100),
    k: round(k * 100),
  }
}

export function cmykToRgb(cmyk: CmykColor): RgbaColor {
  const c = clamp(cmyk.c, 0, 100) / 100
  const m = clamp(cmyk.m, 0, 100) / 100
  const y = clamp(cmyk.y, 0, 100) / 100
  const k = clamp(cmyk.k, 0, 100) / 100
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
    a: 1,
  }
}

function srgbToLinear(channel: number): number {
  const c = clamp(channel, 0, 1)
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(channel: number): number {
  const c = clamp(channel, 0, 1)
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
}

export function rgbToOklch(c: RgbaColor): OklchColor {
  const r = srgbToLinear(c.r / 255)
  const g = srgbToLinear(c.g / 255)
  const b = srgbToLinear(c.b / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bOk = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  const C = Math.hypot(a, bOk)
  let H = (Math.atan2(bOk, a) * 180) / Math.PI
  if (H < 0) H += 360

  return {
    l: round(clamp(L, 0, 1), 4),
    c: round(Math.max(0, C), 4),
    h: C < 1e-4 ? 0 : round(H, 1),
    a: round(clamp(c.a, 0, 1), 3),
  }
}

export function oklchToRgb(ok: OklchColor): RgbaColor {
  const L = clamp(ok.l, 0, 1)
  const C = Math.max(0, ok.c)
  const hRad = (ok.h * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return {
    r: Math.round(linearToSrgb(rLin) * 255),
    g: Math.round(linearToSrgb(gLin) * 255),
    b: Math.round(linearToSrgb(bLin) * 255),
    a: clamp(ok.a, 0, 1),
  }
}

function parseAlphaToken(token?: string): number {
  if (!token) return 1
  const t = token.trim()
  if (t.endsWith('%')) {
    const n = Number.parseFloat(t)
    return Number.isFinite(n) ? clamp(n / 100, 0, 1) : 1
  }
  const n = Number.parseFloat(t)
  return Number.isFinite(n) ? clamp(n, 0, 1) : 1
}

export function parseColor(input: string): RgbaColor | null {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  const lower = raw.toLowerCase()
  if (NAMED_COLORS[lower]) {
    return parseColor(NAMED_COLORS[lower])
  }

  // HEX: #RGB, #RGBA, #RRGGBB, #RRGGBBAA (allow bare 6/8 hex digits without #, require # for 3/4)
  const hexMatch = /^(?:#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|([0-9a-f]{6}|[0-9a-f]{8}))$/i.exec(raw)
  if (hexMatch) {
    const h = hexMatch[1] ?? hexMatch[2]
    if (h.length === 3 || h.length === 4) {
      const r = Number.parseInt(h[0] + h[0], 16)
      const g = Number.parseInt(h[1] + h[1], 16)
      const b = Number.parseInt(h[2] + h[2], 16)
      const a = h.length === 4 ? Number.parseInt(h[3] + h[3], 16) / 255 : 1
      return { r, g, b, a: round(a, 3) }
    }
    const r = Number.parseInt(h.slice(0, 2), 16)
    const g = Number.parseInt(h.slice(2, 4), 16)
    const b = Number.parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a: round(a, 3) }
  }

  // RGB / RGBA
  const rgbMatch =
    /^rgba?\(\s*([0-9.]+%?)\s*[,\s]\s*([0-9.]+%?)\s*[,\s]\s*([0-9.]+%?)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/i.exec(
      raw,
    )
  if (rgbMatch) {
    const parseChannel = (tok: string) => {
      if (tok.endsWith('%')) return clamp(Math.round((Number.parseFloat(tok) / 100) * 255), 0, 255)
      return clamp(Math.round(Number.parseFloat(tok)), 0, 255)
    }
    const r = parseChannel(rgbMatch[1])
    const g = parseChannel(rgbMatch[2])
    const b = parseChannel(rgbMatch[3])
    if ([r, g, b].some((v) => Number.isNaN(v))) return null
    return { r, g, b, a: round(parseAlphaToken(rgbMatch[4]), 3) }
  }

  // HSL / HSLA
  const hslMatch =
    /^hsla?\(\s*(-?[0-9.]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%?\s*[,\s]\s*([0-9.]+)%?(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/i.exec(
      raw,
    )
  if (hslMatch) {
    const h = Number.parseFloat(hslMatch[1])
    const s = Number.parseFloat(hslMatch[2])
    const l = Number.parseFloat(hslMatch[3])
    if ([h, s, l].some((v) => Number.isNaN(v))) return null
    return hslToRgb({ h, s, l, a: parseAlphaToken(hslMatch[4]) })
  }

  // HSV / HSB
  const hsvMatch =
    /^hs[vb]\(\s*(-?[0-9.]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%?\s*[,\s]\s*([0-9.]+)%?(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/i.exec(
      raw,
    )
  if (hsvMatch) {
    const h = Number.parseFloat(hsvMatch[1])
    const s = Number.parseFloat(hsvMatch[2])
    const v = Number.parseFloat(hsvMatch[3])
    if ([h, s, v].some((v2) => Number.isNaN(v2))) return null
    return hsvToRgb({ h, s, v, a: parseAlphaToken(hsvMatch[4]) })
  }

  // CMYK
  const cmykMatch =
    /^cmyk\(\s*([0-9.]+)%?\s*[,\s]\s*([0-9.]+)%?\s*[,\s]\s*([0-9.]+)%?\s*[,\s]\s*([0-9.]+)%?\s*\)$/i.exec(
      raw,
    )
  if (cmykMatch) {
    const c = Number.parseFloat(cmykMatch[1])
    const m = Number.parseFloat(cmykMatch[2])
    const y = Number.parseFloat(cmykMatch[3])
    const k = Number.parseFloat(cmykMatch[4])
    if ([c, m, y, k].some((v) => Number.isNaN(v))) return null
    return cmykToRgb({ c, m, y, k })
  }

  // OKLCH
  const oklchMatch =
    /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+(-?[0-9.]+)(?:deg)?(?:\s*\/\s*([0-9.]+%?))?\s*\)$/i.exec(
      raw,
    )
  if (oklchMatch) {
    const rawL = oklchMatch[1]
    const l = rawL.endsWith('%') ? Number.parseFloat(rawL) / 100 : Number.parseFloat(rawL)
    const c = Number.parseFloat(oklchMatch[2])
    const h = Number.parseFloat(oklchMatch[3])
    if ([l, c, h].some((v) => Number.isNaN(v))) return null
    return oklchToRgb({ l, c, h, a: parseAlphaToken(oklchMatch[4]) })
  }

  return null
}

export function formatAllColorFormats(c: RgbaColor): ColorFormatItem[] {
  const hex = rgbaToHex(c, false)
  const hex8 = rgbaToHex(c, true)
  const hsl = rgbToHsl(c)
  const hsv = rgbToHsv(c)
  const cmyk = rgbToCmyk(c)
  const ok = rgbToOklch(c)
  const aStr = round(c.a, 2)

  const rF = round(c.r / 255, 3)
  const gF = round(c.g / 255, 3)
  const bF = round(c.b / 255, 3)
  const alphaHex = toHexByte(c.a * 255)
  const rgbHexNoHash = hex.slice(1)

  return [
    { id: 'hex', label: 'HEX', group: 'css', value: hex },
    { id: 'hex8', label: 'HEX8', group: 'css', value: hex8 },
    { id: 'rgb', label: 'RGB', group: 'css', value: `rgb(${c.r}, ${c.g}, ${c.b})` },
    { id: 'rgba', label: 'RGBA', group: 'css', value: `rgba(${c.r}, ${c.g}, ${c.b}, ${aStr})` },
    {
      id: 'hsl',
      label: 'HSL',
      group: 'css',
      value: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
    },
    {
      id: 'oklch',
      label: 'OKLCH',
      group: 'model',
      value: `oklch(${round(ok.l, 3)} ${round(ok.c, 3)} ${round(ok.h, 1)})`,
    },
    {
      id: 'hsv',
      label: 'HSV',
      group: 'model',
      value: `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`,
    },
    {
      id: 'cmyk',
      label: 'CMYK',
      group: 'model',
      value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    },
    { id: 'cssvar', label: 'CSS Var', group: 'code', value: `--color-brand: ${hex};` },
    { id: 'tailwind', label: 'Tailwind', group: 'code', value: `bg-[${hex}]` },
    {
      id: 'swiftui',
      label: 'SwiftUI',
      group: 'code',
      value: `Color(red: ${rF}, green: ${gF}, blue: ${bF}${c.a < 1 ? `, opacity: ${aStr}` : ''})`,
    },
    {
      id: 'flutter',
      label: 'Flutter',
      group: 'code',
      value: `Color(0x${alphaHex}${rgbHexNoHash})`,
    },
    {
      id: 'android',
      label: 'Android XML',
      group: 'code',
      value: `<color name="brand">#${c.a < 1 ? alphaHex : ''}${rgbHexNoHash}</color>`,
    },
  ]
}

export function randomPleasantColor(): RgbaColor {
  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 30)
  const l = 42 + Math.floor(Math.random() * 22)
  return hslToRgb({ h, s, l, a: 1 })
}

export function nudgeHsv(
  hsv: HsvColor,
  key: string,
  shiftKey = false,
): HsvColor | null {
  const step = shiftKey ? 10 : 1
  if (key === 'ArrowRight') {
    return { ...hsv, s: round(clamp(hsv.s + step, 0, 100), 1) }
  }
  if (key === 'ArrowLeft') {
    return { ...hsv, s: round(clamp(hsv.s - step, 0, 100), 1) }
  }
  if (key === 'ArrowUp') {
    return { ...hsv, v: round(clamp(hsv.v + step, 0, 100), 1) }
  }
  if (key === 'ArrowDown') {
    return { ...hsv, v: round(clamp(hsv.v - step, 0, 100), 1) }
  }
  if (key === 'Home') {
    return { ...hsv, s: 0 }
  }
  if (key === 'End') {
    return { ...hsv, s: 100 }
  }
  return null
}
