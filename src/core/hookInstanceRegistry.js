import { isHTMLElement } from '../utils/type-guards.js'
import { logger } from '../utils/logger.js'

/**
 * Registry to store hook instances by element
 * @type {WeakMap<HTMLElement, Map<string, any>>}
 */
const hookInstanceRegistry = new WeakMap()

/**
 * Gets a hook instance for an element and hook name
 * @param {HTMLElement} element - The element to get the hook instance for
 * @param {string} hookName - The name of the hook
 * @returns {any|undefined} The hook instance if found
 */
export const getHookInstance = (element, hookName) => {
  if (!isHTMLElement(element)) return undefined
  
  const elementHooks = hookInstanceRegistry.get(element)
  if (!elementHooks) return undefined
  
  return elementHooks.get(hookName)
}

/**
 * Stores a hook instance for an element and hook name
 * @param {HTMLElement} element - The element to store the hook instance for
 * @param {string} hookName - The name of the hook
 * @param {any} instance - The hook instance to store
 */
export const storeHookInstance = (element, hookName, instance) => {
  if (!isHTMLElement(element)) return
  
  let elementHooks = hookInstanceRegistry.get(element)
  if (!elementHooks) {
    elementHooks = new Map()
    hookInstanceRegistry.set(element, elementHooks)
  }
  
  elementHooks.set(hookName, instance)
  logger.log(`Stored hook instance for "${hookName}" on element:`, element)
}

/**
 * Clears all hook instances for an element
 * @param {HTMLElement} element - The element to clear hook instances for
 */
export const clearHookInstances = (element) => {
  if (!isHTMLElement(element)) return
  hookInstanceRegistry.delete(element)
}

/**
 * Checks if an element has any hook instances
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} Whether the element has any hook instances
 */
export const hasHookInstances = (element) => {
  if (!isHTMLElement(element)) return false
  const elementHooks = hookInstanceRegistry.get(element)
  return Boolean(elementHooks && elementHooks.size > 0)
} 
