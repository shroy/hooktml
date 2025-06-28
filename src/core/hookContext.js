/**
 * This module provides a React-like hook context system to manage
 * component-scoped hooks and cleanup functions.
 */
import { isFunction, isNil, isEmptyArray, isNotNil, isNonEmptyArray, isArray, isObject, isSignal } from '../utils/type-guards.js'
import { tryCatch } from '../utils/try-catch.js'
import { getConfig } from './config.js'
import { logger } from '../utils/logger.js'

/**
 * Stack of active hook contexts
 * @type {Array<{element: HTMLElement, effectQueue: Function[], cleanups: Function[]}>}
 */
const hookContextStack = []

/**
 * Map to store cleanup functions for each element
 * @type {WeakMap<HTMLElement, Function[]>}
 */
const componentCleanups = new WeakMap()

/**
 * Map to store effect subscriptions for each element
 * @type {WeakMap<HTMLElement, Map<number, Set<Function>>>}
 */
const effectSubscriptions = new WeakMap()

/**
 * Map to track effect order for each element
 * @type {WeakMap<HTMLElement, number>}
 */
const effectOrder = new WeakMap()

/**
 * Map to store effect cleanups by order
 * @type {WeakMap<HTMLElement, Map<number, Function>>}
 */
const effectCleanups = new WeakMap()

/**
 * Map to track initialized effects by order
 * @type {WeakMap<HTMLElement, Set<number>>}
 */
const initializedEffects = new WeakMap()

/**
 * Creates a hook context for a component or directive
 * @param {HTMLElement} element - The component/directive element
 * @returns {Object} - The hook context object
 */
export const createHookContext = (element) => {
  const context = {
    element,
    effectQueue: [],
    cleanups: []
  }
  
  // Get existing cleanups or initialize an empty array
  const existingCleanups = componentCleanups.get(element) || []
  componentCleanups.set(element, existingCleanups)
  
  // Reset effect order for this element
  effectOrder.set(element, 0)
  
  return context
}

/**
 * Gets the current hook context
 * @returns {Object|null} - The current hook context or null
 */
export const getCurrentContext = () => {
  return hookContextStack.length > 0 ? 
    hookContextStack[hookContextStack.length - 1] : null
}

/**
 * Executes an effect and sets up any necessary cleanup
 * @param {Function} effectFn - The effect function to execute
 * @param {HTMLElement} element - The associated element
 * @param {number} order - The effect's order in the hook
 * @returns {Function|undefined} - The cleanup function if one was returned
 */
const executeEffect = (effectFn, element, order) => {
  let cleanup
  
  tryCatch({
    fn: () => {
      // Get existing cleanups for this element
      let elementCleanups = effectCleanups.get(element)
      if (!elementCleanups) {
        elementCleanups = new Map()
        effectCleanups.set(element, elementCleanups)
      }
      
      // Run existing cleanup for this effect order if it exists
      const existingCleanup = elementCleanups.get(order)
      if (isFunction(existingCleanup)) {
        runCleanup(existingCleanup)
      }
      
      // Run the effect and get any cleanup function
      cleanup = effectFn()
      
      // If the effect returns a cleanup function, store it
      if (isFunction(cleanup)) {
        elementCleanups.set(order, cleanup)
      }
      
      // Mark this effect as initialized
      let elementInitialized = initializedEffects.get(element)
      if (!elementInitialized) {
        elementInitialized = new Set()
        initializedEffects.set(element, elementInitialized)
      }
      elementInitialized.add(order)
    },
    onError: (error) => {
      logger.error('Error in effect execution:', error)
    }
  })
  
  return cleanup
}

/**
 * Executes all queued effects for a context
 * @param {Object} context - The hook context
 */
const executeEffectQueue = (context) => {
  const { element, effectQueue } = context
  
  if (isEmptyArray(effectQueue)) {
    return
  }
  
  logger.log(`Executing ${effectQueue.length} effect(s) for element:`, element)
  
  // Get or create the set of initialized effects for this element
  let elementInitialized = initializedEffects.get(element)
  if (!elementInitialized) {
    elementInitialized = new Set()
    initializedEffects.set(element, elementInitialized)
  }
  
  // Execute each effect that hasn't been initialized
  effectQueue.forEach((effect, index) => {
    if (!elementInitialized.has(index)) {
      executeEffect(effect, element, index)
    }
  })
  
  // Clear the effect queue after execution
  effectQueue.length = 0
  
  // Reset effect order after execution
  effectOrder.set(element, 0)
}

/**
 * Executes a callback with a hook context for the given element
 * @param {HTMLElement} element - The component/directive element
 * @param {Function} callback - The callback to execute
 * @returns {*} - The result of the callback
 */
export const withHookContext = (element, callback) => {
  const context = createHookContext(element)
  hookContextStack.push(context)
  
  return tryCatch({
    fn: () => {
      const result = callback()
      executeEffectQueue(context)
      return result
    },
    onError: (error) => {
      logger.error('Error in withHookContext:', error)
      return null
    },
    onFinally: () => {
      hookContextStack.pop()
    }
  })
}

/**
 * Runs a cleanup function if it exists
 * @param {Function} cleanup - The cleanup function to run
 */
const runCleanup = (cleanup) => {
  if (!isFunction(cleanup)) return
  
  tryCatch({
    fn: cleanup,
    onError: (error) => {
      logger.error('Error in effect cleanup:', error)
    }
  })
}

/**
 * React-like useEffect hook with signal dependency tracking
 * @param {Function} setupFn - Setup function that may return a cleanup function
 * @param {Array} dependencies - Array of dependencies (empty array for one-time effects)
 */
export const useEffect = (setupFn, dependencies) => {
  const context = getCurrentContext()
  
  if (!context) {
    logger.warn('useEffect called outside component/directive context')
    return
  }
  
  // Throw an error if dependencies array is not provided
  if (isNil(dependencies)) {
    throw new Error('[HookTML] useEffect requires a dependencies array. For one-time effects, use an empty array [].')
  }
  
  // Ensure dependencies is an array
  if (!isArray(dependencies)) {
    throw new Error('[HookTML] useEffect dependencies must be an array.')
  }
  
  const { element } = context
  
  // Get current effect order for this element
  const currentOrder = effectOrder.get(element) || 0
  effectOrder.set(element, currentOrder + 1)
  
  // Check for non-signal dependencies and warn developers
  if (isNonEmptyArray(dependencies)) {
    const nonSignalDeps = dependencies.filter(dep => !isSignal(dep) && !isNil(dep))
    
    if (!isEmptyArray(nonSignalDeps)) {
      const { debug } = getConfig()
      const formatValue = (val) => isObject(val) ? 
        JSON.stringify(val).slice(0, 50) : String(val)
      
      const debugInfo = debug ? 
        `\n  Non-reactive values: ${nonSignalDeps.map(formatValue).join(', ')}` : ''
      
      logger.warn(
        `useEffect dependency array contains ${nonSignalDeps.length} non-signal value(s) that won't trigger re-runs.` +
        `\n  To make values reactive, convert them to signals with signal().${debugInfo}`
      )
    }
  }
  
  // Create effect wrapper that handles signal subscriptions
  const effectWrapper = () => {
    // Get or create subscription map for this element
    let elementSubs = effectSubscriptions.get(element)
    if (!elementSubs) {
      elementSubs = new Map()
      effectSubscriptions.set(element, elementSubs)
    }
    
    // Get or create subscription set for this effect order
    let effectSubs = elementSubs.get(currentOrder)
    if (!effectSubs) {
      effectSubs = new Set()
      elementSubs.set(currentOrder, effectSubs)
    }
    
    // Clean up old subscriptions
    effectSubs.forEach(unsub => unsub())
    effectSubs.clear()
    
    // Set up new subscriptions for signal dependencies
    dependencies.forEach(dep => {
      if (isSignal(dep)) {
        const unsubscribe = dep.subscribe(() => {
          // Re-run effect when signal changes
          runEffect()
        })
        effectSubs.add(unsubscribe)
      }
    })
    
    // Run the actual effect
    const runEffect = () => {
      // Get existing cleanups for this element
      let elementCleanups = effectCleanups.get(element)
      if (!elementCleanups) {
        elementCleanups = new Map()
        effectCleanups.set(element, elementCleanups)
      }
      
      // Run existing cleanup for this effect order if it exists
      const existingCleanup = elementCleanups.get(currentOrder)
      if (isFunction(existingCleanup)) {
        runCleanup(existingCleanup)
      }
      
      // Run the new effect
      const cleanup = setupFn()
      
      // If the effect returns a cleanup function, store it
      if (isFunction(cleanup)) {
        elementCleanups.set(currentOrder, cleanup)
      }
      
      return cleanup
    }
    
    return runEffect()
  }
  
  // Queue the effect for execution
  context.effectQueue.push(effectWrapper)
}

/**
 * Runs cleanup functions for an element
 * @param {HTMLElement} element - The element to clean up
 * @returns {boolean} - Whether any cleanups were found and executed
 */
export const runCleanupFunctions = (element) => {
  const cleanups = componentCleanups.get(element)
  let hasCleanups = false
  
  // Run regular cleanup functions
  if (isNotNil(cleanups) && isNonEmptyArray(cleanups)) {
    cleanups.forEach(cleanup => {
      runCleanup(cleanup)
    })
    componentCleanups.delete(element)
    hasCleanups = true
  }
  
  // Clean up effect subscriptions
  const elementSubs = effectSubscriptions.get(element)
  if (elementSubs) {
    elementSubs.forEach(effectSubs => {
      effectSubs.forEach(unsub => unsub())
      effectSubs.clear()
    })
    effectSubscriptions.delete(element)
    hasCleanups = true
  }
  
  // Run effect cleanups
  const elementEffectCleanups = effectCleanups.get(element)
  if (elementEffectCleanups) {
    elementEffectCleanups.forEach(cleanup => {
      runCleanup(cleanup)
    })
    effectCleanups.delete(element)
    hasCleanups = true
  }
  
  // Remove effect order and initialization state
  effectOrder.delete(element)
  initializedEffects.delete(element)
  
  return hasCleanups
}

/**
 * Checks if an element has cleanup functions
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - Whether the element has cleanup functions
 */
export const hasCleanupFunctions = (element) => {
  const cleanups = componentCleanups.get(element)
  const elementSubs = effectSubscriptions.get(element)
  
  return Boolean(
    (isNotNil(cleanups) && isNonEmptyArray(cleanups)) ||
    (elementSubs && elementSubs.size > 0)
  )
} 
