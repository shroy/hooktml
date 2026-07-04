/**
 * Regression: BUG-15 / issue #26 — start() is not idempotent; each call leaks a
 * live MutationObserver.
 *
 * The runtime `start()` (src/index.js / index.browser.js) does
 * `observerRef.current = createObserver()` without stopping the previous observer,
 * so on a second start() the first MutationObserver stays registered on
 * document.documentElement and keeps firing.
 *
 * This spec asserts the CORRECT behavior: an idempotent start() must leave at most
 * one live MutationObserver. It instruments the real jsdom MutationObserver
 * prototype to count observers that have observe()-d but not disconnect()-ed.
 * Assertions live outside any hook context.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { start } from '../../index.js'
import { initConfig } from '../../core/config.js'

describe('BUG-15 / issue #26: start() idempotency / MutationObserver leak', () => {
  const RealMutationObserver = global.MutationObserver
  const realObserve = RealMutationObserver.prototype.observe
  const realDisconnect = RealMutationObserver.prototype.disconnect

  /** @type {Set<any>} instances currently observing (observed, not yet disconnected) */
  let liveObservers

  beforeEach(() => {
    initConfig()
    document.body.innerHTML = ''
    liveObservers = new Set()

    vi.spyOn(RealMutationObserver.prototype, 'observe').mockImplementation(function (...args) {
      liveObservers.add(this)
      return realObserve.apply(this, args)
    })
    vi.spyOn(RealMutationObserver.prototype, 'disconnect').mockImplementation(function (...args) {
      liveObservers.delete(this)
      return realDisconnect.apply(this, args)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('leaves at most one live MutationObserver after two start() calls', async () => {
    await start()
    // Sanity: exactly one observer is live after the first start.
    expect(liveObservers.size).toBe(1)

    // Buggy code: overwrites observerRef.current and starts a NEW observer, never
    // stopping observer #1. Correct code: at most one live observer remains.
    await start()

    expect(liveObservers.size).toBe(1)
  })
})
