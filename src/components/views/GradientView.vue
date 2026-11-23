<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import { rgbaToHex, type RgbaColor } from '../../lib/color'
import {
  buildGradientCss,
  GRADIENT_PRESETS,
  type GradientConfig,
  type GradientStop,
} from '../../lib/palette'
import type { Locale } from '../../lib/i18n'

const props = defineProps<{
  gradient: GradientConfig
  activeColor: RgbaColor
  locale: Locale
}>()

const emit = defineEmits<{
  'update:gradient': [config: GradientConfig]
  copy: [text: string, label?: string]
}>()

const cssValue = computed(() => buildGradientCss(props.gradient))
const cssDeclaration = computed(() => `background: ${cssValue.value};`)

function updateConfig(patch: Partial<GradientConfig>) {
  emit('update:gradient', {
    ...props.gradient,
    ...patch,
    stops: patch.stops ?? props.gradient.stops.map((s) => ({ ...s })),
  })
}

function updateStop(id: string, patch: Partial<GradientStop>) {
  const nextStops = props.gradient.stops.map((s) => (s.id === id ? { ...s, ...patch } : { ...s }))
  updateConfig({ stops: nextStops })
}

function addStop() {
  if (props.gradient.stops.length >= 6) return
  const hex = rgbaToHex(props.activeColor)
  const nextStop: GradientStop = {
    id: `s-${Date.now().toString(36)}`,
    color: hex,
    position: 50,
  }
  updateConfig({ stops: [...props.gradient.stops, nextStop] })
}

function removeStop(id: string) {
  if (props.gradient.stops.length <= 2) return
  updateConfig({ stops: props.gradient.stops.filter((s) => s.id !== id) })
}

function reverseStops() {
  const reversed = props.gradient.stops
    .map((s) => ({ ...s, position: 100 - s.position }))
    .reverse()
  updateConfig({ stops: reversed })
}

function applyPreset(preset: GradientConfig) {
  emit('update:gradient', {
    type: preset.type,
    angle: preset.angle,
    stops: preset.stops.map((s) => ({ ...s })),
  })
}

function useActiveAsFirst() {
  const hex = rgbaToHex(props.activeColor)
  const nextStops = props.gradient.stops.map((s, idx) =>
    idx === 0 ? { ...s, color: hex } : { ...s },
  )
  updateConfig({ stops: nextStops })
}
</script>

<template>
  <div class="gradient-view">
    <!-- Large live preview -->
    <section class="gradient-stage card">
      <div class="gradient-preview" :style="{ background: cssValue }">
        <div class="preview-overlay">
          <span class="preview-badge mono">{{ gradient.type.toUpperCase() }}</span>
          <span v-if="gradient.type !== 'radial'" class="preview-badge mono">{{ gradient.angle }}°</span>
        </div>
      </div>

      <div class="css-output-bar">
        <code class="css-code mono">{{ cssDeclaration }}</code>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          @click="emit('copy', cssDeclaration, 'CSS Gradient')"
        >
          <AppIcon name="copy" :size="13" />
          {{ locale === 'en' ? 'Copy CSS' : '复制 CSS' }}
        </button>
      </div>
    </section>

    <div class="gradient-lower">
      <!-- Controls & Stops -->
      <section class="card controls-card">
        <div class="control-row">
          <div class="seg-group">
            <button
              v-for="mode in [
                { id: 'linear', zh: '线性 Linear', en: 'Linear' },
                { id: 'radial', zh: '径向 Radial', en: 'Radial' },
                { id: 'conic', zh: '锥形 Conic', en: 'Conic' },
              ]"
              :key="mode.id"
              type="button"
              class="seg-btn"
              :class="{ active: gradient.type === mode.id }"
              @click="updateConfig({ type: mode.id as GradientConfig['type'] })"
            >
              {{ locale === 'en' ? mode.en : mode.zh }}
            </button>
          </div>

          <div class="control-actions">
            <button type="button" class="btn btn-sm" @click="useActiveAsFirst">
              {{ locale === 'en' ? 'Use Active' : '套用主色' }}
            </button>
            <button type="button" class="btn btn-sm" @click="reverseStops">
              <AppIcon name="arrows-left-right" :size="13" />
              {{ locale === 'en' ? 'Reverse' : '反转' }}
            </button>
          </div>
        </div>

        <div v-if="gradient.type !== 'radial'" class="angle-row">
          <span class="angle-label">{{ locale === 'en' ? 'Angle' : '角度' }}</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            :value="gradient.angle"
            class="angle-slider"
            @input="updateConfig({ angle: Number(($event.target as HTMLInputElement).value) })"
          />
          <span class="angle-val mono">{{ gradient.angle }}°</span>
          <div class="quick-angles">
            <button
              v-for="deg in [45, 90, 135, 180]"
              :key="deg"
              type="button"
              class="btn btn-sm"
              @click="updateConfig({ angle: deg })"
            >
              {{ deg }}°
            </button>
          </div>
        </div>

        <div class="stops-head">
          <span class="section-title">{{ locale === 'en' ? 'Color Stops' : '色标节点' }}</span>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="gradient.stops.length >= 6"
            @click="addStop"
          >
            <AppIcon name="plus" :size="13" />
            {{ locale === 'en' ? 'Add Stop' : '添加节点' }}
          </button>
        </div>

        <div class="stops-list">
          <div v-for="stop in gradient.stops" :key="stop.id" class="stop-row">
            <input
              type="color"
              :value="stop.color"
              class="native-color"
              @input="updateStop(stop.id, { color: ($event.target as HTMLInputElement).value.toUpperCase() })"
            />
            <input
              type="text"
              :value="stop.color"
              class="input mono stop-hex"
              @change="updateStop(stop.id, { color: ($event.target as HTMLInputElement).value.trim().toUpperCase() })"
            />
            <input
              type="range"
              min="0"
              max="100"
              :value="stop.position"
              class="stop-range"
              @input="updateStop(stop.id, { position: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="stop-pos mono">{{ stop.position }}%</span>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              :disabled="gradient.stops.length <= 2"
              :title="locale === 'en' ? 'Remove stop' : '删除节点'"
              @click="removeStop(stop.id)"
            >
              <AppIcon name="trash" :size="13" />
            </button>
          </div>
        </div>
      </section>

      <!-- Curated Presets -->
      <section class="card presets-card">
        <h3 class="section-title">{{ locale === 'en' ? 'Curated Presets' : '精选预设' }}</h3>
        <div class="presets-grid">
          <button
            v-for="preset in GRADIENT_PRESETS"
            :key="preset.nameEn"
            type="button"
            class="preset-tile"
            @click="applyPreset(preset.config)"
          >
            <span class="preset-swatch" :style="{ background: buildGradientCss(preset.config) }" />
            <span class="preset-label">{{ locale === 'en' ? preset.nameEn : preset.nameZh }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.gradient-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.gradient-stage {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gradient-preview {
  position: relative;
  height: 148px;
  border-radius: 9px;
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.preview-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}

.preview-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.56);
  color: #ffffff;
  font-size: 11px;
  backdrop-filter: blur(4px);
}

.css-output-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.css-code {
  font-size: 11.5px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.gradient-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.95fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.controls-card,
.presets-card {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.control-actions {
  display: flex;
  gap: 6px;
}

.angle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.angle-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.angle-slider {
  flex: 1;
  min-width: 80px;
  accent-color: var(--accent);
}

.angle-val {
  width: 34px;
  font-size: 11.5px;
  text-align: right;
}

.quick-angles {
  display: flex;
  gap: 4px;
}

.stops-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stops-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  overflow-x: hidden;
}

.stop-row {
  display: grid;
  grid-template-columns: 28px 72px minmax(0, 1fr) 36px 26px;
  align-items: center;
  gap: 6px;
}

.native-color {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.stop-hex {
  height: 27px;
  padding: 0 6px;
  font-size: 11.5px;
  min-width: 0;
}

.stop-range {
  width: 100%;
  min-width: 0;
  accent-color: var(--accent);
}

.stop-pos {
  font-size: 11px;
  text-align: right;
  color: var(--text-secondary);
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  overflow-y: auto;
}

.preset-tile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  text-align: left;
  transition: border-color 0.15s;
}

.preset-tile:hover {
  border-color: var(--accent);
}

.preset-swatch {
  height: 36px;
  width: 100%;
  border-radius: 5px;
  border: 1px solid rgba(128, 128, 128, 0.16);
}

.preset-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-primary);
}

@media (max-width: 680px) {
  .gradient-lower {
    grid-template-columns: 1fr;
  }
}
</style>
