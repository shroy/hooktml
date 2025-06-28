/**
 * Component lifecycle management
 */

import { isHTMLElement } from '../utils/type-guards.js'

/**
 * Applies the cloak attribute to a component element
 * @param {HTMLElement} element - The component root element
 */
export const applyCloak = (element) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] applyCloak requires an HTMLElement')
  }
  element.setAttribute('data-hooktml-cloak', '')
}

/**
 * Removes the cloak attribute from a component element
 * @param {HTMLElement} element - The component root element
 */
export const removeCloak = (element) => {
  if (!isHTMLElement(element)) {
    throw new Error('[HookTML] removeCloak requires an HTMLElement')
  }
  element.removeAttribute('data-hooktml-cloak')
} 
