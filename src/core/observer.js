import { scanComponents, initializeComponents } from './scanComponents.js'
import { lifecycleManager } from './initialization.js'
import { runCleanupFunctions } from './hookContext.js'
import { isEmptyArray, isHTMLElement, isNonEmptyArray } from '../utils/type-guards.js'
import { getConfig } from './config.js'
import { tryCatch } from '../utils/try-catch.js'
import { getRegisteredHooks } from './hookRegistry.js'
import { getRegisteredComponentNames } from './registry.js'
import { camelToKebab } from '../utils/strings.js'
import { processElementHooks } from './scanDirectives.js'
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
 * Processes a mutation record
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
  })

  // Refresh to handle added nodes and attribute changes
  refresh(state)
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
      mutations.forEach(mutation => processMutation(state, mutation))
    }
  })

  const observe = () =>
    mutationObserver.observe(root, {
      attributes: true,
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

    // Find all matching elements
    return Array.from(root.querySelectorAll(selectors.join(', ')))
      .filter(isHTMLElement)
  }

  /**
   * Processes a new element by applying hooks and initializing components
   * @param {HTMLElement} element - Element to process
   */
  const addElement = (element) => {
    tryCatch({
      fn: () => {
        // Process hooks on this specific element
        const { formattedPrefix } = getConfig()
        const hooks = getRegisteredHooks()
        const hookNames = Array.from(hooks.keys())

        if (isNonEmptyArray(hookNames)) {
          const hookSelector = createHookSelector(hookNames, formattedPrefix)
          if (element.matches(hookSelector)) {
            processElementHooks(element)
          }
        }

        // Process components
        const componentNames = getRegisteredComponentNames()
        if (isNonEmptyArray(componentNames)) {
          const componentSelector = createComponentSelector(componentNames, formattedPrefix)
          if (element.matches(componentSelector)) {
            const foundComponents = scanComponents().filter(comp => comp.element === element)
            if (isNonEmptyArray(foundComponents)) {
              initializeComponents(foundComponents)
            }
          }
        }
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
