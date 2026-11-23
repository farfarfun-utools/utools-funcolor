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

  it('supports keyboard nudging on 2D SV picker, gradient sanitization/random, and library search clear', async () => {
    const wrapper = mount(App)
    const sv = wrapper.find('[data-testid="sv-canvas"]')
    const beforeHex = wrapper.find('.active-hex').text()
    await sv.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    expect(wrapper.find('.active-hex').text()).not.toBe(beforeHex)

    // Gradient stop validation & random gradient
    await wrapper.find('[data-testid="nav-gradient"]').trigger('click')
    const stopInput = wrapper.find('.stop-hex')
    const validPrev = (stopInput.element as HTMLInputElement).value
    await stopInput.setValue('not-a-color')
    await stopInput.trigger('change')
    expect((stopInput.element as HTMLInputElement).value).toBe(validPrev)
    expect(wrapper.find('.css-code').text()).not.toContain('not-a-color')

    await wrapper.find('[data-testid="random-gradient-btn"]').trigger('click')
    expect(wrapper.find('.css-code').text()).toContain('gradient(')

    // Library search & clear
    await wrapper.find('[data-testid="nav-library"]').trigger('click')
    const searchInput = wrapper.find('[data-testid="library-search-input"]')
    await searchInput.setValue('胭脂')
    expect(wrapper.findAll('.swatch-card').length).toBe(1)
    await wrapper.find('[data-testid="library-search-clear"]').trigger('click')
    expect(wrapper.findAll('.swatch-card').length).toBeGreaterThan(10)

    wrapper.unmount()
  })
})
