import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PRELOAD_PATH = path.resolve(__dirname, '../utools/preload.js')
const PRELOAD_CODE = fs.readFileSync(PRELOAD_PATH, 'utf8')

function loadPreload() {
  let enterCb: ((action: unknown) => void) | null = null
  const utoolsMock = {
    onPluginEnter: vi.fn((cb: (action: unknown) => void) => {
      enterCb = cb
    }),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    getPath: vi.fn(() => os.tmpdir()),
    screenColorPick: vi.fn((cb: (val: unknown) => void) => cb({ hex: '#EC4899' })),
  }

  const sandboxWindow: Record<string, unknown> = {}
  const mod = { exports: {} as Record<string, unknown> }
  const context = vm.createContext({
    require: createRequire(PRELOAD_PATH),
    module: mod,
    exports: mod.exports,
    window: sandboxWindow,
    utools: utoolsMock,
    Buffer,
    console,
    queueMicrotask,
  })
  vm.runInContext(PRELOAD_CODE, context, { filename: PRELOAD_PATH })

  return {
    window: sandboxWindow as unknown as { funcolor: NonNullable<Window['funcolor']> },
    exports: mod.exports as { readImageAsDataUrl: (p: string) => { name: string; mime: string; dataUrl: string } | null },
    triggerEnter: (action: unknown) => {
      if (enterCb) enterCb(action)
    },
    utoolsMock,
  }
}

describe('utools/preload.js', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'funcolor-preload-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('reads supported image files as base64 data URLs and rejects unsupported files', () => {
    const { exports: modExports } = loadPreload()
    const pngPath = path.join(tmpDir, 'sample.png')
    const txtPath = path.join(tmpDir, 'notes.txt')
    fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    fs.writeFileSync(txtPath, 'hello')

    const loaded = modExports.readImageAsDataUrl(pngPath)
    expect(loaded).not.toBeNull()
    expect(loaded!.name).toBe('sample.png')
    expect(loaded!.mime).toBe('image/png')
    expect(loaded!.dataUrl).toMatch(/^data:image\/png;base64,/)

    expect(() => modExports.readImageAsDataUrl(txtPath)).toThrow('Unsupported image format')
    expect(() => modExports.readImageAsDataUrl(path.join(tmpDir, 'missing.png'))).toThrow()
  })

  it('buffers early onPluginEnter action and resolves screenColorPick', async () => {
    const { window: win, triggerEnter } = loadPreload()
    const payload = { code: 'color-regex', type: 'regex', payload: '#EC4899' }
    triggerEnter(payload)

    const received: unknown[] = []
    const off = win.funcolor.onEnter((a) => received.push(a))
    await Promise.resolve()
    expect(received).toEqual([payload])
    off()

    const picked = await win.funcolor.pickScreenColor()
    expect(picked).toBe('#EC4899')
  })
})
