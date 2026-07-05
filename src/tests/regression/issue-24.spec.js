import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scan } from '../../index.js'
import { createObserver } from '../../core/observer.js'
import { registerComponent, clearRegistry } from '../../core/registry.js'
import { registerHook, clearHookRegistry } from '../../core/hookRegistry.js'
import { initConfig } from '../../core/config.js'

/**
 * Regression: BUG-13 / issue #24
 * "Static vs dynamic element processing order divergence."
 *
 * For an element that is BOTH a component and carries a `use-*` directive, the
 * static scan() path and the dynamic observer addElement() path must process the
 * two steps in the SAME order (component, then directive). On unmodified code the
 * static path ran component->directive while the observer ran directive->component.
 *
 * The `order` array is an OUTER variable so it survives even though
 * withHookContext swallows exceptions.
 */
describe('issue #24 — static vs dynamic processing order', () => {
  /** @type {string[]} */
  let order

  beforeEach(() => {
    vi.clearAllMocks()
    initConfig({}) // default prefix, debug off
    clearRegistry()
    clearHookRegistry()
    document.body.innerHTML = ''
    order = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const registerWidgetAndTrack = () => {
    // Component: matched via class ".Widget"
    function Widget() {
      order.push('component')
    }
    registerComponent(Widget)

    // Directive hook: matched via attribute "use-track"
    function useTrack() {
      order.push('directive')
    }
    registerHook(useTrack)
  }

  it('processes a component+directive element the same way whether static or dynamic', () => {
    // ---------- Case 1: element present before start() -> static scan() ----------
    registerWidgetAndTrack()

    const staticEl = document.createElement('div')
    staticEl.classList.add('Widget')
    staticEl.setAttribute('use-track', '')
    document.body.appendChild(staticEl)

    scan()

    const staticOrder = [...order]

    // Sanity: both ran exactly once on the static path.
    expect(staticOrder).toContain('component')
    expect(staticOrder).toContain('directive')

    // ---------- Case 2: element inserted after start() -> dynamic observer ----------
    document.body.innerHTML = ''
    order = []

    const mockMutationObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
      callback: /** @type {(m: any[]) => void} */ (() => {})
    }
    // @ts-ignore - test double
    global.MutationObserver = vi.fn().mockImplementation((cb) => {
      mockMutationObserver.callback = cb
      return mockMutationObserver
    })

    const observer = createObserver()
    observer.start()

    const dynamicEl = document.createElement('div')
    dynamicEl.classList.add('Widget')
    dynamicEl.setAttribute('use-track', '')
    document.body.appendChild(dynamicEl)

    mockMutationObserver.callback([
      { type: 'childList', addedNodes: [dynamicEl], removedNodes: [] }
    ])

    const dynamicOrder = [...order]

    // Sanity: both ran exactly once on the dynamic path too.
    expect(dynamicOrder).toContain('component')
    expect(dynamicOrder).toContain('directive')

    // The documented invariant: identical markup is processed in the same order
    // regardless of whether it existed at start() or was inserted later.
    expect(dynamicOrder).toEqual(staticOrder)
  })
})
