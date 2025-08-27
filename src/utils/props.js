import { isNumeric, isNonEmptyString } from './type-guards.js'
import { extractChildren } from './children.js'
import { kebabToCamel, camelToKebab } from './strings.js'
import { getConfig } from '../core/config.js'

/**
 * Coerces a string value to the appropriate JavaScript primitive
 * @param {string} value - The string value to coerce
 * @returns {string|number|boolean|null} The coerced value
 */
export const coerceValue = (value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (isNumeric(value)) return Number(value)
  return value
}

/**
 * Extracts props from an element's attributes based on component name
 * @param {HTMLElement} element - The DOM element
 * @param {string} componentName - The PascalCase component name
 * @returns {Record<string, any>} The extracted props
 */
export const extractProps = (element, componentName) => {
  const { formattedPrefix } = getConfig()
  const prefix = `${formattedPrefix}${componentName.toLowerCase()}-`
  const props = {}

  // Extract regular props
  Array.from(element.attributes).forEach(({ name, value }) => {
    if (name.startsWith(prefix)) {
      const propName = kebabToCamel(name.slice(prefix.length))
      props[propName] = coerceValue(value)
    }
  })

  // Extract children
  const children = extractChildren(element, componentName)
  if (Object.keys(children).length > 0) {
    props.children = children
  }

  return props
}

/**
 * Extracts props from an element's attributes for a specific hook
 * @param {HTMLElement} element - The DOM element
 * @param {string} hookName - The camelCase hook name (e.g., 'useTooltip')
 * @param {string} mainValue - The value from the main use-* attribute
 * @returns {Record<string, any>} The extracted props
 */
export const extractHookProps = (element, hookName, mainValue) => {
  const { formattedPrefix } = getConfig()

  // Convert hook name to the prefix pattern
  // useTooltip -> tooltip-
  const hookPrefix = hookName.startsWith('use')
    ? camelToKebab(hookName.slice(3)) // Remove 'use' prefix
    : camelToKebab(hookName)

  const prefix = `${formattedPrefix}${hookPrefix}-`
  const props = {}

  // Add main value if provided (from use-* attribute)
  if (isNonEmptyString(mainValue)) {
    props.value = coerceValue(mainValue)
  }

  // Extract additional props (e.g., tooltip-placement, tooltip-color)
  Array.from(element.attributes).forEach(({ name, value }) => {
    if (name.startsWith(prefix)) {
      const propName = kebabToCamel(name.slice(prefix.length))
      props[propName] = coerceValue(value)
    }
  })

  return props
} 
