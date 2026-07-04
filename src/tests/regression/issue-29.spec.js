/**
 * @vitest-environment jsdom
 *
 * Regression: issue #29 (BUG-18) — computed() dependencies must be released when the
 * owning hook context is torn down (not only via a manual destroy() the framework never
 * calls). We spy on `sig.subscribe` so the callback actually stored in the signal is a
 * counting wrapper; any notification of an abandoned computed bumps `fireCount`.
 *
 * Assertions live OUTSIDE withHookContext (which swallows exceptions).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from '../../core/computed.js'
import { signal } from '../../core/signal.js'
import { withHookContext, runCleanupFunctions } from '../../core/hookContext.js'

// Spy on `sig.subscribe` so the callback actually stored in the signal is a
// counting wrapper around the caller's real callback.
const instrumentSignal = (sig) => {
  const realSubscribe = sig.subscribe.bind(sig)
  let fires = 0
  let subs = 0
  vi.spyOn(sig, 'subscribe').mockImplementation((cb) => {
    subs++
    const wrapped = (...args) => {
      fires++
      return cb(...args)
    }
    return realSubscribe(wrapped)
  })
  return { fireCount: () => fires, subCount: () => subs }
}

describe('BUG-18 / issue #29: computed dependencies released automatically', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('tearing down the owning hook context releases the computed\'s dep subscriptions', () => {
    const s = signal(0)
    const probe = instrumentSignal(s)

    const element = document.createElement('div')
    document.body.appendChild(element)

    let computeCount = 0
    withHookContext(element, () => {
      const c = computed(() => {
        computeCount++
        return s.value * 2
      })
      void c.value                      // subscribes the computed to `s`
      // no expect() here — withHookContext swallows exceptions (BUG-34)
    })

    expect(computeCount).toBe(1)
    expect(probe.subCount()).toBe(1)

    runCleanupFunctions(element)        // documented teardown (observer removeElement)

    s.value = 1

    // CORRECT behavior: teardown of the owning hook context must release the
    // computed's subscriptions. computed() isn't wired to the hook context at
    // all on the unfixed tree -> subscription survives -> wrapper fires -> FAILS.
    expect(probe.fireCount()).toBe(0)
  })

  it('computeds created OUTSIDE a hook context are unaffected (manual destroy() still works)', () => {
    const s = signal(0)
    const probe = instrumentSignal(s)

    const c = computed(() => s.value * 2)
    void c.value
    expect(probe.subCount()).toBe(1)

    // No active hook context -> nothing auto-registers, but manual destroy()
    // must still release the subscription per the documented contract.
    c.destroy()
    s.value = 1
    expect(probe.fireCount()).toBe(0)
  })
})
