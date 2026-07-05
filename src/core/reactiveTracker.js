/**
 * Shared reactive dependency tracker.
 *
 * Both `signal.js` and `computed.js` import from this module so that a signal
 * read (`.value`) can register itself with whatever consumer is currently
 * tracking dependencies (a `computed` recompute).
 *
 * This replaces the previous `globalThis.__HOOKTML_TRACK_SIGNAL__` handshake,
 * which was an import-time side effect (a tree-shake hazard while
 * `package.json` declares those modules side-effect free) and a shared mutable
 * global that any script -- or a second copy of the library -- could clobber.
 *
 * @module reactiveTracker
 */
import { isFunction } from '../utils/type-guards.js'

/**
 * The function currently collecting dependencies, or `null` when nothing is
 * tracking. Module-private state, only mutated through {@link startTracking}.
 * @type {((dependency: object) => void) | null}
 */
let currentTracker = null

/**
 * Registers a signal (or computed) read with the active tracker, if any.
 * Called from a signal's `.value` getter.
 *
 * @param {object} dependency - The reactive source being read.
 */
export const trackSignal = (dependency) => {
  if (isFunction(currentTracker)) {
    currentTracker(dependency)
  }
}

/**
 * Installs `trackerFn` as the active dependency collector for the duration of a
 * synchronous computation, returning a function that restores the previous
 * tracker. Nesting is supported: the previous tracker is captured and restored,
 * so computeds reading other computeds behave correctly.
 *
 * @param {(dependency: object) => void} trackerFn - Collector to install.
 * @returns {() => void} Call to restore the previous tracker.
 */
export const startTracking = (trackerFn) => {
  const previousTracker = currentTracker
  currentTracker = trackerFn
  return () => {
    currentTracker = previousTracker
  }
}
