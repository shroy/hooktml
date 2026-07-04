import { getConfig } from './config.js'
import { getRegisteredComponentNames } from './registry.js'
import { getRegisteredHooks } from './hookRegistry.js'
import { camelToKebab } from '../utils/strings.js'
import { isNonEmptyArray } from '../utils/type-guards.js'
import { scanComponents, initializeComponents } from './scanComponents.js'
import { processElementHooks } from './scanDirectives.js'

/**
 * Builds a CSS selector matching any registered component (class- or
 * `use-component`-based) for the current prefix.
 * @param {string[]} componentNames - Registered component names
 * @param {string} prefix - Attribute prefix
 * @returns {string} CSS selector, or '' when there are no components
 */
const buildComponentSelector = (componentNames, prefix = '') => {
  if (!componentNames.length) return ''
  const classSelector = componentNames.map(name => `.${name}`).join(', ')
  const useComponentSelector = componentNames
    .map(name => `[${prefix}use-component="${name}"]`)
    .join(', ')
  return `${classSelector}, ${useComponentSelector}`
}

/**
 * Builds a CSS selector matching any registered hook directive for the current
 * prefix.
 * @param {string[]} hookNames - Registered hook names (camelCase)
 * @param {string} prefix - Attribute prefix
 * @returns {string} CSS selector, or '' when there are no hooks
 */
const buildHookSelector = (hookNames, prefix = '') => {
  if (!hookNames.length) return ''
  return hookNames.map(name => `[${prefix}${camelToKebab(name)}]`).join(', ')
}

/**
 * Processes a single element in the canonical order: component first, then its
 * directives. This is the ONE element-processing routine shared by the dynamic
 * observer path (observer.addElement) and the static scan path, so identical
 * markup is processed the same way regardless of whether it existed at start()
 * or was inserted later. (#24)
 *
 * Per-step guards (`isInitialized` for the component, `isDirectiveInitialized`
 * for each directive) live in initializeComponents / processElementHooks, so
 * calling this repeatedly on the same element is safe and idempotent.
 *
 * @param {HTMLElement} element - The DOM element to process
 */
export const processElement = (element) => {
  const { formattedPrefix } = getConfig()

  // 1. Component step (runs first).
  const componentNames = getRegisteredComponentNames()
  if (isNonEmptyArray(componentNames)) {
    const componentSelector = buildComponentSelector(componentNames, formattedPrefix)
    if (componentSelector && element.matches(componentSelector)) {
      const foundComponents = scanComponents().filter(comp => comp.element === element)
      if (isNonEmptyArray(foundComponents)) {
        initializeComponents(foundComponents)
      }
    }
  }

  // 2. Directive step (runs after the component).
  const hookNames = Array.from(getRegisteredHooks().keys())
  if (isNonEmptyArray(hookNames)) {
    const hookSelector = buildHookSelector(hookNames, formattedPrefix)
    if (hookSelector && element.matches(hookSelector)) {
      processElementHooks(element)
    }
  }
}
