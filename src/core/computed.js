import { tryCatch } from '../utils/try-catch.js'
import { isSignal, isFunction } from '../utils/type-guards.js'
import { startTracking, trackSignal } from './reactiveTracker.js'
import { registerContextCleanup } from './hookContext.js'

/**
 * Registers a signal read with the active dependency tracker.
 *
 * Re-exported for backwards compatibility; the tracker state now lives in the
 * shared `reactiveTracker` module (imported by both `signal.js` and
 * `computed.js`) rather than on a mutable `globalThis` handshake.
 *
 * @param {object} signalInstance - The reactive source being read.
 */
export const trackDependency = (signalInstance) => {
  trackSignal(signalInstance)
}

/**
 * Creates a computed signal that automatically tracks dependencies.
 *
 * ## Disposal contract
 * Reading `.value` subscribes the computed to the signals it depends on (the
 * signals hold strong references to these subscriptions). Those subscriptions
 * must be released to avoid leaking the computed:
 *   - When `computed()` is called inside a component/hook (an active hook
 *     context), disposal is registered with that context automatically and runs
 *     when the element is torn down. Callers do not need to do anything.
 *   - When `computed()` is called outside any hook context, the caller owns the
 *     lifetime and must call `destroy()` when finished.
 *
 * @template T
 * @param {() => T} computeFn - Function that computes the value
 * @returns {{
 *   value: T,
 *   subscribe: (callback: (newValue: T) => void) => (() => void),
 *   destroy: () => void,
 *   toString: () => string
 * }} A read-only computed signal
 */
export const computed = (computeFn) => {
  if (!isFunction(computeFn)) {
    throw new Error('[HookTML] computed() requires a function')
  }

  const state = {
    value: /** @type {T | undefined} */ (undefined),
    hasValue: false,
    isStale: true,
    isComputing: false,
    dependencies: new Set(),
    subscribers: new Set(),
    notificationScheduled: false
  }

  const unsubscribeFunctions = new Set()

  const cleanupDependencies = () => {
    unsubscribeFunctions.forEach(fn => fn())
    unsubscribeFunctions.clear()
    state.dependencies.clear()
  }

  // Schedule notification to break recursion cycle
  const scheduleNotification = () => {
    if (state.notificationScheduled || state.subscribers.size === 0) return

    state.notificationScheduled = true
    queueMicrotask(() => {
      state.notificationScheduled = false

      if (state.subscribers.size === 0) return

      // Recompute value and notify subscribers. A throwing computeFn must not
      // escape the microtask (which would surface as an unhandled error and
      // crash the host); swallow and log it instead.
      tryCatch({
        fn: () => {
          const newValue = computedSignal.value
          state.subscribers.forEach(callback => {
            tryCatch({
              fn: () => callback(newValue),
              onError: (error) => {
                console.error('[HookTML] Error in computed subscriber:', error)
              }
            })
          })
        },
        onError: (error) => {
          console.error('[HookTML] Error recomputing computed signal:', error)
        }
      })
    })
  }

  const computedSignal = {
    get value() {
      // Return cached value if still valid
      if (!state.isStale && state.hasValue) {
        // Track this computed as a dependency for other computeds
        trackSignal(computedSignal)
        return /** @type {T} */ (state.value)
      }

      // Prevent infinite recursion
      if (state.isComputing) {
        throw new Error('[HookTML] Circular dependency detected in computed signal')
      }

      // Clean up old dependencies
      cleanupDependencies()

      // Start computing
      state.isComputing = true

      // Track new dependencies
      const newDependencies = new Set()
      const stopTracking = startTracking((dependency) => {
        if (isSignal(dependency) && !newDependencies.has(dependency)) {
          newDependencies.add(dependency)

          // Subscribe to dependency changes
          const unsubscribe = dependency.subscribe(() => {
            const wasStale = state.isStale
            state.isStale = true

            // Only schedule notification if we weren't already stale
            if (!wasStale && state.hasValue) {
              scheduleNotification()
            }
          })
          unsubscribeFunctions.add(unsubscribe)
        }
      })

      // Compute the value. A throwing computeFn must always restore the tracker
      // and the isComputing flag, otherwise (a) every later read reports a bogus
      // "Circular dependency detected" and (b) the leaked tracker captures every
      // subsequent signal read app-wide as a dependency of this broken computed.
      let result
      try {
        result = computeFn()
      } finally {
        stopTracking()
        state.isComputing = false
      }

      // Update state
      state.dependencies = newDependencies
      state.value = result
      state.hasValue = true
      state.isStale = false

      // Track this computed as a dependency for other computeds
      trackSignal(computedSignal)

      return result
    },

    set value(newValue) {
      throw new Error('[HookTML] Cannot assign to computed signal. Computed signals are read-only.')
    },

    subscribe(callback) {
      if (!isFunction(callback)) {
        throw new Error('[HookTML] Computed subscribers must be functions')
      }

      state.subscribers.add(callback)

      return () => {
        state.subscribers.delete(callback)
      }
    },

    destroy() {
      cleanupDependencies()
      state.subscribers.clear()
      state.hasValue = false
      state.isStale = true
      state.notificationScheduled = false
    },

    toString() {
      const deps = state.dependencies.size
      const stale = state.isStale ? ' (stale)' : ''
      return `Computed(${state.hasValue ? state.value : 'uncomputed'}, ${deps} deps${stale})`
    }
  }

  // If created inside a component/hook, release dependency subscriptions when
  // the owning element is torn down (no manual destroy() required).
  registerContextCleanup(() => computedSignal.destroy())

  return computedSignal
}
