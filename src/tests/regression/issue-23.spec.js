import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { scan } from '../../index.js'
import { scanDirectives } from '../../core/scanDirectives.js'
import { registerHook, clearHookRegistry } from '../../core/hookRegistry.js'
import { registerComponent, clearRegistry } from '../../core/registry.js'
import { lifecycleManager } from '../../core/initialization.js'
import { clearHookInstances } from '../../core/hookInstanceRegistry.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: BUG-12 / issue #23
 * "Processed guards keyed on teardown/instance presence cause re-execution and
 *  wrongful skips."
 *
 * The scan path must guard per-directive on `isDirectiveInitialized` (marked at
 * execution time) rather than on teardown/instance presence, so that:
 *  (a) a hook returning neither a teardown nor a truthy instance still runs
 *      exactly once across repeated scans, and
 *  (b) a `use-*` directive on an element that is ALSO a component still runs
 *      (the component's teardown must not skip the whole element).
 *
 * Counters live OUTSIDE the framework-managed call so withHookContext's
 * exception swallowing cannot hide a failure.
 */
describe('issue-23: processed-guard should be keyed on directive-initialized state', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    clearHookRegistry()
    clearRegistry()
    initConfig({ attributePrefix: '' })
  })

  afterEach(() => {
    document.querySelectorAll('*').forEach((el) => {
      lifecycleManager.executeTeardowns(el)
      clearHookInstances(el)
    })
    vi.restoreAllMocks()
  })

  it('(a) runs a no-teardown/no-instance hook exactly once across two scans', () => {
    let runCount = 0
    function useNoop() {
      runCount += 1
      return undefined
    }
    registerHook(useNoop)

    document.body.innerHTML = '<div id="target" use-noop></div>'

    scanDirectives()
    scanDirectives()

    // Intended: runs once. Unmodified code re-runs it on every scan.
    expect(runCount).toBe(1)
  })

  it('(b) applies a use-* directive on an element that is also a component', () => {
    let directiveRan = false
    function useMark() {
      directiveRan = true
    }
    registerHook(useMark)

    function Widget() {
      return () => {} // component cleanup -> hasRegistration() becomes true
    }
    registerComponent(Widget)

    // Same element is a component (.Widget) AND carries a use-* directive.
    document.body.innerHTML = '<div id="target" class="Widget" use-mark></div>'

    scan() // components first, then scanDirectives()

    // Intended: directive still runs. Unmodified code skips the whole element.
    expect(directiveRan).toBe(true)
  })
})
