import { isFunction, isHTMLElement, isNotNil, isNonEmptyArray } from '../utils/type-guards.js'
import { tryCatch } from '../utils/try-catch.js'
import { logger } from '../utils/logger.js'
import { StateManager } from './stateManager.js'

/**
 * @typedef {Object} Registration
 * @property {Function | undefined} component - The component teardown function
 * @property {Function[]} directives - Array of directive teardown functions
 */

/**
 * @typedef {Object} TeardownResult
 * @property {boolean} success - Whether the teardown was successful
 * @property {Error | undefined} error - Any error that occurred during teardown
 */

/**
 * Manages lifecycle operations for both components and directives
 * 
 * @example
 * ```js
 * const manager = new LifecycleManager()
 * 
 * // Register a component with teardown
 * manager.registerComponent(element, () => {
 *   // Cleanup code
 * })
 * 
 * // Register a directive with teardown
 * manager.registerDirective(element, () => {
 *   // Cleanup code
 * }, 'my-directive')
 * 
 * // Check initialization state
 * if (manager.isInitialized(element)) {
 *   // Component is initialized
 * }
 * 
 * // Execute teardowns when removing element
 * manager.executeTeardowns(element)
 * ```
 */
export class LifecycleManager {
  constructor() {
    /** @type {WeakMap<HTMLElement, Registration>} */
    this.teardownRegistry = new WeakMap()
    this.stateManager = new StateManager()
  }

  /**
   * Registers a component and marks it as initialized
   * @param {HTMLElement} element - The DOM element
   * @param {Function} teardown - The teardown function
   * @returns {boolean} Whether registration was successful
   */
  registerComponent(element, teardown) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] registerComponent requires an HTMLElement')
    }

    if (!isFunction(teardown)) {
      return false
    }

    let registration = this.teardownRegistry.get(element)
    if (!registration) {
      registration = { component: undefined, directives: [] }
      this.teardownRegistry.set(element, registration)
    }

    registration.component = teardown
    this.stateManager.markInitialized(element)
    return true
  }

  /**
   * Registers a directive and marks it as initialized
   * @param {HTMLElement} element - The DOM element
   * @param {Function} teardown - The teardown function
   * @param {string} directiveName - The name of the directive
   * @returns {boolean} Whether registration was successful
   */
  registerDirective(element, teardown, directiveName) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] registerDirective requires an HTMLElement')
    }

    if (!isFunction(teardown)) {
      return false
    }

    if (!directiveName) {
      throw new Error('[HookTML] directiveName is required')
    }

    let registration = this.teardownRegistry.get(element)
    if (!registration) {
      registration = { component: undefined, directives: [] }
      this.teardownRegistry.set(element, registration)
    }

    registration.directives.push(teardown)
    this.stateManager.markDirectiveInitialized(element, directiveName)
    return true
  }

  /**
   * Gets the component teardown function for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {Function | undefined} The teardown function if it exists
   */
  getComponentTeardown(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] getComponentTeardown requires an HTMLElement')
    }
    const registration = this.teardownRegistry.get(element)
    return registration?.component
  }

  /**
   * Gets the directive teardown functions for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {Function[]} Array of teardown functions
   */
  getDirectiveTeardowns(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] getDirectiveTeardowns requires an HTMLElement')
    }
    const registration = this.teardownRegistry.get(element)
    return registration?.directives ?? []
  }

  /**
   * Gets all teardown functions for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {Registration} Object containing component and directive teardowns
   */
  getTeardowns(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] getTeardowns requires an HTMLElement')
    }
    return this.teardownRegistry.get(element) ?? {
      component: undefined,
      directives: []
    }
  }

  /**
   * Checks if an element has any registered teardown functions
   * @param {HTMLElement} element - The DOM element
   * @returns {boolean} Whether the element has any teardown functions
   */
  hasRegistration(element) {
    if (!isHTMLElement(element)) return false
    
    const registration = this.teardownRegistry.get(element)
    return isNotNil(registration) && (
      isFunction(registration.component) || 
      isNonEmptyArray(registration.directives)
    )
  }

  /**
   * Executes teardown for a component
   * @param {HTMLElement} element - The DOM element
   * @returns {TeardownResult} The result of the teardown operation
   */
  executeComponentTeardown(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] executeComponentTeardown requires an HTMLElement')
    }

    const registration = this.teardownRegistry.get(element)
    if (!registration?.component) {
      return { success: true, error: undefined }
    }

    const teardown = registration.component
    return tryCatch({
      fn: () => {
        teardown()
        registration.component = undefined
        return { success: true, error: undefined }
      },
      onError: (error) => {
        logger.error('Error in component teardown:', error)
        return { success: false, error }
      }
    })
  }

  /**
   * Executes all directive teardowns for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {TeardownResult[]} Array of results for each teardown operation
   */
  executeDirectiveTeardowns(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] executeDirectiveTeardowns requires an HTMLElement')
    }

    const registration = this.teardownRegistry.get(element)
    if (!registration?.directives.length) {
      return []
    }

    const results = registration.directives.map(teardown => 
      tryCatch({
        fn: () => {
          teardown()
          return { success: true, error: undefined }
        },
        onError: (error) => {
          logger.error('Error in directive teardown:', error)
          return { success: false, error }
        }
      })
    )

    registration.directives = []
    return results
  }

  /**
   * Executes all teardowns for an element and removes its registration
   * @param {HTMLElement} element - The DOM element
   * @returns {{ component: TeardownResult, directives: TeardownResult[] }} Results of all teardown operations
   */
  executeTeardowns(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] executeTeardowns requires an HTMLElement')
    }

    const componentResult = this.executeComponentTeardown(element)
    const directiveResults = this.executeDirectiveTeardowns(element)

    // Clean up registration and state
    this.teardownRegistry.delete(element)
    this.stateManager.clearState(element)

    return {
      component: componentResult,
      directives: directiveResults
    }
  }

  /**
   * Checks if an element is initialized
   * @param {HTMLElement} element - The DOM element
   * @returns {boolean} Whether the element is initialized
   */
  isInitialized(element) {
    return this.stateManager.isInitialized(element)
  }

  /**
   * Checks if a directive is initialized for an element
   * @param {HTMLElement} element - The DOM element
   * @param {string} directiveName - The name of the directive
   * @returns {boolean} Whether the directive is initialized
   */
  isDirectiveInitialized(element, directiveName) {
    return this.stateManager.isDirectiveInitialized(element, directiveName)
  }

  /**
   * Gets all initialized directives for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {string[]} Array of initialized directive names
   */
  getInitializedDirectives(element) {
    return this.stateManager.getInitializedDirectives(element)
  }

  /**
   * Marks an element as initialized (convenience method)
   * @param {HTMLElement} element - The DOM element
   */
  markInitialized(element) {
    this.stateManager.markInitialized(element)
  }

  /**
   * Clears all state for an element (convenience method)
   * @param {HTMLElement} element - The DOM element
   */
  clearState(element) {
    this.stateManager.clearState(element)
  }
} 
