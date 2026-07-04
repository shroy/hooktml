/**
 * @vitest-environment jsdom
 *
 * Regression: issue #18 (BUG-7) — malformed/multi-rule Component.styles.
 *
 * If `styles` contains a `}` (a media query, or any typo), toCssRule yields a
 * multi-rule string that insertRule rejects with a SyntaxError. On the unfixed
 * code the throw skipped removeCloak (element stayed cloaked forever) and
 * skipped markInitialized (component re-ran on every scan). A robust injector
 * must remove the cloak and mark the component initialized exactly once.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initConfig } from '../../core/config.js'
import { registerComponent, clearRegistry } from '../../core/registry.js'
import { scanComponents, initializeComponents } from '../../core/scanComponents.js'
import { applyCloak } from '../../core/componentLifecycle.js'
import { lifecycleManager } from '../../core/initialization.js'

describe('issue #18: malformed/multi-rule Component.styles', () => {
  beforeEach(() => {
    initConfig({ debug: false })
    clearRegistry()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    clearRegistry()
    vi.restoreAllMocks()
  })

  it('removes the cloak and initializes exactly once when styles contain a media query', () => {
    let initCount = 0
    function MediaComponent() {
      initCount += 1
    }
    // styles contains a `}` (media query) -> toCssRule yields a multi-rule string.
    MediaComponent.styles = '@media (min-width: 600px) { color: red; }'
    registerComponent(MediaComponent)

    const element = document.createElement('div')
    element.className = 'MediaComponent'
    document.body.appendChild(element)
    applyCloak(element)
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(true)

    // First scan + initialize (real caller path).
    initializeComponents(scanComponents())
    const cloakAfterFirst = element.hasAttribute('data-hooktml-cloak')
    const initializedAfterFirst = lifecycleManager.isInitialized(element)

    // Second scan + initialize: must NOT re-run the component.
    initializeComponents(scanComponents())
    const initCountAfterSecond = initCount

    expect(initCount).toBeGreaterThanOrEqual(1)          // component body ran
    expect(cloakAfterFirst).toBe(false)                  // P0: cloak must be removed
    expect(initializedAfterFirst).toBe(true)             // must be marked initialized
    expect(initCountAfterSecond).toBe(1)                 // exactly one init across two scans
  })
})
