/**
 * Creates a chainable API wrapper around an element for applying hooks
 * @param {HTMLElement} element - The DOM element to enhance
 * @returns {Object} A chainable object with hook methods
 */
import { isHTMLElement, isFunction } from '../utils/type-guards.js'
import { useEvents } from '../hooks/useEvents.js'
import { useClasses } from '../hooks/useClasses.js'
import { useAttributes } from '../hooks/useAttributes.js'
import { useStyles } from '../hooks/useStyles.js'
import { getRegisteredChainableHooks } from './hookRegistry.js'

/**
 * @typedef {Object} WithChain
 * @property {(eventMap: Record<string, EventListener>) => WithChain} useEvents
 * @property {(classMap: Record<string, boolean>) => WithChain} useClasses
 * @property {(attrMap: Record<string, string|null>) => WithChain} useAttributes
 * @property {(styleMap: Partial<CSSStyleDeclaration>) => WithChain} useStyles
 */

/**
 * Creates a chainable API wrapper around an element for applying hooks
 * @param {HTMLElement} element - The DOM element to enhance
 * @returns {WithChain} A chainable object with hook methods
 */
const with_ = (element) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] with(el) requires an HTMLElement as argument')
  }

  /** @type {WithChain} */
  const chain = {
    /**
     * Apply event listeners to the element
     * @param {Record<string, EventListener>} eventMap - Object mapping event names to handlers
     * @returns {WithChain} The chainable object for further operations
     */
    useEvents: (eventMap) => {
      useEvents(element, eventMap)
      return chain
    },

    /**
     * Apply conditional classes to the element
     * @param {Record<string, boolean>} classMap - Object mapping class names to boolean conditions
     * @returns {WithChain} The chainable object for further operations
     */
    useClasses: (classMap) => {
      useClasses(element, classMap)
      return chain
    },
    
    /**
     * Set HTML attributes on the element
     * @param {Record<string, string|null>} attrMap - Object mapping attribute names to values
     * @returns {WithChain} The chainable object for further operations
     */
    useAttributes: (attrMap) => {
      useAttributes(element, attrMap)
      return chain
    },
    
    /**
     * Apply inline styles to the element
     * @param {Partial<CSSStyleDeclaration>} styleMap - Object mapping style properties to values
     * @returns {WithChain} The chainable object for further operations
     */
    useStyles: (styleMap) => {
      useStyles(element, styleMap)
      return chain
    }
  }
  
  // Add methods for all registered chainable hooks
  const registeredChainableHooks = getRegisteredChainableHooks()
  
  registeredChainableHooks.forEach((hookFn, hookName) => {
    if (isFunction(hookFn) && !chain[hookName]) {
      // Add the hook as a method on the chain object
      /**
       * Dynamic chainable hook method
       * @param {...any} args - Arguments to pass to the hook function
       * @returns {WithChain} The chainable object for further operations
       */
      chain[hookName] = (...args) => {
        hookFn(element, ...args)
        return chain
      }
    }
  })

  return chain
}

// Export as 'with' while avoiding reserved word errors in this module
export { with_ as with }
