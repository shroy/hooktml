/** @typedef {ReturnType<import('../core/signal.js').signal>} Signal */

/**
 * Resolves scoped child elements by prefix within the current hook context
 * 
 * Returns an object with both singular and plural keys for each found attribute:
 * - Singular keys (e.g., 'button', 'content') contain the first HTMLElement found
 * - Plural keys (e.g., 'buttons', 'contents') contain an HTMLElement[] array of all elements
 * - When signals are requested, specified properties become reactive signals
 * 
 * @param {HTMLElement} element - The root element with use-*
 * @param {string} prefix - The hook prefix (e.g., 'toggle')
 * @param {Object} [config] - Optional configuration
 * @param {string[]} [config.signals] - Array of property names to make reactive
 * @returns {Record<string, HTMLElement | HTMLElement[] | Signal>} Object with both singular (HTMLElement) and plural (HTMLElement[]) keys for consistent access, with optional reactive signals
 * 
 * @example
 * // Static behavior (unchanged)
 * const children = useChildren(el, 'toggle')
 * // Returns: { btn: HTMLElement, btns: [HTMLElement] }
 * 
 * // Reactive behavior
 * const children = useChildren(el, 'toggle', { signals: ['btn'] })
 * // Returns: { btn: Signal, btns: Signal }
 * // Access via: children.btn.value, children.btns.value
 */
import { isArray, isHTMLElement, isNil, isNonEmptyArray, isNonEmptyString, isSignal } from '../utils/type-guards.js'
import { kebabToCamel, pluralize } from '../utils/strings.js'
import { signal } from '../core/signal.js'
import { registerChildrenWatcher } from '../core/observer.js'

/**
 * Resolves scoped child elements by prefix within the current hook context
 * @param {HTMLElement} element - The root element with use-*
 * @param {string} prefix - The hook prefix (e.g., 'toggle')
 * @param {Object} [config] - Optional configuration
 * @param {string[]} [config.signals] - Array of property names to make reactive
 * @returns {Record<string, HTMLElement | HTMLElement[] | Signal>} Object with child elements mapped by their attribute suffixes
 */
export const useChildren = (element, prefix, config = {}) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] useChildren requires an HTMLElement as first argument')
  }

  if (isNil(prefix) || !isNonEmptyString(prefix)) {
    throw new Error('[HookTML] useChildren requires a non-empty string prefix as second argument')
  }

  const { signals = [] } = config
  const useHookSelector = `[use-${prefix}]`
  const prefixWithHyphen = `${prefix}-`

  /** @type {Record<string, HTMLElement | HTMLElement[] | Signal>} */
  const children = {}

  // Track elements for each suffix to build both singular and plural keys
  /** @type {Record<string, HTMLElement[]>} */
  const elementsByKey = {}

  // Function to scan and populate elementsByKey
  const scanElements = () => {
    // Clear existing elements
    Object.keys(elementsByKey).forEach(key => {
      elementsByKey[key] = []
    })

    const all = element.getElementsByTagName('*')

    for (let i = 0; i < all.length; i++) {
      const el = all[i]
      if (!isHTMLElement(el)) continue

      let hasMatchingAttr = false
      const matchingAttrs = []

      for (let j = 0; j < el.attributes.length; j++) {
        const attr = el.attributes[j]
        if (attr.name.startsWith(prefixWithHyphen)) {
          hasMatchingAttr = true
          matchingAttrs.push(attr)
        }
      }

      if (!hasMatchingAttr) continue

      const closestHook = el.closest(useHookSelector)
      if (closestHook && closestHook !== element) continue

      // Now process the matching attributes
      for (let k = 0; k < matchingAttrs.length; k++) {
        const attr = matchingAttrs[k]
        const suffix = attr.name.slice(prefixWithHyphen.length)
        const key = kebabToCamel(suffix)

        // Track elements by key
        if (!isArray(elementsByKey[key])) {
          elementsByKey[key] = []
        }
        elementsByKey[key].push(el)
      }
    }
  }

  scanElements()

  // Create both singular and plural keys for all found elements
  Object.keys(elementsByKey).forEach(key => {
    const elements = elementsByKey[key]
    const pluralKey = pluralize(key)

    if (signals.includes(key)) {
      children[key] = signal(elements[0])
      children[pluralKey] = signal(elements)
    } else {
      children[key] = elements[0]
      children[pluralKey] = elements
    }
  })

  // Register for DOM watching if any signals are requested
  if (isNonEmptyArray(signals)) {
    registerChildrenWatcher(element, prefix, () => {
      scanElements()

      Object.keys(elementsByKey).forEach(key => {
        const elements = elementsByKey[key]
        const pluralKey = pluralize(key)

        if (signals.includes(key)) {
          if (children[key] && isSignal(children[key])) {
            children[key].value = isNonEmptyArray(elements) ? elements[0] : null
          }
          if (children[pluralKey] && isSignal(children[pluralKey])) {
            children[pluralKey].value = elements
          }
        }
      })
    })
  }

  return children
}
