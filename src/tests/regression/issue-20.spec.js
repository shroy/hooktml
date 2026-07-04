import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useChildren } from '../../hooks/useChildren.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: BUG-9 / issue #20 — useChildren must honor the configured
 * attributePrefix (formattedPrefix) for BOTH the closest-scope selector
 * and the attribute-prefix match, mirroring utils/children.js.
 *
 * On the unfixed code useChildren hardcodes `[use-${prefix}]` and `${prefix}-`,
 * so with attributePrefix "data" it scans for `toggle-*` / `[use-toggle]`
 * instead of `data-toggle-*` / `[data-use-toggle]` and finds nothing.
 */
describe('issue #20 — useChildren honors configured attributePrefix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    initConfig({ attributePrefix: '' })
  })

  afterEach(() => {
    // Restore default config so we don't leak the prefix into other suites
    initConfig({ attributePrefix: '' })
    document.body.innerHTML = ''
  })

  it('finds prefixed child markers when attributePrefix is "data"', () => {
    initConfig({ attributePrefix: 'data' }) // -> formattedPrefix === 'data-'

    document.body.innerHTML = `
      <div id="toggle-root" data-use-toggle>
        <button data-toggle-btn>Toggle</button>
      </div>
    `
    const root = document.getElementById('toggle-root')
    if (!root) throw new Error('Test root not found')

    const result = useChildren(root, 'toggle')

    expect(result.btn instanceof HTMLElement).toBe(true)
    expect(result.btn && result.btn.textContent && result.btn.textContent.trim())
      .toBe('Toggle')
    // Plural key is created too (unified shape).
    expect(Array.isArray(result.btns)).toBe(true)
    expect((result.btns || []).length).toBe(1)
  })

  it('scopes nested prefixed hooks correctly with a data prefix', () => {
    initConfig({ attributePrefix: 'data' })

    document.body.innerHTML = `
      <div id="outer" data-use-toggle>
        <button data-toggle-btn>Outer</button>
        <div id="inner" data-use-toggle>
          <button data-toggle-btn>Inner</button>
        </div>
      </div>
    `
    const outer = document.getElementById('outer')
    if (!outer) throw new Error('Test root not found')

    const result = useChildren(outer, 'toggle')

    // The nested [data-use-toggle] scope must not leak its btn into the outer.
    expect(Array.isArray(result.btns)).toBe(true)
    expect((result.btns || []).length).toBe(1)
    expect(result.btn instanceof HTMLElement && result.btn.textContent.trim())
      .toBe('Outer')
  })
})
