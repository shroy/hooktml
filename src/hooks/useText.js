import { useEffect } from "../core/hookContext.js"
import { logger } from "../utils/logger.js"
import { isFunction, isHTMLElement, isNil } from "../utils/type-guards.js"

/**
 * Hook for setting text content on an element
 * @param {HTMLElement} element - The element to set text content on
 * @param {() => string} textFunction - Function that returns the text content to set
 * @param {any[]} [deps=[]] - Dependencies array for the effect
 * @returns {Function|void} - Outside a hook context, a cleanup that unsubscribes; otherwise void
 */
export const useText = (element, textFunction, deps = []) => {
  if (isNil(element)) {
    logger.info('[HookTML] useText called with null/undefined element, skipping text updates')
    return
  }

  if (!isHTMLElement(element)) {
    logger.info('[HookTML] useText requires HTMLElement as first argument')
    return
  }

  if (!isFunction(textFunction)) {
    logger.info('[HookTML] useText requires a function as the second argument')
    return
  }

  // useEffect applies the text immediately and stays reactive to signal deps
  // both inside a hook context and outside one (returning a cleanup we forward).
  return useEffect(() => {
    element.textContent = textFunction()
  }, deps)
}
