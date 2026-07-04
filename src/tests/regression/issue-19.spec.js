/**
 * @vitest-environment jsdom
 *
 * Regression: issue #19 (BUG-8) — FOUC cloak rule must be present after start().
 *
 * Documented behavior (README "FOUC Prevention"):
 *   HookTML "automatically hides elements with `data-hooktml-cloak` until
 *   they're initialized" using `[data-hooktml-cloak] { display: none !important; }`.
 *
 * On the unfixed code the hiding rule was injected lazily inside getStyleTag(),
 * only reached AFTER the no-styles early returns -- so starting with only
 * style-less components (the common case) never injected the rule, and the rule
 * text used `visibility: hidden` instead of the documented CSS.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { start } from '../../index.js'
import { clearRegistry, registerComponent } from '../../core/registry.js'
import { initConfig } from '../../core/config.js'

const collectAllCssRuleText = () => {
  /** @type {string[]} */
  const out = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules
    try { rules = sheet.cssRules } catch { continue }
    if (!rules) continue
    for (const rule of Array.from(rules)) out.push(rule.cssText.toLowerCase())
  }
  for (const tag of Array.from(document.querySelectorAll('style'))) {
    if (tag.textContent) out.push(tag.textContent.toLowerCase())
  }
  return out
}

describe('issue #19: FOUC cloak rule must be present after start()', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    clearRegistry()
    initConfig({ debug: false })
  })
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    clearRegistry()
  })

  it('injects the [data-hooktml-cloak] hiding rule when only style-less components are registered', async () => {
    function Widget() {}
    expect(registerComponent(Widget)).toBe(true)
    document.body.innerHTML = '<div class="Widget" data-hooktml-cloak></div>'
    await start()
    const allRules = collectAllCssRuleText()
    const hasCloakRule = allRules.some((text) => text.includes('[data-hooktml-cloak]'))
    expect(hasCloakRule).toBe(true)
  })

  it('the injected cloak rule matches the documented CSS (display: none !important)', async () => {
    function Widget() {}
    registerComponent(Widget)
    document.body.innerHTML = '<div class="Widget" data-hooktml-cloak></div>'
    await start()
    const allRules = collectAllCssRuleText()
    const cloakRuleText = allRules.find((text) => text.includes('[data-hooktml-cloak]')) ?? ''
    expect(cloakRuleText).toContain('display: none')
    expect(cloakRuleText).toContain('!important')
  })
})
