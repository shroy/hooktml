import {
  isFunction,
  isHTMLElement,
  isHTMLElementArray,
  isNil,
  isNonEmptyArray,
  isNonEmptyObject,
  isNotNil,
  isSignal,
  isEmptyArray
} from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { tryCatch } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

/**
 * Hook for setting HTML attributes on an element or array of elements
 * @param {HTMLElement|HTMLElement[]|null|undefined} elementOrElements - The element(s) to set attributes on (or null/undefined)
 * @param {Record<string, string|null|{value: string|null, subscribe: Function}|Function>} attrMap - Object mapping attribute names to string values, null to remove, signals, or functions
 * @returns {Function} Cleanup function that removes all applied attributes
 */
export const useAttributes = (elementOrElements, attrMap) => {

  if (isNil(elementOrElements)) {
    logger.info('[HookTML] useAttributes called with null/undefined element, skipping attribute setting')
    return () => { } // Return no-op cleanup function
  }

  // Handle empty arrays gracefully
  if (isEmptyArray(elementOrElements)) {
    logger.info('[HookTML] useAttributes called with empty array, skipping attribute setting')
    return () => { } // Return no-op cleanup function
  }

  const elements = isHTMLElementArray(elementOrElements) ? elementOrElements : [elementOrElements]

  if (elements.some(element => !isHTMLElement(element))) {
    throw new Error('[HookTML] useAttributes requires HTMLElement(s) as first argument')
  }

  if (!isNonEmptyObject(attrMap)) {
    throw new Error('[HookTML] useAttributes requires a non-empty object mapping attribute names to values')
  }

  const signalDeps = Object.values(attrMap).filter(isSignal)

  const modifiedAttributesPerElement = new WeakMap()

  const evaluateCondition = (condition, element) => {
    if (isFunction(condition)) {
      return condition(element)
    } else if (isSignal(condition)) {
      return condition.value
    } else {
      return condition
    }
  }

  const applyAttributes = () => {
    elements.forEach(element => {
      let modifiedAttributes = modifiedAttributesPerElement.get(element)
      if (!modifiedAttributes) {
        modifiedAttributes = new Map()
        modifiedAttributesPerElement.set(element, modifiedAttributes)
      }

      Object.entries(attrMap).forEach(([attrName, valueOrSignal]) => {
        if (!modifiedAttributes.has(attrName)) {
          modifiedAttributes.set(attrName, element.hasAttribute(attrName)
            ? element.getAttribute(attrName)
            : null
          )
        }

        const value = evaluateCondition(valueOrSignal, element)

        if (isNil(value)) {
          element.removeAttribute(attrName)
        } else {
          element.setAttribute(attrName, value)
        }
      })
    })
  }

  // Apply attributes immediately
  applyAttributes()

  // Set up reactive updates if any signals were provided
  if (isNonEmptyArray(signalDeps)) {
    tryCatch({
      fn: () => {
        useEffect(() => {
          applyAttributes()
        }, signalDeps)
      },
      onError: (error) => {
        logger.error('Error in useAttributes:', error)

        // Handle case where useEffect is called outside component/directive context
        // Set up manual signal subscriptions as fallback
        // Since we've already filtered with isSignal, we know these have a subscribe method
        const unsubscribes = signalDeps.map(signal => {
          return isSignal(signal) ? signal.subscribe(() => applyAttributes()) : null
        }).filter(isNotNil)

        // Add cleanup for manual subscriptions to each element's modifiedAttributes for proper teardown
        elements.forEach(element => {
          const modifiedAttributes = modifiedAttributesPerElement.get(element)
          if (modifiedAttributes) {
            const originalCleanup = modifiedAttributes.get('__cleanup')
            modifiedAttributes.set('__cleanup', () => {
              unsubscribes.forEach(unsub => unsub())
              if (isFunction(originalCleanup)) originalCleanup()
            })
          }
        })
      }
    })
  }

  // Return cleanup function
  return () => {
    elements.forEach(element => {
      const modifiedAttributes = modifiedAttributesPerElement.get(element)
      if (modifiedAttributes) {
        // Run any stored cleanup function first
        const cleanup = modifiedAttributes.get('__cleanup')
        if (isFunction(cleanup)) cleanup()

        // Restore original attribute values
        modifiedAttributes.forEach((originalValue, attrName) => {
          if (attrName === '__cleanup') return

          if (isNil(originalValue)) {
            element.removeAttribute(attrName)
          } else {
            element.setAttribute(attrName, originalValue)
          }
        })
        modifiedAttributes.clear()
      }
    })
  }
} 
