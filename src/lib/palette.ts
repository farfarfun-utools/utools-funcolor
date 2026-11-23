import {
  clamp,
  hslToRgb,
  oklchToRgb,
  parseColor,
  rgbaToHex,
  rgbToHsl,
  rgbToOklch,
  round,
  type RgbaColor,
} from './color'

export interface ScaleStop {
  step: number
  hex: string
  rgb: RgbaColor
  isBase: boolean
}

export type HarmonyKind =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic'
  | 'monochromatic'

export interface HarmonyScheme {
  id: HarmonyKind
  nameZh: string
  nameEn: string
  colors: string[]
}

export interface GradientStop {
  id: string
  color: string
  position: number // 0..100
}

export interface GradientConfig {
  type: 'linear' | 'radial' | 'conic'
  angle: number // 0..360
  stops: GradientStop[]
}

export interface ExtractedSwatch {
  hex: string
  rgb: RgbaColor
  weight: number // 0..100 percent
}

const TAILWIND_STOPS: Array<{ step: number; targetL: number; chromaFactor: number }> = [
  { step: 50, targetL: 0.97, chromaFactor: 0.14 },
  { step: 100, targetL: 0.93, chromaFactor: 0.28 },
  { step: 200, targetL: 0.87, chromaFactor: 0.46 },
  { step: 300, targetL: 0.78, chromaFactor: 0.7 },
  { step: 400, targetL: 0.68, chromaFactor: 0.9 },
  { step: 500, targetL: 0.59, chromaFactor: 1.0 },
  { step: 600, targetL: 0.5, chromaFactor: 0.96 },
  { step: 700, targetL: 0.42, chromaFactor: 0.86 },
  { step: 800, targetL: 0.34, chromaFactor: 0.72 },
  { step: 900, targetL: 0.27, chromaFactor: 0.56 },
  { step: 950, targetL: 0.19, chromaFactor: 0.42 },
]

export function generateColorScale(base: RgbaColor): ScaleStop[] {
  const ok = rgbToOklch(base)
  let closestIdx = 0
  let bestDist = Infinity
  TAILWIND_STOPS.forEach((s, idx) => {
    const dist = Math.abs(s.targetL - ok.l)
    if (dist < bestDist) {
      bestDist = dist
      closestIdx = idx
    }
  })

  return TAILWIND_STOPS.map((spec, idx) => {
    if (idx === closestIdx) {
      const clean = { ...base, a: 1 }
      return {
        step: spec.step,
        hex: rgbaToHex(clean),
        rgb: clean,
        isBase: true,
      }
    }
    const rgb = oklchToRgb({
      l: spec.targetL,
      c: clamp(ok.c * spec.chromaFactor, 0, 0.33),
      h: ok.h,
      a: 1,
    })
    return {
      step: spec.step,
      hex: rgbaToHex(rgb),
      rgb,
      isBase: false,
    }
  })
}

function shiftHue(base: RgbaColor, deg: number, sDelta = 0, lDelta = 0): string {
  const hsl = rgbToHsl(base)
  return rgbaToHex(
    hslToRgb({
      h: (hsl.h + deg + 360) % 360,
      s: clamp(hsl.s + sDelta, 5, 100),
      l: clamp(hsl.l + lDelta, 12, 92),
      a: 1,
    }),
  )
}

export function generateHarmonies(base: RgbaColor): HarmonyScheme[] {
  const hex = rgbaToHex({ ...base, a: 1 })
  return [
    {
      id: 'complementary',
      nameZh: '互补色',
      nameEn: 'Complementary',
      colors: [hex, shiftHue(base, 180)],
    },
    {
      id: 'analogous',
      nameZh: '类似色',
      nameEn: 'Analogous',
      colors: [shiftHue(base, -30), hex, shiftHue(base, 30)],
    },
    {
      id: 'triadic',
      nameZh: '三角色',
      nameEn: 'Triadic',
      colors: [hex, shiftHue(base, 120), shiftHue(base, 240)],
    },
    {
      id: 'split-complementary',
      nameZh: '分裂互补',
      nameEn: 'Split Comp.',
      colors: [hex, shiftHue(base, 150), shiftHue(base, 210)],
    },
    {
      id: 'tetradic',
      nameZh: '四角色',
      nameEn: 'Tetradic',
      colors: [hex, shiftHue(base, 90), shiftHue(base, 180), shiftHue(base, 270)],
    },
    {
      id: 'monochromatic',
      nameZh: '单色明度阶',
      nameEn: 'Monochromatic',
      colors: [
        shiftHue(base, 0, -10, 26),
        shiftHue(base, 0, -4, 13),
        hex,
        shiftHue(base, 0, 4, -14),
        shiftHue(base, 0, 8, -26),
      ],
    },
  ]
}

export function exportScaleAsCss(scale: ScaleStop[], prefix = 'brand'): string {
  const safe = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'brand'
  const lines = scale.map((s) => `  --color-${safe}-${s.step}: ${s.hex};`)
  return `:root {\n${lines.join('\n')}\n}`
}

export function exportScaleAsTailwind(scale: ScaleStop[], name = 'brand'): string {
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '') || 'brand'
  const entries = scale.map((s) => `    ${s.step}: '${s.hex}',`).join('\n')
  return `{\n  ${safe}: {\n${entries}\n  }\n}`
}

export function exportScaleAsJson(scale: ScaleStop[]): string {
  const obj: Record<string, string> = {}
  for (const s of scale) obj[String(s.step)] = s.hex
  return JSON.stringify(obj, null, 2)
}

export function sanitizeGradientStopColor(raw: string, fallback = '#EC4899'): string {
  const parsed = parseColor(raw)
  if (!parsed) {
    const fb = parseColor(fallback)
    return fb ? rgbaToHex(fb, false) : '#EC4899'
  }
  return rgbaToHex(parsed, false)
}

export function randomGradientConfig(): GradientConfig {
  const baseHue = Math.floor(Math.random() * 360)
  const spread = 45 + Math.floor(Math.random() * 95)
  const threeStops = Math.random() > 0.55
  const types: GradientConfig['type'][] = ['linear', 'linear', 'linear', 'radial', 'conic']
  const type = types[Math.floor(Math.random() * types.length)]
  const angle = Math.floor(Math.random() * 24) * 15

  const c1 = rgbaToHex(
    hslToRgb({ h: baseHue, s: 68 + Math.floor(Math.random() * 22), l: 50 + Math.floor(Math.random() * 14), a: 1 }),
  )
  const c2 = rgbaToHex(
    hslToRgb({
      h: (baseHue + spread) % 360,
      s: 68 + Math.floor(Math.random() * 22),
      l: 48 + Math.floor(Math.random() * 16),
      a: 1,
    }),
  )

  if (!threeStops) {
    return {
      type,
      angle,
      stops: [
        { id: `r1-${Date.now().toString(36)}`, color: c1, position: 0 },
        { id: `r2-${Date.now().toString(36)}`, color: c2, position: 100 },
      ],
    }
  }

  const cMid = rgbaToHex(
    hslToRgb({
      h: (baseHue + Math.round(spread * 0.5)) % 360,
      s: 70 + Math.floor(Math.random() * 20),
      l: 52 + Math.floor(Math.random() * 14),
      a: 1,
    }),
  )
  return {
    type,
    angle,
    stops: [
      { id: `r1-${Date.now().toString(36)}`, color: c1, position: 0 },
      { id: `r2-${Date.now().toString(36)}`, color: cMid, position: 50 },
      { id: `r3-${Date.now().toString(36)}`, color: c2, position: 100 },
    ],
  }
}

export function buildGradientCss(config: GradientConfig): string {
  const sorted = [...config.stops].sort((a, b) => a.position - b.position)
  const safeAngle = Number.isFinite(config.angle) ? ((Math.round(config.angle) % 360) + 360) % 360 : 135
  const stopList = sorted
    .map((s) => `${sanitizeGradientStopColor(s.color)} ${clamp(Math.round(Number(s.position) || 0), 0, 100)}%`)
    .join(', ')
  if (config.type === 'radial') {
    return `radial-gradient(circle at center, ${stopList})`
  }
  if (config.type === 'conic') {
    return `conic-gradient(from ${safeAngle}deg at center, ${stopList})`
  }
  return `linear-gradient(${safeAngle}deg, ${stopList})`
}

export const GRADIENT_PRESETS: Array<{ nameZh: string; nameEn: string; config: GradientConfig }> = [
  {
    nameZh: '落樱绯霞',
    nameEn: 'Sakura Rose',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 's1', color: '#EC4899', position: 0 },
        { id: 's2', color: '#F97316', position: 100 },
      ],
    },
  },
  {
    nameZh: '极光靛蓝',
    nameEn: 'Aurora Indigo',
    config: {
      type: 'linear',
      angle: 120,
      stops: [
        { id: 's1', color: '#6366F1', position: 0 },
        { id: 's2', color: '#06B6D4', position: 52 },
        { id: 's3', color: '#10B981', position: 100 },
      ],
    },
  },
  {
    nameZh: '暮光紫韵',
    nameEn: 'Twilight Violet',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 's1', color: '#7C3AED', position: 0 },
        { id: 's2', color: '#EC4899', position: 100 },
      ],
    },
  },
  {
    nameZh: '碧海晴空',
    nameEn: 'Ocean Sky',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 's1', color: '#0EA5E9', position: 0 },
        { id: 's2', color: '#2563EB', position: 100 },
      ],
    },
  },
  {
    nameZh: '暖金琥珀',
    nameEn: 'Warm Amber',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 's1', color: '#F59E0B', position: 0 },
        { id: 's2', color: '#EF4444', position: 100 },
      ],
    },
  },
  {
    nameZh: '森系翡翠',
    nameEn: 'Emerald Mint',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 's1', color: '#10B981', position: 0 },
        { id: 's2', color: '#0D9488', position: 100 },
      ],
    },
  },
  {
    nameZh: '深空星云',
    nameEn: 'Deep Nebula',
    config: {
      type: 'radial',
      angle: 0,
      stops: [
        { id: 's1', color: '#4F46E5', position: 0 },
        { id: 's2', color: '#1E1B4B', position: 100 },
      ],
    },
  },
  {
    nameZh: '霓虹光谱',
    nameEn: 'Prism Conic',
    config: {
      type: 'conic',
      angle: 45,
      stops: [
        { id: 's1', color: '#EC4899', position: 0 },
        { id: 's2', color: '#8B5CF6', position: 33 },
        { id: 's3', color: '#06B6D4', position: 66 },
        { id: 's4', color: '#EC4899', position: 100 },
      ],
    },
  },
]

/**
 * Quantized bucket clustering over raw RGBA pixel data to extract dominant distinct swatches.
 */
export function extractPaletteFromPixels(
  data: Uint8ClampedArray,
  maxColors = 6,
): ExtractedSwatch[] {
  const totalPixels = Math.floor(data.length / 4)
  if (totalPixels === 0) return []

  const step = Math.max(1, Math.floor(totalPixels / 4000))
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>()
  let sampled = 0

  for (let i = 0; i < totalPixels; i += step) {
    const off = i * 4
    const a = data[off + 3]
    if (a < 128) continue
    const r = data[off]
    const g = data[off + 1]
    const b = data[off + 2]
    // 5-bit per channel quantization
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const entry = buckets.get(key)
    if (entry) {
      entry.r += r
      entry.g += g
      entry.b += b
      entry.count += 1
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
    sampled += 1
  }

  if (sampled === 0) return []

  const sorted = [...buckets.values()]
    .map((b) => ({
      r: Math.round(b.r / b.count),
      g: Math.round(b.g / b.count),
      b: Math.round(b.b / b.count),
      count: b.count,
    }))
    .sort((a, b) => b.count - a.count)

  const picked: Array<{ r: number; g: number; b: number; count: number }> = []
  const minDistSq = 38 * 38

  for (const cand of sorted) {
    if (picked.length >= maxColors) break
    const tooClose = picked.some((p) => {
      const dr = p.r - cand.r
      const dg = p.g - cand.g
      const db = p.b - cand.b
      return dr * dr + dg * dg + db * db < minDistSq
    })
    if (!tooClose) picked.push(cand)
  }

  // Fallback if image is nearly monochrome
  if (picked.length < Math.min(maxColors, sorted.length)) {
    for (const cand of sorted) {
      if (picked.length >= maxColors) break
      if (!picked.includes(cand)) picked.push(cand)
    }
  }

  const pickedTotal = picked.reduce((acc, item) => acc + item.count, 0) || 1
  return picked.map((item) => {
    const rgb: RgbaColor = { r: item.r, g: item.g, b: item.b, a: 1 }
    return {
      hex: rgbaToHex(rgb),
      rgb,
      weight: round((item.count / pickedTotal) * 100, 1),
    }
  })
}
