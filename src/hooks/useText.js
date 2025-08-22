import { useEffect } from "../core/hookContext"
import { logger } from "../utils/logger"
import { isFunction, isHTMLElement, isNil } from "../utils/type-guards"

/**
 * Hook for setting text content on an element
 * @param {HTMLElement} element - The element to set text content on
 * @param {() => string} textFunction - Function that returns the text content to set
 * @param {any[]} [deps=[]] - Dependencies array for the effect
 * @returns {void}
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

  useEffect(() => {
    element.textContent = textFunction()
  }, deps)
}
