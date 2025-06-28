/**
 * Manages initialization state for elements
 * 
 * @example
 * ```js
 * const manager = new StateManager()
 * 
 * // Track component initialization
 * manager.markInitialized(element)
 * 
 * // Track directive initialization
 * manager.markDirectiveInitialized(element, 'my-directive')
 * 
 * // Check initialization states
 * if (manager.isInitialized(element)) {
 *   // Component is initialized
 * }
 * 
 * if (manager.isDirectiveInitialized(element, 'my-directive')) {
 *   // Directive is initialized
 * }
 * 
 * // Get all initialized directives
 * const directives = manager.getInitializedDirectives(element)
 * 
 * // Clean up when done
 * manager.clearState(element)
 * ```
 */
import { isHTMLElement } from '../utils/type-guards.js'

/**
 * @typedef {Object} ElementState
 * @property {boolean} initialized - Whether the element has been initialized
 * @property {string[]} initializedDirectives - Names of directives that have been initialized
 */

export class StateManager {
  constructor() {
    /** @type {WeakMap<HTMLElement, ElementState>} */
    this.stateRegistry = new WeakMap()
  }

  /**
   * Marks an element as initialized
   * @param {HTMLElement} element - The DOM element
   * @throws {Error} If element is not an HTMLElement
   */
  markInitialized(element) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] markInitialized requires an HTMLElement')
    }

    const state = this.getOrCreateState(element)
    state.initialized = true
  }

  /**
   * Marks a directive as initialized for an element
   * @param {HTMLElement} element - The DOM element
   * @param {string} directiveName - The name of the directive
   * @throws {Error} If element is not an HTMLElement
   */
  markDirectiveInitialized(element, directiveName) {
    if (!isHTMLElement(element)) {
      throw new Error('[HookTML] markDirectiveInitialized requires an HTMLElement')
    }

    if (!directiveName) {
      throw new Error('[HookTML] directiveName is required')
    }

    const state = this.getOrCreateState(element)
    if (!state.initializedDirectives.includes(directiveName)) {
      state.initializedDirectives.push(directiveName)
    }
  }

  /**
   * Checks if an element is initialized
   * @param {HTMLElement} element - The DOM element
   * @returns {boolean} Whether the element is initialized
   */
  isInitialized(element) {
    if (!isHTMLElement(element)) {
      return false
    }

    const state = this.stateRegistry.get(element)
    return state?.initialized ?? false
  }

  /**
   * Checks if a directive is initialized for an element
   * @param {HTMLElement} element - The DOM element
   * @param {string} directiveName - The name of the directive
   * @returns {boolean} Whether the directive is initialized
   */
  isDirectiveInitialized(element, directiveName) {
    if (!isHTMLElement(element) || !directiveName) {
      return false
    }

    const state = this.stateRegistry.get(element)
    return state?.initializedDirectives.includes(directiveName) ?? false
  }

  /**
   * Gets all initialized directives for an element
   * @param {HTMLElement} element - The DOM element
   * @returns {string[]} Array of initialized directive names
   */
  getInitializedDirectives(element) {
    if (!isHTMLElement(element)) {
      return []
    }

    const state = this.stateRegistry.get(element)
    return state?.initializedDirectives ?? []
  }

  /**
   * Clears all state for an element
   * @param {HTMLElement} element - The DOM element
   */
  clearState(element) {
    if (!isHTMLElement(element)) {
      return
    }

    this.stateRegistry.delete(element)
  }

  /**
   * Gets or creates state for an element
   * @private
   * @param {HTMLElement} element - The DOM element
   * @returns {ElementState} The element's state
   */
  getOrCreateState(element) {
    let state = this.stateRegistry.get(element)
    if (!state) {
      state = {
        initialized: false,
        initializedDirectives: []
      }
      this.stateRegistry.set(element, state)
    }
    return state
  }
} 
 