import { isHTMLElement } from '../utils/type-guards.js'
import { LifecycleManager } from './lifecycleManager.js'

/**
 * Singleton instance of LifecycleManager for the entire HookTML system
 * @type {LifecycleManager}
 */
export const lifecycleManager = new LifecycleManager()

/**
 * Checks if an element has been initialized
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} Whether the element has been initialized
 */
export const isInitialized = (element) => {
  return lifecycleManager.isInitialized(element)
}

/**
 * Marks an element as initialized
 * @param {HTMLElement} element - The element to mark
 */
export const markInitialized = (element) => {
  if (isHTMLElement(element)) {
    lifecycleManager.markInitialized(element)
  }
}

/**
 * Removes an element from the initialized set
 * @param {HTMLElement} element - The element to remove
 */
export const clearInitialized = (element) => {
  if (isHTMLElement(element)) {
    lifecycleManager.clearState(element)
  }
} 
