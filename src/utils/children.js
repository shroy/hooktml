import { kebabToCamel, pluralize, camelToKebab } from './strings.js'
import { isHTMLElement } from './type-guards.js'
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
 * Returns both singular and plural keys for each found attribute,
 * matching the behavior of the useChildren hook.
 * @param {Element} element - The root element
 * @param {string} componentName - The PascalCase component name
 * @returns {Record<string, Element | Element[]>} The extracted children
 */
export const extractChildren = (element, componentName) => {
  const { formattedPrefix } = getConfig()
  const prefix = `${formattedPrefix}${camelToKebab(componentName)}-`
  /** @type {Record<string, Element[]>} */
  const elementsByKey = {}

  // Get all descendants
  const descendants = Array.from(element.getElementsByTagName('*'))

  // Nested same-named components own their subtrees — exclude them without
  // stopping the scan for children that appear later in document order
  const nestedRoots = descendants.filter(child => hasSameComponent(child, componentName))

  descendants.forEach((child) => {
    if (nestedRoots.some(root => root === child || root.contains(child))) {
      return
    }

    // Check all attributes
    Array.from(child.attributes).forEach(({ name }) => {
      if (name.startsWith(prefix)) {
        const key = kebabToCamel(name.slice(prefix.length))

        if (elementsByKey[key]) {
          elementsByKey[key].push(child)
        } else {
          elementsByKey[key] = [child]
        }
      }
    })
  })

  /** @type {Record<string, Element | Element[]>} */
  const children = {}

  // Create both singular and plural keys for all found elements
  Object.entries(elementsByKey).forEach(([key, elements]) => {
    children[key] = elements[0]
    children[pluralize(key)] = elements
  })

  return children
}
