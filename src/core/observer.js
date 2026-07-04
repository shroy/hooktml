import { lifecycleManager } from './initialization.js'
import { runCleanupFunctions, registerCleanup } from './hookContext.js'
import { isEmptyArray, isHTMLElement, isNonEmptyArray } from '../utils/type-guards.js'
import { getConfig } from './config.js'
import { tryCatch } from '../utils/try-catch.js'
import { getRegisteredHooks } from './hookRegistry.js'
import { getRegisteredComponentNames } from './registry.js'
import { camelToKebab } from '../utils/strings.js'
import { processElement } from './processElement.js'
import { logger } from '../utils/logger.js'
import { clearHookInstances } from './hookInstanceRegistry.js'

/**
 * @typedef {Object} ElementObserverDelegate
 * @property {(root: Element) => HTMLElement[]} matchElements - Function to find matching elements
 * @property {(element: HTMLElement) => void} addElement - Function to process a new element  
 * @property {(element: HTMLElement) => void} removeElement - Function to clean up a removed element
 */

/**
 * @typedef {Object} MutableObserverState
 * @property {Element} root - Root element to observe
 * @property {ElementObserverDelegate} delegate - Delegate for element matching/processing
 * @property {Set<HTMLElement>} elements - Set of currently tracked elements
 * @property {boolean} started - Whether observation is active
 */

/**
 * Checks if a node is an element node
 * @param {Node} node - The node to check
 * @returns {boolean} - Whether the node is an element node
 */
const isElementNode = (node) => node.nodeType === Node.ELEMENT_NODE

/**
 * Processes a mutation record.
 *
 * Handles per-record bookkeeping (removed-element teardown, children watchers)
 * only. The element-tracking `refresh` is intentionally NOT called here — it is
 * run once per callback batch by the observer (issue #31), so a batch of K
 * records no longer triggers K whole-document scans.
 * @param {MutableObserverState} state - Observer state
 * @param {MutationRecord} mutation - Mutation record to process
   */
const processMutation = (state, mutation) => {
  // Handle removed nodes
  const removedNodes = mutation.removedNodes || []
  const removedElements = Array.from(removedNodes)
    .filter(node => isHTMLElement(node) && isElementNode(node))
    .flatMap(node => {
      const element = /** @type {HTMLElement} */ (node)
      const descendants = Array.from(element.getElementsByTagName('*'))
        .filter(isHTMLElement)
      return [element, ...descendants]
    })

  // Clean up removed elements
  removedElements.forEach(element => {
    if (state.elements.has(element)) {
      state.delegate.removeElement(element)
      state.elements.delete(element)
    }

    const cleanups = childrenCleanup.get(element)
    if (cleanups) {
      cleanups.forEach(cleanup => cleanup())
      childrenCleanup.delete(element)
    }
  })

  // Collect all affected elements for children watchers
  const addedNodes = mutation.addedNodes || []
  const addedElements = Array.from(addedNodes)
    .filter(node => isHTMLElement(node) && isElementNode(node))
    .flatMap(node => {
      const element = /** @type {HTMLElement} */ (node)
      const descendants = Array.from(element.getElementsByTagName('*'))
        .filter(isHTMLElement)
      return [element, ...descendants]
    })

  // Trigger children watchers for all affected elements
  const affectedElements = [...removedElements, ...addedElements]
  if (isNonEmptyArray(affectedElements)) {
    triggerChildrenWatchers(affectedElements)
  }
}

/**
 * Refreshes the element tracking
 * @param {MutableObserverState} state - Observer state
 */
const refresh = (state) => {
  if (!state.started) return

  const matched = new Set(state.delegate.matchElements(state.root))

  // Remove elements that no longer match
  const elementsToRemove = Array.from(state.elements).filter(el => !matched.has(el))
  elementsToRemove.forEach(element => {
    state.delegate.removeElement(element)
    state.elements.delete(element)
  })

  // Add new elements
  const elementsToAdd = Array.from(matched).filter(el => !state.elements.has(el))
  elementsToAdd.forEach(element => {
    state.delegate.addElement(element)
    state.elements.add(element)
  })
}

/**
 * Creates an element observer with StimulusJS-style element tracking
 * @param {Element} root - Root element to observe
 * @param {ElementObserverDelegate} delegate - Delegate for element operations
 * @returns {Object} Observer instance with control methods
 */
const createElementObserver = (root, delegate) => {
  /** @type {MutableObserverState} */
  const state = {
    root,
    delegate,
    elements: new Set(),
    started: false
  }

  const mutationObserver = new MutationObserver((mutations) => {
    if (state.started) {
      // Per-record bookkeeping (removals, children watchers) for the whole batch,
      // then a single element-tracking refresh for the batch — not one per
      // record — so a batch of K records causes one whole-document scan (issue #31).
      mutations.forEach(mutation => processMutation(state, mutation))
      refresh(state)
    }
  })

  const observe = () =>
    mutationObserver.observe(root, {
      attributes: true,
      attributeFilter: getObservedAttributes(),
      childList: true,
      subtree: true
    })

  const disconnect = () => mutationObserver.disconnect()

  const start = () => {
    if (!state.started) {
      state.started = true
      observe()
      refresh(state)
    }
  }

  const stop = () => {
    if (state.started) {
      if (mutationObserver.takeRecords) {
        mutationObserver.takeRecords()
      }
      disconnect()
      state.started = false
    }
  }

  const pause = (callback) => {
    if (state.started) {
      disconnect()
      state.started = false
    }

    callback()

    if (!state.started) {
      observe()
      state.started = true
    }
  }

  return { start, stop, pause, refresh: () => refresh(state) }
}

/**
 * Creates a selector for hook directives
 * @param {string[]} hookNames - Array of hook names  
 * @param {string} prefix - Attribute prefix
 * @returns {string} CSS selector
 */
const createHookSelector = (hookNames, prefix = '') => {
  if (!hookNames.length) return ''
  const attributeNames = hookNames.map(name => `[${prefix}${camelToKebab(name)}]`)
  return attributeNames.join(', ')
}

/**
 * Creates a selector for components
 * @param {string[]} componentNames - Array of component names
 * @param {string} prefix - Attribute prefix  
 * @returns {string} CSS selector
 */
const createComponentSelector = (componentNames, prefix = '') => {
  if (!componentNames.length) return ''
  const classSelector = componentNames.map(name => `.${name}`).join(', ')
  const useComponentSelector = componentNames
    .map(name => `[${prefix}use-component="${name}"]`)
    .join(', ')
  return `${classSelector}, ${useComponentSelector}`
}

/**
 * Builds the list of attribute names worth observing, so the MutationObserver
 * only wakes on relevant attribute churn instead of every attribute change in
 * the subtree (issue #31). Covers each registered hook directive attribute,
 * the (prefixed) `use-component` attribute, and `class` (class-based components).
 * @returns {string[]} Attribute names for `attributeFilter`
 */
const getObservedAttributes = () => {
  const { formattedPrefix } = getConfig()
  const hookNames = Array.from(getRegisteredHooks().keys())

  const hookAttributes = hookNames.map(name => `${formattedPrefix}${camelToKebab(name)}`)

  // `class` and `use-component` are always relevant: components can be matched
  // by class name or by the (prefixed) use-component attribute, and either may
  // be added to an already-present element after observation starts.
  return [...hookAttributes, 'class', `${formattedPrefix}use-component`]
}

/**
 * Creates the HookTML delegate for element observation
 * @returns {ElementObserverDelegate} Delegate instance
 */
const createHookTMLDelegate = () => {
  /**
   * Matches elements with hook directives or component tags
   * @param {Element} root - Root element to search in
   * @returns {HTMLElement[]} - Array of matching elements
   */
  const matchElements = (root) => {
    const { formattedPrefix } = getConfig()
    const hooks = getRegisteredHooks()
    const hookNames = Array.from(hooks.keys())
    const componentNames = getRegisteredComponentNames()

    // Create selectors for hooks and components
    const selectors = []

    if (isNonEmptyArray(hookNames)) {
      selectors.push(createHookSelector(hookNames, formattedPrefix))
    }

    if (isNonEmptyArray(componentNames)) {
      selectors.push(createComponentSelector(componentNames, formattedPrefix))
    }

    if (isEmptyArray(selectors)) {
      return []
    }

    // Find all matching elements. Guard querySelectorAll so a malformed
    // selector (e.g. from a bad attribute prefix) can never throw inside the
    // MutationObserver callback and permanently break observation (issue #33).
    const selector = selectors.join(', ')
    return tryCatch({
      fn: () => Array.from(root.querySelectorAll(selector)).filter(isHTMLElement),
      onError: (error) => {
        if (getConfig().debug) {
          logger.error(`Invalid element selector "${selector}":`, error)
        }
        return []
      }
    })
  }

  /**
   * Processes a new element by initializing its component then applying its
   * hooks. Delegates to the shared processElement() so the dynamic (observer)
   * path uses the exact same order as the static scan path. (#24)
   * @param {HTMLElement} element - Element to process
   */
  const addElement = (element) => {
    tryCatch({
      fn: () => {
        processElement(element)
      },
      onError: (error) => {
        if (getConfig().debug) {
          logger.error('Error processing element:', error)
        }
      }
    })
  }

  /**
   * Cleans up a removed element
   * @param {HTMLElement} element - Element to clean up
   */
  const removeElement = (element) => {
    tryCatch({
      fn: () => {
        lifecycleManager.executeTeardowns(element)
        runCleanupFunctions(element)
        clearHookInstances(element)
      },
      onError: (error) => {
        if (getConfig().debug) {
          logger.error('Error removing element:', error)
        }
      }
    })
  }

  return { matchElements, addElement, removeElement }
}

/**
 * @typedef {Object} ChildrenWatcher
 * @property {HTMLElement} element - The element being watched
 * @property {string} prefix - The prefix for child elements
 * @property {() => void} callback - Callback to execute when children change
 */

/** @type {Set<ChildrenWatcher>} */
const childrenWatchers = new Set()

/** @type {WeakMap<HTMLElement, (() => void)[]>} */
const childrenCleanup = new WeakMap()

/**
 * Registers a watcher for children changes on an element
 * @param {HTMLElement} element - The element to watch
 * @param {string} prefix - The prefix for child elements
 * @param {() => void} callback - Callback to execute when children change
 */
export const registerChildrenWatcher = (element, prefix, callback) => {
  const watcher = { element, prefix, callback }
  childrenWatchers.add(watcher)

  const cleanup = () => {
    childrenWatchers.delete(watcher)
  }

  const cleanups = childrenCleanup.get(element) || []
  childrenCleanup.set(element, [...cleanups, cleanup])

  // Also tie disposal to the element's lifecycle via the shared, element-scoped
  // cleanup path (runCleanupFunctions). The childrenCleanup WeakMap above only runs
  // from the live MutationObserver removal branch, which is silent when the observer
  // is stopped / paused / never started — so on its own it strongly leaks the watcher
  // (and its element) in those cases (BUG-17).
  registerCleanup(element, cleanup)
}

/**
 * Triggers children watchers for elements that may have changed
 * @param {HTMLElement[]} elements - Elements that may have changed
 */
const triggerChildrenWatchers = (elements) => {
  const triggeredWatchers = new Set()

  elements.forEach(element => {
    childrenWatchers.forEach(watcher => {
      // Sweep out watchers whose element has left the DOM. Disposal is normally
      // driven by the element lifecycle (runCleanupFunctions) / the mutation stream,
      // but if a detached element is never routed through either, this guard prevents
      // a stale watcher from firing for a dead element (BUG-17).
      if (!watcher.element.isConnected) {
        childrenWatchers.delete(watcher)
        return
      }

      // Check if this element is a descendant of or is the watched element
      if (watcher.element === element || watcher.element.contains(element)) {
        if (!triggeredWatchers.has(watcher)) {
          triggeredWatchers.add(watcher)
          tryCatch({
            fn: watcher.callback,
            onError: (error) => {
              if (getConfig().debug) {
                logger.error('Error in children watcher callback:', error)
              }
            }
          })
        }
      }
    })
  })
}

/**
 * Creates a DOM observer for HookTML
 * @returns {Object} Observer instance with start/stop methods
 */
export const createObserver = () => {
  const delegate = createHookTMLDelegate()
  const elementObserver = createElementObserver(document.documentElement, delegate)

  const start = () => {
    elementObserver.start()
    logger.log('DOM observation started')
  }

  const stop = () => {
    elementObserver.stop()
    logger.log('DOM Observer stopped')
  }

  return { start, stop }
} 
