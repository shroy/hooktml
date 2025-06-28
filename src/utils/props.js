import { isNumeric } from './type-guards.js'
import { extractChildren } from './children.js'
import { kebabToCamel } from './strings.js'
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
