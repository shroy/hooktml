/**
 * Hook for conditionally applying CSS classes to an element
 * @param {HTMLElement|null|undefined} element - The element to apply classes to (or null/undefined)
 * @param {Record<string, boolean|{value: boolean, subscribe: Function}>} classMap - Object mapping class names to boolean conditions or signals
 * @returns {Function} Cleanup function that removes all event listeners
 */
import { isHTMLElement, isNonEmptyArray, isNonEmptyObject, isSignal, isNil } from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { logger } from '../utils/logger.js'

export const useClasses = (element, classMap) => {

  if (isNil(element)) {
    logger.warn('[HookTML] useClasses called with null/undefined element, skipping class application')
    return () => { } // Return no-op cleanup function
  }

  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] useClasses requires an HTMLElement as first argument')
  }

  if (!isNonEmptyObject(classMap)) {
    throw new Error('[HookTML] useClasses requires a non-empty object mapping class names to boolean conditions')
  }

  // Extract signals from classMap for effect dependencies
  const signalDeps = Object.values(classMap).filter(isSignal)

  // Track which classes we've added for cleanup
  const addedClasses = new Set()

  // Function to update classes based on current conditions
  const updateClasses = () => {
    // Clear previously added classes first
    addedClasses.forEach(className => {
      element.classList.remove(className)
    })
    addedClasses.clear()

    // Apply classes based on current conditions
    Object.entries(classMap).forEach(([className, condition]) => {
      // Handle both boolean and signal values
      const isActive = isSignal(condition)
        ? condition.value
        : Boolean(condition)

      if (isActive) {
        element.classList.add(className)
        addedClasses.add(className)
      }
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
    addedClasses.forEach(className => {
      element.classList.remove(className)
    })
    addedClasses.clear()
  }
} 
