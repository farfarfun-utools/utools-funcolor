<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppIcon, { type IconName } from './components/AppIcon.vue'
import PickerView from './components/views/PickerView.vue'
import ImagePickerView from './components/views/ImagePickerView.vue'
import PaletteView from './components/views/PaletteView.vue'
import GradientView from './components/views/GradientView.vue'
import ContrastView from './components/views/ContrastView.vue'
import LibraryView from './components/views/LibraryView.vue'
import { registerFunColorAiTools } from './lib/ai-tools'
import {
  parseColor,
  randomPleasantColor,
  rgbaToHex,
  rgbToHsl,
  type RgbaColor,
} from './lib/color'
import { t } from './lib/i18n'
import {
  loadStudioState,
  pushColorHistory,
  saveStudioState,
  type ThemeMode,
  type ViewId,
} from './lib/storage'
import type { GradientConfig } from './lib/palette'
import logoUrl from '../utools/logo.png'

const state = reactive(loadStudioState())
const activeColor = ref<RgbaColor>(
  parseColor(state.activeHex) ?? { r: 236, g: 72, b: 153, a: 1 },
)
const sidebarCollapsed = ref(false)
const imageSrc = ref<string | null>(null)
const imageName = ref('')
const toastText = ref('')
let toastTimer: number | null = null
let unsubscribeEnter: (() => void) | null = null

const navItems: Array<{ id: ViewId; icon: IconName; labelKey: Parameters<typeof t>[1] }> = [
  { id: 'picker', icon: 'pipette', labelKey: 'nav.picker' },
  { id: 'image', icon: 'image', labelKey: 'nav.image' },
  { id: 'palette', icon: 'palette', labelKey: 'nav.palette' },
  { id: 'gradient', icon: 'blend', labelKey: 'nav.gradient' },
  { id: 'contrast', icon: 'contrast', labelKey: 'nav.contrast' },
  { id: 'library', icon: 'bookmark', labelKey: 'nav.library' },
]

const activeHex = computed(() => rgbaToHex(activeColor.value))
const activeHsl = computed(() => rgbToHsl(activeColor.value))
const isFavorite = computed(() => state.favorites.includes(activeHex.value))

function showToast(msg: string) {
  toastText.value = msg
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
  }, 1900)
}

function resolveSystemDark(): boolean {
  if (typeof window.utools?.isDarkColors === 'function') {
    try {
      return window.utools.isDarkColors()
    } catch {
      // ignore
    }
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyTheme(mode: ThemeMode) {
  const effective = mode === 'system' ? (resolveSystemDark() ? 'dark' : 'light') : mode
  document.documentElement.dataset.theme = effective
}

function persist() {
  state.activeHex = activeColor.value.a < 1 ? rgbaToHex(activeColor.value, true) : activeHex.value
  saveStudioState({
    version: state.version,
    activeView: state.activeView,
    activeHex: state.activeHex,
    contrastBg: state.contrastBg,
    favorites: [...state.favorites],
    history: [...state.history],
    gradient: {
      type: state.gradient.type,
      angle: state.gradient.angle,
      stops: state.gradient.stops.map((s) => ({ ...s })),
    },
    settings: { ...state.settings },
  })
}

watch(
  () => state.settings.theme,
  (mode) => {
    applyTheme(mode)
    persist()
  },
  { immediate: true },
)

watch(() => [state.activeView, state.contrastBg, state.settings.locale], persist)

function setColor(color: RgbaColor, commitHistory = false) {
  activeColor.value = { ...color }
  if (commitHistory) {
    state.history = pushColorHistory(state.history, rgbaToHex(color))
  }
  persist()
}

async function copyText(text: string, label?: string) {
  try {
    if (window.utools?.copyText) {
      window.utools.copyText(text)
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
    const prefix = state.settings.locale === 'en' ? 'Copied' : '已复制'
    showToast(label ? `${prefix} ${label}: ${text.slice(0, 36)}` : `${prefix} ${text.slice(0, 36)}`)
  } catch {
    showToast(state.settings.locale === 'en' ? 'Copy failed' : '复制失败')
  }
}

async function handleScreenPick() {
  try {
    let pickedHex: string | null = null
    if (window.funcolor?.pickScreenColor) {
      pickedHex = await window.funcolor.pickScreenColor()
    } else if (window.EyeDropper) {
      const ed = new window.EyeDropper()
      const res = await ed.open()
      pickedHex = res.sRGBHex
    } else {
      showToast(
        state.settings.locale === 'en'
          ? 'Screen eyedropper requires uTools or Chromium EyeDropper'
          : '屏幕取色需在 uTools 或支持 EyeDropper 的浏览器中运行',
      )
      return
    }
    if (!pickedHex) return
    const parsed = parseColor(pickedHex)
    if (!parsed) return
    setColor(parsed, true)
    await copyText(rgbaToHex(parsed), 'HEX')
  } catch {
    // user cancelled
  }
}

function handleRandomColor() {
  const c = randomPleasantColor()
  setColor(c, true)
}

function toggleFavorite(hex: string) {
  const clean = hex.toUpperCase()
  const idx = state.favorites.indexOf(clean)
  if (idx >= 0) {
    state.favorites.splice(idx, 1)
    showToast(state.settings.locale === 'en' ? `Removed ${clean}` : `已取消收藏 ${clean}`)
  } else {
    state.favorites.unshift(clean)
    showToast(state.settings.locale === 'en' ? `Saved ${clean}` : `已收藏 ${clean}`)
  }
  persist()
}

function updateGradient(next: GradientConfig) {
  state.gradient = next
  persist()
}

function handleOpenImageFile() {
  const file = window.funcolor?.openImageFile?.()
  if (!file) return
  imageSrc.value = file.dataUrl
  imageName.value = file.name
  state.activeView = 'image'
}

function handleSaveFile(filename: string, content: string) {
  if (window.funcolor?.saveTextFile) {
    const ok = window.funcolor.saveTextFile(filename, content)
    if (ok) {
      showToast(state.settings.locale === 'en' ? `Saved ${filename}` : `已保存 ${filename}`)
    }
    return
  }
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function cycleTheme() {
  const order: ThemeMode[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(state.settings.theme) + 1) % order.length]
  state.settings.theme = next
}

function toggleLocale() {
  state.settings.locale = state.settings.locale === 'zh-CN' ? 'en' : 'zh-CN'
}

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (!file) continue
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          imageSrc.value = reader.result
          imageName.value = file.name || 'clipboard.png'
          state.activeView = 'image'
        }
      }
      reader.readAsDataURL(file)
      return
    }
  }
  const activeTag = (document.activeElement?.tagName ?? '').toLowerCase()
  if (activeTag === 'input' || activeTag === 'textarea') return
  const text = e.clipboardData?.getData('text')?.trim()
  if (!text) return
  const parsed = parseColor(text)
  if (parsed) {
    setColor(parsed, true)
    showToast(
      state.settings.locale === 'en'
        ? `Parsed ${rgbaToHex(parsed)}`
        : `已解析色值 ${rgbaToHex(parsed)}`,
    )
  }
}

onMounted(() => {
  registerFunColorAiTools()
  window.addEventListener('paste', handlePaste)

  if (window.funcolor?.onEnter) {
    unsubscribeEnter = window.funcolor.onEnter((action) => {
      if (action.code === 'color-pick') {
        state.activeView = 'picker'
        void handleScreenPick()
        return
      }
      if (action.code === 'color-files' && Array.isArray(action.payload)) {
        const loaded = window.funcolor?.readEntryImageFiles?.(
          action.payload as Array<string | { path?: string }>,
        )
        if (loaded && loaded.length > 0) {
          imageSrc.value = loaded[0].dataUrl
          imageName.value = loaded[0].name
          state.activeView = 'image'
        }
        return
      }
      if ((action.code === 'color-regex' || action.code === 'color-over') && typeof action.payload === 'string') {
        const parsed = parseColor(action.payload)
        if (parsed) {
          setColor(parsed, true)
          state.activeView = 'picker'
        }
      }
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', handlePaste)
  unsubscribeEnter?.()
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="studio-shell">
    <!-- Left Flat Navigation Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="brand-row">
        <img :src="logoUrl" alt="FunColor" class="brand-logo" />
        <div v-if="!sidebarCollapsed" class="brand-text">
          <div class="brand-title">{{ t(state.settings.locale, 'app.name') }}</div>
          <div class="brand-sub">{{ t(state.settings.locale, 'app.subtitle') }}</div>
        </div>
      </div>

      <div v-if="!sidebarCollapsed" class="nav-label">
        {{ t(state.settings.locale, 'nav.section') }}
      </div>

      <nav class="nav-list" :aria-label="t(state.settings.locale, 'nav.section')">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="nav-item"
          :class="{ active: state.activeView === item.id }"
          :data-testid="`nav-${item.id}`"
          :title="t(state.settings.locale, item.labelKey)"
          @click="state.activeView = item.id"
        >
          <AppIcon :name="item.icon" :size="15" />
          <span v-if="!sidebarCollapsed" class="nav-text">
            {{ t(state.settings.locale, item.labelKey) }}
          </span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          data-testid="theme-btn"
          :title="state.settings.theme"
          @click="cycleTheme"
        >
          <AppIcon
            :name="
              state.settings.theme === 'dark'
                ? 'moon'
                : state.settings.theme === 'light'
                  ? 'sun'
                  : 'monitor'
            "
            :size="14"
          />
        </button>
        <button
          v-if="!sidebarCollapsed"
          type="button"
          class="btn btn-ghost btn-sm mono"
          @click="toggleLocale"
        >
          {{ state.settings.locale === 'zh-CN' ? 'EN' : '中' }}
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-icon collapse-btn"
          :title="sidebarCollapsed ? 'Expand' : 'Collapse'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <AppIcon name="panel-left" :size="14" />
        </button>
      </div>
    </aside>

    <!-- Main Workspace Column -->
    <div class="workspace-col">
      <!-- Slim Active Color Topbar -->
      <header class="topbar">
        <div class="active-color-pill">
          <span class="active-chip" :style="{ backgroundColor: activeHex }" />
          <button
            type="button"
            class="active-hex mono"
            :title="t(state.settings.locale, 'action.copy')"
            @click="copyText(activeHex, 'HEX')"
          >
            {{ activeHex }}
          </button>
          <span class="active-meta mono">
            rgb({{ activeColor.r }}, {{ activeColor.g }}, {{ activeColor.b }}) · hsl({{ Math.round(activeHsl.h) }}°, {{ Math.round(activeHsl.s) }}%, {{ Math.round(activeHsl.l) }}%)
          </span>
        </div>

        <div class="topbar-actions">
          <button type="button" class="btn btn-sm btn-primary" @click="handleScreenPick">
            <AppIcon name="pipette" :size="13" />
            <span class="hide-narrow">{{ t(state.settings.locale, 'action.pickScreen') }}</span>
          </button>
          <button type="button" class="btn btn-sm" @click="handleRandomColor">
            <AppIcon name="sparkles" :size="13" />
            <span class="hide-narrow">{{ t(state.settings.locale, 'action.random') }}</span>
          </button>
          <button
            type="button"
            class="btn btn-sm btn-icon"
            :title="
              isFavorite
                ? t(state.settings.locale, 'action.unfavorite')
                : t(state.settings.locale, 'action.favorite')
            "
            @click="toggleFavorite(activeHex)"
          >
            <AppIcon
              :name="isFavorite ? 'star-fill' : 'star'"
              :size="14"
              :style="isFavorite ? { color: '#F59E0B' } : undefined"
            />
          </button>
        </div>
      </header>

      <!-- Active View Stage -->
      <main class="main-stage">
        <PickerView
          v-if="state.activeView === 'picker'"
          :color="activeColor"
          :favorites="state.favorites"
          :history="state.history"
          :locale="state.settings.locale"
          @update:color="setColor"
          @copy="copyText"
          @pick-screen="handleScreenPick"
          @random="handleRandomColor"
          @toggle-favorite="toggleFavorite"
        />

        <ImagePickerView
          v-else-if="state.activeView === 'image'"
          :image-src="imageSrc"
          :image-name="imageName"
          :locale="state.settings.locale"
          @update:color="setColor"
          @update:image="
            (url, name) => {
              imageSrc = url
              imageName = name
            }
          "
          @copy="copyText"
          @open-file="handleOpenImageFile"
        />

        <PaletteView
          v-else-if="state.activeView === 'palette'"
          :color="activeColor"
          :locale="state.settings.locale"
          @update:color="setColor"
          @copy="copyText"
          @save-file="handleSaveFile"
        />

        <GradientView
          v-else-if="state.activeView === 'gradient'"
          :gradient="state.gradient"
          :active-color="activeColor"
          :locale="state.settings.locale"
          @update:gradient="updateGradient"
          @copy="copyText"
        />

        <ContrastView
          v-else-if="state.activeView === 'contrast'"
          :foreground="activeColor"
          :background-hex="state.contrastBg"
          :locale="state.settings.locale"
          @update:foreground="setColor"
          @update:background-hex="(h) => (state.contrastBg = h)"
          @copy="copyText"
        />

        <LibraryView
          v-else
          :favorites="state.favorites"
          :history="state.history"
          :active-hex="activeHex"
          :locale="state.settings.locale"
          @update:color="setColor"
          @copy="copyText"
          @toggle-favorite="toggleFavorite"
          @clear-history="
            () => {
              state.history = []
              persist()
            }
          "
        />
      </main>

      <!-- Slim Status Bar -->
      <footer class="statusbar">
        <span class="status-left">
          <span class="status-dot" />
          {{ t(state.settings.locale, 'status.offline') }}
        </span>
        <span v-if="toastText" class="status-toast">
          <AppIcon name="check" :size="12" />
          {{ toastText }}
        </span>
        <span v-else class="status-right mono">
          {{ state.favorites.length }} ★ · {{ state.history.length }} {{ state.settings.locale === 'en' ? 'recent' : '历史' }}
        </span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.studio-shell {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-app);
}

.sidebar {
  width: 152px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 8px 8px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  transition: width 0.16s ease;
}

.sidebar.collapsed {
  width: 54px;
  align-items: center;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 10px;
}

.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  flex-shrink: 0;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 10.5px;
  color: var(--text-muted);
}

.nav-label {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  width: 100%;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 9px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  width: 100%;
  text-align: left;
  transition: background 0.14s, color 0.14s;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-active);
  color: var(--accent);
  font-weight: 600;
}

.nav-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  width: 100%;
}

.sidebar.collapsed .sidebar-footer {
  flex-direction: column;
}

.workspace-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.active-color-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.active-chip {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.28);
  flex-shrink: 0;
}

.active-hex {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  padding: 2px 5px;
  border-radius: 4px;
}

.active-hex:hover {
  background: var(--bg-hover);
}

.active-meta {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.main-stage {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}

.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  padding: 0 12px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.status-left {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.status-toast {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 640px) {
  .sidebar {
    width: 50px;
    align-items: center;
    padding: 8px 4px;
  }
  .brand-text,
  .nav-label,
  .nav-text,
  .active-meta,
  .hide-narrow {
    display: none;
  }
  .nav-item {
    justify-content: center;
    padding: 0;
  }
  .sidebar-footer {
    flex-direction: column;
  }
  .main-stage {
    padding: 8px;
  }
}
</style>
