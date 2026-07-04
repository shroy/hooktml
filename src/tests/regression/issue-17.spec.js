/**
 * @vitest-environment jsdom
 *
 * Regression: issue #17 (BUG-6) — Component.styles selector.
 *
 * Under the REAL default config (no componentSelectorMode set), the injected
 * rule must be scoped by the component's CLASS (`.Name`), matching README:572
 * and how scanComponents binds components. On the unfixed code the selector was
 * `[data-component="Name"]`, which the framework never sets, so the documented
 * Component.styles feature applied zero styles by default.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { injectComponentStyles } from '../../core/styleInjection.js'
import { initConfig } from '../../core/config.js'
import * as componentLifecycle from '../../core/componentLifecycle.js'

describe('issue #17: Component.styles selector defaults to class scoping', () => {
  let element

  beforeEach(() => {
    document.head.innerHTML = ''
    // Real default config -- the documented default path. No componentSelectorMode.
    initConfig({ debug: false })
    // Framework binds by CLASS (scanComponents.createClassSelector).
    element = document.createElement('div')
    element.className = 'Thing'
    document.body.appendChild(element)
    vi.spyOn(componentLifecycle, 'removeCloak').mockImplementation(() => {})
  })

  afterEach(() => {
    document.head.innerHTML = ''
    if (element.parentNode) element.parentNode.removeChild(element)
    vi.restoreAllMocks()
    initConfig({})
  })

  it('injects a rule scoped by the component class (.Thing) under default config', () => {
    function Thing() {}
    Thing.styles = 'color: red;'

    injectComponentStyles(Thing, element)

    const styleTag = document.getElementById('__hooktml')
    expect(styleTag).toBeInstanceOf(HTMLStyleElement)
    const sheet = styleTag.sheet
    expect(sheet).not.toBeNull()

    const componentRules = Array.from(sheet.cssRules).filter((r) => r.cssText.includes('color'))
    expect(componentRules.length).toBe(1)
    const selector = componentRules[0].selectorText

    // README:572 + scanComponents => class-scoped (correct/documented behavior).
    expect(selector).toBe('.Thing')
    // The rule must actually match the class-bound element, else styles apply to nothing.
    expect(element.matches(selector)).toBe(true)
  })
})
