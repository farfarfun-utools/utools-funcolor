// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App.vue'

describe('FunColor App UI', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, String(v))
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
        clear: () => {
          store.clear()
        },
      },
    })
    delete document.documentElement.dataset.theme
    window.funcolor = undefined
    window.utools = undefined
  })

  it('mounts cleanly and switches across all 6 workspace views', async () => {
    const wrapper = mount(App)
    expect(wrapper.find('.picker-layout').exists()).toBe(true)

    await wrapper.find('[data-testid="nav-palette"]').trigger('click')
    expect(wrapper.find('.scale-grid').exists()).toBe(true)

    await wrapper.find('[data-testid="nav-gradient"]').trigger('click')
    expect(wrapper.find('.gradient-preview').exists()).toBe(true)

    await wrapper.find('[data-testid="nav-contrast"]').trigger('click')
    expect(wrapper.find('.cvd-grid').exists()).toBe(true)

    await wrapper.find('[data-testid="nav-library"]').trigger('click')
    expect(wrapper.find('.swatch-grid').exists()).toBe(true)

    await wrapper.find('[data-testid="nav-image"]').trigger('click')
    expect(wrapper.find('.pick-canvas').exists()).toBe(true)

    wrapper.unmount()
  })

  it('cycles theme mode via sidebar button', async () => {
    const wrapper = mount(App)
    const themeBtn = wrapper.find('[data-testid="theme-btn"]')
    await themeBtn.trigger('click') // light
    expect(document.documentElement.dataset.theme).toBe('light')
    await themeBtn.trigger('click') // dark
    expect(document.documentElement.dataset.theme).toBe('dark')
    wrapper.unmount()
  })
})
