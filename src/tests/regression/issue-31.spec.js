/**
 * @vitest-environment jsdom
 *
 * Regression test for issue #31 (BUG-20): observer performance.
 *
 * The MutationObserver callback used to iterate every record and call
 * `refresh()` per record, so a batch of K records produced K whole-document
 * `querySelectorAll` diffs. Additionally, `addElement` ran a whole-document
 * `scanComponents()` and then filtered to the single added element, which is
 * quadratic on bulk insert.
 *
 * Correct behavior (asserted here, OUTSIDE any hook context):
 *   - exactly ONE full-document scan per callback batch, regardless of K.
 *   - adding a single component element does NOT trigger a whole-document
 *     component scan (scanComponents scoped to the element's subtree).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createObserver } from '../../core/observer.js'
import * as hookRegistryModule from '../../core/hookRegistry.js'
import * as registryModule from '../../core/registry.js'
import { initConfig } from '../../core/config.js'

describe('issue #31: observer full-document scans scale with batch, not records', () => {
  let mockMutationObserver

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    initConfig({})
    document.body.innerHTML = ''

    // Mock MutationObserver so its callback can be driven synchronously with an
    // arbitrary batch of records (matching observer.spec.js idiom).
    // querySelectorAll stays REAL so we can count real scans.
    mockMutationObserver = { observe: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn() }
    global.MutationObserver = vi.fn().mockImplementation(callback => {
      mockMutationObserver.callback = callback
      return mockMutationObserver
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('scans the whole document once per callback batch, not once per record', () => {
    vi.spyOn(hookRegistryModule, 'getRegisteredHooks').mockReturnValue(new Map([['useTest', vi.fn()]]))
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue([])

    // matchElements(state.root) with root === document.documentElement calls
    // root.querySelectorAll(...) -> spy on the root scan.
    const rootScanSpy = vi.spyOn(document.documentElement, 'querySelectorAll')

    const observer = createObserver()
    observer.start() // start() performs one refresh -> one scan
    rootScanSpy.mockClear()

    const el = document.createElement('div')
    el.setAttribute('use-test', 'true')
    document.body.appendChild(el)

    // K attribute-mutation records delivered in ONE callback (one tick).
    const K = 5
    const batch = Array.from({ length: K }, (_, i) => ({
      type: 'attributes', target: el, attributeName: `data-attr-${i}`, addedNodes: [], removedNodes: []
    }))
    mockMutationObserver.callback(batch)

    // Correct behavior: refresh once per callback -> exactly ONE full-document
    // scan for the batch, regardless of K.
    expect(rootScanSpy).toHaveBeenCalledTimes(1)
  })

  it('does not run a whole-document component scan when a single element is added', () => {
    vi.spyOn(hookRegistryModule, 'getRegisteredHooks').mockReturnValue(new Map())
    vi.spyOn(registryModule, 'getRegisteredComponentNames').mockReturnValue(['Widget'])

    const observer = createObserver()
    observer.start()

    // Spy on document.querySelectorAll AFTER start so we only observe the
    // per-add work. The buggy addElement() calls scanComponents(), which runs
    // `document.querySelectorAll(selector)` on the whole document.
    const docScanSpy = vi.spyOn(document, 'querySelectorAll')

    const el = document.createElement('div')
    el.classList.add('Widget')
    document.body.appendChild(el)

    mockMutationObserver.callback([
      { type: 'childList', target: document.body, addedNodes: [el], removedNodes: [] }
    ])

    // Correct behavior: processing a newly added component element must not
    // perform a whole-document `document.querySelectorAll` component scan.
    expect(docScanSpy).not.toHaveBeenCalled()
  })
})
