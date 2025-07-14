import { kebabToCamel } from '../utils/strings.js'
import { isFunction, isHTMLElement, isHTMLElementArray, isNonEmptyArray, isNonEmptyObject, isSignal, isNil } from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { tryCatch } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

/**
 * Hook for applying inline styles to an element or array of elements
 * @param {HTMLElement|HTMLElement[]|null|undefined} elementOrElements - The element(s) to apply styles to (or null/undefined)
 * @param {Partial<CSSStyleDeclaration>|Record<string, string|{value: string, subscribe: Function}|Function>} styleMap - Object mapping style properties to values, signals, or functions
 * @returns {Function} Cleanup function that removes all applied styles
 */
export const useStyles = (elementOrElements, styleMap) => {

  if (isNil(elementOrElements)) {
    logger.warn('[HookTML] useStyles called with null/undefined element, skipping style application')
    return () => { } // Return no-op cleanup function
  }

  const elements = isHTMLElementArray(elementOrElements) ? elementOrElements : [elementOrElements]

  if (elements.some(element => !isHTMLElement(element))) {
    throw new Error('[HookTML] useStyles requires HTMLElement(s) as first argument')
  }

  if (!isNonEmptyObject(styleMap)) {
    throw new Error('[HookTML] useStyles requires a non-empty object mapping style properties to values')
  }

  const signalDeps = Object.values(styleMap).filter(isSignal)

  const modifiedStylesPerElement = new WeakMap()

  // Function to evaluate a condition for a specific element
  const evaluateCondition = (condition, element) => {
    if (isFunction(condition)) {
      return condition(element)
    } else if (isSignal(condition)) {
      return condition.value
    } else {
      return condition
    }
  }

  // Function to apply styles
  const applyStyles = () => {
    elements.forEach(element => {
      let modifiedStyles = modifiedStylesPerElement.get(element)
      if (!modifiedStyles) {
        modifiedStyles = new Map()
        modifiedStylesPerElement.set(element, modifiedStyles)
      }

      Object.entries(styleMap).forEach(([prop, valueOrSignal]) => {
        // Convert kebab-case to camelCase if needed
        const cssProp = prop.includes('-')
          ? kebabToCamel(prop)
          : prop

        // Store original value for potential cleanup
        if (!modifiedStyles.has(cssProp)) {
          modifiedStyles.set(cssProp, element.style[cssProp])
        }

        // Extract the actual value (either direct, from signal, or from function)
        const value = evaluateCondition(valueOrSignal, element)

        // Apply the new value
        element.style[cssProp] = value
      })
    })
  }

  applyStyles()

  if (isNonEmptyArray(signalDeps)) {
    tryCatch({
      fn: () => {
        useEffect(() => {
          applyStyles()
        }, signalDeps)
      },
      onError: (error) => {
        logger.error('Error in useStyles:', error)

        // Handle case where useEffect is called outside component/directive context
        // Set up manual signal subscriptions as fallback
        // Since we've already filtered with isSignal, we know these have a subscribe method
        const unsubscribes = signalDeps.map(signal => signal.subscribe(() => applyStyles()))

        // Add cleanup for manual subscriptions to each element's modifiedStyles for proper teardown
        elements.forEach(element => {
          const modifiedStyles = modifiedStylesPerElement.get(element)
          if (modifiedStyles) {
            const originalCleanup = modifiedStyles.get('__cleanup')
            modifiedStyles.set('__cleanup', () => {
              unsubscribes.forEach(unsub => unsub())
              if (isFunction(originalCleanup)) originalCleanup()
            })
          }
        })
      }
    })
  }

  return () => {
    elements.forEach(element => {
      const modifiedStyles = modifiedStylesPerElement.get(element)
      if (modifiedStyles) {
        // Run any stored cleanup function first
        const cleanup = modifiedStyles.get('__cleanup')
        if (isFunction(cleanup)) cleanup()

        // Restore original style values
        modifiedStyles.forEach((originalValue, prop) => {
          if (prop === '__cleanup') return
          element.style[prop] = originalValue
        })
        modifiedStyles.clear()
      }
    })
  }
} 
