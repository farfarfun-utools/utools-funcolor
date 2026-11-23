import { clamp, oklchToRgb, rgbaToHex, rgbToOklch, round, type RgbaColor } from './color'

export type ColorBlindnessMode =
  | 'normal'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia'

export interface ContrastReport {
  ratio: number
  aaNormal: boolean
  aaLarge: boolean
  aaaNormal: boolean
  aaaLarge: boolean
  grade: 'AAA' | 'AA' | 'AA Large' | 'Fail'
  apcaLc: number
  suggestedAa: string | null
  suggestedAaa: string | null
}

function srgbToLin(v: number): number {
  const c = clamp(v, 0, 255) / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linToSrgb(v: number): number {
  const c = clamp(v, 0, 1)
  return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255)
}

export function relativeLuminance(c: RgbaColor): number {
  return 0.2126 * srgbToLin(c.r) + 0.7152 * srgbToLin(c.g) + 0.0722 * srgbToLin(c.b)
}

export function compositeOver(fg: RgbaColor, bg: RgbaColor): RgbaColor {
  const a = clamp(fg.a, 0, 1)
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  }
}

export function contrastRatio(fg: RgbaColor, bg: RgbaColor): number {
  const solidBg = { ...bg, a: 1 }
  const effFg = fg.a < 1 ? compositeOver(fg, solidBg) : fg
  const l1 = relativeLuminance(effFg)
  const l2 = relativeLuminance(solidBg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return round((lighter + 0.05) / (darker + 0.05), 2)
}

/**
 * Simplified APCA-W3 perceptual lightness contrast (Lc, range ~ -108..+106).
 */
export function computeApcaLc(fg: RgbaColor, bg: RgbaColor): number {
  const effFg = fg.a < 1 ? compositeOver(fg, bg) : fg
  const yTxt =
    0.2126729 * (effFg.r / 255) ** 2.4 +
    0.7151522 * (effFg.g / 255) ** 2.4 +
    0.072175 * (effFg.b / 255) ** 2.4
  const yBg =
    0.2126729 * (bg.r / 255) ** 2.4 +
    0.7151522 * (bg.g / 255) ** 2.4 +
    0.072175 * (bg.b / 255) ** 2.4

  const softClip = (y: number) => (y > 0.022 ? y : y + (0.022 - y) ** 1.414)
  const txt = softClip(yTxt)
  const back = softClip(yBg)
  if (Math.abs(back - txt) < 0.0005) return 0

  let sapc = 0
  if (back > txt) {
    sapc = (back ** 0.56 - txt ** 0.57) * 1.14
    return round(sapc < 0.1 ? 0 : (sapc - 0.027) * 100, 1)
  }
  sapc = (back ** 0.65 - txt ** 0.62) * 1.14
  return round(sapc > -0.1 ? 0 : (sapc + 0.027) * 100, 1)
}

export function suggestAccessibleForeground(
  fg: RgbaColor,
  bg: RgbaColor,
  targetRatio: number,
): string | null {
  if (contrastRatio(fg, bg) >= targetRatio) return null
  const ok = rgbToOklch(fg)
  let bestHex: string | null = null
  let bestDist = Infinity

  for (let i = 0; i <= 100; i += 1) {
    const l = i / 100
    const cand = oklchToRgb({ l, c: ok.c, h: ok.h, a: 1 })
    if (contrastRatio(cand, bg) >= targetRatio) {
      const dist = Math.abs(l - ok.l)
      if (dist < bestDist) {
        bestDist = dist
        bestHex = rgbaToHex(cand)
      }
    }
  }
  return bestHex
}

export function evaluateContrast(fg: RgbaColor, bg: RgbaColor): ContrastReport {
  const ratio = contrastRatio(fg, bg)
  const aaNormal = ratio >= 4.5
  const aaLarge = ratio >= 3
  const aaaNormal = ratio >= 7
  const aaaLarge = ratio >= 4.5
  const grade: ContrastReport['grade'] = aaaNormal
    ? 'AAA'
    : aaNormal
      ? 'AA'
      : aaLarge
        ? 'AA Large'
        : 'Fail'

  return {
    ratio,
    aaNormal,
    aaLarge,
    aaaNormal,
    aaaLarge,
    grade,
    apcaLc: computeApcaLc(fg, bg),
    suggestedAa: suggestAccessibleForeground(fg, bg, 4.5),
    suggestedAaa: suggestAccessibleForeground(fg, bg, 7.0),
  }
}

// Viénot 1999 / Machado linear-RGB color vision deficiency simulation matrices
const CVD_MATRICES: Record<Exclude<ColorBlindnessMode, 'normal'>, readonly number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
  achromatopsia: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
}

export function simulateColorBlindness(c: RgbaColor, mode: ColorBlindnessMode): RgbaColor {
  if (mode === 'normal') return { ...c }
  const m = CVD_MATRICES[mode]
  const r = srgbToLin(c.r)
  const g = srgbToLin(c.g)
  const b = srgbToLin(c.b)
  return {
    r: linToSrgb(m[0] * r + m[1] * g + m[2] * b),
    g: linToSrgb(m[3] * r + m[4] * g + m[5] * b),
    b: linToSrgb(m[6] * r + m[7] * g + m[8] * b),
    a: c.a,
  }
}

export const CVD_MODES: Array<{
  id: ColorBlindnessMode
  nameZh: string
  nameEn: string
  noteZh: string
  noteEn: string
}> = [
  { id: 'normal', nameZh: '正常视觉', nameEn: 'Normal', noteZh: '标准三色视觉', noteEn: 'Trichromatic' },
  { id: 'protanopia', nameZh: '红色盲', nameEn: 'Protanopia', noteZh: 'L 视锥缺失', noteEn: 'No Red Cones' },
  { id: 'deuteranopia', nameZh: '绿色盲', nameEn: 'Deuteranopia', noteZh: 'M 视锥缺失', noteEn: 'No Green Cones' },
  { id: 'tritanopia', nameZh: '蓝色盲', nameEn: 'Tritanopia', noteZh: 'S 视锥缺失', noteEn: 'No Blue Cones' },
  { id: 'achromatopsia', nameZh: '全色盲', nameEn: 'Achromatopsia', noteZh: '仅明度感知', noteEn: 'Monochrome' },
]
