import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initConfig, getConfig } from '../../core/config.js'
import { registerHook, clearHookRegistry } from '../../core/hookRegistry.js'
import { scanDirectives } from '../../core/scanDirectives.js'
import { createObserver } from '../../core/observer.js'

/**
 * Regression: issue #33 — selector injection via unvalidated attributePrefix.
 *
 * `initConfig({ attributePrefix: 'foo]' })` used to only append a trailing
 * dash (config.js formatPrefix -> 'foo]-') with NO validation. The prefix was
 * spliced directly into a CSS attribute selector such as `[foo]-use-test]`,
 * which is malformed CSS, so `querySelectorAll` threw a SyntaxError inside the
 * scan path (scanDirectives.js) and the MutationObserver callback
 * (observer.js), permanently breaking observation.
 *
 * These specs assert the CORRECT behavior: a CSS-significant / invalid prefix
 * is rejected at config time (falling back to no prefix) and, defensively, a
 * scan or mutation never throws because of a user-supplied prefix. Assertions
 * live OUTSIDE any hook context.
 */
describe('issue #33: unvalidated attributePrefix must not inject into CSS selector', () => {
  beforeEach(() => {
    clearHookRegistry()
    initConfig({})
    document.body.innerHTML = ''
    // A registered hook is required so the selector is non-empty and
    // querySelectorAll is actually reached.
    registerHook(function useTest () {})
  })

  afterEach(() => {
    clearHookRegistry()
    initConfig({})
    document.body.innerHTML = ''
  })

  it('rejects a CSS-significant prefix instead of splicing it into the selector', () => {
    initConfig({ attributePrefix: 'foo]' })
    // Correct behavior: the hostile prefix is not accepted verbatim. On the
    // unfixed code formattedPrefix was 'foo]-'.
    expect(getConfig().formattedPrefix).not.toBe('foo]-')
    // An invalid prefix falls back to no prefix.
    expect(getConfig().formattedPrefix).toBe('')
  })

  it('still accepts a valid prefix (with and without a trailing dash)', () => {
    initConfig({ attributePrefix: 'hk' })
    expect(getConfig().formattedPrefix).toBe('hk-')

    initConfig({ attributePrefix: 'data-' })
    expect(getConfig().formattedPrefix).toBe('data-')
  })

  it('scanDirectives() must not throw for a hostile prefix', () => {
    initConfig({ attributePrefix: 'foo]' })
    document.body.innerHTML = '<div use-test></div>'

    let thrown = null
    try {
      scanDirectives()
    } catch (err) {
      thrown = err
    }

    // A user-supplied prefix should never crash a scan.
    expect(thrown).toBeNull()
  })

  it('a DOM mutation must not kill the observer for a hostile prefix', () => {
    // Drive the observer via a mocked MutationObserver so the callback runs
    // synchronously (same idiom as observerError.spec.js). The delegate's
    // matchElements() calls root.querySelectorAll(selector) in observer.js.
    let capturedCallback = null
    const fakeObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn()
    }
    const OriginalMO = global.MutationObserver
    global.MutationObserver = vi.fn().mockImplementation((cb) => {
      capturedCallback = cb
      return fakeObserver
    })

    try {
      initConfig({ attributePrefix: 'foo]' })

      const observer = createObserver()

      let startThrew = null
      try {
        observer.start()
      } catch (err) {
        startThrew = err
      }

      const el = document.createElement('div')
      el.setAttribute('use-test', '')
      document.body.appendChild(el)

      let mutationThrew = null
      try {
        capturedCallback([{ type: 'childList', addedNodes: [el], removedNodes: [] }])
      } catch (err) {
        mutationThrew = err
      }

      // Neither start nor a mutation should throw due to the prefix.
      expect(startThrew).toBeNull()
      expect(mutationThrew).toBeNull()
    } finally {
      global.MutationObserver = OriginalMO
    }
  })
})
