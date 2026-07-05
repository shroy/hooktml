/**
 * @vitest-environment jsdom
 *
 * Regression: issue #15 (BUG-4) — a throwing computed must not poison global reactivity.
 *
 * The computed value getter sets `state.isComputing = true` and installs the shared
 * dependency tracker before calling `computeFn()`. Without a try/finally, a throwing
 * `computeFn()` leaves `isComputing` stuck true (so every later read reports a bogus
 * "Circular dependency detected") and never restores the tracker (so every subsequent
 * signal read anywhere in the app is captured as a dependency of the broken computed).
 * The scheduled microtask recompute must also swallow a throwing computeFn instead of
 * producing an unhandled rejection.
 *
 * Assertions live OUTSIDE any hook context so nothing swallows them.
 */
import { describe, it, expect, vi } from 'vitest'
import { computed } from '../../core/computed.js'
import { signal } from '../../core/signal.js'

describe('issue #15 - throwing computed must not poison reactivity', () => {
  it('(1) after computeFn throws, a subsequent read re-attempts and does NOT report a bogus circular dependency', () => {
    const boom = new Error('boom-from-computeFn')
    const compute = vi.fn(() => { throw boom })
    const broken = computed(compute)

    let firstError
    try { broken.value } catch (e) { firstError = e }
    expect(firstError).toBe(boom)
    expect(compute).toHaveBeenCalledTimes(1)

    // Correct behavior: retry (still throws the real error). BUG: isComputing
    // left true, so it throws "Circular dependency detected" without re-calling computeFn.
    let secondError
    try { broken.value } catch (e) { secondError = e }
    expect(secondError).toBeDefined()
    expect(String(secondError && secondError.message)).not.toMatch(/Circular dependency detected/)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('(2) after a computed throws, reading an unrelated signal must NOT be captured as a dependency of the broken computed', () => {
    const broken = computed(() => { throw new Error('boom') })
    try { broken.value } catch { /* expected */ }

    // Unrelated signal created AFTER the throw.
    const unrelated = signal(0)
    const subscribeSpy = vi.spyOn(unrelated, 'subscribe')

    // Merely READING it must not subscribe anything. BUG: the leaked tracker
    // captures this read and calls unrelated.subscribe(...).
    unrelated.value
    expect(subscribeSpy).not.toHaveBeenCalled()
  })

  it('(3) a subscribed computed whose computeFn throws on recompute must not raise an unhandled error from the scheduled microtask', async () => {
    const trigger = signal(0)
    let shouldThrow = false
    const c = computed(() => {
      if (shouldThrow) throw new Error('boom-on-recompute')
      return trigger.value
    })

    // Prime the computed and subscribe so a dependency change schedules a recompute.
    void c.value
    c.subscribe(() => {})

    // Fail future recomputes, then change the dependency to schedule the microtask.
    shouldThrow = true

    // The recompute runs synchronously inside queueMicrotask, so a throw there
    // surfaces as an uncaughtException (not an unhandledRejection). Capture both.
    const caught = []
    const onErr = (e) => caught.push(e)
    process.on('uncaughtException', onErr)
    process.on('unhandledRejection', onErr)

    trigger.value = 1
    // Flush the scheduled microtask and any promise/timer callbacks.
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    process.off('uncaughtException', onErr)
    process.off('unhandledRejection', onErr)

    // Correct behavior: the throwing recompute is caught internally; nothing escapes.
    expect(caught).toHaveLength(0)
  })
})
