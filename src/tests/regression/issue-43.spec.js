/**
 * @vitest-environment jsdom
 *
 * Regression: issue #43 (BUG-32) — per-instance duplicate-style warnings spam
 * the console.
 *
 * On the unfixed code the 2nd..Nth instance of a styled component each emitted a
 * console.warn (always-on, not gated by debug). Expected usage therefore
 * produced O(instances) warning spam. The fix dedupes by component name in a Set
 * and downgrades the message to a debug-gated log, so production (debug off)
 * stays quiet.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { injectComponentStyles } from '../../core/styleInjection.js'
import * as configModule from '../../core/config.js'
import * as componentLifecycle from '../../core/componentLifecycle.js'

describe('issue #43: duplicate-style warnings should not spam the console', () => {
  let element
  let consoleWarnSpy

  beforeEach(() => {
    document.head.innerHTML = ''
    element = document.createElement('div')
    document.body.appendChild(element)

    // Production config: debug OFF -- the common case that must stay quiet.
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      componentSelectorMode: 'class',
      debug: false
    })
    vi.spyOn(componentLifecycle, 'removeCloak').mockImplementation(() => {})

    // Capture every console.warn call (all arguments).
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.head.innerHTML = ''
    document.body.removeChild(element)
    vi.restoreAllMocks()
  })

  const duplicateWarnings = () =>
    consoleWarnSpy.mock.calls.filter(args =>
      args.some(a => typeof a === 'string' && a.includes('Duplicate style injection'))
    )

  it('does not warn on the second instance of the same styled component (debug off)', () => {
    function Button() {}
    Button.styles = 'color: red;'

    const el2 = document.createElement('div')
    document.body.appendChild(el2)

    injectComponentStyles(Button, element) // 1st instance
    injectComponentStyles(Button, el2)     // 2nd instance

    document.body.removeChild(el2)
    expect(duplicateWarnings()).toEqual([])
  })

  it('does not spam console.warn across many instances (debug off)', () => {
    function Card() {}
    Card.styles = 'display: block;'

    const N = 5
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div')
      document.body.appendChild(el)
      injectComponentStyles(Card, el)
      document.body.removeChild(el)
    }
    expect(duplicateWarnings().length).toBe(0)
  })
})
