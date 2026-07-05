/**
 * @vitest-environment jsdom
 *
 * Regression: BUG-19 / issue #30
 * Dead cleanup plumbing (componentCleanups / context.cleanups).
 *
 * Nothing ever pushed into these arrays, so the first branches of
 * runCleanupFunctions and hasCleanupFunctions were unreachable. This batch
 * implements an onCleanup(fn) context API (which with()/hooks feed) that
 * routes component-scoped cleanups into componentCleanups so they are
 * reported and executed. B12 reuses this mechanism.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createHookContext,
  withHookContext,
  onCleanup,
  runCleanupFunctions,
  hasCleanupFunctions
} from '../../core/hookContext.js'
import { initConfig } from '../../core/config.js'

describe('issue #30 — onCleanup context API feeds componentCleanups', () => {
  beforeEach(() => {
    initConfig()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('createHookContext exposes a fresh cleanups array', () => {
    const element = document.createElement('div')
    const context = createHookContext(element)
    expect(Array.isArray(context.cleanups)).toBe(true)
    expect(context.cleanups.length).toBe(0)
  })

  it('onCleanup registers a component-scoped cleanup that is reported and executed', () => {
    const element = document.createElement('div')
    const cleanup = vi.fn()

    withHookContext(element, () => {
      onCleanup(cleanup)
    })

    // Intended contract 1: the element now HAS a cleanup function.
    expect(hasCleanupFunctions(element)).toBe(true)

    // Intended contract 2: running cleanups executes it and reports it ran.
    const ran = runCleanupFunctions(element)
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(ran).toBe(true)
  })

  it('runs multiple onCleanup registrations in order', () => {
    const element = document.createElement('div')
    const order = []

    withHookContext(element, () => {
      onCleanup(() => order.push('a'))
      onCleanup(() => order.push('b'))
    })

    runCleanupFunctions(element)
    expect(order).toEqual(['a', 'b'])
  })

  it('onCleanup outside a context warns and does not throw', () => {
    expect(() => onCleanup(() => {})).not.toThrow()
  })
})
