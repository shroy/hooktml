/**
 * Resolves scoped child elements by prefix within the current hook context
 * 
 * Returns an object with both singular and plural keys for each found attribute:
 * - Singular keys (e.g., 'button', 'content') contain the first HTMLElement found
 * - Plural keys (e.g., 'buttons', 'contents') contain an HTMLElement[] array of all elements
 * 
 * @param {HTMLElement} element - The root element with use-*
 * @param {string} prefix - The hook prefix (e.g., 'toggle')
 * @returns {Record<string, HTMLElement | HTMLElement[]>} Object with both singular (HTMLElement) and plural (HTMLElement[]) keys for consistent access
 * 
 * @example
 * // For HTML: <div><button toggle-btn>Click</button></div>
 * const children = useChildren(el, 'toggle')
 * // Returns: { btn: HTMLElement, btns: [HTMLElement] }
 * 
 * // Use singular for first element: children.btn.click()
 * // Use plural for iteration: children.btns.forEach(...)
 * // Use plural for validation: isEmptyArray(children.btns)
 */
import { isArray, isHTMLElement, isNil, isNonEmptyString } from '../utils/type-guards.js'
import { kebabToCamel, pluralize } from '../utils/strings.js'

/**
 * Resolves scoped child elements by prefix within the current hook context
 * @param {HTMLElement} element - The root element with use-*
 * @param {string} prefix - The hook prefix (e.g., 'toggle')
 * @returns {Record<string, HTMLElement | HTMLElement[]>} Object with child elements mapped by their attribute suffixes
 */
export const useChildren = (element, prefix) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] useChildren requires an HTMLElement as first argument')
  }

  if (isNil(prefix) || !isNonEmptyString(prefix)) {
    throw new Error('[HookTML] useChildren requires a non-empty string prefix as second argument')
  }

  const useHookSelector = `[use-${prefix}]`
  const prefixWithHyphen = `${prefix}-`

  /** @type {Record<string, HTMLElement | HTMLElement[]>} */
  const children = {}

  // Track elements for each suffix to build both singular and plural keys
  /** @type {Record<string, HTMLElement[]>} */
  const elementsByKey = {}

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

  // Create both singular and plural keys for all found elements
  Object.keys(elementsByKey).forEach(key => {
    const elements = elementsByKey[key]
    const pluralKey = pluralize(key)
    
    // Always set singular key to first element
    children[key] = elements[0]
    
    // Always set plural key to array of all elements
    children[pluralKey] = elements
  })

  return children
}
