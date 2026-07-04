/**
 * This module provides a React-like hook context system to manage
 * component-scoped hooks and cleanup functions.
 */
import { isFunction, isNil, isEmptyArray, isNotNil, isNonEmptyArray, isNonEmptyString, isArray, isObject, isSignal } from '../utils/type-guards.js'
import { tryCatch } from '../utils/try-catch.js'
import { getConfig } from './config.js'
import { logger } from '../utils/logger.js'

/**
 * Stack of active hook contexts
 * @type {Array<{id: number, element: HTMLElement, effectQueue: Function[], effectOrder: number, cleanups: Function[]}>}
 */
const hookContextStack = []

/**
 * Monotonic counter used to give every hook context a unique id, which also
 * seeds a fallback context name when the caller does not supply one. Effect
 * identity is namespaced by the context name so two directives on the same
 * element each run in their own context and must not collide (see #14).
 * @type {number}
 */
let contextIdCounter = 0

/**
 * Map to store cleanup functions for each element
 * @type {WeakMap<HTMLElement, Function[]>}
 */
const componentCleanups = new WeakMap()

/**
 * Map to store effect subscriptions for each element, keyed by a
 * context-namespaced effect key (`${contextName}:${index}`)
 * @type {WeakMap<HTMLElement, Map<string, Set<Function>>>}
 */
const effectSubscriptions = new WeakMap()

/**
 * Map to store effect cleanups, keyed by a context-namespaced effect key
 * @type {WeakMap<HTMLElement, Map<string, Function>>}
 */
const effectCleanups = new WeakMap()

/**
 * Map to track initialized effects, keyed by a context-namespaced effect key
 * @type {WeakMap<HTMLElement, Set<string>>}
 */
const initializedEffects = new WeakMap()

/**
 * Opt-in test/debug flag: when enabled, `withHookContext` re-throws non-framework
 * errors (e.g. vitest AssertionErrors) instead of swallowing them. This exists so
 * assertions placed inside a `withHookContext` callback are not silently eaten,
 * which would let tests pass vacuously. It is OFF by default so production behavior
 * (graceful degradation) is unchanged; the test suite opts in via src/tests/setup.js.
 * @type {boolean}
 */
let rethrowInHookContext = false

/**
 * Enable or disable the opt-in rethrow behavior of `withHookContext`.
 * @param {boolean} enabled - Whether non-framework errors should be re-thrown
 * @returns {void}
 */
export const setRethrowInHookContext = (enabled) => {
  rethrowInHookContext = Boolean(enabled)
}

/**
 * Whether `withHookContext` currently re-throws non-framework errors.
 * @returns {boolean}
 */
export const getRethrowInHookContext = () => rethrowInHookContext

/**
 * Determines whether an error is a framework (HookTML) operational error, which
 * `withHookContext` intentionally swallows even in rethrow mode. Non-framework
 * errors (AssertionErrors, unexpected runtime errors) are the ones surfaced.
 * @param {unknown} error - The caught error
 * @returns {boolean}
 */
const isFrameworkError = (error) =>
  isObject(error) &&
  typeof (/** @type {{ message?: unknown }} */ (error).message) === 'string' &&
  /** @type {{ message: string }} */ (error).message.startsWith('[HookTML]')

/**
 * Builds the per-element key that identifies a single effect. The key is
 * namespaced by the owning context's name so a second hook's effect on the same
 * element does not collide with the first hook's effect at the same index (#14),
 * while re-processing the SAME hook on the same element reuses the same key so
 * its effect is not needlessly re-run.
 * @param {{name: string}} context - The owning hook context
 * @param {number} order - The effect's order within its context
 * @returns {string} - The namespaced effect key
 */
const getEffectKey = (context, order) => `${context.name}:${order}`

/**
 * Creates a hook context for a component or directive
 * @param {HTMLElement} element - The component/directive element
 * @param {string} [name] - A stable name for the context (hook/component name).
 *   Effect identity is namespaced by this name so distinct hooks on the same
 *   element don't collide. When omitted, a unique per-context name is generated.
 * @returns {Object} - The hook context object
 */
export const createHookContext = (element, name) => {
  const id = contextIdCounter++
  const context = {
    id,
    // Stable namespace for effect identity; fall back to a unique id when the
    // caller does not supply a name (e.g. direct withHookContext usage).
    name: isNonEmptyString(name) ? name : `ctx#${id}`,
    element,
    effectQueue: [],
    effectOrder: 0,
    cleanups: []
  }

  // Ensure a cleanups store exists for this element so onCleanup(fn) can feed it
  const existingCleanups = componentCleanups.get(element) || []
  componentCleanups.set(element, existingCleanups)

  return context
}

/**
 * Registers an element-scoped cleanup function that runs on teardown via
 * runCleanupFunctions (from the observer's removeElement and refresh paths).
 *
 * This lets subsystems that outlive a single hook context (e.g. children watchers
 * in the observer) tie their disposal to the element's lifecycle instead of relying
 * on the MutationObserver stream, which is silent while the observer is stopped,
 * paused, or never started.
 *
 * @param {HTMLElement} element - The element to associate the cleanup with
 * @param {Function} cleanup - The cleanup function to run on teardown
 */
export const registerCleanup = (element, cleanup) => {
  if (!isFunction(cleanup)) return

  const existingCleanups = componentCleanups.get(element) || []
  componentCleanups.set(element, [...existingCleanups, cleanup])
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
 * Registers a cleanup function with the currently active hook context so it runs
 * when the owning element is torn down via {@link runCleanupFunctions}. Used by
 * reactive primitives (e.g. `computed`) created inside a component/hook so their
 * dependency subscriptions are released automatically, without the caller having
 * to call `destroy()` manually.
 *
 * No-op when there is no active hook context (the caller then owns disposal).
 *
 * @param {() => void} cleanup - The disposer to run on teardown.
 * @returns {boolean} - Whether a context was active and the cleanup was registered.
 */
export const registerContextCleanup = (cleanup) => {
  if (!isFunction(cleanup)) return false

  const context = getCurrentContext()
  if (isNil(context)) return false

  const { element } = context
  const existingCleanups = componentCleanups.get(element) || []
  existingCleanups.push(cleanup)
  componentCleanups.set(element, existingCleanups)
  return true
}

/**
 * Executes an effect and sets up any necessary cleanup
 * @param {Function} effectFn - The effect function to execute
 * @param {HTMLElement} element - The associated element
 * @param {string} key - The effect's context-namespaced identity key
 * @returns {Function|undefined} - The cleanup function if one was returned
 */
const executeEffect = (effectFn, element, key) => {
  let cleanup

  tryCatch({
    fn: () => {
      // Get existing cleanups for this element
      let elementCleanups = effectCleanups.get(element)
      if (!elementCleanups) {
        elementCleanups = new Map()
        effectCleanups.set(element, elementCleanups)
      }

      // Run existing cleanup for this effect if it exists
      const existingCleanup = elementCleanups.get(key)
      if (isFunction(existingCleanup)) {
        runCleanup(existingCleanup)
      }

      // Run the effect and get any cleanup function
      cleanup = effectFn()

      // If the effect returns a cleanup function, store it
      if (isFunction(cleanup)) {
        elementCleanups.set(key, cleanup)
      }

      // Mark this effect as initialized
      let elementInitialized = initializedEffects.get(element)
      if (!elementInitialized) {
        elementInitialized = new Set()
        initializedEffects.set(element, elementInitialized)
      }
      elementInitialized.add(key)
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

  // Drain with a while-loop (not forEach) so effects queued from inside another
  // effect's setup body are also executed rather than dropped (see #39).
  while (effectQueue.length > 0) {
    const effect = effectQueue.shift()
    const key = effect.__effectKey
    if (!elementInitialized.has(key)) {
      executeEffect(effect, element, key)
    }
  }
}

/**
 * Executes a callback with a hook context for the given element
 * @param {HTMLElement} element - The component/directive element
 * @param {Function} callback - The callback to execute
 * @param {string} [name] - A stable name (hook/component name) used to namespace
 *   this context's effect identity. Distinct names on the same element keep
 *   their effects separate; the same name reuses effect identity across re-runs.
 * @returns {*} - The result of the callback
 */
export const withHookContext = (element, callback, name) => {
  const context = createHookContext(element, name)
  hookContextStack.push(context)
  
  return tryCatch({
    fn: () => {
      const result = callback()
      executeEffectQueue(context)
      return result
    },
    onError: (error) => {
      logger.error('Error in withHookContext:', error)
      // Opt-in test/debug mode: surface non-framework errors (e.g. AssertionErrors)
      // so inner assertions can't pass vacuously. Off by default in production.
      if (rethrowInHookContext && !isFrameworkError(error)) {
        throw error
      }
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
 * Warns about dependencies that are not signals (they won't trigger re-runs)
 * @param {Array} dependencies - The dependency array passed to useEffect
 */
const warnNonSignalDeps = (dependencies) => {
  if (!isNonEmptyArray(dependencies)) return

  const nonSignalDeps = dependencies.filter(dep => !isSignal(dep) && !isNil(dep))
  if (isEmptyArray(nonSignalDeps)) return

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

/**
 * React-like useEffect hook with signal dependency tracking.
 *
 * Inside a component/directive context the effect is queued and executed when
 * the context finishes, with cleanups/subscriptions tracked per element for
 * teardown. Outside any context the effect runs immediately, subscribes to its
 * signal dependencies manually, and returns a combined cleanup that runs the
 * effect's teardown and unsubscribes — so no-context behavior is uniform and
 * stays reactive (see #42).
 *
 * @param {Function} setupFn - Setup function that may return a cleanup function
 * @param {Array} dependencies - Array of dependencies (empty array for one-time effects)
 * @returns {Function|undefined} - Outside a context: a cleanup function. Inside a context: undefined.
 */
export const useEffect = (setupFn, dependencies) => {
  const context = getCurrentContext()

  // Throw an error if dependencies array is not provided
  if (isNil(dependencies)) {
    throw new Error('[HookTML] useEffect requires a dependencies array. For one-time effects, use an empty array [].')
  }

  // Ensure dependencies is an array
  if (!isArray(dependencies)) {
    throw new Error('[HookTML] useEffect dependencies must be an array.')
  }

  // Check for non-signal dependencies and warn developers
  warnNonSignalDeps(dependencies)

  // Outside a hook context: apply immediately, subscribe to signal deps
  // manually, and return a combined cleanup. This keeps no-context usage of
  // useEffect (and the hooks built on it) reactive and uniform.
  if (!context) {
    logger.warn('useEffect called outside component/directive context')
    return runDetachedEffect(setupFn, dependencies)
  }

  const { element } = context

  // Assign this effect a stable identity within its context. The order counter
  // lives on the context object, so two directives on the same element each
  // start at 0 without colliding, and the key is namespaced by the context name.
  const currentOrder = context.effectOrder++
  const effectKey = getEffectKey(context, currentOrder)

  // Create effect wrapper that handles signal subscriptions
  const effectWrapper = () => {
    // Get or create subscription map for this element
    let elementSubs = effectSubscriptions.get(element)
    if (!elementSubs) {
      elementSubs = new Map()
      effectSubscriptions.set(element, elementSubs)
    }

    // Get or create subscription set for this effect
    let effectSubs = elementSubs.get(effectKey)
    if (!effectSubs) {
      effectSubs = new Set()
      elementSubs.set(effectKey, effectSubs)
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

      // Run existing cleanup for this effect if it exists
      const existingCleanup = elementCleanups.get(effectKey)
      if (isFunction(existingCleanup)) {
        runCleanup(existingCleanup)
      }

      // Run the new effect
      const cleanup = setupFn()

      // If the effect returns a cleanup function, store it
      if (isFunction(cleanup)) {
        elementCleanups.set(effectKey, cleanup)
      }

      return cleanup
    }

    return runEffect()
  }

  // Tag the wrapper with its identity so the queue drain can dedupe/track it.
  effectWrapper.__effectKey = effectKey

  // Queue the effect for execution
  context.effectQueue.push(effectWrapper)
}

/**
 * Runs an effect outside of any hook context: applies it immediately,
 * subscribes to its signal dependencies so it stays reactive, and returns a
 * combined cleanup that runs the latest teardown and unsubscribes.
 * @param {Function} setupFn - Setup function that may return a cleanup function
 * @param {Array} dependencies - Array of dependencies
 * @returns {Function} - Combined cleanup function
 */
const runDetachedEffect = (setupFn, dependencies) => {
  let currentCleanup

  const runEffect = () => {
    // Run the previous teardown before re-running the effect
    if (isFunction(currentCleanup)) {
      runCleanup(currentCleanup)
    }
    currentCleanup = setupFn()
  }

  // Initial application
  runEffect()

  // Subscribe to signal dependencies so the effect stays reactive
  const unsubscribes = []
  dependencies.forEach(dep => {
    if (isSignal(dep)) {
      unsubscribes.push(dep.subscribe(() => runEffect()))
    }
  })

  // Combined cleanup: unsubscribe, then run the latest teardown
  return () => {
    unsubscribes.forEach(unsub => unsub())
    unsubscribes.length = 0
    if (isFunction(currentCleanup)) {
      runCleanup(currentCleanup)
      currentCleanup = undefined
    }
  }
}

/**
 * Registers a component/directive-scoped cleanup function from within a hook
 * context. The cleanup is run (and cleared) by runCleanupFunctions when the
 * element is torn down. This is the mechanism with()-chain hooks and other
 * hooks use to auto-register their teardown.
 * @param {Function} fn - The cleanup function to register
 * @returns {void}
 */
export const onCleanup = (fn) => {
  if (!isFunction(fn)) {
    logger.warn('onCleanup expects a function')
    return
  }

  const context = getCurrentContext()

  if (!context) {
    logger.warn('onCleanup called outside component/directive context')
    return
  }

  const { element } = context

  // Track on the context object for introspection...
  context.cleanups.push(fn)

  // ...and merge into per-element storage so teardown finds it.
  let elementCleanups = componentCleanups.get(element)
  if (!elementCleanups) {
    elementCleanups = []
    componentCleanups.set(element, elementCleanups)
  }
  elementCleanups.push(fn)
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
  
  // Remove effect initialization state (effect order lives on the context object)
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
