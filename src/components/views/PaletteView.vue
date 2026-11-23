<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import { parseColor, type RgbaColor } from '../../lib/color'
import { relativeLuminance } from '../../lib/contrast'
import {
  exportScaleAsCss,
  exportScaleAsJson,
  exportScaleAsTailwind,
  generateColorScale,
  generateHarmonies,
} from '../../lib/palette'
import type { Locale } from '../../lib/i18n'

const props = defineProps<{
  color: RgbaColor
  locale: Locale
}>()

const emit = defineEmits<{
  'update:color': [color: RgbaColor, commitHistory?: boolean]
  copy: [text: string, label?: string]
  saveFile: [filename: string, content: string]
}>()

const tokenName = ref('brand')

const scale = computed(() => generateColorScale(props.color))
const harmonies = computed(() => generateHarmonies(props.color))

function textColorOn(hex: string): string {
  const c = parseColor(hex)
  if (!c) return '#111827'
  return relativeLuminance(c) > 0.34 ? '#0F172A' : '#FFFFFF'
}

function applyHex(hex: string) {
  const parsed = parseColor(hex)
  if (parsed) emit('update:color', parsed, true)
}

function copyScale(kind: 'css' | 'tailwind' | 'json') {
  if (kind === 'css') emit('copy', exportScaleAsCss(scale.value, tokenName.value), 'CSS Tokens')
  else if (kind === 'tailwind')
    emit('copy', exportScaleAsTailwind(scale.value, tokenName.value), 'Tailwind')
  else emit('copy', exportScaleAsJson(scale.value), 'JSON')
}

function downloadCss() {
  const safe = tokenName.value.replace(/[^a-zA-Z0-9_-]/g, '') || 'brand'
  emit('saveFile', `${safe}-scale.css`, exportScaleAsCss(scale.value, safe))
}
</script>

<template>
  <div class="palette-view">
    <!-- 11-step Tailwind-style OKLCH perceptual scale -->
    <section class="card palette-section">
      <div class="section-head">
        <div>
          <h2 class="section-title">
            {{ locale === 'en' ? 'Perceptual Color Scale (50–950 · OKLCH)' : '感知均匀 11 级色阶 (50–950 · OKLCH)' }}
          </h2>
          <p class="section-sub">
            {{ locale === 'en' ? 'Click a chip to copy HEX · Double-click to set as active' : '单击色块复制 HEX · 双击设为当前主色' }}
          </p>
        </div>

        <div class="export-bar">
          <input
            v-model="tokenName"
            type="text"
            class="input token-input mono"
            :aria-label="locale === 'en' ? 'Token name' : '色阶变量名'"
            placeholder="brand"
          />
          <button type="button" class="btn btn-sm" @click="copyScale('css')">CSS</button>
          <button type="button" class="btn btn-sm" @click="copyScale('tailwind')">Tailwind</button>
          <button type="button" class="btn btn-sm" @click="copyScale('json')">JSON</button>
          <button
            type="button"
            class="btn btn-sm btn-icon"
            :title="locale === 'en' ? 'Save CSS file' : '导出 CSS 文件'"
            @click="downloadCss"
          >
            <AppIcon name="download" :size="13" />
          </button>
        </div>
      </div>

      <div class="scale-grid">
        <button
          v-for="stop in scale"
          :key="stop.step"
          type="button"
          class="scale-chip"
          :class="{ 'is-base': stop.isBase }"
          :style="{ backgroundColor: stop.hex, color: textColorOn(stop.hex) }"
          :title="`${stop.step} · ${stop.hex}`"
          @click="emit('copy', stop.hex, `${tokenName}-${stop.step}`)"
          @dblclick="applyHex(stop.hex)"
        >
          <span class="scale-step mono">{{ stop.step }}</span>
          <span v-if="stop.isBase" class="base-dot" />
          <span class="scale-hex mono">{{ stop.hex.slice(1) }}</span>
        </button>
      </div>
    </section>

    <!-- 6 Classic Color Harmonies -->
    <section class="card palette-section harmonies-card">
      <div class="section-head">
        <div>
          <h2 class="section-title">
            {{ locale === 'en' ? 'Color Harmonies' : '经典色彩和谐方案' }}
          </h2>
          <p class="section-sub">
            {{ locale === 'en' ? 'Click any color to copy · Click CSS to copy the whole set' : '点击单色复制，点击右侧按钮复制整组配色' }}
          </p>
        </div>
      </div>

      <div class="harmony-grid">
        <div v-for="scheme in harmonies" :key="scheme.id" class="harmony-item">
          <div class="harmony-head">
            <span class="harmony-name">
              {{ locale === 'en' ? scheme.nameEn : scheme.nameZh }}
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              @click="emit('copy', scheme.colors.join(', '), locale === 'en' ? scheme.nameEn : scheme.nameZh)"
            >
              <AppIcon name="copy" :size="12" />
              {{ locale === 'en' ? 'Copy' : '整组' }}
            </button>
          </div>
          <div class="harmony-strip">
            <button
              v-for="(hex, idx) in scheme.colors"
              :key="`${scheme.id}-${idx}`"
              type="button"
              class="harmony-swatch"
              :style="{ backgroundColor: hex, color: textColorOn(hex) }"
              :title="hex"
              @click="emit('copy', hex, 'HEX')"
              @dblclick="applyHex(hex)"
            >
              <span class="mono">{{ hex }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.palette-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.palette-section {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.harmonies-card {
  flex: 1;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.section-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}

.export-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.token-input {
  width: 78px;
  height: 26px;
  padding: 0 7px;
  font-size: 11.5px;
}

.scale-grid {
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 5px;
}

.scale-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 76px;
  padding: 7px 2px;
  border-radius: 8px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  transition: transform 0.12s, box-shadow 0.12s;
}

.scale-chip:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.scale-chip.is-base {
  box-shadow: 0 0 0 2px var(--bg-panel), 0 0 0 3.5px var(--accent);
}

.scale-step {
  font-size: 11px;
  font-weight: 700;
}

.base-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.scale-hex {
  font-size: 9.5px;
  opacity: 0.9;
}

.harmony-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.harmony-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-subtle);
}

.harmony-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.harmony-name {
  font-size: 12px;
  font-weight: 600;
}

.harmony-strip {
  display: flex;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid rgba(128, 128, 128, 0.18);
  height: 46px;
}

.harmony-swatch {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 4px 2px;
  font-size: 9.5px;
  font-weight: 600;
  transition: flex 0.15s;
}

.harmony-swatch:hover {
  flex: 1.35;
}

@media (max-width: 680px) {
  .scale-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .harmony-grid {
    grid-template-columns: 1fr;
  }
}
</style>
