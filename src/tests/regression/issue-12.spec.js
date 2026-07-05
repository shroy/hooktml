import { describe, it, expect, vi } from 'vitest'
import { useEvents } from '../../hooks/useEvents.js'
import { signal } from '../../core/signal.js'
import { withHookContext } from '../../core/hookContext.js'

/**
 * Regression: issue #12 (BUG-1) — signal-wrapped event handlers must fire.
 *
 * `src/hooks/useEvents.js` used `.filter()` where `.map().filter()` was
 * intended: the callback unwrapped `handlerOrSignal.value` into a local but
 * `return [eventName, handler]` was read by `.filter()` as a truthy predicate,
 * so the ORIGINAL entry (the raw signal) was kept, not the unwrapped handler.
 * Downstream the `isFunction(handler)` guard then silently dropped the
 * dispatch because a signal is not a function.
 *
 * BUG-34 note: `withHookContext` swallows exceptions, so the spy is an OUTER
 * variable and every assertion runs OUTSIDE the context.
 */
describe('regression #12 — signal-wrapped event handlers must fire', () => {
  it('fires a signal-wrapped click handler when the event is dispatched', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const spy = vi.fn()
    const clickSignal = signal(spy)

    // Dispatch inside the context (listener must exist); assert outside.
    withHookContext(element, () => {
      useEvents(element, { click: clickSignal })
      element.dispatchEvent(new Event('click'))
    })

    // Correct behavior: the unwrapped handler runs, receiving (event, index).
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(expect.any(Event), 0)

    element.remove()
  })

  it('reflects a signal handler swapped AFTER binding without re-binding', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const first = vi.fn()
    const second = vi.fn()
    const clickSignal = signal(first)

    let cleanup
    withHookContext(element, () => {
      cleanup = useEvents(element, { click: clickSignal })
    })

    // Resolving the handler at dispatch time means swapping the signal's value
    // takes effect immediately, without any re-bind.
    clickSignal.value = second
    element.dispatchEvent(new Event('click'))

    expect(first).toHaveBeenCalledTimes(0)
    expect(second).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledWith(expect.any(Event), 0)

    cleanup()
    element.remove()
  })
})
