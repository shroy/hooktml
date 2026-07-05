import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scan } from '../../index.js'
import { registerComponent, clearRegistry } from '../../core/registry.js'
import { lifecycleManager } from '../../core/initialization.js'
import { logger } from '../../utils/logger.js'

/**
 * Regression: BUG-14 / issue #25
 * "Init flags set after user code runs -> reentrant double-initialization."
 *
 * A component whose body synchronously calls the public scan() must still be
 * initialized exactly once. Mark-before-run: the initialized flag has to be set
 * immediately after the guard (before the component body runs) so a reentrant
 * scan() does not re-enter initialization for the same element.
 *
 * The per-element run counter is captured OUTSIDE the framework-managed call so
 * that withHookContext's exception swallowing / return value cannot hide it.
 */
describe('issue #25 — reentrant double-initialization guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(logger, 'log').mockImplementation(() => {})
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    document.body.innerHTML = ''
    clearRegistry()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    clearRegistry()
    vi.restoreAllMocks()
  })

  it('runs a component body exactly once even if it synchronously calls scan()', () => {
    const runsByElement = new WeakMap()
    // Bounds reentrancy so an unguarded double-scan can't recurse forever;
    // exactly one reentrant scan() is enough to reveal the missing init flag.
    let reentered = false

    function Widget(element) {
      const prev = runsByElement.get(element) || 0
      runsByElement.set(element, prev + 1)
      if (!reentered) {
        reentered = true
        scan() // synchronously re-enters initializeComponents for the same element
      }
    }

    const el = document.createElement('div')
    el.classList.add('Widget')
    document.body.appendChild(el)

    registerComponent(Widget)

    scan() // single initial scan

    expect(runsByElement.get(el)).toBeGreaterThanOrEqual(1) // sanity
    expect(runsByElement.get(el)).toBe(1) // correct behavior: exactly once
    expect(lifecycleManager.isInitialized(el)).toBe(true)
  })
})
