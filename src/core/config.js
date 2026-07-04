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
 * Valid attribute prefixes must be usable inside a CSS attribute selector.
 * They must start with an ASCII letter and contain only word characters
 * (letters, digits, underscore) or dashes. This prevents a CSS-significant
 * prefix (e.g. `'foo]'`) from being spliced into a selector and throwing a
 * SyntaxError inside `querySelectorAll`, which would permanently break DOM
 * scanning / observation (issue #33).
 *
 * A single trailing dash is tolerated because prefixes are commonly written
 * with one (e.g. `'data-'`); the pattern below allows dashes anywhere.
 * @type {RegExp}
 */
const VALID_PREFIX = /^[a-zA-Z][\w-]*$/

/**
 * Format the attribute prefix to ensure it has a trailing dash.
 *
 * Invalid prefixes (non-string, empty, or containing CSS-significant
 * characters) are rejected and fall back to no prefix so a malformed value
 * can never crash selector construction (issue #33).
 * @param {string|undefined} prefix - The raw prefix
 * @returns {string} - The formatted prefix with a trailing dash, or '' if invalid
 */
const formatPrefix = (prefix) => {
  if (isNil(prefix) || !isString(prefix) || isEmptyString(prefix)) return ''

  // Validate against the bare prefix (without any trailing dash) so a lone
  // trailing dash like 'data-' is accepted while CSS-significant characters
  // are not.
  const bare = prefix.endsWith('-') ? prefix.slice(0, -1) : prefix
  if (!VALID_PREFIX.test(bare)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[HookTML] Invalid attributePrefix "${prefix}". ` +
      'Prefixes must start with a letter and contain only letters, digits, ' +
      'underscores or dashes. Falling back to no prefix.'
    )
    return ''
  }

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
