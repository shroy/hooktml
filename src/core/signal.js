import { tryCatch } from '../utils/try-catch.js'
import { isFunction, isUndefined } from '../utils/type-guards.js'
import { logger } from '../utils/logger.js'

/**
 * A lightweight reactive primitive for storing local state.
 * 
 * @template T
 * @param {T} initialValue - The initial value to be stored in the signal
 * @returns {{
 *   value: T,
 *   subscribe: (callback: (newValue: T) => void) => (() => void),
 *   destroy: () => void,
 *   toString: () => string
 * }} A signal object with a value property
 */
export const signal = (initialValue) => {
  // Store value in a container object to avoid direct reassignment
  const state = { current: initialValue }
  
  // Store subscribers in a Set for uniqueness and O(1) lookup
  const subscribers = new Set()
  
  const signalObject = {
    get value() {
      // Track this signal as a dependency if we're in a tracking context
      if (!isUndefined(globalThis) && globalThis.__HOOKTML_TRACK_SIGNAL__) {
        globalThis.__HOOKTML_TRACK_SIGNAL__(signalObject)
      }
      return state.current
    },
    set value(newValue) {
      // Optional: Check if the value hasn't changed to avoid unnecessary updates
      if (state.current === newValue) return
      
      // Update reference container instead of direct variable reassignment
      state.current = newValue
      
      // Notify all subscribers about the value change
      if (subscribers.size > 0) {
        subscribers.forEach(callback => {
          tryCatch({
            fn: () => callback(newValue),
            onError: (error) => {
              logger.error('Error in signal subscriber:', error)
            }
          })
        })
      }
    },
    /**
     * Subscribe to value changes
     * @param {Function} callback - Function to call when value changes
     * @returns {() => void} Unsubscribe function
     */
    subscribe(callback) {
      if (!isFunction(callback)) {
        throw new Error('[HookTML] Signal subscribers must be functions')
      }
      
      subscribers.add(callback)
      
      // Return unsubscribe function
      return () => {
        subscribers.delete(callback)
      }
    },
    destroy() {
      // Clean up all subscribers
      subscribers.clear()
    },
    // For debugging purposes
    toString() {
      return `Signal(${state.current})`
    }
  }
  
  return signalObject
}
 