import { isEmptyString, isFunction, isString } from '../utils/type-guards.js'
import { logger } from '../utils/logger.js'

/**
 * Validates that a hook name follows the use* naming convention
 * @param {string} name - Hook name to validate
 * @returns {boolean} Whether the name is valid
 */
const isValidHookName = (name) => {
  if (isEmptyString(name)) return false
  
  // Check if name starts with 'use' prefix
  return name.startsWith('use') && name.length > 3
}

/**
 * @typedef {Function} HookCallback
 * @property {string} name - The name of the hook function
 */

/**
 * Internal storage for registered hooks
 * Maps hook names to their callback functions
 * @type {Map<string, HookCallback>}
 */
const hookRegistry = new Map()

/**
 * Internal storage for registered chainable hooks
 * Maps hook names to their callback functions
 * @type {Map<string, HookCallback>}
 */
const chainableHookRegistry = new Map()

/**
 * Registers a hook with HookTML
 * @param {HookCallback} callback - The hook callback function
 * @returns {boolean} True if the hook was newly registered, false if it was already registered
 */
export const registerHook = (callback) => {
  // Ensure we received a function
  if (!isFunction(callback)) {
    logger.warn('Invalid hook: must be a function')
    return false
  }
  
  // Extract name from the function
  const name = callback.name
  
  // Ensure name is valid
  if (isEmptyString(name)) {
    logger.warn('Invalid hook: must be a named function')
    return false
  }

  // Ensure hook follows naming convention
  if (!isValidHookName(name)) {
    logger.warn(`Invalid hook name: "${name}". Hook names must start with "use"`)
    return false
  }
  
  const isNew = !hookRegistry.has(name)
  
  if (isNew) {
    hookRegistry.set(name, callback)
    logger.log(`Registered hook: ${name}`)
  }
  
  return isNew
}

/**
 * Registers a chainable hook for use with the with(el) API
 * @param {HookCallback} callback - The hook callback function
 * @returns {boolean} True if the hook was newly registered, false if it was already registered
 */
export const registerChainableHook = (callback) => {
  // Ensure we received a function
  if (!isFunction(callback)) {
    logger.warn('Invalid chainable hook: must be a function')
    return false
  }
  
  // Extract name from the function
  const name = callback.name
  
  // Ensure name is valid
  if (isEmptyString(name)) {
    logger.warn('Invalid chainable hook: must be a named function')
    return false
  }

  // Ensure hook follows naming convention
  if (!isValidHookName(name)) {
    logger.warn(`Invalid chainable hook name: "${name}". Hook names must start with "use"`)
    return false
  }
  
  const isNew = !chainableHookRegistry.has(name)
  
  if (isNew) {
    chainableHookRegistry.set(name, callback)
    logger.log(`Registered chainable hook: ${name}`)
  }
  
  return isNew
}

/**
 * Gets all registered hook names
 * @returns {string[]} Array of registered hook names
 */
export const getRegisteredHookNames = () => {
  return Array.from(hookRegistry.keys())
}

/**
 * Gets all registered chainable hook names
 * @returns {string[]} Array of registered chainable hook names
 */
export const getRegisteredChainableHookNames = () => {
  return Array.from(chainableHookRegistry.keys())
}

/**
 * Gets a registered hook callback by name
 * @param {string} name - The name of the hook to retrieve
 * @returns {HookCallback|undefined} The hook callback function or undefined if not found
 */
export const getRegisteredHook = (name) => {
  if (!isString(name)) return undefined
  return hookRegistry.get(name)
}

/**
 * Gets a registered chainable hook callback by name
 * @param {string} name - The name of the chainable hook to retrieve
 * @returns {HookCallback|undefined} The chainable hook callback function or undefined if not found
 */
export const getRegisteredChainableHook = (name) => {
  if (!isString(name)) return undefined
  return chainableHookRegistry.get(name)
}

/**
 * Returns a map of all registered hooks
 * @returns {Map<string, HookCallback>} Map of hook names to their callbacks
 */
export const getRegisteredHooks = () => {
  return new Map(hookRegistry)
}

/**
 * Returns a map of all registered chainable hooks
 * @returns {Map<string, HookCallback>} Map of chainable hook names to their callbacks
 */
export const getRegisteredChainableHooks = () => {
  return new Map(chainableHookRegistry)
}

/**
 * Clears the hook registry
 * This is primarily for testing and debugging
 */
export const clearHookRegistry = () => {
  hookRegistry.clear()
  logger.log('Hook registry cleared')
}

/**
 * Clears the chainable hook registry
 * This is primarily for testing and debugging
 */
export const clearChainableHookRegistry = () => {
  chainableHookRegistry.clear()
  logger.log('Chainable hook registry cleared')
} 
