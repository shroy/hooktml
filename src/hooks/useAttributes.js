import { 
  isFunction,
  isHTMLElement, 
  isNil, 
  isNonEmptyArray, 
  isNonEmptyObject, 
  isNotNil, 
  isSignal 
} from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { tryCatch } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

/**
 * Hook for setting HTML attributes on an element
 * @param {HTMLElement} element - The element to set attributes on
 * @param {Record<string, string|null|{value: string|null, subscribe: Function}>} attrMap - Object mapping attribute names to string values, null to remove, or signals
 * @returns {Function} Cleanup function that removes all applied attributes
 */
export const useAttributes = (element, attrMap) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] useAttributes requires an HTMLElement as first argument')
  }

  if (!isNonEmptyObject(attrMap)) {
    throw new Error('[HookTML] useAttributes requires a non-empty object mapping attribute names to values')
  }

  // Extract signals from attrMap for effect dependencies
  const signalDeps = Object.values(attrMap).filter(isSignal)

  // Track which attributes we've modified for cleanup
  const modifiedAttributes = new Map()

  // Function to apply attributes
  const applyAttributes = () => {
    Object.entries(attrMap).forEach(([attrName, valueOrSignal]) => {
      // Store original value for potential cleanup if not already stored
      if (!modifiedAttributes.has(attrName)) {
        modifiedAttributes.set(attrName, element.hasAttribute(attrName) 
          ? element.getAttribute(attrName) 
          : null
        )
      }

      // Extract the actual value (either direct or from signal)
      const value = isSignal(valueOrSignal)
        ? valueOrSignal.value
        : valueOrSignal

      // Apply the new value (or remove if null)
      if (isNil(value)) {
        element.removeAttribute(attrName)
      } else {
        element.setAttribute(attrName, value)
      }
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
      
        // Add cleanup for manual subscriptions to modifiedAttributes for proper teardown
        const originalCleanup = modifiedAttributes.get('__cleanup')
        modifiedAttributes.set('__cleanup', () => {
          unsubscribes.forEach(unsub => unsub())
          if (isFunction(originalCleanup)) originalCleanup()
        })
      }
    })
  }

  // Return cleanup function
  return () => {
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
} 
