import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  registerHook,
  clearHookRegistry
} from '../../core/hookRegistry.js'
import { scanDirectives } from '../../core/scanDirectives.js'
import { initConfig } from '../../core/config.js'
import { camelToKebab } from '../../utils/strings.js'
import { logger } from '../../utils/logger.js'

/**
 * Regression: issue #40 — acronym hook names are unreachable, and non-hook
 * words are wrongly accepted.
 *
 * `camelToKebab('useURLParser')` -> 'use-urlparser', but `kebabToCamel` back
 * -> 'useUrlparser' != the registered name. The selector matched the element
 * (attribute derived from the name) yet the per-attribute registry lookup
 * missed, producing an 'Unknown hook' warning and never running the hook.
 * Separately, `isValidHookName` only checked the 'use' prefix + length, so a
 * plain word like `useful` was accepted as a hook.
 *
 * Correct behavior: an acronym-named hook placed via its own derived kebab
 * attribute actually executes (lookups are normalized through the kebab key),
 * and a non-hook word (no capital immediately after 'use') is rejected.
 * Execution is recorded in an OUTER spy and asserted outside any hook context.
 */
describe('issue #40: acronym hook names must be reachable; non-hook words rejected', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    clearHookRegistry()
    initConfig({ debug: false }) // default '' prefix
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    clearHookRegistry()
  })

  it('executes an acronym-named hook placed via its derived kebab attribute', () => {
    const executed = vi.fn()

    // eslint-disable-next-line no-unused-vars
    function useURLParser (_el, _props) {
      executed()
    }

    const attr = camelToKebab('useURLParser') // 'use-urlparser'
    expect(registerHook(useURLParser)).toBe(true)

    document.body.innerHTML = `<div id="acr" ${attr}></div>`

    const warnSpy = vi.spyOn(logger, 'warn')

    const processed = scanDirectives()

    // Selector matches the element (attribute derived from the name)...
    expect(processed).toBe(1)
    // ...and the acronym hook actually runs.
    expect(executed).toHaveBeenCalledTimes(1)

    const unknownWarned = warnSpy.mock.calls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('Unknown hook')
    )
    expect(unknownWarned).toBe(false)
  })

  it('still executes a normal camelCase hook', () => {
    const executed = vi.fn()
    // eslint-disable-next-line no-unused-vars
    function useTooltip (_el, _props) {
      executed()
    }
    expect(registerHook(useTooltip)).toBe(true)
    document.body.innerHTML = '<div use-tooltip></div>'
    expect(scanDirectives()).toBe(1)
    expect(executed).toHaveBeenCalledTimes(1)
  })

  it('rejects a non-hook word like "useful" (name-validation gap)', () => {
    function useful () {}
    expect(registerHook(useful)).toBe(false)
  })

  it('rejects "usefoo" (no capital immediately after "use")', () => {
    function usefoo () {}
    expect(registerHook(usefoo)).toBe(false)
  })
})
