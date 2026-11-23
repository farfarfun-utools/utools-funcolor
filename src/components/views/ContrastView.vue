<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import { parseColor, rgbaToHex, type RgbaColor } from '../../lib/color'
import {
  CVD_MODES,
  evaluateContrast,
  simulateColorBlindness,
  type ColorBlindnessMode,
} from '../../lib/contrast'
import type { Locale } from '../../lib/i18n'

const props = defineProps<{
  foreground: RgbaColor
  backgroundHex: string
  locale: Locale
}>()

const emit = defineEmits<{
  'update:foreground': [color: RgbaColor, commitHistory?: boolean]
  'update:backgroundHex': [hex: string]
  copy: [text: string, label?: string]
}>()

const fgInput = ref(rgbaToHex(props.foreground))
const bgInput = ref(props.backgroundHex)

watch(
  () => props.foreground,
  (next) => {
    fgInput.value = rgbaToHex(next)
  },
  { deep: true },
)

watch(
  () => props.backgroundHex,
  (next) => {
    bgInput.value = next
  },
)

const bgColor = computed<RgbaColor>(
  () => parseColor(props.backgroundHex) ?? { r: 255, g: 255, b: 255, a: 1 },
)

const report = computed(() => evaluateContrast(props.foreground, bgColor.value))

const gradePillClass = computed(() => {
  if (report.value.grade === 'AAA' || report.value.grade === 'AA') return 'pill-ok'
  if (report.value.grade === 'AA Large') return 'pill-warn'
  return 'pill-err'
})

function commitFg(raw: string) {
  const parsed = parseColor(raw)
  if (parsed) emit('update:foreground', parsed, true)
}

function commitBg(raw: string) {
  const parsed = parseColor(raw)
  if (parsed) emit('update:backgroundHex', rgbaToHex(parsed))
}

function swapColors() {
  const prevFgHex = rgbaToHex(props.foreground)
  const prevBg = bgColor.value
  emit('update:foreground', prevBg, true)
  emit('update:backgroundHex', prevFgHex)
}

function applySuggested(hex: string | null) {
  if (!hex) return
  commitFg(hex)
}

function simHex(c: RgbaColor, mode: ColorBlindnessMode): string {
  return rgbaToHex(simulateColorBlindness(c, mode))
}
</script>

<template>
  <div class="contrast-view">
    <!-- Top: Pair inputs + WCAG / APCA scorecard -->
    <div class="contrast-top">
      <section class="card pair-card">
        <div class="pair-inputs">
          <div class="color-field">
            <label class="field-label">{{ locale === 'en' ? 'Foreground (Text)' : '前景色（文字）' }}</label>
            <div class="field-controls">
              <input
                type="color"
                :value="rgbaToHex(foreground)"
                class="native-color"
                @input="commitFg(($event.target as HTMLInputElement).value)"
              />
              <input
                v-model="fgInput"
                type="text"
                class="input mono"
                @keydown.enter="commitFg(fgInput)"
                @blur="commitFg(fgInput)"
              />
            </div>
          </div>

          <button
            type="button"
            class="btn btn-icon swap-btn"
            :title="locale === 'en' ? 'Swap colors' : '互换前景与背景'"
            @click="swapColors"
          >
            <AppIcon name="arrows-left-right" :size="15" />
          </button>

          <div class="color-field">
            <label class="field-label">{{ locale === 'en' ? 'Background' : '背景色' }}</label>
            <div class="field-controls">
              <input
                type="color"
                :value="rgbaToHex(bgColor)"
                class="native-color"
                @input="commitBg(($event.target as HTMLInputElement).value)"
              />
              <input
                v-model="bgInput"
                type="text"
                class="input mono"
                @keydown.enter="commitBg(bgInput)"
                @blur="commitBg(bgInput)"
              />
            </div>
          </div>
        </div>

        <!-- Live preview sample -->
        <div
          class="typo-preview"
          :style="{
            backgroundColor: rgbaToHex(bgColor),
            color: rgbaToHex(foreground),
          }"
        >
          <div class="typo-large">
            {{ locale === 'en' ? 'Accessible Design Matters · 18pt Bold' : '清晰可读的色彩对比 · 大号标题 18pt' }}
          </div>
          <div class="typo-body">
            {{
              locale === 'en'
                ? 'Normal body text (14px) should meet WCAG AA (4.5:1) or AAA (7.0:1) for effortless reading.'
                : '正文文本（14px）建议达到 WCAG AA（4.5:1）或 AAA（7.0:1）标准，保证长文阅读清晰舒适。'
            }}
          </div>
        </div>
      </section>

      <section class="card score-card">
        <div class="score-hero">
          <div>
            <div class="score-label">WCAG 2.1</div>
            <div class="score-ratio mono">{{ report.ratio.toFixed(2) }}:1</div>
          </div>
          <span class="pill" :class="gradePillClass">{{ report.grade }}</span>
        </div>

        <div class="score-apca">
          <span>APCA Lc</span>
          <strong class="mono">{{ report.apcaLc }}</strong>
        </div>

        <div class="checks-grid">
          <div class="check-item">
            <span>AA {{ locale === 'en' ? 'Normal' : '正文' }} (4.5)</span>
            <span class="pill" :class="report.aaNormal ? 'pill-ok' : 'pill-err'">
              {{ report.aaNormal ? 'PASS' : 'FAIL' }}
            </span>
          </div>
          <div class="check-item">
            <span>AA {{ locale === 'en' ? 'Large' : '大字' }} (3.0)</span>
            <span class="pill" :class="report.aaLarge ? 'pill-ok' : 'pill-err'">
              {{ report.aaLarge ? 'PASS' : 'FAIL' }}
            </span>
          </div>
          <div class="check-item">
            <span>AAA {{ locale === 'en' ? 'Normal' : '正文' }} (7.0)</span>
            <span class="pill" :class="report.aaaNormal ? 'pill-ok' : 'pill-err'">
              {{ report.aaaNormal ? 'PASS' : 'FAIL' }}
            </span>
          </div>
          <div class="check-item">
            <span>AAA {{ locale === 'en' ? 'Large' : '大字' }} (4.5)</span>
            <span class="pill" :class="report.aaaLarge ? 'pill-ok' : 'pill-err'">
              {{ report.aaaLarge ? 'PASS' : 'FAIL' }}
            </span>
          </div>
        </div>

        <div v-if="report.suggestedAa || report.suggestedAaa" class="autofix-box">
          <div class="autofix-title">
            <AppIcon name="wand" :size="13" />
            {{ locale === 'en' ? 'One-Click Accessible Fix' : '一键优化达标前景色' }}
          </div>
          <div class="autofix-btns">
            <button
              v-if="report.suggestedAa"
              type="button"
              class="btn btn-sm"
              @click="applySuggested(report.suggestedAa)"
            >
              <span class="mini-dot" :style="{ backgroundColor: report.suggestedAa }" />
              AA · {{ report.suggestedAa }}
            </button>
            <button
              v-if="report.suggestedAaa"
              type="button"
              class="btn btn-sm"
              @click="applySuggested(report.suggestedAaa)"
            >
              <span class="mini-dot" :style="{ backgroundColor: report.suggestedAaa }" />
              AAA · {{ report.suggestedAaa }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Bottom: Color Vision Deficiency Simulator -->
    <section class="card cvd-card">
      <div class="cvd-head">
        <h3 class="section-title">
          <AppIcon name="eye" :size="14" style="vertical-align: -2px; margin-right: 4px" />
          {{ locale === 'en' ? 'Color Blindness Simulation' : '色觉障碍（色盲）实时模拟' }}
        </h3>
        <span class="cvd-note">
          {{ locale === 'en' ? 'Check how your foreground/background pair appears under 4 CVD conditions' : '实时评估当前配色在不同色觉障碍人群眼中的辨识度' }}
        </span>
      </div>

      <div class="cvd-grid">
        <div v-for="mode in CVD_MODES" :key="mode.id" class="cvd-tile">
          <div
            class="cvd-sample"
            :style="{
              backgroundColor: simHex(bgColor, mode.id),
              color: simHex(foreground, mode.id),
            }"
          >
            <span class="cvd-aa">Aa</span>
            <span class="cvd-badge mono">{{ simHex(foreground, mode.id) }}</span>
          </div>
          <div class="cvd-meta">
            <span class="cvd-name">{{ locale === 'en' ? mode.nameEn : mode.nameZh }}</span>
            <span class="cvd-sub">{{ locale === 'en' ? mode.noteEn : mode.noteZh }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contrast-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.contrast-top {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 12px;
}

.pair-card,
.score-card,
.cvd-card {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pair-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr);
  align-items: end;
  gap: 8px;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.field-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-controls .input {
  width: 100%;
  min-width: 0;
  font-size: 12px;
}

.native-color {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  flex-shrink: 0;
  cursor: pointer;
}

.swap-btn {
  margin-bottom: 1px;
}

.typo-preview {
  flex: 1;
  min-height: 124px;
  padding: 14px;
  border-radius: 9px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.typo-large {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}

.typo-body {
  font-size: 12.5px;
  line-height: 1.5;
  opacity: 0.94;
}

.score-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.score-ratio {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.score-apca {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  font-size: 12px;
  color: var(--text-secondary);
}

.checks-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.check-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-secondary);
}

.autofix-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.autofix-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent);
}

.autofix-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mini-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(128, 128, 128, 0.35);
}

.cvd-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.cvd-note {
  font-size: 11px;
  color: var(--text-muted);
}

.cvd-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.cvd-tile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  padding: 6px;
}

.cvd-sample {
  height: 60px;
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.cvd-aa {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

.cvd-badge {
  font-size: 9.5px;
  opacity: 0.85;
}

.cvd-meta {
  display: flex;
  flex-direction: column;
}

.cvd-name {
  font-size: 11.5px;
  font-weight: 600;
}

.cvd-sub {
  font-size: 10px;
  color: var(--text-muted);
}

@media (max-width: 680px) {
  .contrast-top {
    grid-template-columns: 1fr;
  }
  .cvd-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
