import { isEmptyString, isFunction, isString } from '../utils/type-guards.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Function} ComponentCallback
 * @property {string} name - The name of the component function
 */

/**
 * @typedef {Object} RegisteredComponent
 * @property {string} name - The normalized name of the component
 * @property {ComponentCallback} callback - The component initialization function
 */

/**
 * Internal storage for registered components
 * Maps component names to their callback functions
 * @type {Map<string, ComponentCallback>}
 */
const componentRegistry = new Map()

/**
 * Validates that a component name follows PascalCase naming convention
 * @param {string} name - Component name to validate
 * @returns {boolean} Whether the name is valid
 */
const isValidComponentName = (name) => {
  if (isEmptyString(name)) return false
  
  // Check if name starts with uppercase (PascalCase)
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

/**
 * Registers a component with HookTML
 * @param {ComponentCallback} callback - The component callback function (must be a named function in PascalCase)
 * @returns {boolean} True if the component was newly registered, false if it was already registered
 */
export const registerComponent = (callback) => {
  // Ensure we received a function
  if (!isFunction(callback)) {
    logger.warn('Invalid component: must be a function')
    return false
  }
  
  // Extract name from the function
  const name = callback.name
  
  // Validate the component name
  if (!isValidComponentName(name)) {
    logger.warn(`Invalid component name: "${name}". Must be a non-empty PascalCase name`)
    return false
  }
  
  const isNew = !componentRegistry.has(name)
  
  if (isNew) {
    componentRegistry.set(name, callback)
    logger.log(`Registered component: ${name}`)
  }
  
  return isNew
}

/**
 * Gets all registered component names
 * @returns {string[]} Array of registered component names
 */
export const getRegisteredComponentNames = () => {
  return Array.from(componentRegistry.keys())
}

/**
 * Gets a registered component callback by name
 * @param {string} name - The name of the component to retrieve
 * @returns {ComponentCallback|undefined} The component callback function or undefined if not found
 */
export const getRegisteredComponent = (name) => {
  if (!isString(name)) return undefined
  return componentRegistry.get(name)
}

/**
 * Clears the component registry
 * This is primarily for testing and debugging
 */
export const clearRegistry = () => {
  componentRegistry.clear()
  logger.log('Component registry cleared')
}

/**
 * Placeholder for future build tool integration
 * This function would automatically register components from a glob pattern
 * 
 * Example usage with Vite:
 * ```
 * // Get all component files
 * const componentFiles = import.meta.glob('./components/*.js')
 * registerFromGlob(componentFiles)
 * ```
 * 
 * Note: Parameter is commented out until implementation is complete
 */
export const registerFromGlob = () => {
  logger.warn('[HookTML] registerFromGlob is not implemented yet')
  // Future implementation will:
  // 1. Extract component names from file paths
  // 2. Import the modules to trigger their registerComponent calls
  // 3. Return a Promise that resolves when all components are registered
}

/**
 * Adapter function to register a component by name and function
 * This helps autoRegisterComponents work with the existing registry
 * @param {string} name - Component name
 * @param {Function} componentFn - Component function
 * @returns {boolean} Registration success
 */
export const registerComponentByName = (name, componentFn) => {
  if (!isString(name) || !isFunction(componentFn)) {
    logger.warn('Invalid component or name')
    return false
  }
  
  // Attach the name to the function if it doesn't have one
  if (isEmptyString(componentFn.name) || componentFn.name !== name) {
    Object.defineProperty(componentFn, 'name', { value: name })
  }
  
  return registerComponent(componentFn)
} 
