/**
 * Hook for applying inline styles to an element
 * @param {HTMLElement} element - The element to apply styles to
 * @param {Partial<CSSStyleDeclaration>|Record<string, string|{value: string, subscribe: Function}>} styleMap - Object mapping style properties to values or signals
 * @returns {Function} Cleanup function that removes all applied styles
 */
import { kebabToCamel } from '../utils/strings.js'
import { isFunction, isHTMLElement, isNonEmptyArray, isNonEmptyObject, isSignal } from '../utils/type-guards.js'
import { useEffect } from '../core/hookContext.js'
import { tryCatch } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'

export const useStyles = (element, styleMap) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] useStyles requires an HTMLElement as first argument')
  }

  if (!isNonEmptyObject(styleMap)) {
    throw new Error('[HookTML] useStyles requires a non-empty object mapping style properties to values')
  }

  // Extract signals from styleMap for effect dependencies
  const signalDeps = Object.values(styleMap).filter(isSignal)

  // Track which styles we've modified for cleanup
  const modifiedStyles = new Map()

  // Function to apply styles
  const applyStyles = () => {
    Object.entries(styleMap).forEach(([prop, valueOrSignal]) => {
      // Convert kebab-case to camelCase if needed
      const cssProp = prop.includes('-') 
        ? kebabToCamel(prop)
        : prop

      // Store original value for potential cleanup
      if (!modifiedStyles.has(cssProp)) {
        modifiedStyles.set(cssProp, element.style[cssProp])
      }

      // Extract the actual value (either direct or from signal)
      const value = isSignal(valueOrSignal)
        ? valueOrSignal.value
        : valueOrSignal

      // Apply the new value
      element.style[cssProp] = value
    })
  }

  // Apply styles immediately
  applyStyles()

  // Set up reactive updates if any signals were provided
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
        
        // Add cleanup for manual subscriptions to modifiedStyles for proper teardown
        const originalCleanup = modifiedStyles.get('__cleanup')
        modifiedStyles.set('__cleanup', () => {
          unsubscribes.forEach(unsub => unsub())
          if (isFunction(originalCleanup)) originalCleanup()
        })
      }
    })
  }

  // Return cleanup function
  return () => {
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
} 
