/**
 * Regression: BUG-16 / issue #27 — `element.component` is never cleared on teardown.
 *
 * `initializeComponents` assigns the component's context object onto the DOM element
 * via Object.defineProperty(element, 'component', …) (scanComponents.js:154-158), but
 * the teardown path never removes it, so detached elements keep a stale `.component`
 * API whose closed-over context/signals stay reachable.
 *
 * These specs assert the CORRECT behavior (the stale API + closed-over context object
 * must NOT survive teardown of a detached element). Assertions live outside any hook
 * context.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initializeComponents } from '../../core/scanComponents.js'
import * as registryModule from '../../core/registry.js'
import { lifecycleManager } from '../../core/initialization.js'
import { runCleanupFunctions } from '../../core/hookContext.js'
import { clearHookInstances } from '../../core/hookInstanceRegistry.js'

describe('BUG-16 / issue #27: element.component cleared on teardown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('clears element.component after lifecycleManager.executeTeardowns', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    // Context object holds closed-over state (simulating signals) that would leak if
    // the element keeps referencing it after removal.
    const context = { publicApi: vi.fn(), state: { count: 0 } }
    const componentFn = vi.fn().mockReturnValue({ context })
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)

    initializeComponents([{ element, componentName: 'TestComponent' }])

    // Precondition: the framework assigned the public API onto the element.
    expect(element['component']).toBe(context)

    // Documented teardown path.
    lifecycleManager.executeTeardowns(element)

    // Correct behavior: the stale API must be gone after teardown.
    expect(element['component']).toBe(undefined)
  })

  it('clears element.component across the full observer removeElement cleanup path', () => {
    // The observer delegate's removeElement (observer.js:283-296) runs exactly these
    // three steps. Reproduce them here (without the async MutationObserver callback,
    // which triggers an unrelated jsdom quirk) to prove the property is cleared.
    const element = document.createElement('div')
    document.body.appendChild(element)

    const context = { getCount: () => 42 }
    const componentFn = vi.fn().mockReturnValue({ context })
    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)

    initializeComponents([{ element, componentName: 'TestComponent' }])
    expect(element['component']).toBe(context)

    element.remove()

    // Exactly what removeElement does:
    lifecycleManager.executeTeardowns(element)
    runCleanupFunctions(element)
    clearHookInstances(element)

    // Correct behavior: detached element must not retain the stale component API.
    expect(element['component']).toBe(undefined)
  })
})
