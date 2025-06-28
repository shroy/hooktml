import { isEmptyString, isNil, isString } from '../utils/type-guards.js'

/**
 * @typedef {Object} HookTMLConfig
 * @property {boolean} [debug=false] - Whether to enable debug logging
 * @property {string} [attributePrefix=''] - Optional prefix for all HookTML attributes
 * @property {string} [componentPath] - Path to scan for auto-registering components
 * @property {string} [formattedPrefix=''] - Internal: attributePrefix formatted with trailing dash
 */

/**
 * @typedef {Object} HookTMLConfigOptions
 * @property {boolean} [debug=false] - Whether debug mode is enabled
 * @property {string} [attributePrefix] - Optional prefix for all HookTML attributes
 * @property {string} [componentPath] - Path to scan for auto-registering components
 * @property {string} [formattedPrefix] - Internal: attributePrefix formatted with trailing dash
 */

/**
 * Default configuration
 * @type {HookTMLConfig}
 */
const defaultConfig = {
  componentPath: undefined,
  debug: false,
  attributePrefix: '',
  formattedPrefix: ''
}

/**
 * Current runtime configuration
 * @type {HookTMLConfig}
 */
let config = { ...defaultConfig }

/**
 * Format the attribute prefix to ensure it has a trailing dash
 * @param {string|undefined} prefix - The raw prefix
 * @returns {string} - The formatted prefix with a trailing dash
 */
const formatPrefix = (prefix) => {
  if (isNil(prefix) || !isString(prefix) || isEmptyString(prefix)) return ''
  return prefix.endsWith('-') ? prefix : `${prefix}-`
}

/**
 * Initialize the runtime configuration
 * @param {Partial<HookTMLConfig>} [options] - Configuration options
 */
export const initConfig = (options = {}) => {
  const normalizedOptions = { ...options }

  if ('attributePrefix' in normalizedOptions) {
    normalizedOptions.formattedPrefix = formatPrefix(normalizedOptions.attributePrefix)
  }

  config = { ...defaultConfig, ...normalizedOptions }
}

/**
 * Get the current runtime configuration
 * @returns {HookTMLConfig}
 */
export const getConfig = () => ({ ...config })
