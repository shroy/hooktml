import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scanDirectives } from '../../core/scanDirectives.js'
import { registerHook, clearHookRegistry } from '../../core/hookRegistry.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: BUG-30 / issue #41
 * "use-component triggers 'Unknown hook useComponent' warnings."
 *
 * `getHookAttributesFromElement` must exclude the reserved `use-component`
 * component-binding attribute, so scanning an element that combines
 * `use-component="Name"` with a real hook does NOT emit an always-on
 * `Unknown hook "useComponent"` console warning on every scan.
 */
describe('issue #41 — use-component must not warn as an unknown hook', () => {
  let consoleWarnSpy

  beforeEach(() => {
    initConfig() // default config: no attribute prefix, debug off
    clearHookRegistry()
    document.body.innerHTML = ''
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    clearHookRegistry()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('does not warn "Unknown hook useComponent" when use-component sits beside a real hook', () => {
    const realHookImpl = vi.fn()
    function useRealHook(el, props) {
      realHookImpl(el, props)
    }
    expect(registerHook(useRealHook)).toBe(true)

    // Element combines the reserved `use-component` binding with a real hook.
    document.body.innerHTML = `
      <div id="target" use-component="Thing" use-real-hook></div>
    `

    // Run the REAL scan pipeline (not a mock).
    const processed = scanDirectives()

    // Sanity: the element was actually selected and the real hook ran.
    expect(processed).toBe(1)
    expect(realHookImpl).toHaveBeenCalledTimes(1)

    // The reserved component-binding attribute must NOT be reported as a hook.
    const warnedUnknownComponent = consoleWarnSpy.mock.calls.some(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('Unknown hook "useComponent"')
    )

    expect(warnedUnknownComponent).toBe(false)
  })
})
