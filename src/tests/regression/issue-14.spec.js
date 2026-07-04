/**
 * @vitest-environment jsdom
 *
 * Regression: BUG-3 / issue #14
 * Second hook's effects on the same element are silently skipped.
 *
 * Effect identity used to be keyed per-element by queue index, and each
 * directive/component runs in its own withHookContext which restarts the
 * index at 0. So the second directive's effect collided with the first's
 * index-0 entry in initializedEffects and was never executed.
 *
 * Assertions live OUTSIDE withHookContext so the context's exception
 * swallowing cannot hide a failing assertion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerHook, clearHookRegistry } from '../../core/hookRegistry.js'
import { scanDirectives } from '../../core/scanDirectives.js'
import { initConfig } from '../../core/config.js'
import { useEffect, runCleanupFunctions } from '../../core/hookContext.js'

describe('issue #14 — two directives with useEffect on one element', () => {
  beforeEach(() => {
    initConfig({ debug: false })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    document.body.innerHTML = ''
    clearHookRegistry()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs the useEffect of BOTH directives on the same element', () => {
    const fooEffect = vi.fn()
    const barEffect = vi.fn()

    const useFoo = (element) => {
      useEffect(() => { fooEffect(element) }, [])
    }
    const useBar = (element) => {
      useEffect(() => { barEffect(element) }, [])
    }

    expect(registerHook(useFoo)).toBe(true)
    expect(registerHook(useBar)).toBe(true)

    document.body.innerHTML = `
      <div id="target" use-foo use-bar></div>
    `
    const target = document.getElementById('target')
    expect(target).not.toBeNull()

    // Each directive runs in its own withHookContext for the same element.
    scanDirectives()

    expect(fooEffect).toHaveBeenCalledTimes(1)
    expect(fooEffect).toHaveBeenCalledWith(target)

    // Regression assertion: the second directive's effect must also run.
    expect(barEffect).toHaveBeenCalledTimes(1)
    expect(barEffect).toHaveBeenCalledWith(target)

    runCleanupFunctions(target)
  })

  it('runs teardown for BOTH directives cleanups on the same element', () => {
    const fooTeardown = vi.fn()
    const barTeardown = vi.fn()

    const useFoo = (element) => {
      useEffect(() => fooTeardown, [])
    }
    const useBar = (element) => {
      useEffect(() => barTeardown, [])
    }

    registerHook(useFoo)
    registerHook(useBar)

    document.body.innerHTML = `
      <div id="target2" use-foo use-bar></div>
    `
    const target = document.getElementById('target2')
    expect(target).not.toBeNull()

    scanDirectives()

    // Both effect cleanups must be tracked per element and run on teardown.
    runCleanupFunctions(target)

    expect(fooTeardown).toHaveBeenCalledTimes(1)
    expect(barTeardown).toHaveBeenCalledTimes(1)
  })
})
