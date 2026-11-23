<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import { parseColor, type RgbaColor } from '../../lib/color'
import { SWATCH_COLLECTIONS, type SwatchCollectionId } from '../../lib/swatches'
import type { Locale } from '../../lib/i18n'

type LibraryTab = SwatchCollectionId | 'favorites' | 'history'

const props = defineProps<{
  favorites: string[]
  history: string[]
  activeHex: string
  locale: Locale
}>()

const emit = defineEmits<{
  'update:color': [color: RgbaColor, commitHistory?: boolean]
  copy: [text: string, label?: string]
  toggleFavorite: [hex: string]
  clearHistory: []
}>()

const activeTab = ref<LibraryTab>('chinese')
const query = ref('')

const tabs = computed(() => [
  ...SWATCH_COLLECTIONS.map((c) => ({
    id: c.id as LibraryTab,
    label: props.locale === 'en' ? c.labelEn : c.labelZh,
    count: c.items.length,
  })),
  {
    id: 'favorites' as LibraryTab,
    label: props.locale === 'en' ? 'Favorites' : '我的收藏',
    count: props.favorites.length,
  },
  {
    id: 'history' as LibraryTab,
    label: props.locale === 'en' ? 'Recent' : '历史记录',
    count: props.history.length,
  },
])

interface DisplaySwatch {
  hex: string
  title: string
  subtitle: string
}

const visibleSwatches = computed<DisplaySwatch[]>(() => {
  const q = query.value.trim().toLowerCase()
  let list: DisplaySwatch[] = []

  if (activeTab.value === 'favorites') {
    list = props.favorites.map((hex) => ({
      hex,
      title: hex,
      subtitle: props.locale === 'en' ? 'Favorite' : '已收藏',
    }))
  } else if (activeTab.value === 'history') {
    list = props.history.map((hex, i) => ({
      hex,
      title: hex,
      subtitle: `#${i + 1}`,
    }))
  } else {
    const col = SWATCH_COLLECTIONS.find((c) => c.id === activeTab.value)
    if (col) {
      list = col.items.map((item) => ({
        hex: item.hex,
        title: props.locale === 'en' ? item.nameEn : item.nameZh,
        subtitle: item.note ?? item.nameEn,
      }))
    }
  }

  if (!q) return list
  return list.filter(
    (s) =>
      s.hex.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q),
  )
})

function pickSwatch(hex: string) {
  const parsed = parseColor(hex)
  if (!parsed) return
  emit('update:color', parsed, true)
  emit('copy', hex, 'HEX')
}
</script>

<template>
  <div class="library-view card">
    <div class="library-head">
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-pill"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <span class="tab-count mono">{{ tab.count }}</span>
        </button>
      </div>

      <div class="library-tools">
        <div class="search-box">
          <AppIcon name="search" :size="13" class="search-icon" />
          <input
            v-model="query"
            type="text"
            class="input search-input"
            data-testid="library-search-input"
            :placeholder="locale === 'en' ? 'Filter by name or HEX...' : '按色名或 HEX 筛选...'"
            @keydown.escape="query = ''"
          />
          <button
            v-if="query"
            type="button"
            class="clear-btn"
            data-testid="library-search-clear"
            :aria-label="locale === 'en' ? 'Clear filter' : '清空筛选'"
            :title="locale === 'en' ? 'Clear' : '清空'"
            @click="query = ''"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
        <span class="result-count mono">
          {{ visibleSwatches.length }} {{ locale === 'en' ? 'colors' : '色' }}
        </span>
        <button
          v-if="activeTab === 'history' && history.length"
          type="button"
          class="btn btn-sm"
          @click="emit('clearHistory')"
        >
          <AppIcon name="trash" :size="12" />
          {{ locale === 'en' ? 'Clear' : '清空' }}
        </button>
      </div>
    </div>

    <div v-if="visibleSwatches.length" class="swatch-grid">
      <div
        v-for="item in visibleSwatches"
        :key="`${activeTab}-${item.hex}-${item.title}`"
        role="button"
        tabindex="0"
        class="swatch-card"
        :class="{ 'is-active': item.hex.toUpperCase() === activeHex }"
        @click="pickSwatch(item.hex)"
        @keydown.enter="pickSwatch(item.hex)"
        @keydown.space.prevent="pickSwatch(item.hex)"
      >
        <div class="swatch-banner" :style="{ backgroundColor: item.hex }">
          <button
            type="button"
            class="fav-btn"
            :title="favorites.includes(item.hex.toUpperCase()) ? (locale === 'en' ? 'Unfavorite' : '取消收藏') : locale === 'en' ? 'Favorite' : '收藏'"
            @click.stop="emit('toggleFavorite', item.hex)"
          >
            <AppIcon
              :name="favorites.includes(item.hex.toUpperCase()) ? 'star-fill' : 'star'"
              :size="13"
              :style="favorites.includes(item.hex.toUpperCase()) ? { color: '#F59E0B' } : undefined"
            />
          </button>
        </div>
        <div class="swatch-body">
          <div class="swatch-name">{{ item.title }}</div>
          <div class="swatch-foot">
            <span class="mono swatch-hex">{{ item.hex }}</span>
            <span class="swatch-sub">{{ item.subtitle }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      {{ locale === 'en' ? 'No matching colors found.' : '暂无匹配的色卡' }}
    </div>
  </div>
</template>

<style scoped>
.library-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  height: 100%;
  min-height: 0;
}

.library-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 25px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.15s;
}

.tab-pill:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.tab-pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}

.tab-count {
  font-size: 10px;
  opacity: 0.8;
}

.library-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 280px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 28px;
  padding-left: 28px;
  padding-right: 26px;
  font-size: 12px;
}

.clear-btn {
  position: absolute;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: background 0.14s, color 0.14s;
}

.clear-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.result-count {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
  gap: 9px;
  overflow-y: auto;
  padding-right: 2px;
  flex: 1;
  align-content: start;
}

.swatch-card {
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.15s, box-shadow 0.15s;
}

.swatch-card:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.swatch-card.is-active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.swatch-banner {
  position: relative;
  height: 54px;
}

.fav-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.36);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
  transition: opacity 0.15s, background 0.15s;
}

.fav-btn:hover {
  opacity: 1;
  background: rgba(15, 23, 42, 0.62);
}

.swatch-body {
  padding: 7px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.swatch-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.swatch-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.swatch-hex {
  font-size: 10.5px;
  color: var(--text-secondary);
}

.swatch-sub {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
