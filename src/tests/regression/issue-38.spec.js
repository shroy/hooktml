/**
 * @vitest-environment jsdom
 *
 * Regression: issue #38 (BUG-27) — signal edge cases.
 *   (1) `===` equality re-notifies on repeated NaN writes; correct behavior uses Object.is.
 *   (2) No reentrancy/batch guard: two signals whose subscribers write each other recurse
 *       to a stack overflow.
 *   (3) Import-time `globalThis.__HOOKTML_TRACK_SIGNAL__` handshake is an import side effect
 *       (tree-shake hazard, global-clobber hazard) that must be removed in favor of a shared
 *       tracker module imported by both signal.js and computed.js.
 * Assertions assert the CORRECT behavior.
 */
import { describe, it, expect, vi } from 'vitest'
import { signal } from '../../core/signal.js'
import { logger } from '../../utils/logger.js'

describe('BUG-27: signal NaN re-notification (=== vs Object.is)', () => {
  it('should NOT re-notify subscribers when the value is set to NaN twice', () => {
    const s = signal(NaN)
    const sub = vi.fn()
    s.subscribe(sub)

    // Value is already NaN. Setting it to NaN again is not a change.
    // Correct behavior (Object.is / change-detection): subscriber called 0 times.
    s.value = NaN
    s.value = NaN

    expect(sub).toHaveBeenCalledTimes(0)
  })

  it('should treat a fresh NaN assignment as no-op when current is already NaN', () => {
    const s = signal(1)
    const sub = vi.fn()
    s.subscribe(sub)

    s.value = NaN // real change 1 -> NaN, must notify once
    s.value = NaN // no change NaN -> NaN, must NOT notify again
    s.value = NaN // no change NaN -> NaN, must NOT notify again

    // Correct behavior: exactly one notification for the single real change.
    expect(sub).toHaveBeenCalledTimes(1)
  })
})

describe('BUG-27: no reentrancy/batch guard -> stack overflow', () => {
  it('should NOT stack overflow when two signals subscribers write each other', () => {
    const a = signal(0)
    const b = signal(0)

    // a's subscriber pushes an ever-larger value into b, and b's subscriber
    // pushes an ever-larger value back into a. Each write is a genuine change
    // (values keep diverging), so the naive "value unchanged?" bail-out cannot
    // stop it. With a proper reentrancy/batch guard the synchronous notify from
    // within a notify would be deferred/suppressed and the cascade would settle.
    // Without one, `set value` re-enters `set value` unboundedly -> RangeError.
    //
    // To keep the test finite even on buggy code, each subscriber stops once a
    // sane bound is exceeded; a correct implementation settles far below it,
    // while the buggy implementation blows the stack before reaching the bound.
    //
    // NOTE: signal's `set value` wraps each subscriber in tryCatch and routes
    // thrown errors to logger.error, so the outer assignment does NOT re-throw
    // the RangeError. We therefore spy on logger.error and assert that a correct
    // implementation never reports a stack-overflow from within notification.
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    const BOUND = 1e6
    a.subscribe((v) => { if (v < BOUND) b.value = v + 1 })
    b.subscribe((v) => { if (v < BOUND) a.value = v + 1 })

    a.value = 1

    const overflowLogged = errorSpy.mock.calls.some((args) =>
      args.some((arg) => arg instanceof RangeError &&
        /call stack/i.test(arg.message))
    )
    errorSpy.mockRestore()

    // Correct behavior: a reentrancy/batch guard prevents unbounded synchronous
    // re-entry, so no stack-overflow is ever produced.
    expect(overflowLogged).toBe(false)
  })
})

describe('BUG-27: no import-time globalThis side effect', () => {
  it('importing the reactive modules must NOT install a mutable global tracker', async () => {
    // Importing the reactive modules must not set a global handshake at import
    // time. The dependency tracker must live in a shared module imported by both
    // signal.js and computed.js, not on a mutable global any script can clobber.
    await import('../../core/signal.js')
    await import('../../core/computed.js')

    // Correct: no import side effect leaks a global handshake.
    expect(typeof globalThis.__HOOKTML_TRACK_SIGNAL__).toBe('undefined')
  })
})
