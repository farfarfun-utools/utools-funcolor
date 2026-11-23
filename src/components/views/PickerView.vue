<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import {
  clamp,
  formatAllColorFormats,
  hsvToRgb,
  parseColor,
  rgbaToHex,
  rgbToHsv,
  round,
  type RgbaColor,
} from '../../lib/color'
import type { Locale } from '../../lib/i18n'

const props = defineProps<{
  color: RgbaColor
  favorites: string[]
  history: string[]
  locale: Locale
}>()

const emit = defineEmits<{
  'update:color': [color: RgbaColor, commitHistory?: boolean]
  copy: [text: string, label?: string]
  pickScreen: []
  random: []
  toggleFavorite: [hex: string]
}>()

const svAreaRef = ref<HTMLDivElement | null>(null)
const isDraggingSv = ref(false)
const inputValue = ref(rgbaToHex(props.color))
const inputError = ref(false)
const formatGroup = ref<'all' | 'css' | 'model' | 'code'>('all')

const hsv = ref(rgbToHsv(props.color))

watch(
  () => props.color,
  (next) => {
    if (!isDraggingSv.value) {
      const nextHsv = rgbToHsv(next)
      // Preserve hue when saturation or value hits 0 so dragging doesn't jump hue to 0
      if (nextHsv.s === 0 || nextHsv.v === 0) {
        hsv.value = { ...nextHsv, h: hsv.value.h }
      } else {
        hsv.value = nextHsv
      }
    }
    inputValue.value = next.a < 1 ? rgbaToHex(next, true) : rgbaToHex(next)
    inputError.value = false
  },
  { deep: true },
)

const activeHex = computed(() => rgbaToHex(props.color))
const isFav = computed(() => props.favorites.includes(activeHex.value))
const huePureColor = computed(() => `hsl(${Math.round(hsv.value.h)}, 100%, 50%)`)
const rgbaCss = computed(
  () => `rgba(${props.color.r}, ${props.color.g}, ${props.color.b}, ${round(props.color.a, 2)})`,
)

const formats = computed(() => {
  const all = formatAllColorFormats(props.color)
  if (formatGroup.value === 'all') return all
  return all.filter((f) => f.group === formatGroup.value)
})

function updateFromPointer(clientX: number, clientY: number, commit = false) {
  const el = svAreaRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)
  const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100)
  hsv.value = { ...hsv.value, s: round(s, 1), v: round(v, 1) }
  emit('update:color', hsvToRgb(hsv.value), commit)
}

function onSvPointerDown(e: PointerEvent) {
  isDraggingSv.value = true
  ;(e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId)
  updateFromPointer(e.clientX, e.clientY, false)
}

function onSvPointerMove(e: PointerEvent) {
  if (!isDraggingSv.value) return
  updateFromPointer(e.clientX, e.clientY, false)
}

function onSvPointerUp(e: PointerEvent) {
  if (!isDraggingSv.value) return
  isDraggingSv.value = false
  updateFromPointer(e.clientX, e.clientY, true)
}

function onHueInput(e: Event) {
  const h = Number((e.target as HTMLInputElement).value)
  hsv.value = { ...hsv.value, h }
  emit('update:color', hsvToRgb(hsv.value), false)
}

function onHueChange() {
  emit('update:color', hsvToRgb(hsv.value), true)
}

function onAlphaInput(e: Event) {
  const a = clamp(Number((e.target as HTMLInputElement).value) / 100, 0, 1)
  hsv.value = { ...hsv.value, a }
  emit('update:color', { ...props.color, a: round(a, 2) }, false)
}

function onRgbChannel(channel: 'r' | 'g' | 'b', e: Event) {
  const val = clamp(Math.round(Number((e.target as HTMLInputElement).value) || 0), 0, 255)
  emit('update:color', { ...props.color, [channel]: val }, true)
}

function onColorInputCommit() {
  const parsed = parseColor(inputValue.value)
  if (!parsed) {
    inputError.value = true
    return
  }
  inputError.value = false
  emit('update:color', parsed, true)
}

function selectQuickHex(hex: string) {
  const parsed = parseColor(hex)
  if (parsed) emit('update:color', parsed, true)
}
</script>

<template>
  <div class="picker-layout">
    <!-- Left column: Interactive 2D Picker & Sliders -->
    <section class="picker-left card">
      <div
        ref="svAreaRef"
        class="sv-canvas"
        :style="{ backgroundColor: huePureColor }"
        role="slider"
        :aria-label="locale === 'en' ? 'Saturation and brightness' : '饱和度与明度'"
        tabindex="0"
        @pointerdown="onSvPointerDown"
        @pointermove="onSvPointerMove"
        @pointerup="onSvPointerUp"
        @pointercancel="onSvPointerUp"
      >
        <div class="sv-white" />
        <div class="sv-black" />
        <div
          class="sv-cursor"
          :style="{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: activeHex,
          }"
        />
      </div>

      <div class="slider-stack">
        <div class="slider-row">
          <span class="slider-label">H</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            :value="Math.round(hsv.h)"
            class="range-hue"
            :aria-label="locale === 'en' ? 'Hue' : '色相'"
            @input="onHueInput"
            @change="onHueChange"
          />
          <span class="slider-val mono">{{ Math.round(hsv.h) }}°</span>
        </div>

        <div class="slider-row">
          <span class="slider-label">A</span>
          <div class="alpha-track checker-bg">
            <div
              class="alpha-fill"
              :style="{
                background: `linear-gradient(90deg, transparent, ${activeHex})`,
              }"
            />
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              :value="Math.round(color.a * 100)"
              class="range-alpha"
              :aria-label="locale === 'en' ? 'Opacity' : '透明度'"
              @input="onAlphaInput"
            />
          </div>
          <span class="slider-val mono">{{ Math.round(color.a * 100) }}%</span>
        </div>
      </div>

      <!-- Direct color parser input -->
      <div class="input-row">
        <div class="swatch-preview checker-bg" :title="activeHex">
          <div class="swatch-preview-fill" :style="{ backgroundColor: rgbaCss }" />
        </div>
        <input
          v-model="inputValue"
          type="text"
          class="input mono color-text-input"
          :class="{ 'is-error': inputError }"
          :placeholder="locale === 'en' ? '#EC4899 / rgb(...) / oklch(...)' : '输入 HEX / RGB / HSL / OKLCH / 颜色名'"
          @keydown.enter="onColorInputCommit"
          @blur="onColorInputCommit"
        />
        <button
          type="button"
          class="btn btn-icon"
          :title="isFav ? (locale === 'en' ? 'Remove favorite' : '取消收藏') : locale === 'en' ? 'Add favorite' : '收藏色值'"
          @click="emit('toggleFavorite', activeHex)"
        >
          <AppIcon :name="isFav ? 'star-fill' : 'star'" :size="14" :style="isFav ? { color: '#F59E0B' } : undefined" />
        </button>
      </div>

      <!-- RGB quick numeric fields -->
      <div class="rgb-grid">
        <label class="rgb-cell">
          <span>R</span>
          <input
            type="number"
            min="0"
            max="255"
            class="input mono"
            :value="color.r"
            @change="onRgbChannel('r', $event)"
          />
        </label>
        <label class="rgb-cell">
          <span>G</span>
          <input
            type="number"
            min="0"
            max="255"
            class="input mono"
            :value="color.g"
            @change="onRgbChannel('g', $event)"
          />
        </label>
        <label class="rgb-cell">
          <span>B</span>
          <input
            type="number"
            min="0"
            max="255"
            class="input mono"
            :value="color.b"
            @change="onRgbChannel('b', $event)"
          />
        </label>
      </div>

      <!-- Quick actions -->
      <div class="picker-actions">
        <button type="button" class="btn btn-primary" @click="emit('pickScreen')">
          <AppIcon name="pipette" :size="14" />
          {{ locale === 'en' ? 'Screen Pick' : '屏幕取色' }}
        </button>
        <button type="button" class="btn" @click="emit('random')">
          <AppIcon name="sparkles" :size="14" />
          {{ locale === 'en' ? 'Random' : '随机灵感' }}
        </button>
      </div>

      <!-- Favorites & Recent compact strips -->
      <div class="recent-block">
        <div class="recent-head">
          <span>{{ locale === 'en' ? 'Favorites' : '收藏色板' }}</span>
          <span class="mono muted">{{ favorites.length }}</span>
        </div>
        <div class="dot-strip">
          <button
            v-for="hex in favorites.slice(0, 10)"
            :key="`fav-${hex}`"
            type="button"
            class="color-dot"
            :class="{ active: hex.toUpperCase() === activeHex }"
            :style="{ backgroundColor: hex }"
            :title="hex"
            @click="selectQuickHex(hex)"
          />
        </div>
      </div>

      <div class="recent-block recent-tight">
        <div class="recent-head">
          <span>{{ locale === 'en' ? 'Recent' : '最近使用' }}</span>
          <span class="mono muted">{{ history.length }}</span>
        </div>
        <div class="dot-strip">
          <button
            v-for="hex in history.slice(0, 10)"
            :key="hex"
            type="button"
            class="color-dot"
            :class="{ active: hex.toUpperCase() === activeHex }"
            :style="{ backgroundColor: hex }"
            :title="hex"
            @click="selectQuickHex(hex)"
          />
        </div>
      </div>
    </section>

    <!-- Right column: All-Format Converter -->
    <section class="picker-right card">
      <div class="panel-head">
        <div>
          <h2 class="section-title">{{ locale === 'en' ? 'All-Format Color Codes' : '全格式色值转换' }}</h2>
          <p class="panel-sub">
            {{ locale === 'en' ? 'Click any row to copy immediately' : '点击任意格式卡片即可一键复制' }}
          </p>
        </div>
        <div class="seg-group">
          <button
            v-for="tab in [
              { id: 'all', zh: '全部', en: 'All' },
              { id: 'css', zh: 'CSS', en: 'CSS' },
              { id: 'model', zh: '色彩空间', en: 'Model' },
              { id: 'code', zh: '代码', en: 'Code' },
            ]"
            :key="tab.id"
            type="button"
            class="seg-btn"
            :class="{ active: formatGroup === tab.id }"
            @click="formatGroup = tab.id as typeof formatGroup"
          >
            {{ locale === 'en' ? tab.en : tab.zh }}
          </button>
        </div>
      </div>

      <div class="format-list">
        <button
          v-for="item in formats"
          :key="item.id"
          type="button"
          class="format-row"
          :title="locale === 'en' ? `Copy ${item.label}` : `复制 ${item.label}`"
          @click="emit('copy', item.value, item.label)"
        >
          <span class="format-tag">{{ item.label }}</span>
          <span class="format-val mono">{{ item.value }}</span>
          <span class="format-copy">
            <AppIcon name="copy" :size="13" />
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.picker-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.picker-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  overflow-y: auto;
}

.sv-canvas {
  position: relative;
  width: 100%;
  height: 164px;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
  border: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.sv-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0));
}

.sv-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #000, rgba(0, 0, 0, 0));
}

.sv-cursor {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2.5px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.slider-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-row {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 8px;
}

.slider-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.slider-val {
  font-size: 11px;
  text-align: right;
  color: var(--text-secondary);
}

.range-hue {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    #ff0000 0%,
    #ffff00 17%,
    #00ff00 33%,
    #00ffff 50%,
    #0000ff 67%,
    #ff00ff 83%,
    #ff0000 100%
  );
  outline: none;
  cursor: pointer;
}

.range-hue::-webkit-slider-thumb,
.range-alpha::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #1f2937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.alpha-track {
  position: relative;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.alpha-fill {
  position: absolute;
  inset: 0;
}

.range-alpha {
  position: relative;
  z-index: 1;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.swatch-preview {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.swatch-preview-fill {
  width: 100%;
  height: 100%;
}

.color-text-input {
  flex: 1;
  min-width: 0;
  font-size: 12px;
}

.color-text-input.is-error {
  border-color: #ef4444;
}

.rgb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.rgb-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rgb-cell span {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.rgb-cell input {
  width: 100%;
  min-width: 0;
  height: 27px;
  padding: 0 6px;
  font-size: 12px;
  text-align: center;
}

.picker-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.recent-block {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-tight {
  margin-top: 2px;
}

.recent-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

.dot-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid rgba(128, 128, 128, 0.25);
  transition: transform 0.12s;
}

.color-dot:hover {
  transform: scale(1.12);
}

.color-dot.active {
  box-shadow: 0 0 0 2px var(--bg-panel), 0 0 0 3.5px var(--accent);
}

.picker-right {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  gap: 10px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.panel-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}

.format-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 2px;
  min-height: 0;
  flex: 1;
}

.format-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.format-row:hover {
  border-color: var(--accent);
  background: var(--bg-active);
}

.format-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.format-val {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.format-copy {
  display: inline-flex;
  justify-content: flex-end;
  color: var(--text-muted);
}

.format-row:hover .format-copy {
  color: var(--accent);
}

@media (max-width: 680px) {
  .picker-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .picker-left,
  .picker-right {
    overflow: visible;
  }
}
</style>
