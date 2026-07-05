/**
 * Regression: BUG-17 / issue #28 — children watchers strongly leak elements.
 *
 * `childrenWatchers` is a module-level Set (observer.js) that strongly holds
 * `{ element, prefix, callback }`. Watcher removal only runs from processMutation's
 * removed-node branch (through the live MutationObserver stream). If the element
 * leaves the DOM while the observer is stopped / paused / never started, the watcher
 * is never removed, and triggerChildrenWatchers still fires it for the detached
 * element (the `watcher.element === element` branch has no isConnected guard).
 *
 * These specs assert the CORRECT behavior: a watcher whose element has left the DOM
 * must be disposed through the element-scoped cleanup path (runCleanupFunctions) and
 * must not fire. Assertions live outside any hook context.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createObserver, registerChildrenWatcher } from '../../core/observer.js'
import { runCleanupFunctions } from '../../core/hookContext.js'
import { initConfig } from '../../core/config.js'

const installMockMutationObserver = () => {
  const handle = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
    callback: () => {}
  }
  global.MutationObserver = vi.fn().mockImplementation((cb) => {
    handle.callback = cb
    return handle
  })
  return {
    deliver: (mutations) => handle.callback(mutations),
    observe: handle.observe,
    disconnect: handle.disconnect,
    takeRecords: handle.takeRecords
  }
}

describe('BUG-17 / issue #28 — children watchers leak when element removed while observer is not running', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initConfig({}) // debug: false
    document.body.innerHTML = ''
  })

  it('does NOT fire a stale watcher for an element removed while the observer is stopped/never-started (isConnected sweep)', () => {
    const mock = installMockMutationObserver()
    const observer = createObserver()

    const el = document.createElement('div')
    el.setAttribute('use-toggle', '')
    document.body.appendChild(el)

    // Same registration useChildren(el, 'toggle', { signals }) performs.
    const watcherCallback = vi.fn()
    registerChildrenWatcher(el, 'toggle', watcherCallback)

    // BUG PRECONDITION: observer is NOT started when the element leaves the DOM.
    expect(mock.observe).not.toHaveBeenCalled()

    // Element leaves the DOM; no mutation is delivered because nothing is observing.
    el.remove()
    expect(el.isConnected).toBe(false)

    // Later, observation begins and a mutation references the (now-detached) element.
    // Delivered via addedNodes so we exercise triggerChildrenWatchers WITHOUT the
    // removed-node cleanup branch.
    observer.start()
    mock.deliver([{ type: 'childList', addedNodes: [el], removedNodes: [] }])

    // CORRECT behavior: the stale watcher for a detached element must not fire.
    expect(watcherCallback).not.toHaveBeenCalled()
  })

  it('disposes the watcher through the element-scoped cleanup path (runCleanupFunctions)', () => {
    installMockMutationObserver()
    createObserver()

    const el = document.createElement('div')
    el.setAttribute('use-toggle', '')
    document.body.appendChild(el)

    const watcherCallback = vi.fn()
    registerChildrenWatcher(el, 'toggle', watcherCallback)

    // The framework tears an element down via runCleanupFunctions (called from the
    // observer's removeElement and from refresh). This must remove the watcher even
    // when no MutationObserver removal record is ever delivered.
    runCleanupFunctions(el)

    // Re-create the observer state and deliver a mutation referencing the element.
    const mock2 = installMockMutationObserver()
    const observer2 = createObserver()
    observer2.start()
    mock2.deliver([{ type: 'childList', addedNodes: [el], removedNodes: [] }])

    // CORRECT behavior: watcher was disposed via runCleanupFunctions -> must not fire.
    expect(watcherCallback).not.toHaveBeenCalled()
  })

  it('control: removing an element through the LIVE observer DOES tear its watcher down', () => {
    const mock = installMockMutationObserver()
    const observer = createObserver()
    observer.start()

    const el = document.createElement('div')
    el.setAttribute('use-toggle', '')
    document.body.appendChild(el)

    const watcherCallback = vi.fn()
    registerChildrenWatcher(el, 'toggle', watcherCallback)

    el.remove()
    mock.deliver([{ type: 'childList', addedNodes: [], removedNodes: [el] }]) // cleanup runs

    mock.deliver([{ type: 'childList', addedNodes: [el], removedNodes: [] }])
    expect(watcherCallback).not.toHaveBeenCalled()
  })
})
