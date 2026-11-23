'use strict'

const fs = require('node:fs')
const path = require('node:path')

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
}

function readImageAsDataUrl(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('Invalid image path')
  }
  const resolved = path.resolve(filePath)
  const ext = path.extname(resolved).toLowerCase()
  const mime = IMAGE_MIME[ext]
  if (!mime) {
    throw new Error(`Unsupported image format: ${ext || 'unknown'}`)
  }
  const stat = fs.lstatSync(resolved)
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('Only regular local image files are supported')
  }
  if (stat.size <= 0 || stat.size > MAX_IMAGE_BYTES) {
    throw new Error('Image size must be between 1 byte and 12 MB')
  }
  const buf = fs.readFileSync(resolved)
  return {
    name: path.basename(resolved),
    mime,
    size: stat.size,
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
  }
}

function openImageFile() {
  if (typeof utools === 'undefined' || typeof utools.showOpenDialog !== 'function') {
    return null
  }
  const picked = utools.showOpenDialog({
    title: '选择图片提取配色',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'] }],
  })
  if (!Array.isArray(picked) || picked.length === 0) return null
  return readImageAsDataUrl(picked[0])
}

function readEntryImageFiles(entries) {
  if (!Array.isArray(entries)) return []
  const out = []
  for (const item of entries.slice(0, 1)) {
    const p = typeof item === 'string' ? item : item && typeof item.path === 'string' ? item.path : ''
    if (!p) continue
    try {
      out.push(readImageAsDataUrl(p))
    } catch {
      // skip invalid file
    }
  }
  return out
}

function saveTextFile(defaultName, content) {
  if (typeof content !== 'string') throw new Error('Invalid file content')
  if (typeof utools === 'undefined' || typeof utools.showSaveDialog !== 'function') {
    return false
  }
  const safeName = String(defaultName || 'funcolor-palette.css').replace(/[\\/:*?"<>|]/g, '_')
  const target = utools.showSaveDialog({
    title: '导出色板文件',
    defaultPath: safeName,
  })
  if (!target) return false
  fs.writeFileSync(path.resolve(target), content, 'utf8')
  return true
}

function pickScreenColor() {
  return new Promise((resolve) => {
    if (typeof utools === 'undefined' || typeof utools.screenColorPick !== 'function') {
      resolve(null)
      return
    }
    try {
      utools.screenColorPick((hex) => {
        if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim())) {
          resolve(hex.trim().toUpperCase())
        } else if (hex && typeof hex.hex === 'string') {
          resolve(hex.hex.trim().toUpperCase())
        } else {
          resolve(null)
        }
      })
    } catch {
      resolve(null)
    }
  })
}

let pendingEnter = null
const enterListeners = new Set()

if (typeof utools !== 'undefined' && typeof utools.onPluginEnter === 'function') {
  utools.onPluginEnter((action) => {
    pendingEnter = action
    for (const cb of enterListeners) {
      try {
        cb(action)
      } catch {
        // ignore listener errors
      }
    }
  })
}

function onEnter(callback) {
  if (typeof callback !== 'function') return () => {}
  enterListeners.add(callback)
  if (pendingEnter) {
    const queued = pendingEnter
    pendingEnter = null
    queueMicrotask(() => callback(queued))
  }
  return () => {
    enterListeners.delete(callback)
  }
}

const api = {
  openImageFile,
  readEntryImageFiles,
  saveTextFile,
  pickScreenColor,
  onEnter,
}

if (typeof window !== 'undefined') {
  window.funcolor = api
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ...api, readImageAsDataUrl }
}
