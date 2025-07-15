import {
  isHTMLElement,
  isHTMLElementArray,
  isNonEmptyArray,
  isNonEmptyObject,
  isSignal,
  isNil,
  isFunction,
  isEmptyArray
} from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

/**
 * Hook for conditionally applying CSS classes to an element or array of elements
 * @param {HTMLElement|HTMLElement[]|null|undefined} elementOrElements - The element(s) to apply classes to (or null/undefined)
 * @param {Record<string, boolean|{value: boolean, subscribe: Function}|Function>} classMap - Object mapping class names to boolean conditions, signals, or functions
 * @returns {Function} Cleanup function that removes all event listeners
 */
export const useClasses = (elementOrElements, classMap) => {

  if (isNil(elementOrElements)) {
    logger.info('[HookTML] useClasses called with null/undefined element, skipping class application')
    return () => { } // Return no-op cleanup function
  }

  // Handle empty arrays gracefully  
  if (isEmptyArray(elementOrElements)) {
    logger.info('[HookTML] useClasses called with empty array, skipping class application')
    return () => { } // Return no-op cleanup function
  }

  // Normalize input to array
  const elements = isHTMLElementArray(elementOrElements) ? elementOrElements : [elementOrElements]

  if (elements.some(element => !isHTMLElement(element))) {
    throw new Error('[HookTML] useClasses requires HTMLElement(s) as first argument')
  }

  if (!isNonEmptyObject(classMap)) {
    throw new Error('[HookTML] useClasses requires a non-empty object mapping class names to boolean conditions')
  }

  // Extract signals from classMap for effect dependencies (ignore functions)
  const signalDeps = Object.values(classMap).filter(isSignal)

  // Track which classes we've added per element for cleanup using WeakMap
  const addedClassesPerElement = new WeakMap()

  // Function to evaluate a condition for a specific element
  const evaluateCondition = (condition, element) => {
    if (isFunction(condition)) {
      return Boolean(condition(element))
    } else if (isSignal(condition)) {
      return Boolean(condition.value)
    } else {
      return Boolean(condition)
    }
  }

  // Function to update classes based on current conditions
  const updateClasses = () => {
    elements.forEach(element => {
      let addedClasses = addedClassesPerElement.get(element)
      if (!addedClasses) {
        addedClasses = new Set()
        addedClassesPerElement.set(element, addedClasses)
      }

      // Clear previously added classes first
      addedClasses.forEach(className => {
        element.classList.remove(className)
      })
      addedClasses.clear()

      Object.entries(classMap).forEach(([className, condition]) => {
        const isActive = evaluateCondition(condition, element)

        if (isActive) {
          element.classList.add(className)
          addedClasses.add(className)
        }
      })
    })
  }

  // Initial application of classes
  updateClasses()

  // Set up reactive updates if any signals were provided
  if (isNonEmptyArray(signalDeps)) {
    useEffect(() => {
      updateClasses()
    }, signalDeps)
  }

  // Return cleanup function
  return () => {
    elements.forEach(element => {
      const addedClasses = addedClassesPerElement.get(element)
      if (addedClasses) {
        addedClasses.forEach(className => {
          element.classList.remove(className)
        })
        addedClasses.clear()
      }
    })
  }
} 
