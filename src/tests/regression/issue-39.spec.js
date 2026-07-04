/**
 * @vitest-environment jsdom
 *
 * Regression: BUG-28 / issue #39
 * Effects queued during effect execution are silently dropped.
 *
 * executeEffectQueue used to drain with effectQueue.forEach(...) then
 * effectQueue.length = 0. forEach snapshots length at the start, so a
 * useEffect registered from inside another effect's body (which pushes onto
 * context.effectQueue) was never visited, then wiped. The nested effect
 * never ran. Fix: drain with while (effectQueue.length).
 *
 * Assertions live OUTSIDE withHookContext so the context's exception
 * swallowing cannot hide a failing assertion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEffect, withHookContext, runCleanupFunctions } from '../../core/hookContext.js'
import { initConfig } from '../../core/config.js'

describe('issue #39 — effects queued during effect execution', () => {
  let container

  beforeEach(() => {
    initConfig()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    runCleanupFunctions(container)
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('runs a useEffect that is registered from inside another effect body', () => {
    const innerSpy = vi.fn()

    withHookContext(container, () => {
      useEffect(() => {
        // Registering another effect from within an effect's setup body.
        useEffect(innerSpy, [])
      }, [])
    })

    // The nested effect's body should have executed exactly once.
    expect(innerSpy).toHaveBeenCalledTimes(1)
  })

  it('runs multiple levels of effects queued during execution', () => {
    const order = []

    withHookContext(container, () => {
      useEffect(() => {
        order.push('outer')
        useEffect(() => {
          order.push('middle')
          useEffect(() => {
            order.push('inner')
          }, [])
        }, [])
      }, [])
    })

    expect(order).toEqual(['outer', 'middle', 'inner'])
  })
})
