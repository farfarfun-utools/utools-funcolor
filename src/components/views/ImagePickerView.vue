<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import { rgbaToHex, type RgbaColor } from '../../lib/color'
import { extractPaletteFromPixels, type ExtractedSwatch } from '../../lib/palette'
import type { Locale } from '../../lib/i18n'

const props = defineProps<{
  imageSrc: string | null
  imageName: string
  locale: Locale
}>()

const emit = defineEmits<{
  'update:color': [color: RgbaColor, commitHistory?: boolean]
  'update:image': [dataUrl: string | null, name: string]
  copy: [text: string, label?: string]
  openFile: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const palette = ref<ExtractedSwatch[]>([])
const hoverHex = ref<string | null>(null)
const hoverCoords = ref<{ x: number; y: number } | null>(null)
const isDragOver = ref(false)
const swatchCount = ref(6)

function drawDemoArtwork(canvas: HTMLCanvasElement) {
  canvas.width = 480
  canvas.height = 300
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  // Multi-layered studio geometric artwork for instant offline demo
  const bg = ctx.createLinearGradient(0, 0, 480, 300)
  bg.addColorStop(0, '#1E1B4B')
  bg.addColorStop(0.5, '#312E81')
  bg.addColorStop(1, '#0F172A')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 480, 300)

  // Glowing coral-rose sun
  const sun = ctx.createRadialGradient(130, 110, 10, 130, 110, 125)
  sun.addColorStop(0, '#FDE047')
  sun.addColorStop(0.42, '#FB7185')
  sun.addColorStop(0.75, '#EC4899')
  sun.addColorStop(1, 'rgba(236, 72, 153, 0)')
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(130, 110, 125, 0, Math.PI * 2)
  ctx.fill()

  // Teal aurora wave
  const wave = ctx.createLinearGradient(160, 140, 480, 290)
  wave.addColorStop(0, '#06B6D4')
  wave.addColorStop(0.55, '#10B981')
  wave.addColorStop(1, '#047857')
  ctx.fillStyle = wave
  ctx.beginPath()
  ctx.moveTo(0, 240)
  ctx.bezierCurveTo(140, 150, 290, 260, 480, 140)
  ctx.lineTo(480, 300)
  ctx.lineTo(0, 300)
  ctx.closePath()
  ctx.fill()

  // Amber & violet geometric accents
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.arc(360, 88, 44, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(139, 92, 246, 0.85)'
  ctx.beginPath()
  ctx.roundRect(230, 155, 130, 74, 18)
  ctx.fill()

  extractCurrentCanvas()
}

function extractCurrentCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !canvas.width || !canvas.height) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  palette.value = extractPaletteFromPixels(imgData.data, swatchCount.value)
}

function renderSource(src: string | null) {
  const canvas = canvasRef.value
  if (!canvas) return
  if (!src) {
    drawDemoArtwork(canvas)
    return
  }
  const img = new Image()
  img.onload = () => {
    const maxW = 720
    const maxH = 440
    const scale = Math.min(1, maxW / img.width, maxH / img.height)
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    extractCurrentCanvas()
  }
  img.src = src
}

onMounted(() => {
  renderSource(props.imageSrc)
})

watch(() => props.imageSrc, (next) => renderSource(next))
watch(swatchCount, () => extractCurrentCanvas())

function readPixelAtEvent(e: MouseEvent): RgbaColor | null {
  const canvas = canvasRef.value
  if (!canvas || !canvas.width || !canvas.height) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width)))
  const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height)))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const px = ctx.getImageData(x, y, 1, 1).data
  hoverCoords.value = { x, y }
  return { r: px[0], g: px[1], b: px[2], a: Math.round((px[3] / 255) * 100) / 100 }
}

function onCanvasMove(e: MouseEvent) {
  const c = readPixelAtEvent(e)
  hoverHex.value = c ? rgbaToHex(c) : null
}

function onCanvasLeave() {
  hoverHex.value = null
  hoverCoords.value = null
}

function onCanvasClick(e: MouseEvent) {
  const c = readPixelAtEvent(e)
  if (!c) return
  emit('update:color', c, true)
  emit('copy', rgbaToHex(c), 'HEX')
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      emit('update:image', reader.result, file.name)
    }
  }
  reader.readAsDataURL(file)
}

function triggerChooseFile() {
  if (window.funcolor?.openImageFile) {
    emit('openFile')
  } else {
    fileInputRef.value?.click()
  }
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      emit('update:image', reader.result, file.name)
    }
  }
  reader.readAsDataURL(file)
}

function resetToDemo() {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  hoverHex.value = null
  hoverCoords.value = null
  emit('update:image', null, '')
}

function copyPaletteCss() {
  const lines = palette.value.map((s, idx) => `  --palette-${idx + 1}: ${s.hex};`)
  emit('copy', `:root {\n${lines.join('\n')}\n}`, 'CSS')
}

function copyPaletteJson() {
  emit(
    'copy',
    JSON.stringify(
      palette.value.map((s) => ({ hex: s.hex, weight: s.weight })),
      null,
      2,
    ),
    'JSON',
  )
}
</script>

<template>
  <div
    class="image-view"
    :class="{ 'is-dragover': isDragOver }"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <div class="image-toolbar card">
      <div class="image-toolbar-left">
        <button type="button" class="btn btn-primary" @click="triggerChooseFile">
          <AppIcon name="upload" :size="14" />
          {{ locale === 'en' ? 'Open Image' : '导入图片' }}
        </button>
        <button
          v-if="imageSrc"
          type="button"
          class="btn"
          data-testid="reset-demo-btn"
          @click="resetToDemo"
        >
          <AppIcon name="refresh-cw" :size="13" />
          {{ locale === 'en' ? 'Reset Demo' : '恢复示例图' }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="sr-only"
          @change="onFileChange"
        />
        <span class="image-meta" :title="imageSrc ? imageName : ''">
          {{ imageSrc ? imageName : locale === 'en' ? 'Built-in Demo Artwork (paste or drop any image)' : '内置示例画作（支持 Ctrl+V 粘贴或拖入任意图片）' }}
        </span>
      </div>

      <div class="image-toolbar-right">
        <div v-if="hoverHex" class="hover-chip" data-testid="hover-pixel-chip">
          <span class="hover-dot" :style="{ backgroundColor: hoverHex }" />
          <span class="mono">{{ hoverHex }}</span>
          <span v-if="hoverCoords" class="hover-coords mono">
            ({{ hoverCoords.x }}, {{ hoverCoords.y }})
          </span>
        </div>
        <div class="seg-group">
          <button
            v-for="cnt in [5, 6, 8]"
            :key="cnt"
            type="button"
            class="seg-btn"
            :class="{ active: swatchCount === cnt }"
            @click="swatchCount = cnt"
          >
            {{ cnt }} {{ locale === 'en' ? 'colors' : '色' }}
          </button>
        </div>
      </div>
    </div>

    <div class="image-grid">
      <div class="canvas-stage card checker-bg">
        <canvas
          ref="canvasRef"
          class="pick-canvas"
          @mousemove="onCanvasMove"
          @mouseleave="onCanvasLeave"
          @click="onCanvasClick"
        />
        <div class="canvas-hint">
          {{ locale === 'en' ? 'Click any pixel to pick & copy HEX' : '点击画面任意像素即可精准取色并复制' }}
        </div>
      </div>

      <aside class="extracted-panel card">
        <div class="extracted-head">
          <h3 class="section-title">
            {{ locale === 'en' ? 'Dominant Palette' : '自动提取主色板' }}
          </h3>
          <div class="extracted-actions">
            <button type="button" class="btn btn-sm" @click="copyPaletteCss">CSS</button>
            <button type="button" class="btn btn-sm" @click="copyPaletteJson">JSON</button>
          </div>
        </div>

        <div class="extracted-list">
          <button
            v-for="swatch in palette"
            :key="swatch.hex"
            type="button"
            class="extracted-item"
            @click="emit('update:color', swatch.rgb, true); emit('copy', swatch.hex, 'HEX')"
          >
            <span class="extracted-swatch" :style="{ backgroundColor: swatch.hex }" />
            <div class="extracted-info">
              <span class="mono extracted-hex">{{ swatch.hex }}</span>
              <div class="weight-bar">
                <div class="weight-fill" :style="{ width: `${Math.max(8, swatch.weight)}%`, backgroundColor: swatch.hex }" />
              </div>
            </div>
            <span class="mono extracted-pct">{{ swatch.weight }}%</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.image-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.image-view.is-dragover {
  outline: 2px dashed var(--accent);
  outline-offset: -4px;
  border-radius: var(--radius-md);
}

.image-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  flex-wrap: wrap;
}

.image-toolbar-left,
.image-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.image-meta {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hover-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  font-size: 11.5px;
}

.hover-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.hover-coords {
  font-size: 10.5px;
  color: var(--text-muted);
}

.image-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 232px;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.canvas-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow: hidden;
  min-height: 0;
}

.pick-canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  cursor: crosshair;
  box-shadow: var(--shadow-md);
}

.canvas-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  font-size: 11px;
  pointer-events: none;
  white-space: nowrap;
}

.extracted-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
  min-height: 0;
}

.extracted-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.extracted-actions {
  display: flex;
  gap: 4px;
}

.extracted-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  flex: 1;
}

.extracted-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  text-align: left;
  transition: border-color 0.15s;
}

.extracted-item:hover {
  border-color: var(--accent);
}

.extracted-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.extracted-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.extracted-hex {
  font-size: 12px;
  font-weight: 600;
}

.weight-bar {
  height: 4px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.weight-fill {
  height: 100%;
  border-radius: 999px;
}

.extracted-pct {
  font-size: 11px;
  text-align: right;
  color: var(--text-muted);
}

@media (max-width: 680px) {
  .image-grid {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .canvas-stage {
    min-height: 220px;
  }
}
</style>
