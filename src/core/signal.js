import { tryCatch } from '../utils/try-catch.js'
import { isFunction } from '../utils/type-guards.js'
import { logger } from '../utils/logger.js'
import { trackSignal } from './reactiveTracker.js'

/**
 * @template T
 * @typedef {Object} Signal
 * @property {T} value
 * @property {Function} destroy
 * @property {Function} toString
 * @property {Function} subscribe
 */

/**
 * Whether a signal notification cascade is currently draining. Module-level so
 * that a subscriber which writes another signal does not synchronously re-enter
 * the notify loop (which, with mutually-writing subscribers, recurses to a
 * stack overflow). Instead the re-entrant write is queued and drained by the
 * outermost `set value` in FIFO order.
 * @type {boolean}
 */
let isNotifying = false

/**
 * Queue of pending notifications collected while a cascade is draining.
 * @type {Array<() => void>}
 */
const notificationQueue = []

/**
 * A lightweight reactive primitive for storing local state.
 *
 * @template T
 * @param {T} initialValue - The initial value to be stored in the signal
 * @returns {Signal<T>} A signal object with a value property
 */
export const signal = (initialValue) => {
  // Store value in a container object to avoid direct reassignment
  const state = { current: initialValue }

  // Store subscribers in a Set for uniqueness and O(1) lookup
  const subscribers = new Set()

  // Notify all current subscribers about the value change
  const notifySubscribers = (newValue) => {
    if (subscribers.size === 0) return

    subscribers.forEach(callback => {
      tryCatch({
        fn: () => callback(newValue),
        onError: (error) => {
          logger.error('Error in signal subscriber:', error)
        }
      })
    })
  }

  const signalObject = {
    get value() {
      // Track this signal as a dependency if we're in a tracking context
      trackSignal(signalObject)
      return state.current
    },
    set value(newValue) {
      // Skip no-op writes. Object.is treats NaN as equal to itself (unlike
      // ===), so repeatedly assigning NaN does not re-notify subscribers.
      if (Object.is(state.current, newValue)) return

      // Update reference container instead of direct variable reassignment
      state.current = newValue

      // Reentrancy/batch guard: if a notification cascade is already draining,
      // queue this notification instead of recursing into it. This bounds
      // synchronous re-entry (e.g. two subscribers writing each other's
      // signals) that would otherwise overflow the stack.
      if (isNotifying) {
        const queuedValue = newValue
        notificationQueue.push(() => notifySubscribers(queuedValue))
        return
      }

      isNotifying = true
      try {
        notifySubscribers(newValue)
        // Drain any notifications queued by subscribers during this cascade.
        while (notificationQueue.length > 0) {
          const next = /** @type {() => void} */ (notificationQueue.shift())
          next()
        }
      } finally {
        isNotifying = false
        // Defensive: never let a stray queue leak across cascades.
        notificationQueue.length = 0
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
