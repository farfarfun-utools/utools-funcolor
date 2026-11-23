import { describe, expect, it } from 'vitest'
import {
  cmykToRgb,
  formatAllColorFormats,
  hslToRgb,
  hsvToRgb,
  oklchToRgb,
  parseColor,
  rgbaToHex,
  rgbToCmyk,
  rgbToHsl,
  rgbToHsv,
  rgbToOklch,
} from '../src/lib/color'
import {
  computeApcaLc,
  contrastRatio,
  evaluateContrast,
  simulateColorBlindness,
  suggestAccessibleForeground,
} from '../src/lib/contrast'
import {
  buildGradientCss,
  exportScaleAsCss,
  exportScaleAsJson,
  exportScaleAsTailwind,
  extractPaletteFromPixels,
  generateColorScale,
  generateHarmonies,
  GRADIENT_PRESETS,
} from '../src/lib/palette'
import { createDefaultState, pushColorHistory } from '../src/lib/storage'
import { findNearestSwatch, SWATCH_COLLECTIONS } from '../src/lib/swatches'

describe('color parsing and conversions', () => {
  it('parses HEX, RGB, RGBA, HSL, HSV, CMYK, OKLCH, and named colors', () => {
    expect(parseColor('#EC4899')).toEqual({ r: 236, g: 72, b: 153, a: 1 })
    expect(parseColor('#f0a')).toEqual({ r: 255, g: 0, b: 170, a: 1 })
    expect(parseColor('#EC489980')).toEqual({ r: 236, g: 72, b: 153, a: 0.502 })
    expect(parseColor('rgb(236, 72, 153)')).toEqual({ r: 236, g: 72, b: 153, a: 1 })
    expect(parseColor('rgba(236, 72, 153, 0.5)')).toEqual({ r: 236, g: 72, b: 153, a: 0.5 })
    expect(parseColor('hsl(330, 81%, 60%)')).toBeTruthy()
    expect(parseColor('hsv(330, 69%, 93%)')).toBeTruthy()
    expect(parseColor('cmyk(0%, 69%, 35%, 7%)')).toBeTruthy()
    expect(parseColor('oklch(0.656 0.212 354.3)')).toBeTruthy()
    expect(parseColor('pink')).toEqual({ r: 236, g: 72, b: 153, a: 1 })
    expect(parseColor('not-a-color')).toBeNull()
  })

  it('round-trips RGB <-> HSL / HSV / CMYK / OKLCH accurately', () => {
    const sample = { r: 236, g: 72, b: 153, a: 1 }

    const fromHsl = hslToRgb(rgbToHsl(sample))
    expect(Math.abs(fromHsl.r - sample.r)).toBeLessThanOrEqual(2)
    expect(Math.abs(fromHsl.g - sample.g)).toBeLessThanOrEqual(2)
    expect(Math.abs(fromHsl.b - sample.b)).toBeLessThanOrEqual(2)

    const fromHsv = hsvToRgb(rgbToHsv(sample))
    expect(Math.abs(fromHsv.r - sample.r)).toBeLessThanOrEqual(2)
    expect(Math.abs(fromHsv.g - sample.g)).toBeLessThanOrEqual(2)
    expect(Math.abs(fromHsv.b - sample.b)).toBeLessThanOrEqual(2)

    const fromCmyk = cmykToRgb(rgbToCmyk(sample))
    expect(Math.abs(fromCmyk.r - sample.r)).toBeLessThanOrEqual(3)
    expect(Math.abs(fromCmyk.g - sample.g)).toBeLessThanOrEqual(3)
    expect(Math.abs(fromCmyk.b - sample.b)).toBeLessThanOrEqual(3)

    const fromOklch = oklchToRgb(rgbToOklch(sample))
    expect(Math.abs(fromOklch.r - sample.r)).toBeLessThanOrEqual(2)
    expect(Math.abs(fromOklch.g - sample.g)).toBeLessThanOrEqual(2)
    expect(Math.abs(fromOklch.b - sample.b)).toBeLessThanOrEqual(2)
  })

  it('formats all 13 output formats cleanly', () => {
    const formats = formatAllColorFormats({ r: 236, g: 72, b: 153, a: 1 })
    expect(formats).toHaveLength(13)
    const map = Object.fromEntries(formats.map((f) => [f.id, f.value]))
    expect(map.hex).toBe('#EC4899')
    expect(map.hex8).toBe('#EC4899FF')
    expect(map.rgb).toBe('rgb(236, 72, 153)')
    expect(map.tailwind).toBe('bg-[#EC4899]')
    expect(map.flutter).toBe('Color(0xFFEC4899)')
    expect(map.android).toBe('<color name="brand">#EC4899</color>')
  })
})

describe('palettes, gradients, and pixel extraction', () => {
  it('generates 11-step perceptual scale and exports CSS/Tailwind/JSON', () => {
    const scale = generateColorScale({ r: 236, g: 72, b: 153, a: 1 })
    expect(scale).toHaveLength(11)
    expect(scale.map((s) => s.step)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
    expect(scale.filter((s) => s.isBase)).toHaveLength(1)

    const css = exportScaleAsCss(scale, 'rose')
    expect(css).toContain('--color-rose-500:')
    const tw = exportScaleAsTailwind(scale, 'rose')
    expect(tw).toContain('500:')
    const json = JSON.parse(exportScaleAsJson(scale)) as Record<string, string>
    expect(Object.keys(json)).toHaveLength(11)
  })

  it('generates 6 color harmony schemes', () => {
    const harmonies = generateHarmonies({ r: 236, g: 72, b: 153, a: 1 })
    expect(harmonies).toHaveLength(6)
    expect(harmonies[0].colors).toHaveLength(2)
    expect(harmonies[4].colors).toHaveLength(4)
  })

  it('builds linear, radial, and conic CSS gradients', () => {
    expect(buildGradientCss(GRADIENT_PRESETS[0].config)).toMatch(/^linear-gradient\(135deg,/)
    expect(buildGradientCss(GRADIENT_PRESETS[6].config)).toMatch(/^radial-gradient\(circle at center,/)
    expect(buildGradientCss(GRADIENT_PRESETS[7].config)).toMatch(/^conic-gradient\(from 45deg at center,/)
  })

  it('extracts dominant distinct colors from RGBA pixel buffer', () => {
    // 200 red pixels + 100 blue pixels
    const pixels = new Uint8ClampedArray(300 * 4)
    for (let i = 0; i < 200; i += 1) {
      pixels[i * 4] = 230
      pixels[i * 4 + 1] = 40
      pixels[i * 4 + 2] = 90
      pixels[i * 4 + 3] = 255
    }
    for (let i = 200; i < 300; i += 1) {
      pixels[i * 4] = 20
      pixels[i * 4 + 1] = 120
      pixels[i * 4 + 2] = 240
      pixels[i * 4 + 3] = 255
    }
    const swatches = extractPaletteFromPixels(pixels, 5)
    expect(swatches.length).toBeGreaterThanOrEqual(2)
    expect(swatches[0].weight).toBeGreaterThan(swatches[1].weight)
  })
})

describe('WCAG contrast, APCA, auto-fix, and color blindness', () => {
  it('computes exact WCAG contrast ratios and grades', () => {
    const black = { r: 0, g: 0, b: 0, a: 1 }
    const white = { r: 255, g: 255, b: 255, a: 1 }
    expect(contrastRatio(black, white)).toBe(21)
    expect(evaluateContrast(black, white).grade).toBe('AAA')
    expect(Math.abs(computeApcaLc(black, white))).toBeGreaterThan(100)
  })

  it('suggests an accessible foreground color when failing AA', () => {
    const lightPink = { r: 244, g: 164, b: 192, a: 1 }
    const white = { r: 255, g: 255, b: 255, a: 1 }
    const fixedHex = suggestAccessibleForeground(lightPink, white, 4.5)
    expect(fixedHex).toBeTruthy()
    const parsed = parseColor(fixedHex!)!
    expect(contrastRatio(parsed, white)).toBeGreaterThanOrEqual(4.5)
  })

  it('simulates color vision deficiency modes deterministically', () => {
    const red = { r: 239, g: 68, b: 68, a: 1 }
    const mono = simulateColorBlindness(red, 'achromatopsia')
    expect(mono.r).toBe(mono.g)
    expect(mono.g).toBe(mono.b)
    expect(rgbaToHex(simulateColorBlindness(red, 'normal'))).toBe('#EF4444')
  })

  it('provides curated offline swatch collections and deduplicates history', () => {
    expect(SWATCH_COLLECTIONS).toHaveLength(7)
    expect(findNearestSwatch({ r: 236, g: 72, b: 153 })?.hex).toBe('#EC4899')
    const defaults = createDefaultState()
    const next = pushColorHistory(defaults.history, '#10B981')
    expect(next[0]).toBe('#10B981')
    expect(new Set(next).size).toBe(next.length)
  })
})
