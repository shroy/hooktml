import { describe, it, expect, vi } from 'vitest'
import { useEvents } from '../../hooks/useEvents.js'
import { withHookContext } from '../../core/hookContext.js'

/**
 * Regression: issue #13 (BUG-2) — multi-element useEvents cleanup must not leak.
 *
 * `useEvents([el1, el2, el3], { click: spy })` keyed its internal
 * `currentHandlers` map by event name only, so the outer `elements.forEach`
 * loop overwrote each previous element's wrapper. On cleanup only the LAST
 * element's wrapper was known, so removeEventListener was a no-op for elements
 * 0..N-2 and their listeners leaked (and reactive re-binds stacked handlers).
 *
 * These specs assert the CORRECT behavior: after cleanup NO element should
 * still invoke the handler, and each element's OWN wrapper is removed.
 *
 * BUG-34 note: `withHookContext` swallows exceptions, so cleanup + all
 * assertions run OUTSIDE the context.
 */
describe('regression #13 — multi-element useEvents cleanup', () => {
  it('cleanup removes the click listener from EVERY element (no leak)', () => {
    const el1 = document.createElement('button')
    const el2 = document.createElement('button')
    const el3 = document.createElement('button')
    document.body.append(el1, el2, el3)

    const spy = vi.fn()

    let cleanup
    withHookContext(el1, () => {
      cleanup = useEvents([el1, el2, el3], { click: spy })
    })

    // While listeners are live, all three elements fire the handler.
    el1.dispatchEvent(new Event('click'))
    el2.dispatchEvent(new Event('click'))
    el3.dispatchEvent(new Event('click'))
    expect(spy).toHaveBeenCalledTimes(3)

    spy.mockClear()

    // Run cleanup — should remove the listener from ALL elements.
    cleanup()

    el1.dispatchEvent(new Event('click'))
    el2.dispatchEvent(new Event('click'))
    el3.dispatchEvent(new Event('click'))

    // Correct behavior: zero calls after cleanup (buggy code fires el1 & el2).
    expect(spy).toHaveBeenCalledTimes(0)

    document.body.replaceChildren()
  })

  it('removes each element\'s OWN wrapper on cleanup', () => {
    const el1 = document.createElement('button')
    const el2 = document.createElement('button')
    const el3 = document.createElement('button')

    const add1 = vi.spyOn(el1, 'addEventListener')
    const add2 = vi.spyOn(el2, 'addEventListener')
    const add3 = vi.spyOn(el3, 'addEventListener')
    const remove1 = vi.spyOn(el1, 'removeEventListener')
    const remove2 = vi.spyOn(el2, 'removeEventListener')
    const remove3 = vi.spyOn(el3, 'removeEventListener')

    const spy = vi.fn()

    const cleanup = useEvents([el1, el2, el3], { click: spy })

    // Each element got its OWN distinct wrapper attached.
    const wrapper1 = add1.mock.calls.find(([name]) => name === 'click')[1]
    const wrapper2 = add2.mock.calls.find(([name]) => name === 'click')[1]
    const wrapper3 = add3.mock.calls.find(([name]) => name === 'click')[1]

    expect(wrapper1).not.toBe(wrapper2)
    expect(wrapper2).not.toBe(wrapper3)

    cleanup()

    // Correct behavior: each element must have its OWN wrapper removed.
    expect(remove1).toHaveBeenCalledWith('click', wrapper1)
    expect(remove2).toHaveBeenCalledWith('click', wrapper2)
    expect(remove3).toHaveBeenCalledWith('click', wrapper3)
  })
})
