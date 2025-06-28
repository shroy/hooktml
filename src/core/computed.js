import { tryCatch } from '../utils/try-catch.js'
import { isSignal, isFunction, isUndefined } from '../utils/type-guards.js'

/**
 * Singleton class for managing computed signal dependency tracking
 */
class ComputedTracker {
  /** @type {ComputedTracker | null} */
  static instance = null

  constructor() {
    /** @type {Function | null} */
    this.currentTracker = null
    /** @type {Set<object>} */
    this.computingSignals = new Set()
  }

  /** @returns {ComputedTracker} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new ComputedTracker()
    }
    return this.instance
  }

  trackDependency(signalInstance) {
    if (this.currentTracker && isFunction(this.currentTracker)) {
      this.currentTracker(signalInstance)
    }
  }

  startTracking(trackerFn) {
    const previousTracker = this.currentTracker
    this.currentTracker = trackerFn
    return () => {
      this.currentTracker = previousTracker
    }
  }

  isComputing(signal) {
    return this.computingSignals.has(signal)
  }

  markAsComputing(signal) {
    this.computingSignals.add(signal)
  }

  markAsComplete(signal) {
    this.computingSignals.delete(signal)
  }
}

const tracker = ComputedTracker.getInstance()

export const trackDependency = (signalInstance) => {
  tracker.trackDependency(signalInstance)
}

// Set up global tracking for signals to avoid circular imports
if (!isUndefined(globalThis)) {
  globalThis.__HOOKTML_TRACK_SIGNAL__ = trackDependency
}

/**
 * Creates a computed signal that automatically tracks dependencies
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
      
      if (state.subscribers.size > 0) {
        // Recompute value and notify subscribers
        const newValue = computedSignal.value
        state.subscribers.forEach(callback => {
          tryCatch({
            fn: () => callback(newValue),
            onError: (error) => {
              console.error('[HookTML] Error in computed subscriber:', error)
            }
          })
        })
      }
    })
  }

  const computedSignal = {
    get value() {
      // Return cached value if still valid
      if (!state.isStale && state.hasValue) {
        // Track this computed as a dependency for other computeds
        trackDependency(computedSignal)
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
      const stopTracking = tracker.startTracking((dependency) => {
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

      // Compute the value
      const result = computeFn()
      
      // Clean up tracking
      stopTracking()
      state.isComputing = false

      // Update state
      state.dependencies = newDependencies
      state.value = result
      state.hasValue = true
      state.isStale = false

      // Track this computed as a dependency for other computeds
      trackDependency(computedSignal)

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

  return computedSignal
} 
