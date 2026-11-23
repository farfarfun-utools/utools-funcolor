import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  checkContrastTool,
  convertColorTool,
  generatePaletteTool,
  registerFunColorAiTools,
} from '../src/lib/ai-tools'

describe('FunColor AI / MCP tools', () => {
  it('converts valid colors and rejects invalid inputs', () => {
    const res = convertColorTool({ color: '#EC4899' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.hex).toBe('#EC4899')
      expect(res.formats.rgb).toBe('rgb(236, 72, 153)')
      expect(res.formats.oklch).toMatch(/^oklch\(/)
    }

    expect(convertColorTool({ color: 'invalid' }).ok).toBe(false)
    expect(convertColorTool(null).ok).toBe(false)
  })

  it('evaluates WCAG contrast and returns AA/AAA suggestions', () => {
    const res = checkContrastTool({ foreground: '#F4A4C0', background: '#FFFFFF' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.aaNormal).toBe(false)
      expect(res.suggestedAa).toMatch(/^#[0-9A-F]{6}$/)
    }
    expect(checkContrastTool({ foreground: '#000', background: 'bad' }).ok).toBe(false)
  })

  it('generates perceptual 11-step scale and requested harmony', () => {
    const res = generatePaletteTool({ color: '#6366F1', harmony: 'triadic' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(Object.keys(res.scale)).toHaveLength(11)
      expect(Object.keys(res.harmonies)).toEqual(['triadic'])
      expect(res.harmonies.triadic).toHaveLength(3)
    }
    expect(generatePaletteTool({ color: '#6366F1', harmony: 'unknown' }).ok).toBe(false)
  })

  it('registers exact tool names matching utools/plugin.json', () => {
    const manifestPath = path.resolve(process.cwd(), 'utools/plugin.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      tools: Record<string, unknown>
    }
    const registerTool = vi.fn()
    ;(globalThis as unknown as { window: { utools: { registerTool: typeof registerTool } } }).window =
      {
        utools: { registerTool },
      }

    registerFunColorAiTools()
    const registeredNames = registerTool.mock.calls.map((c) => c[0]).sort()
    expect(registeredNames).toEqual(Object.keys(manifest.tools).sort())
  })
})
