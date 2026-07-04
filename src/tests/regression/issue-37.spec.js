/**
 * @vitest-environment jsdom
 *
 * Regression: BUG-26 / issue #37
 * with() chains discard hook cleanup functions.
 *
 * Every chain method in src/core/with.js invoked the underlying hook but threw
 * away the cleanup closure the hook returned, so `with(el).useEvents({...})`
 * inside a component leaked listeners on teardown (the chainable API gave the
 * author no handle to plumb the cleanup themselves). The fix routes each hook's
 * returned cleanup into the active hook context via onCleanup(fn) (the
 * mechanism implemented by batch B3), so teardown reclaims it.
 *
 * All assertions live OUTSIDE any hook context.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initializeComponents } from '../../core/scanComponents.js'
import * as registryModule from '../../core/registry.js'
import { lifecycleManager } from '../../core/initialization.js'
import { withHookContext, runCleanupFunctions } from '../../core/hookContext.js'
import { registerChainableHook } from '../../core/hookRegistry.js'
import { with as withEl } from '../../core/with.js'
import { initConfig } from '../../core/config.js'

describe('issue #37 — with() chain hook cleanups are reclaimed on teardown', () => {
  beforeEach(() => {
    initConfig()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes with().useEvents listeners when the owning component is torn down', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const clickSpy = vi.fn()

    // A component that attaches a click listener via the chainable with() API.
    // It returns nothing — the author expects the framework to reclaim the
    // hook's cleanup, exactly as if useEvents were called directly.
    const componentFn = vi.fn(() => {
      withEl(element).useEvents({ click: clickSpy })
    })

    vi.spyOn(registryModule, 'getRegisteredComponent').mockReturnValue(componentFn)

    // Initialize the component inside a real hook context (production path).
    initializeComponents([{ element, componentName: 'LeakyComponent' }])

    // Sanity check: the listener really is attached while mounted.
    element.dispatchEvent(new Event('click'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    clickSpy.mockClear()

    // Tear the component down exactly like observer.removeElement does.
    lifecycleManager.executeTeardowns(element)
    runCleanupFunctions(element)

    // Dispatch a click AFTER teardown.
    element.dispatchEvent(new Event('click'))

    // Correct behavior: the listener was cleaned up, so the spy must NOT fire.
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('registers the useEvents cleanup into the active hook context', () => {
    const element = document.createElement('div')
    const clickSpy = vi.fn()

    // Run the chain call inside a hook context, then tear it down via the
    // context cleanup path only (no lifecycle teardown involved).
    withHookContext(element, () => {
      withEl(element).useEvents({ click: clickSpy })
    })

    // Listener attached while "mounted".
    element.dispatchEvent(new Event('click'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    clickSpy.mockClear()

    // Running the context cleanups alone must remove the listener.
    const ran = runCleanupFunctions(element)
    expect(ran).toBe(true)

    element.dispatchEvent(new Event('click'))
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('reclaims cleanups from dynamically registered chainable hooks', () => {
    const element = document.createElement('div')
    const teardown = vi.fn()
    const body = vi.fn(() => teardown)

    // A custom chainable hook that returns a cleanup closure. It must be a
    // *named* function whose name starts with "use" to satisfy the registry.
    function useCustom (...args) {
      return body(...args)
    }
    registerChainableHook(useCustom)

    withHookContext(element, () => {
      // The dynamic method is named after the registered hook function.
      withEl(element).useCustom('arg')
    })

    expect(body).toHaveBeenCalledTimes(1)
    // The custom hook's cleanup must not have run yet.
    expect(teardown).not.toHaveBeenCalled()

    // Tearing down the context must run the custom hook's cleanup.
    runCleanupFunctions(element)
    expect(teardown).toHaveBeenCalledTimes(1)
  })
})
