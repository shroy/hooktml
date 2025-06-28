import { kebabToCamel, pluralize } from './strings.js'
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
 * Adds a child to a pluralized key
 * @param {Record<string, Element | Element[]>} children - The children object
 * @param {string} key - The key to add the child to
 * @param {Element} child - The child to add
 */
export const addPluralizedChild = (children, key, child) => {
  const pluralKey = pluralize(key)
  
  if (pluralKey in children) {
    // If the pluralized key already exists, just push the new child
    if (isArray(children[pluralKey])) {
      children[pluralKey].push(child)
    }
  } else {
    // Create a new array with first child and new child
    children[pluralKey] = [/** @type {Element} */(children[key]), child]
  }
}

/**
 * Extracts children from an element's subtree based on component name
 * @param {Element} element - The root element
 * @param {string} componentName - The PascalCase component name
 * @returns {Record<string, Element | Element[]>} The extracted children
 */
export const extractChildren = (element, componentName) => {
  const { formattedPrefix } = getConfig()
  const prefix = `${formattedPrefix}${componentName.toLowerCase()}-`
  /** @type {Record<string, Element | Element[]>} */
  const children = {}

  // Get all descendants
  const descendants = Array.from(element.getElementsByTagName('*'))
  
  // Use some to short-circuit when the component is found
  descendants.some((child) => {
    if (hasSameComponent(child, componentName)) {
      return true
    }
    // Check all attributes
    Array.from(child.attributes).forEach(({ name }) => {
      if (name.startsWith(prefix)) {
        const key = kebabToCamel(name.slice(prefix.length))

        if (children[key]) {
          addPluralizedChild(children, key, child)
        } else {
          children[key] = child
        }
      }
    })

    return false
  })

  return children
} 
