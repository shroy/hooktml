import { kebabToCamel, pluralize, camelToKebab } from './strings.js'
import { isArray, isHTMLElement } from './type-guards.js'
import { getConfig } from '../core/config.js'

/**
 * Checks if an element has the same component class as its ancestor
 * @param {Element | HTMLElement} element - The element to check
 * @param {string} componentName - The component name to check against
 * @returns {boolean} Whether the element has the same component class
 */
export const hasSameComponent = (element, componentName) => {
  const { formattedPrefix } = getConfig()
  return element.classList.contains(componentName) ||
    (isHTMLElement(element) && (
      element.getAttribute(`${formattedPrefix}use-component`) === componentName
    ))
}

/**
 * Extracts children from an element's subtree based on component name.
 *
 * Mirrors the shape produced by `useChildren`: every matched marker suffix
 * yields BOTH a singular key (first element found) and a plural key (array of
 * all elements found). Elements that live inside a nested same-name component
 * are skipped per-descendant (not aborting the scan) so root-level markers that
 * follow a nested component are still collected.
 *
 * @param {Element} element - The root element
 * @param {string} componentName - The PascalCase component name
 * @returns {Record<string, Element | Element[]>} The extracted children
 */
export const extractChildren = (element, componentName) => {
  const { formattedPrefix } = getConfig()
  const prefix = `${formattedPrefix}${camelToKebab(componentName)}-`
  const componentSelector = `.${componentName}, [${formattedPrefix}use-component="${componentName}"]`

  /** @type {Record<string, Element | Element[]>} */
  const children = {}

  // Track elements for each suffix to build both singular and plural keys
  /** @type {Record<string, Element[]>} */
  const elementsByKey = {}

  // Get all descendants in document order
  const descendants = Array.from(element.getElementsByTagName('*'))

  for (const child of descendants) {
    // Skip elements that belong to a nested same-name component. The nested
    // component itself, or anything scoped inside it, resolves via closest()
    // to a component element other than the root — skip only those.
    const closestComponent = child.closest(componentSelector)
    if (closestComponent && closestComponent !== element) continue

    // Collect matching markers for this element
    for (const { name } of Array.from(child.attributes)) {
      if (name.startsWith(prefix)) {
        const key = kebabToCamel(name.slice(prefix.length))
        if (!isArray(elementsByKey[key])) {
          elementsByKey[key] = []
        }
        elementsByKey[key].push(child)
      }
    }
  }

  // Emit both singular and plural keys for every matched suffix (unified shape
  // with useChildren). Two passes so pluralization collisions never drop an
  // element (e.g. `box` pluralizes to `boxes`, which may also be a literal
  // marker): plural slots are populated first as arrays (merging colliding
  // suffixes), then singular slots fill only keys not already taken by an array.
  const keys = Object.keys(elementsByKey)

  keys.forEach((key) => {
    const pluralKey = pluralize(key)
    const existing = children[pluralKey]
    if (isArray(existing)) {
      elementsByKey[key].forEach((el) => {
        if (!existing.includes(el)) existing.push(el)
      })
    } else {
      children[pluralKey] = [...elementsByKey[key]]
    }
  })

  keys.forEach((key) => {
    if (!isArray(children[key])) {
      children[key] = elementsByKey[key][0]
    }
  })

  return children
}
