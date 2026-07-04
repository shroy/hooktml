import {
  isFunction,
  isHTMLElement,
  isHTMLElementArray,
  isNil,
  isNonEmptyArray,
  isNonEmptyObject,
  isSignal,
  isEmptyArray
} from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

/**
 * Hook for setting HTML attributes on an element or array of elements
 * @param {HTMLElement|HTMLElement[]|null|undefined} elementOrElements - The element(s) to set attributes on (or null/undefined)
 * @param {Record<string, string|null|{value: string|null, subscribe: Function}|Function>} attrMap - Object mapping attribute names to string values, null to remove, signals, or functions
 * @returns {Function} Cleanup function that removes all applied attributes
 */
export const useAttributes = (elementOrElements, attrMap, deps = []) => {

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

  const implicitDeps = Object.values(attrMap).filter(isSignal)
  const allDeps = implicitDeps.concat(deps)

  const modifiedAttributesPerElement = new WeakMap()

  const evaluateCondition = (condition, element, index) => {
    if (isFunction(condition)) {
      return condition(element, index)
    } else if (isSignal(condition)) {
      return condition.value
    } else {
      return condition
    }
  }

  const applyAttributes = () => {
    elements.forEach((element, index) => {
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

        const value = evaluateCondition(valueOrSignal, element, index)

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

  // Set up reactive updates if any signals were provided. useEffect keeps the
  // attributes reactive both inside a hook context (queued + tracked for
  // teardown) and outside one (applies + subscribes immediately, returning a
  // combined cleanup we capture below).
  let effectCleanup
  if (isNonEmptyArray(allDeps)) {
    effectCleanup = useEffect(() => {
      applyAttributes()
    }, allDeps)
  }

  // Return cleanup function
  return () => {
    // Tear down any effect subscriptions set up outside a hook context
    if (isFunction(effectCleanup)) effectCleanup()

    elements.forEach(element => {
      const modifiedAttributes = modifiedAttributesPerElement.get(element)
      if (modifiedAttributes) {
        // Restore original attribute values
        modifiedAttributes.forEach((originalValue, attrName) => {
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
