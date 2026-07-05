/**
 * @vitest-environment jsdom
 *
 * Regression: issue #34 (BUG-23) — Component.styles is a raw CSS injection
 * channel into a shared stylesheet with no validation layer.
 *
 * toCssRule builds `${property} { ${styles} }` by bare string interpolation and
 * feeds it straight into sheet.insertRule. A styles value with unbalanced braces
 * makes insertRule throw, stranding the cloak on the unfixed code. A hardened
 * injector must validate/reject unbalanced braces early with a clear warning,
 * never throw, and keep cloak removal unconditional.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { injectComponentStyles } from '../../core/styleInjection.js'
import { applyCloak } from '../../core/componentLifecycle.js'
import * as configModule from '../../core/config.js'
import { logger } from '../../utils/logger.js'

describe('issue #34: Component.styles raw CSS injection channel', () => {
  let element

  beforeEach(() => {
    document.head.innerHTML = ''
    vi.spyOn(configModule, 'getConfig').mockReturnValue({
      componentSelectorMode: 'class',
      debug: true
    })
    element = document.createElement('div')
    document.body.appendChild(element)
    applyCloak(element)
  })

  afterEach(() => {
    document.head.innerHTML = ''
    element.remove()
    vi.restoreAllMocks()
  })

  it('does not throw and keeps cloak removal unconditional for malformed styles (ties to #18)', () => {
    // Rule-escape whose brace dangles against the wrapper's own closing brace:
    // toCssRule => `.Evil { color:red} }`, which insertRule rejects with a
    // SyntaxError. A hardened injector should validate/reject early and still
    // remove the cloak, never crash.
    function Evil() {}
    Evil.styles = 'color:red}'

    expect(element.hasAttribute('data-hooktml-cloak')).toBe(true)

    // Documented/expected: injection is robust and does NOT throw.
    expect(() => injectComponentStyles(Evil, element)).not.toThrow()

    // Documented/expected: cloak removal is unconditional.
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
  })

  it('does not let a rule-escape string reach the shared sheet without a validation warning', () => {
    // toCssRule => `.Evil2 { color:red} .evil{background:url(x) }`.
    // With a validation layer, unbalanced braces should be detected + warned
    // before injection.
    const warnSpy = vi.spyOn(logger, 'warn')
    function Evil2() {}
    Evil2.styles = 'color:red} .evil{background:url(x)'

    injectComponentStyles(Evil2, element)

    const warnedAboutInvalidCss = warnSpy.mock.calls.some(call =>
      call.some(arg =>
        typeof arg === 'string' && /invalid|unbalanced|brace|reject|malformed|parse/i.test(arg)
      )
    )

    // Documented/expected: unbalanced-brace escape is validated + warned about.
    expect(warnedAboutInvalidCss).toBe(true)
    // And cloak removal stays unconditional even for rejected styles.
    expect(element.hasAttribute('data-hooktml-cloak')).toBe(false)
  })
})
